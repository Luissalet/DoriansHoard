"""The shared Hoard Link request guard in front of the app, and what Dorian's own boundary still adds."""
import pytest
from fastapi.testclient import TestClient

from selfhoard.api import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, test_mode=True), base_url='http://127.0.0.1:8741') as client:
        yield client


def test_a_foreign_host_name_is_refused_with_the_shared_message(client):
    # a page that rebinds its DNS name to 127.0.0.1 sends its own name in Host
    refused = client.get('/api/session', headers={'Host': 'evil.example'})
    assert refused.status_code == 403 and refused.json() == {'error': 'Only local access is allowed.'}
    for host in ('127.0.0.1:8741', 'localhost:8741', '[::1]:8741'):
        assert client.get('/api/session', headers={'Host': host}).status_code == 200


def test_cross_site_fetches_are_refused_but_a_navigation_is_not(client):
    assert client.get('/api/session', headers={'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'cors'}).status_code == 403
    navigation = {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document'}
    assert client.get('/api/session', headers=navigation).status_code == 200


def test_the_origin_must_be_exactly_this_apps_own(client):
    own = 'http://127.0.0.1:8741'
    assert client.get('/api/session', headers={'Origin': own}).status_code == 200
    # another local app on another port is still refused (stricter than the shared rule, kept on purpose)
    assert client.get('/api/session', headers={'Origin': 'http://127.0.0.1:9999'}).json() == {'error': 'origin_denied'}
    assert client.get('/api/session', headers={'Origin': 'https://evil.example'}).status_code == 403


def test_a_lan_name_is_opened_only_by_the_environment(tmp_path, monkeypatch):
    monkeypatch.setenv('DORIAN_ALLOWED_HOSTS', 'pc2.example')
    with TestClient(create_app(tmp_path, test_mode=True), base_url='http://127.0.0.1:8741') as c:
        assert c.get('/api/session', headers={'Host': 'pc2.example'}).status_code == 200
        assert c.get('/api/session', headers={'Host': 'pc3.example'}).status_code == 403


def test_outside_test_mode_the_peer_must_be_loopback(tmp_path):
    # the test client's peer is not a loopback address: a real app refuses it before any route runs
    with TestClient(create_app(tmp_path), base_url='http://127.0.0.1:8741') as c:
        assert c.get('/api/session').json() == {'error': 'local_only'}


def test_the_vendored_guard_is_importable_without_the_model_backend_extras():
    from selfhoard.hoard_link import guard

    assert guard.check_request('GET', {'host': 'evil.example'}, 0) == (403, 'Only local access is allowed.')
