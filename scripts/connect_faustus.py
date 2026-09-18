"""Owner-invoked local Faustus setup. No secret appears on the command line or stdout.

Creates a 30-day personal connection with context.read + updates.write only and
stores the credential where Faustus's connector preset expects it
(data/agent-clients/faustus.json). Existing credentials are never replaced.
"""
import json
import os
from pathlib import Path
import subprocess
import httpx


def main():
    root = Path(__file__).resolve().parents[1]
    credential = root / 'data' / 'agent-clients' / 'faustus.json'
    if credential.exists():
        raise SystemExit('A Faustus connection already exists (data/agent-clients/faustus.json). Revoke it in AI connections and delete the file to create another.')
    flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    with httpx.Client(base_url='http://127.0.0.1:8741', trust_env=False, timeout=10) as owner:
        owner.get('/api/session').raise_for_status()
        owner.headers.update({'X-Hoard-Request': '1', 'X-Hoard-Space': 'personal'})
        previous_enabled = owner.get('/api/agents').json()['enabled']
        result = owner.post('/api/agents/grants', json={'name': 'Faustus personal', 'scopes': ['context.read', 'updates.write'], 'days': 30})
        result.raise_for_status()
        grant = result.json()
        try:
            credential.parent.mkdir(parents=True, exist_ok=True)
            if os.name == 'nt':
                identity = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True, creationflags=flags)
                import csv
                sid = next(csv.reader([identity.stdout.strip()]))[1]
                subprocess.run(['icacls', str(credential.parent), '/inheritance:r', '/grant:r', f'*{sid}:(OI)(CI)F'], capture_output=True, check=True, creationflags=flags)
            credential.write_text(json.dumps({'url': 'http://127.0.0.1:8741', 'token': grant['token'], 'grant_id': grant['id']}, indent=2), encoding='utf-8')
            if os.name != 'nt':
                credential.chmod(0o600)
            owner.post('/api/agents/switch', json={'enabled': True}).raise_for_status()
        except Exception:
            owner.delete('/api/agents/grants/' + grant['id'])
            owner.post('/api/agents/switch', json={'enabled': previous_enabled})
            credential.unlink(missing_ok=True)
            raise
    print('Faustus connection created: context reading and reviewed updates, expires ' + grant['expires_at'] + '.')
    print('Faustus reads the credential from data/agent-clients/faustus.json. Revoke it from AI connections at any time.')


if __name__ == '__main__':
    main()
