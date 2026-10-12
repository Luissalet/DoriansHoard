from fastapi.testclient import TestClient

from selfhoard.api import create_app


def make(tmp_path):
    return TestClient(create_app(tmp_path / 'data', None, test_mode=True))


def test_launcher_is_public_and_pages_get_it_injected(tmp_path):
    frontend = tmp_path / 'dist'
    frontend.mkdir()
    (frontend / 'index.html').write_text('<html><body><div id=root></div></body></html>')
    client = TestClient(create_app(tmp_path / 'data', frontend, test_mode=True))
    # The page loads the launcher before it has a session cookie.
    assert client.get('/api/copilot/launcher.js').status_code == 200
    assert '/api/copilot/launcher.js' in client.get('/').text
    # Other copilot routes still need the session.
    assert client.get('/api/copilot/info').status_code == 401


def test_proxy_needs_the_request_header_like_every_other_write(tmp_path):
    client = make(tmp_path)
    client.get('/api/session')
    # The shared launcher sends X-Hoard-Request on its relay calls, so the relay has no exemption any more.
    assert client.post('/api/copilot/proxy', json={'path': '/x', 'method': 'GET'}).json()['error'] == 'request_header_required'
    answer = client.post('/api/copilot/proxy', json={'path': '/x', 'method': 'GET'}, headers={'X-Hoard-Request': '1'}).json()
    assert answer.get('error') != 'request_header_required'
    assert client.post('/api/sources', json={'title': 'a', 'text': 'b'}).json()['error'] == 'request_header_required'


def test_public_paths_come_from_the_shared_library(tmp_path):
    from selfhoard.hoard_link.copilot import COPILOT_PUBLIC_PATHS
    client = make(tmp_path)
    for path in COPILOT_PUBLIC_PATHS:
        assert client.get(path).status_code == 200


def test_csp_has_no_inline_styles_and_no_scripts(tmp_path):
    client = make(tmp_path)
    csp = client.get('/api/session').headers['content-security-policy']
    assert 'unsafe-inline' not in csp
    assert "style-src 'self';" in csp
    # Dorian's own Manrope @font-face is inlined as data:, so font-src keeps it.
    assert "font-src 'self' data:" in csp
    assert "script-src 'self';" in csp