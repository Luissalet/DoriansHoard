import json
from hashlib import sha256
import asyncio
import httpx
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from selfhoard.api import create_app
from selfhoard.reflection import Reflection, PersonaInput, CardInput, CardReview, ChatPreviewInput, ReflectionAnswer, ExpressionPattern
from selfhoard.providers import ProviderManager, ProviderInput
from selfhoard.decisions import Decisions, DecisionVault, EpisodeInput, PredictInput, BlindAnswer
from selfhoard.store import DomainError


@pytest.fixture
def memory(tmp_path):
    value=Reflection(tmp_path/'memory.db')
    value.save_persona(PersonaInput(name='Synthetic Alba',consent=True))
    return value


@pytest.fixture
def provider(tmp_path):
    manager=ProviderManager(tmp_path/'providers.db')
    return manager, manager.save(ProviderInput(name='Test local',model='test'))


def card(memory, **kwargs):
    item=memory.add_card(CardInput(title='Synthetic words',text='Bueno, vamos por partes.',**kwargs))
    memory.review_card(item['id'],CardReview(state='confirmed'))
    return item


def preview(memory,provider,**kwargs):
    provider={k:v for k,v in provider.items() if k!='has_key'}
    return memory.preview(ChatPreviewInput(question='¿Qué diría?',provider_id=provider['id'],**kwargs),provider)


def complete(memory,p):
    packet=memory.prepared(p['id'],p['digest'])
    memory.begin_send(p['id'])
    return memory.complete(packet,ReflectionAnswer(text='Vamos por partes.',kind='reflection',citations=[p['payload']['evidence'][0]['id']]),{})


def test_expression_needs_literal_source_and_retains_attribution(memory,provider):
    with pytest.raises(ValidationError):
        CardInput(kind='voice',title='x',text='Original',expression=ExpressionPattern(exact_examples=['Invented']))
    c=card(memory,kind='voice',attribution='attributed',author='Synthetic child',expression=ExpressionPattern(
        exact_examples=['vamos por partes'],relationship='family',frequency='sometimes',avoid_when='grief'))
    evidence=preview(memory,provider[1])['payload']['evidence'][0]
    assert evidence['id']==c['id'] and evidence['attribution']=='attributed'
    assert evidence['expression']['frequency']=='sometimes'
    assert evidence['expression']['avoid_when']=='grief'
    assert memory.search('vamos')['matches']==[]


def test_unreviewed_and_other_recipient_style_excluded(memory,provider):
    memory.add_card(CardInput(kind='voice',title='private',text='Unreviewed phrase'))
    own=card(memory,kind='voice',audiences=['daughter'])
    p={k:v for k,v in provider[1].items() if k!='has_key'}
    args=ChatPreviewInput(question='Hi',provider_id=p['id'])
    assert len(memory.preview(args,p,'daughter')['payload']['evidence'])==1
    assert memory.preview(args,p,'son')['payload']['evidence']==[]
    memory.review_card(own['id'],CardReview(state='proposed'))
    assert memory.preview(args,p,'daughter')['payload']['evidence']==[]


@pytest.mark.parametrize('operation',['source','card','review','profile'])
def test_forgetting_purges_context_and_generated_history(memory,provider,operation):
    c=card(memory,kind='voice')
    p=preview(memory,provider[1]);complete(memory,p)
    followup=preview(memory,provider[1],conversation_id=p['conversation_id'])
    assert followup['payload']['history']
    if operation=='source': memory.delete_source(c['source_id'])
    elif operation=='card': memory.delete_card(c['id'])
    elif operation=='review': memory.review_card(c['id'],CardReview(state='proposed'))
    else: memory.save_persona(PersonaInput(name='Changed',consent=True))
    assert memory.conversations()==[]
    with memory.connect() as db:
        assert db.execute('SELECT count(*) FROM packets').fetchone()[0]==0
    with pytest.raises(DomainError,match='context_expired'):
        memory.prepared(followup['id'],followup['digest'])


