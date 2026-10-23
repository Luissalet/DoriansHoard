import hashlib
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from selfhoard.api import create_app
from selfhoard.lab import Lab, TrialInput, TrialPageInput
from selfhoard.agents import AgentHub


@pytest.fixture
def history(tmp_path):
    app = create_app(tmp_path, test_mode=True)
    lab = Lab(tmp_path/'lab-personal.sqlite3')
    for n in range(25):
        item = lab.create(TrialInput(scenario='afternoon', minutes=60,
                         weights={'calm':3,'autonomy':3,'curiosity':3,'connection':2}))
        with lab.db.connect() as db:
            db.execute('UPDATE trials SET created_at=? WHERE id=?', ('2026-10-23T12:00:00Z', item['id']))
        if n % 3 == 0:
            lab.answer(item['id'], 'skip')
    with TestClient(app) as client:
        client.get('/api/session')
        client.headers.update({'X-Hoard-Request':'1','X-Hoard-Space':'personal'})
        yield client, lab, tmp_path


def test_pages_cover_tied_timestamps_once_and_preserve_old_full_history_export(history):
    client, lab, _ = history
    expected = lab.history()
    assert len(expected) == 25
    assert [r['id'] for r in expected] == sorted((r['id'] for r in expected), reverse=True)
    results = []
    for offset in range(0, 25, 8):
        response = client.get(f'/api/lab/trials/page?limit=8&offset={offset}')
        assert response.status_code == 200
        page = response.json()
        assert page == lab.page(TrialPageInput(offset=offset, limit=8))
        assert page['total'] == 25
        assert page['has_more'] == (offset < 24)
        assert page['method'] == 'manual-utility-v1' and not page['personal_model']
        results.extend(page['trials'])
    assert results == expected
    assert client.get('/api/lab/trials').json() == expected
    beyond = client.get('/api/lab/trials/page?offset=999').json()
    assert beyond['trials'] == [] and beyond['total'] == 25 and not beyond['has_more']


def test_answer_filters_include_skip_and_pending_never_reveal_sealed_material(history):
    client, lab, _ = history
    for answered, count in [(True, 9), (False, 16)]:
        page = client.get(f'/api/lab/trials/page?answered={str(answered).lower()}&limit=100').json()
        assert page['trials'] == [r for r in lab.history() if r['answered'] == answered]
        assert page['total'] == count
        for item in page['trials']:
            assert item['answered'] == answered
            if not answered:
                assert not {'payload','prediction','scores','choice','match','canonical_payload','nonce'} & set(item)


def test_existing_spaces_grants_pause_revocation_and_expiry_apply_to_listing(history):
    client, _, path = history
    def grant(scopes, space='personal'):
        client.headers['X-Hoard-Space'] = space
        return client.post('/api/agents/grants',json={'name':'Synthetic page test','scopes':scopes,'days':1}).json()
    def call(credential, args=None, **headers):
        return client.post('/agent/call',headers={'Authorization':'Bearer '+credential['token'],**headers},
                           json={'tool':'list_trials','arguments':args or {}})
    credential = grant(['lab.run'])
    assert call(credential).json()['error'] == 'agents_paused'
    client.post('/api/agents/switch',json={'enabled':True})
    expected = client.get('/api/lab/trials/page?answered=false&offset=8&limit=8').json()
    assert call(credential,{'answered':False,'offset':8,'limit':8}).json() == expected
    assert call(credential,{'space':'demo'}).status_code == 422
    assert call(credential,{},**{'X-Hoard-Space':'demo'}).json()['total'] == 25
    denied = grant(['context.read'])
    assert call(denied).json()['error'] == 'scope_denied'
    demo = grant(['lab.run'],'demo')
    client.post('/api/agents/switch',json={'enabled':True})
    assert call(demo).json()['total'] == 0
    assert client.get('/api/lab/trials/page').json()['trials'] == []
    client.headers['X-Hoard-Space'] = 'personal'
    client.delete('/api/agents/grants/'+credential['id'])
    assert call(credential).status_code == 401
    expired = grant(['lab.run'])
    with AgentHub(path/'agents.sqlite3').connect() as db:
        db.execute("UPDATE grants SET expires_at='2000-01-01T00:00:00Z' WHERE id=?",(expired['id'],))
    assert call(expired).status_code == 401


def test_validation_and_read_only_listing_preserve_trials_and_memory(history):
    client, lab, path = history
    files = [p for p in path.glob('*.sqlite3') if p.name != 'agents.sqlite3']
    before = {p.name:(hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns) for p in files}
    for query in ['offset=-1','limit=0','limit=101','limit=no','answered=invalid']:
        assert client.get('/api/lab/trials/page?'+query).status_code == 422
    for args in [{'offset':True},{'limit':False},{'limit':1.2},{'answered':'true'},{'unknown':1}]:
        with pytest.raises(ValidationError):
            TrialPageInput(**args)
    assert lab.page(TrialPageInput())['total'] == 25
    client.get('/api/lab/trials/page?answered=false')
    assert before == {p.name:(hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mtime_ns) for p in files}
