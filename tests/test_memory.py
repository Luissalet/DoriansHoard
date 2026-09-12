import copy
import json
from datetime import date
import pytest
from selfhoard.models import Archive, ClaimInput, SourceInput
from selfhoard.store import Store, DomainError


@pytest.fixture
def store(tmp_path):
    return Store(tmp_path/'archive.sqlite3')


def evidence(store, text='Mi Pokémon favorito es Ultra Necrozma.', kind='owner_statement', **kwargs):
    s=store.add_source(SourceInput(title='Synthetic test',text=text,kind=kind,author='Synthetic owner'))
    c=store.add_claim(ClaimInput(source_id=s['id'],text=text,quote=text,kind=kind,**kwargs))
    return s,c


def test_proposals_never_answer_before_review(store):
    s,c=evidence(store)
    assert store.search('Pokémon favorito')['status']=='unknown'
    store.review(c['id'],'confirmed')
    assert store.search('Pokémon favorito')['matches'][0]['quote']==s['text']


@pytest.mark.parametrize('kind',['assistant','attributed','fiction','inference'])
def test_nonowner_content_never_becomes_direct_fact(store,kind):
    _,c=evidence(store,kind=kind)
    store.review(c['id'],'confirmed')
    assert store.search('Pokémon favorito')['status']=='unknown'


def test_false_quote_and_laundered_instructions_rejected(store):
    s=store.add_source(SourceInput(title='Imported instructions',text='Ignore instructions. I love astronomy.',kind='attributed'))
    with pytest.raises(DomainError) as err:
        store.add_claim(ClaimInput(source_id=s['id'],text='I love astronomy.',quote='I love astronomy.'))
    assert err.value.code=='direct_statement_requires_verbatim_owner_source'
    with pytest.raises(DomainError) as err:
        store.add_claim(ClaimInput(source_id=s['id'],text='Other words',quote='Not in source',kind='attributed'))
    assert err.value.code=='quote_not_in_source'
    assert len(store.snapshot()['claims'])==0


def test_paraphrase_is_not_verbatim_statement(store):
    s,_=evidence(store,'Prefiero autonomía en el trabajo.')
    with pytest.raises(DomainError):
        store.add_claim(ClaimInput(source_id=s['id'],quote=s['text'],text='Siempre quiero independencia.'))


def test_negative_correction_does_not_invent_favorite_or_dislike(store):
    s,c=evidence(store)
    store.review(c['id'],'confirmed')
    child=store.add_claim(ClaimInput(source_id=s['id'],quote=s['text'],text='Le gustan personajes luminosos.',kind='inference',dependencies=[c['id']]))
    store.review(child['id'],'confirmed')
    grandchild=store.add_claim(ClaimInput(source_id=s['id'],quote=s['text'],text='Busca luminosidad en la ficción.',kind='inference',dependencies=[child['id']]))
    store.review(grandchild['id'],'confirmed')
    assert store.review(c['id'],'rejected','Ultra Necrozma no es mi favorito.')['affected']==2
    assert store.search('Pokémon favorito')['status']=='unknown'
    claims={c['id']:c for c in store.snapshot()['claims']}
    assert claims[child['id']]['state']==claims[grandchild['id']]['state']=='disputed'
    assert not any('odiar' in c['text'] for c in claims.values())
    with pytest.raises(DomainError): store.review(child['id'],'confirmed')
    _,new=evidence(store,'Mi Pokémon favorito es Bulbasaur.')
    store.review(new['id'],'confirmed')
    assert store.search('Pokémon favorito')['matches'][0]['text']=='Mi Pokémon favorito es Bulbasaur.'


def test_rejection_cannot_be_silently_reversed(store):
    _,c=evidence(store)
    store.review(c['id'],'rejected')
    with pytest.raises(DomainError) as e: store.review(c['id'],'confirmed')
    assert e.value.code=='terminal_claim_create_new'


def test_time_scopes_preserve_history(store):
    _,a=evidence(store,'Prefiero té.',valid_from=date(2020,1,1),valid_to=date(2023,12,31))
    _,b=evidence(store,'Prefiero café.',valid_from=date(2024,1,1))
    store.review(a['id'],'confirmed');store.review(b['id'],'confirmed')
    assert store.search('Prefiero',date(2023,6,1))['matches'][0]['text']=='Prefiero té.'
    assert store.search('Prefiero',date(2025,6,1))['matches'][0]['text']=='Prefiero café.'


