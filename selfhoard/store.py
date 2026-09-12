"""Transactional single-owner evidence store; imported text is always data."""
from contextlib import contextmanager
from datetime import date, datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import sqlite3
import unicodedata
from uuid import uuid4
from .models import Archive, ClaimInput, SourceInput


class DomainError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def uid():
    return str(uuid4())


def digest(source):
    # Metadata participates in identity, so identical words by different authors differ.
    return sha256(json.dumps({k: source[k] for k in ('text', 'kind', 'author')},
                             ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower())
                   if unicodedata.category(c) != 'Mn')


class Store:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS sources (
                  id TEXT PRIMARY KEY, title TEXT NOT NULL, text TEXT NOT NULL,
                  kind TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL,
                  digest TEXT NOT NULL UNIQUE);
                CREATE TABLE IF NOT EXISTS claims (
                  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
                  text TEXT NOT NULL, quote TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT NOT NULL,
                  state TEXT NOT NULL, valid_from TEXT, valid_to TEXT, created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS dependencies (
                  child TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
                  parent TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
                  PRIMARY KEY(child,parent));
                CREATE TABLE IF NOT EXISTS events (
                  id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
                  action TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS claim_source ON claims(source_id);
                CREATE INDEX IF NOT EXISTS dependency_parent ON dependencies(parent);
                PRAGMA user_version=1;
            ''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA secure_delete=ON')
        db.execute('PRAGMA journal_mode=DELETE')
        try:
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def get(db, table, item_id):
        assert table in ('sources', 'claims')
        row = db.execute(f'SELECT * FROM {table} WHERE id=?', (item_id,)).fetchone()
        if not row:
            raise DomainError('not_found', 404)
        return dict(row)

    @staticmethod
    def event(db, claim_id, action, reason=''):
        db.execute('INSERT INTO events VALUES (?,?,?,?,?)', (uid(), claim_id, action, reason, now()))

    def add_source(self, data: SourceInput):
        item = data.model_dump()
        item.update(id=uid(), created_at=now(), digest=digest(item))
        with self.connect() as db:
            previous = db.execute('SELECT * FROM sources WHERE digest=?', (item['digest'],)).fetchone()
            if previous:
                return dict(previous) | {'duplicate': True}
            db.execute('INSERT INTO sources VALUES (:id,:title,:text,:kind,:author,:created_at,:digest)', item)
        return item | {'duplicate': False}

    @staticmethod
    def validate_claim(item, source):
        if item['quote'] not in source['text']:
            raise DomainError('quote_not_in_source')
        if item['kind'] == 'owner_statement':
            if source['kind'] != 'owner_statement' or item['text'] != item['quote']:
                raise DomainError('direct_statement_requires_verbatim_owner_source')
        elif item['kind'] not in ('inference', source['kind']):
            raise DomainError('invalid_attribution')

    def add_claim(self, data: ClaimInput):
        item = data.model_dump(mode='json')
        parents = sorted(set(item.pop('dependencies')))
        item.update(id=uid(), state='proposed', created_at=now())
        with self.connect() as db:
            source = self.get(db, 'sources', item['source_id'])
            self.validate_claim(item, source)
            for parent in parents:
                self.get(db, 'claims', parent)
            db.execute('''INSERT INTO claims VALUES
              (:id,:source_id,:text,:quote,:kind,:subject,:state,:valid_from,:valid_to,:created_at)''', item)
            db.executemany('INSERT INTO dependencies VALUES (?,?)', [(item['id'], p) for p in parents])
            self.event(db, item['id'], 'proposed')
        return item | {'dependencies': parents}

    @staticmethod
    def descendants(db, ids):
        found, pending = set(ids), list(ids)
        while pending:
            parent = pending.pop()
            for row in db.execute('SELECT child FROM dependencies WHERE parent=?', (parent,)):
                if row['child'] not in found:
                    found.add(row['child'])
                    pending.append(row['child'])
        return found

    def review(self, claim_id, state, reason=''):
        with self.connect() as db:
            item = self.get(db, 'claims', claim_id)
            if state == 'confirmed':
                if item['state'] in ('rejected', 'superseded'):
                    raise DomainError('terminal_claim_create_new', 409)
                parents = db.execute('''SELECT c.state FROM claims c JOIN dependencies d
                    ON c.id=d.parent WHERE d.child=?''', (claim_id,)).fetchall()
                if any(p['state'] != 'confirmed' for p in parents):
                    raise DomainError('unconfirmed_dependency', 409)
            db.execute('UPDATE claims SET state=? WHERE id=?', (state, claim_id))
            self.event(db, claim_id, state, reason)
            affected = self.descendants(db, [claim_id]) - {claim_id}
            if state != 'confirmed':
                for child in affected:
                    db.execute("UPDATE claims SET state='disputed' WHERE id=? AND state NOT IN ('rejected','superseded')", (child,))
                    self.event(db, child, 'dependency_invalidated')
            return {'id': claim_id, 'state': state, 'affected': len(affected) if state != 'confirmed' else 0}

    def snapshot(self):
        with self.connect() as db:
            sources = [dict(r) for r in db.execute('SELECT * FROM sources ORDER BY created_at DESC,id')]
            claims = [dict(r) for r in db.execute('SELECT * FROM claims ORDER BY created_at DESC,id')]
            for claim in claims:
                claim['dependencies'] = [r[0] for r in db.execute(
                    'SELECT parent FROM dependencies WHERE child=? ORDER BY parent', (claim['id'],))]
            events = [dict(r) for r in db.execute('SELECT * FROM events ORDER BY created_at,id')]
        return {'format': 'selfhoard.archive', 'version': 1, 'sources': sources, 'claims': claims, 'events': events}

    def delete_source(self, source_id, dry_run=False):
        with self.connect() as db:
            self.get(db, 'sources', source_id)
            roots = [r[0] for r in db.execute('SELECT id FROM claims WHERE source_id=?', (source_id,))]
            ids = self.descendants(db, roots)
            result = {'sources': 1, 'claims': len(ids)}
            if not dry_run:
                for item in ids:
                    db.execute('DELETE FROM claims WHERE id=?', (item,))
                db.execute('DELETE FROM sources WHERE id=?', (source_id,))
        return result

    def search(self, query, as_of=None):
        # Conservative keyword retrieval, never a generated biographical answer.
        stop = set('que cual cuales es el la los las mi mis un una de del en por para y a al lo se me con como what which is are my the a an of in for and do i does have can you know about'.split())
        terms = [t for t in re.findall(r'\w+', normalized(query)) if t not in stop][:24]
        day = str(as_of or date.today())
        archive = self.snapshot()
        sources = {s['id']: s for s in archive['sources']}
        by_id = {c['id']: c for c in archive['claims']}

        def directly_eligible(c):
            if c['state'] != 'confirmed' or c['kind'] != 'owner_statement' or c['subject'] != 'owner':
                return False
            if c['valid_from'] and c['valid_from'] > day or c['valid_to'] and c['valid_to'] < day:
                return False
            if sources[c['source_id']]['kind'] != 'owner_statement':
                return False
            return True

        # Propagate invalid ancestors iteratively, including very deep imports.
        blocked = {c['id'] for c in archive['claims'] if not directly_eligible(c)}
        children = {item_id: [] for item_id in by_id}
        for c in archive['claims']:
            for parent in c['dependencies']:
                children[parent].append(c['id'])
        pending = list(blocked)
        while pending:
            for child in children[pending.pop()]:
                if child not in blocked:
                    blocked.add(child)
                    pending.append(child)

        results = []
        for claim in archive['claims']:
            if not terms or claim['id'] in blocked:
                continue
            words = set(re.findall(r'\w+', normalized(claim['text'])))
            if all(t in words for t in terms):
                results.append(claim | {'source_title': sources[claim['source_id']]['title']})
        return {'status': 'evidence' if results else 'unknown', 'matches': results[:30],
                'method': 'literal_keywords', 'as_of': day}

    def restore(self, data: Archive):
        archive = data.model_dump(mode='json')
        sources = {s['id']: s for s in archive['sources']}
        claims = {c['id']: c for c in archive['claims']}
        events = archive['events']
        if len(sources) != len(archive['sources']) or len(claims) != len(archive['claims']) or len({e['id'] for e in events}) != len(events):
            raise DomainError('duplicate_ids')
        if len({s['digest'] for s in sources.values()}) != len(sources):
            raise DomainError('duplicate_sources')
        for source in sources.values():
            if source['digest'] != digest(source):
                raise DomainError('source_integrity')
        for c in claims.values():
            if c['source_id'] not in sources or any(p not in claims for p in c['dependencies']):
                raise DomainError('missing_reference')
            self.validate_claim(c, sources[c['source_id']])
            if c['state'] == 'confirmed' and any(claims[p]['state'] != 'confirmed' for p in c['dependencies']):
                raise DomainError('unconfirmed_dependency')
        # Kahn's algorithm avoids recursion limits with user-controlled graphs.
        pending = {k: set(c['dependencies']) for k, c in claims.items()}
        ready = [k for k, parents in pending.items() if not parents]
        children = {k: [] for k in claims}
        for k, parents in pending.items():
            for p in parents:
                children[p].append(k)
        count = 0
        while ready:
            item = ready.pop()
            count += 1
            for child in children[item]:
                pending[child].discard(item)
                if not pending[child]:
                    ready.append(child)
        if count != len(claims):
            raise DomainError('dependency_cycle')
        if any(e['claim_id'] not in claims for e in events):
            raise DomainError('missing_reference')
        with self.connect() as db:
            if db.execute('SELECT count(*) FROM sources').fetchone()[0]:
                raise DomainError('restore_requires_empty_archive', 409)
            for s in sources.values():
                db.execute('INSERT INTO sources VALUES (:id,:title,:text,:kind,:author,:created_at,:digest)', s)
            for c in claims.values():
                db.execute('''INSERT INTO claims VALUES
                  (:id,:source_id,:text,:quote,:kind,:subject,:state,:valid_from,:valid_to,:created_at)''', c)
            for c in claims.values():
                db.executemany('INSERT INTO dependencies VALUES (?,?)', [(c['id'], p) for p in set(c['dependencies'])])
            for e in events:
                db.execute('INSERT INTO events VALUES (:id,:claim_id,:action,:reason,:created_at)', e)
        return {'sources': len(sources), 'claims': len(claims)}

    def markdown(self):
        archive = self.snapshot()
        lines = ['# Self Hoard', '', 'Personal archive / Archivo personal', '']
        for source in archive['sources']:
            lines += [f"## {source['title']}", '', f"{source['kind']} · {source['author']} · {source['created_at']}", '', source['text'], '']
            for c in archive['claims']:
                if c['source_id'] == source['id']:
                    lines += [f"- [{c['state']}] ({c['kind']}) {c['text']}", f"  Source: {source['id']} · Claim: {c['id']}"]
        return '\n'.join(lines)
