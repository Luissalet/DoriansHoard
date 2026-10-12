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


def test_proxy_reaches_the_relay_without_the_request_header(tmp_path):
    client = make(tmp_path)
    client.get('/api/session')
    # The panel's own fetch cannot add the app header; the guard must not stop it before the relay answers.
    assert client.post('/api/copilot/proxy', json={'path': '/x', 'method': 'GET'}).json().get('error') != 'request_header_required'
    # Everything else keeps the rule.
    assert client.post('/api/sources', json={'title': 'a', 'text': 'b'}).json()['error'] == 'request_header_required'


def test_csp_lets_the_panel_style_itself_but_not_run_scripts(tmp_path):
    client = make(tmp_path)
    csp = client.get('/api/session').headers['content-security-policy']
    assert "style-src 'self' 'unsafe-inline'" in csp and "font-src 'self' data:" in csp
    assert "script-src 'self';" in csp
