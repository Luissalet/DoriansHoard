import pytest
from fastapi.testclient import TestClient
from selfhoard.api import create_app
from selfhoard.reflection import Reflection, PersonaInput, CardInput, CardReview


@pytest.fixture
def memory(tmp_path):
    value = Reflection(tmp_path / 'memory.db')
    value.save_persona(PersonaInput(name='Synthetic Alba', voice='calm', values='order', consent=True))
    return value


def test_patch_merges_only_the_fields_sent(memory):
    result = memory.patch_persona({'voice': 'quick'})
    assert result['profile']['voice'] == 'quick'
    assert (result['profile']['name'], result['profile']['values'], result['profile']['consent']) == ('Synthetic Alba', 'order', True)
    # a field changed by someone else in the meantime survives the next patch of a different field
    memory.patch_persona({'values': 'candour'})
    final = memory.patch_persona({'greeting': 'Hi'})['profile']
    assert (final['voice'], final['values'], final['greeting']) == ('quick', 'candour', 'Hi')


def test_patch_validates_and_leaves_the_portrait_intact_on_error(memory):
    with pytest.raises(Exception):
        memory.patch_persona({'name': 'x' * 101})
    assert memory.persona()['profile']['name'] == 'Synthetic Alba'


def test_patch_forgets_derived_dialogue_only_when_something_changed(memory):
    item = memory.add_card(CardInput(title='Words', text='Vamos por partes.'))
    memory.review_card(item['id'], CardReview(state='confirmed'))
    revision = memory.persona()['revision']
    assert memory.patch_persona({'name': 'Synthetic Alba'})['revision'] == revision
    assert memory.patch_persona({'name': 'Renamed'})['revision'] != revision


def test_patch_route_sends_a_partial_body(tmp_path):
    app = create_app(tmp_path, test_mode=True)
    with TestClient(app) as client:
        client.get('/api/session')
        client.headers.update({'X-Hoard-Request': '1'})
        assert client.post('/api/reflection/persona', json={'name': 'Synthetic', 'voice': 'calm', 'consent': True}).status_code == 200
        answer = client.patch('/api/reflection/persona', json={'voice': 'quick'})
        assert answer.status_code == 200, answer.text
        profile = client.get('/api/reflection').json()['profile']
        assert (profile['name'], profile['voice'], profile['consent']) == ('Synthetic', 'quick', True)
        assert client.patch('/api/reflection/persona', json={'unknown': 1}).status_code == 422
        # the demo space is separate
        assert client.get('/api/reflection', headers={'X-Hoard-Space': 'demo'}).json()['profile']['name'] == ''
        assert client.patch('/api/reflection/persona', json={'voice': 'x'}, headers={'Authorization': 'Bearer a'}).status_code == 403