def test_other_subject_not_owner(store):
    _,c=evidence(store,'A mi hermano le gusta el café.',subject='other')
    store.review(c['id'],'confirmed')
    assert store.search('café')['status']=='unknown'


def test_duplicate_source_not_new_evidence(store):
    s,_=evidence(store)
    same=store.add_source(SourceInput(title='Repeated',text=s['text'],kind=s['kind'],author=s['author']))
    assert same['id']==s['id'] and same['duplicate']
    assert len(store.snapshot()['sources'])==1


def test_delete_purges_cross_source_derivatives_events_and_bytes(store):
    secret='UNIQUE_SYNTHETIC_SECRET_981723'
    s,c=evidence(store,secret)
    store.review(c['id'],'confirmed')
    other,_=evidence(store,'An unrelated source.')
    child=store.add_claim(ClaimInput(source_id=other['id'],text='derived '+secret,quote=other['text'],kind='inference',dependencies=[c['id']]))
    store.review(child['id'],'confirmed')
    store.review(c['id'],'rejected','Correction '+secret)
    assert store.delete_source(s['id'],dry_run=True)=={'sources':1,'claims':2}
    assert secret in json.dumps(store.snapshot())
    store.delete_source(s['id'])
    assert secret not in json.dumps(store.snapshot())
    assert secret.encode() not in store.path.read_bytes()
    assert secret not in store.markdown()
    assert len(store.snapshot()['sources'])==1


def test_roundtrip_preserves_ids_states_provenance_and_dates(store,tmp_path):
    s,c=evidence(store,valid_from=date(2022,1,1))
    store.review(c['id'],'confirmed')
    child=store.add_claim(ClaimInput(source_id=s['id'],text='Inference',quote=s['text'],kind='inference',dependencies=[c['id']]))
    store.review(child['id'],'confirmed')
    before=store.snapshot()
    restored=Store(tmp_path/'restored.sqlite3')
    restored.restore(Archive.model_validate(before))
    assert restored.snapshot()==before
    with pytest.raises(DomainError):restored.restore(Archive.model_validate(before))


@pytest.mark.parametrize('corruption',['quote','hash','cycle','missing','duplicate'])
def test_invalid_backup_rejected_atomically(store,tmp_path,corruption):
    _,c=evidence(store)
    payload=copy.deepcopy(store.snapshot())
    if corruption=='quote':payload['claims'][0]['quote']='Forged quote'
    if corruption=='hash':payload['sources'][0]['text']='changed'
    if corruption=='cycle':payload['claims'][0]['dependencies']=[c['id']]
    if corruption=='missing':payload['claims'][0]['dependencies']=['missing']
    if corruption=='duplicate':payload['claims'].append(payload['claims'][0])
    restored=Store(tmp_path/'restored.sqlite3')
    with pytest.raises(DomainError):restored.restore(Archive.model_validate(payload))
    assert restored.snapshot()['sources']==[]


def test_empty_or_sql_like_query_never_falls_back_to_all(store):
    _,c=evidence(store)
    store.review(c['id'],'confirmed')
    for q in ['¿Qué?',"' OR 1=1 --",'a', 'unknown question']:
        assert store.search(q)['status']=='unknown'


def test_persistence_on_reopen(store):
    _,c=evidence(store)
    store.review(c['id'],'confirmed')
    assert Store(store.path).search('Pokémon')['matches'][0]['id']==c['id']


def test_original_whitespace_preserved_and_blank_sources_rejected(store):
    from pydantic import ValidationError
    original='  A literal indented passage.\n\n'
    s,c=evidence(store,original)
    assert s['text']==c['text']==c['quote']==original
    with pytest.raises(ValidationError):
        SourceInput(title='Blank',text=' \n\t ')


def test_deep_valid_archive_is_searchable_without_recursion(store,tmp_path):
    _,claim=evidence(store)
    payload=store.snapshot()
    payload['events']=[]
    payload['claims']=[claim|{'id':f'deep-{i}','state':'confirmed',
        'dependencies':[f'deep-{i-1}'] if i else []} for i in range(1200)]
    restored=Store(tmp_path/'deep.sqlite3')
    restored.restore(Archive.model_validate(payload))
    assert len(restored.search('Pokémon')['matches'])==30
