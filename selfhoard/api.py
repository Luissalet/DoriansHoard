from pathlib import Path
import secrets
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from .models import Archive, ClaimInput, CorrectionInput, QueryInput, ReviewInput, SourceInput
from .store import DomainError, Store
from .lab import Lab, SCENARIOS, TrialInput, AnswerInput
from .agents import AgentHub, GrantInput, SwitchInput, UpdateReview
from .decisions import Decisions, DecisionVault
from .providers import ProviderManager
from .reflection_api import install as install_reflection
from .models import StrictModel
from pydantic import Field


class AgentCall(StrictModel):
    tool: str = Field(min_length=1, max_length=80)
    arguments: dict = Field(default_factory=dict)


def create_app(data_dir: Path, frontend_dir: Path | None = None, test_mode=False):
    app = FastAPI(title='Self Hoard', docs_url=None, redoc_url=None, openapi_url=None)
    stores = {space: Decisions(data_dir / f'{space}.sqlite3') for space in ('personal','demo')}
    vaults = {space: DecisionVault(data_dir / f'decisions-{space}.sqlite3') for space in stores}
    for space in stores:
        vaults[space].purge(stores[space])
    providers = ProviderManager(data_dir / 'providers.sqlite3')
    app.state.providers = providers
    labs = {space: Lab(data_dir / f'lab-{space}.sqlite3') for space in stores}
    agents = AgentHub(data_dir / 'agents.sqlite3')
    sessions: set[str] = set()

    def store(request: Request):
        space = request.headers.get('X-Hoard-Space', 'personal')
        if space not in stores:
            raise DomainError('invalid_space')
        return stores[space]

    def lab(request: Request):
        store(request)
        return labs[request.headers.get('X-Hoard-Space', 'personal')]

    def space_of(request):
        store(request)
        return request.headers.get('X-Hoard-Space', 'personal')

    install_reflection(app,store,space_of,providers,vaults)

    def mutate_memory(request, operation):
        result=operation(store(request))
        vaults[space_of(request)].purge(store(request))
        return result

    @app.exception_handler(DomainError)
    async def domain_error(request, exc):
        return JSONResponse({'error': exc.code}, status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def invalid_fields(request, exc):
        # Do not echo original personal text or secrets in validation errors.
        return JSONResponse({'error':'invalid_fields'},status_code=422)

    @app.middleware('http')
    async def local_boundary(request: Request, call_next):
        host = request.url.hostname
        if host not in ('127.0.0.1', 'localhost', '::1') and not (test_mode and host == 'testserver'):
            return JSONResponse({'error': 'local_only'}, status_code=403)
        if request.client and request.client.host not in ('127.0.0.1', '::1') and not test_mode:
            return JSONResponse({'error': 'local_only'}, status_code=403)
        origin = request.headers.get('origin')
        if origin and origin != f'{request.url.scheme}://{request.url.netloc}':
            return JSONResponse({'error': 'origin_denied'}, status_code=403)
        if request.headers.get('sec-fetch-site') == 'cross-site':
            return JSONResponse({'error': 'origin_denied'}, status_code=403)
        if request.url.path.startswith('/api/') and request.url.path != '/api/session':
            if request.headers.get('authorization'):
                return JSONResponse({'error': 'owner_session_required'}, status_code=403)
            if request.cookies.get('hoard_session') not in sessions:
                return JSONResponse({'error': 'session_required'}, status_code=401)
            if request.method not in ('GET', 'HEAD') and request.headers.get('X-Hoard-Request') != '1':
                return JSONResponse({'error': 'request_header_required'}, status_code=403)
        length = request.headers.get('content-length', '0')
        try:
            if int(length) > 8_000_000:
                return JSONResponse({'error': 'file_too_large'}, status_code=413)
        except ValueError:
            return JSONResponse({'error': 'invalid_length'}, status_code=400)
        if request.method in ('POST', 'PUT', 'PATCH'):
            parts, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 8_000_000:
                    return JSONResponse({'error': 'file_too_large'}, status_code=413)
                parts.append(chunk)
            request._body = b''.join(parts)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Content-Security-Policy'] = "default-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"
        return response

    @app.get('/api/session')
    def session(request: Request):
        token = request.cookies.get('hoard_session')
        if token not in sessions:
            if len(sessions) >= 100:
                sessions.clear()
            token = secrets.token_urlsafe(32)
            sessions.add(token)
        response = JSONResponse({'mode': 'local', 'version': '0.1.0'})
        response.set_cookie('hoard_session', token, httponly=True, samesite='strict')
        return response

    @app.get('/api/archive')
    def archive(request: Request):
        return store(request).snapshot()

    @app.get('/api/agents')
    def agent_settings(request: Request):
        return agents.owner_state(space_of(request))

    @app.post('/api/agents/switch')
    def agent_switch(data: SwitchInput, request: Request):
        return agents.set_enabled(space_of(request), data.enabled)

    @app.post('/api/agents/grants')
    def agent_grant(data: GrantInput, request: Request):
        import sys
        result = agents.grant(space_of(request), data)
        result['mcp_config'] = {'mcpServers': {'selfhoard': {
            'command': sys.executable,
            'args': [str(Path(__file__).with_name('mcp_server.py').resolve())],
            'env': {'SELFHOARD_URL': str(request.base_url).rstrip('/'), 'SELFHOARD_TOKEN': result['token']}
        }}}
        return result

    @app.delete('/api/agents/grants/{grant_id}')
    def agent_revoke(grant_id: str, request: Request):
        return agents.revoke(space_of(request), grant_id)

    @app.post('/api/agents/updates/{update_id}/review')
    def agent_review(update_id: str, data: UpdateReview, request: Request):
        return agents.review_update(space_of(request), update_id, data.state)

    @app.delete('/api/agents/updates/{update_id}')
    def agent_delete_update(update_id: str, request: Request):
        return agents.delete_update(space_of(request), update_id)

    @app.get('/api/agents/export')
    def agent_export(request: Request):
        state = agents.owner_state(space_of(request))
        return {'format': 'selfhoard.ai-report', 'version': 1, 'space': space_of(request),
                'updates': state['updates'], 'audit': state['audit']}

    @app.post('/agent/call')
    def agent_call(data: AgentCall, request: Request):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer ') or len(auth) > 200:
            raise DomainError('agent_unauthorized', 401)
        return agents.call(auth[7:], data.tool, data.arguments, stores, labs)

    @app.post('/api/sources')
    def source(data: SourceInput, request: Request):
        return store(request).add_source(data)

    @app.post('/api/claims')
    def claim(data: ClaimInput, request: Request):
        return store(request).add_claim(data)

    @app.post('/api/claims/{claim_id}/review')
    def review(claim_id: str, data: ReviewInput, request: Request):
        return mutate_memory(request,lambda memory: memory.review(claim_id, data.state))

    @app.post('/api/claims/{claim_id}/correct')
    def correct(claim_id: str, data: CorrectionInput, request: Request):
        return mutate_memory(request,lambda memory: memory.review(claim_id, 'rejected', data.reason))

    @app.get('/api/sources/{source_id}/deletion')
    def deletion(source_id: str, request: Request):
        return store(request).delete_source(source_id, dry_run=True)

    @app.delete('/api/sources/{source_id}')
    def remove_source(source_id: str, request: Request):
        return mutate_memory(request,lambda memory: memory.delete_source(source_id))

    @app.post('/api/search')
    def search(data: QueryInput, request: Request):
        return store(request).search(data.query, data.as_of)

    @app.get('/api/export')
    def export(request: Request, format: str = 'json'):
        if format == 'md':
            return Response(store(request).markdown(), media_type='text/markdown',
                            headers={'Content-Disposition': 'attachment; filename="SelfHoard.md"'})
        if format != 'json':
            raise DomainError('invalid_format')
        return JSONResponse(store(request).snapshot(), headers={'Content-Disposition': 'attachment; filename="SelfHoard.json"'})

    @app.post('/api/restore')
    def restore(data: Archive, request: Request):
        return store(request).restore(data)

    @app.post('/api/demo')
    def seed_demo(request: Request):
        if request.headers.get('X-Hoard-Space') != 'demo':
            raise DomainError('demo_space_required')
        from .demo import populate
        populate(stores['demo'])
        return {'ok': True}

    @app.get('/api/lab/scenarios')
    def scenarios():
        return SCENARIOS

    @app.get('/api/lab/trials')
    def trials(request: Request):
        return lab(request).history()

    @app.post('/api/lab/trials')
    def trial(data: TrialInput, request: Request):
        return lab(request).create(data)

    @app.get('/api/lab/trials/{trial_id}')
    def read_trial(trial_id: str, request: Request):
        return lab(request).get(trial_id)

    @app.post('/api/lab/trials/{trial_id}/answer')
    def answer(trial_id: str, data: AnswerInput, request: Request):
        return lab(request).answer(trial_id, data.choice)

    @app.delete('/api/lab/trials')
    def clear_trials(request: Request):
        lab(request).clear()
        return {'ok': True}

    if frontend_dir and frontend_dir.is_dir():
        app.mount('/', StaticFiles(directory=frontend_dir, html=True), name='ui')
    return app
