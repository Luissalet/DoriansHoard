from hashlib import sha256
from fastapi.testclient import TestClient
import pytest
from selfhoard.api import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path,test_mode=True)) as client:
        yield client


def init(client,space='personal'):
    client.get('/api/session')
    client.headers.update({'X-Hoard-Request':'1','X-Hoard-Space':space})


def trial(client,minutes=60,weights=None):
    return client.post('/api/lab/trials',json={'scenario':'afternoon','minutes':minutes,
        'weights':weights or {'calm':3,'autonomy':3,'curiosity':3,'connection':2}})


def test_api_requires_session_and_csrf_header(client):
    assert client.get('/api/archive').status_code==401
    client.get('/api/session')
    assert client.post('/api/demo',json={}).status_code==403
    assert client.get('/api/archive').status_code==200


def test_cross_origin_and_dns_rebinding_denied(client):
    init(client)
    for headers in [{'Origin':'https://evil.example'},{'Host':'evil.example'},{'Sec-Fetch-Site':'cross-site'}]:
        assert client.get('/api/session',headers=headers).status_code==403


def test_demo_separate_from_personal(client):
    init(client,'demo')
    assert client.post('/api/demo',json={}).status_code==200
    assert len(client.get('/api/archive').json()['sources'])==3
    client.headers['X-Hoard-Space']='personal'
    assert client.get('/api/archive').json()['sources']==[]
    assert client.post('/api/demo',json={}).status_code==400


def test_complete_api_lifecycle(client):
    init(client)
    s=client.post('/api/sources',json={'title':'Synthetic','text':'I prefer quiet walks.'}).json()
    c=client.post('/api/claims',json={'source_id':s['id'],'text':s['text'],'quote':s['text']}).json()
    assert c['state']=='proposed'
    assert client.post('/api/search',json={'query':'quiet'}).json()['status']=='unknown'
    client.post('/api/claims/'+c['id']+'/review',json={'state':'confirmed'})
    assert client.post('/api/search',json={'query':'quiet'}).json()['status']=='evidence'
    backup=client.get('/api/export').json()
    assert 'I prefer quiet' in client.get('/api/export?format=md').text
    assert client.delete('/api/sources/'+s['id']).status_code==200
    assert client.post('/api/search',json={'query':'quiet'}).json()['status']=='unknown'
    assert client.post('/api/restore',json=backup).status_code==200
    assert client.get('/api/archive').json()==backup


def test_blind_trial_never_exposes_prediction_until_answer(client):
    init(client)
    sealed=trial(client).json()
    assert sealed['answered'] is False
    assert 'payload' not in sealed and 'prediction' not in sealed and 'scores' not in sealed
    assert 'payload' not in client.get('/api/lab/trials').json()[0]
    reveal=client.post('/api/lab/trials/'+sealed['id']+'/answer',json={'choice':'garden'}).json()
    assert reveal['digest']==sealed['digest']
    assert sha256(reveal['canonical_payload'].encode()).hexdigest()==sealed['digest']
    assert reveal['choice']=='garden'
    assert reveal['payload']['prediction']=='studio'
    assert client.post('/api/lab/trials/'+sealed['id']+'/answer',json={'choice':'cafe'}).status_code==409
    assert client.get('/api/archive').json()['sources']==[]


def test_time_limit_skip_and_abstention(client):
    init(client)
    s=trial(client,minutes=10).json()
    assert client.post('/api/lab/trials/'+s['id']+'/answer',json={'choice':'garden'}).status_code==400
    revealed=client.post('/api/lab/trials/'+s['id']+'/answer',json={'choice':'none'}).json()
    assert revealed['payload']['prediction']=='abstain'


def test_tie_abstains(client):
    init(client)
    s=trial(client,weights={'calm':0,'autonomy':0,'curiosity':0,'connection':0}).json()
    r=client.post('/api/lab/trials/'+s['id']+'/answer',json={'choice':'skip'}).json()
    assert r['payload']['prediction']=='abstain'


def test_trials_separate_spaces_and_deletion(client):
    init(client)
    trial(client)
    client.headers['X-Hoard-Space']='demo'
    assert client.get('/api/lab/trials').json()==[]
    client.headers['X-Hoard-Space']='personal'
    assert client.delete('/api/lab/trials').status_code==200
    assert client.get('/api/lab/trials').json()==[]


def test_invalid_weights_and_source_payload(client):
    init(client)
    assert trial(client,weights={'calm':-1}).status_code==400
    assert client.post('/api/sources',json={'title':'x','text':'hello','hidden_instruction':'execute'}).status_code==422
    assert client.post('/api/restore',json={'version':99}).status_code==422