def test_unsupported_predictions_and_false_citations_rejected(memory,provider):
    card(memory); p=preview(memory,provider[1]);packet=memory.prepared(p['id'],p['digest']);memory.begin_send(p['id'])
    for answer in [ReflectionAnswer(text='Fact',kind='documented_memory'),
                   ReflectionAnswer(text='Choice',kind='prediction',uncertainty='Maybe'),
                   ReflectionAnswer(text='Choice',kind='prediction',citations=['nonexistent'])]:
        with pytest.raises(DomainError,match='unsupported_model_claim'): memory.complete(packet,answer,{})
    with pytest.raises(DomainError,match='prediction_uncertainty_required'):
        memory.complete(packet,ReflectionAnswer(text='Choice',kind='prediction',citations=[p['payload']['evidence'][0]['id']]),{})


def test_source_deletion_preview_counts_actual_reflection_cascade_and_rolls_back(memory,provider):
    c=card(memory,kind='voice'); p=preview(memory,provider[1]);complete(memory,p)
    result=memory.delete_source(c['source_id'],dry_run=True)
    assert result['cards']==1 and result['turns']==1
    assert len(memory.conversations())==1 and len(memory.cards())==1
    assert memory.delete_source(c['source_id'])==result
    assert memory.cards()==[] and memory.conversations()==[]


def test_destination_snapshot_prevents_silent_model_change(memory,provider):
    manager,settings=provider
    p=preview(memory,settings)
    manager.save(ProviderInput(name='Changed',model='different'),settings['id'])
    with pytest.raises(DomainError,match='provider_changed_preview_again'):
        asyncio.run(manager.generate(settings['id'],p['payload']))
    assert manager.list()['today']==[]


def test_provider_call_and_budget(memory,provider):
    manager,settings=provider
    manager.save(ProviderInput(name='Test local',model='test',calls_per_day=1),settings['id'])
    seen=[]
    def handler(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200,json={'message':{'content':json.dumps({'text':'I do not know.','kind':'unknown','citations':[],'uncertainty':'No evidence'})},'prompt_eval_count':50,'eval_count':20})
    manager.transport=httpx.MockTransport(handler)
    p=preview(memory,manager.get_provider(settings['id']))
    answer,usage=asyncio.run(manager.generate(settings['id'],p['payload']))
    assert answer.kind=='unknown' and usage['output_tokens']==20
    assert seen[0]['stream'] is False and 'tools' not in seen[0]
    with pytest.raises(DomainError,match='provider_budget_exceeded'):
        asyncio.run(manager.generate(settings['id'],p['payload']))
    assert len(seen)==1


@pytest.mark.parametrize('url',['http://evil.example','http://127.0.0.1:1234/proxy','http://user:password@localhost','https://localhost'])
def test_provider_rejects_unapproved_destinations(provider,url):
    with pytest.raises(DomainError,match='provider_destination_denied'):
        provider[0].save(ProviderInput(name='Bad',model='x',base_url=url))


def test_owner_api_end_to_end_and_agent_cannot_use_it(tmp_path):
    app=create_app(tmp_path,test_mode=True)
    def handler(request):
        payload=json.loads(json.loads(request.content)['messages'][1]['content'])
        return httpx.Response(200,json={'message':{'content':json.dumps({'text':'Bueno, vamos por partes.','kind':'reflection','citations':[payload['evidence'][0]['id']],'uncertainty':''})}})
    app.state.providers.transport=httpx.MockTransport(handler)
    with TestClient(app) as client:
        client.get('/api/session');client.headers.update({'X-Hoard-Request':'1'})
        assert client.post('/api/reflection/persona',json={'name':'Synthetic','consent':True}).status_code==200
        c=client.post('/api/reflection/cards',json={'title':'Phrase','text':'Bueno, vamos por partes.','kind':'voice'}).json()
        assert client.post(f"/api/reflection/cards/{c['id']}/review",json={'state':'confirmed'}).status_code==200
        p=client.post('/api/providers',json={'name':'Local','model':'test'}).json()
        packet=client.post('/api/reflection/preview',json={'question':'What would I say?','provider_id':p['id']}).json()
        result=client.post('/api/reflection/send',json={'packet_id':packet['id'],'digest':packet['digest']})
        assert result.status_code==200,result.text
        assert result.json()['answer']['text']=='Bueno, vamos por partes.'
        assert client.post('/api/reflection/send',json={'packet_id':packet['id'],'digest':packet['digest']}).status_code==409
        assert client.get('/api/reflection',headers={'Authorization':'Bearer agent'}).status_code==403
        assert client.get('/api/reflection',headers={'X-Hoard-Space':'demo'}).json()['cards']==[]
        assert client.delete('/api/sources/'+c['source_id']).status_code==200
        assert client.get('/api/reflection').json()['conversations']==[]


