from pathlib import Path
import secrets
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from .models import Archive, ClaimInput, CorrectionInput, QueryInput, ReviewInput, SourceInput
from .store import DomainError, Store
from .lab import Lab, SCENARIOS, TrialInput, AnswerInput


def create_app(data_dir: Path, frontend_dir: Path | None = None, test_mode=False):
    app = FastAPI(title='Self Hoard', docs_url=None, redoc_url=None, openapi_url=None)
    stores = {'personal': Store(data_dir / 'personal.sqlite3'), 'demo': Store(data_dir / 'demo.sqlite3')}
    labs = {space: Lab(data_dir / f'lab-{space}.sqlite3') for space in stores}
    sessions: set[str] = set()

    def store(request: Request):
        space = request.headers.get('X-Hoard-Space', 'personal')
        if space not in stores:
            raise DomainError('invalid_space')
        return stores[space]

    def lab(request: Request):
        store(request)
        return labs[request.headers.get('X-Hoard-Space', 'personal')]

    @app.exception_handler(DomainError)
    async def domain_error(request, exc):
        return JSONResponse({'error': exc.code}, status_code=exc.status)

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

    @app.post('/api/sources')
    def source(data: SourceInput, request: Request):
        return store(request).add_source(data)

    @app.post('/api/claims')
    def claim(data: ClaimInput, request: Request):
        return store(request).add_claim(data)

    @app.post('/api/claims/{claim_id}/review')
    def review(claim_id: str, data: ReviewInput, request: Request):
        return store(request).review(claim_id, data.state)

    @app.post('/api/claims/{claim_id}/correct')
    def correct(claim_id: str, data: CorrectionInput, request: Request):
        return store(request).review(claim_id, 'rejected', data.reason)

    @app.get('/api/sources/{source_id}/deletion')
    def deletion(source_id: str, request: Request):
        return store(request).delete_source(source_id, dry_run=True)

    @app.delete('/api/sources/{source_id}')
    def remove_source(source_id: str, request: Request):
        return store(request).delete_source(source_id)

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