def test_learned_choices_sealed_labels_and_forgetting(tmp_path):
    models=Decisions(tmp_path/'memory.db'); vault=DecisionVault(tmp_path/'heldout.db')
    options=[{'id':'a','label':'Walk','features':{'quiet':5,'crowds':0}}, {'id':'b','label':'Party','features':{'quiet':0,'crowds':5}}]
    episodes=[]
    for i in range(3):
        episodes.append(models.add_episode(EpisodeInput(domain='leisure',situation=f'Synthetic day {i}',options=options,chosen=['a'],reason='Quiet helps me rest.')))
    with pytest.raises(DomainError,match='insufficient_decisions'): models.fit('leisure')
    for e in episodes: models.review_card(e['card_id'],CardReview(state='confirmed'))
    model=models.fit('leisure')
    assert model['weights']['quiet']>0 and model['weights']['crowds']<0
    case=PredictInput(domain='leisure',situation='Held-out Saturday',options=options,model_id=model['id'])
    trial=vault.create(models,case)
    assert 'seal' not in trial and 'prediction' not in trial
    result=vault.answer(models,trial['id'],BlindAnswer(chosen=['a'],reason='HELDOUT_SECRET'))
    assert sha256(result['canonical_payload'].encode()).hexdigest()==trial['digest']
    assert result['agreement'] is True and result['brier']<result['uniform_brier']
    assert 'HELDOUT_SECRET' not in json.dumps(models.snapshot())
    assert 'HELDOUT_SECRET' not in json.dumps(models.cards())
    models.review_card(episodes[0]['card_id'],CardReview(state='proposed'))
    assert models.models()==[]
    vault.purge(models)
    assert vault.history(models)==[]


def test_mcp_reflection_permission_review_revocation_and_spaces(tmp_path):
    with TestClient(create_app(tmp_path,test_mode=True)) as client:
        client.get('/api/session');client.headers['X-Hoard-Request']='1'
        client.post('/api/agents/switch',json={'enabled':True})
        limited=client.post('/api/agents/grants',json={'name':'Limited','scopes':['context.read']}).json()
        allowed=client.post('/api/agents/grants',json={'name':'Reflection reader','scopes':['reflection.read']}).json()
        def call(token):
            return client.post('/agent/call',json={'tool':'read_reflection','arguments':{}},headers={'Authorization':'Bearer '+token})
        assert call(limited['token']).json()['error']=='scope_denied'
        assert call(allowed['token']).json()['profile'] is None
        client.post('/api/reflection/persona',json={'name':'Synthetic','consent':True})
        c=client.post('/api/reflection/cards',json={'title':'Style','text':'Bueno, vamos por partes.','kind':'voice','attribution':'attributed','author':'Synthetic relative'}).json()
        assert call(allowed['token']).json()['memories']==[]
        client.post('/api/reflection/cards/'+c['id']+'/review',json={'state':'confirmed'})
        previous=call(allowed['token']).json()
        assert previous['memories'][0]['attribution']=='attributed'
        assert 'conversations' not in previous
        client.delete('/api/sources/'+c['source_id'])
        fresh=call(allowed['token']).json()
        assert fresh['revision']!=previous['revision'] and fresh['memories']==[]
        client.delete('/api/agents/grants/'+allowed['id'])
        assert call(allowed['token']).status_code==401
