"""Owner-invoked local Codex setup. No secret appears on the command line or stdout.

Creates a 30-day personal connection with context.read + updates.write only.
Existing credentials/configurations are never silently replaced or reauthorized.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import httpx


def main():
    root=Path(__file__).resolve().parents[1]
    credential=root/'data'/'agent-clients'/'codex.json'
    codex=shutil.which('codex')
    if not codex:
        raise SystemExit('Codex CLI was not found. Use the MCP configuration download in the app.')
    flags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0
    existing=subprocess.run([codex,'mcp','get','selfhoard','--json'],capture_output=True,creationflags=flags)
    if existing.returncode==0 or credential.exists():
        raise SystemExit('A Self Hoard connection already exists. Inspect it in Codex and the app; setup does not replace it.')
    with httpx.Client(base_url='http://127.0.0.1:8741',trust_env=False,timeout=10) as owner:
        owner.get('/api/session').raise_for_status()
        owner.headers.update({'X-Hoard-Request':'1','X-Hoard-Space':'personal'})
        previous_enabled=owner.get('/api/agents').json()['enabled']
        result=owner.post('/api/agents/grants',json={'name':'Codex personal','scopes':['context.read','updates.write'],'days':30})
        result.raise_for_status(); grant=result.json()
        try:
            credential.parent.mkdir(parents=True,exist_ok=True)
            # Restrict the folder before writing any secret, on Windows.
            if os.name=='nt':
                identity=subprocess.run(['whoami','/user','/fo','csv','/nh'],capture_output=True,text=True,check=True,creationflags=flags)
                import csv
                sid=next(csv.reader([identity.stdout.strip()]))[1]
                subprocess.run(['icacls',str(credential.parent),'/inheritance:r','/grant:r',f'*{sid}:(OI)(CI)F'],capture_output=True,check=True,creationflags=flags)
            credential.write_text(json.dumps({'url':'http://127.0.0.1:8741','token':grant['token'],'grant_id':grant['id']},indent=2),encoding='utf-8')
            if os.name!='nt':
                credential.chmod(0o600)
            owner.post('/api/agents/switch',json={'enabled':True}).raise_for_status()
            subprocess.run([codex,'mcp','add','selfhoard','--',sys.executable,str(root/'selfhoard'/'mcp_server.py'),
                            '--credential-file',str(credential)],capture_output=True,check=True,creationflags=flags)
        except Exception:
            owner.delete('/api/agents/grants/'+grant['id'])
            owner.post('/api/agents/switch',json={'enabled':previous_enabled})
            credential.unlink(missing_ok=True)
            raise
    print('Self Hoard registered in Codex: context reading and reviewed updates, expires '+grant['expires_at']+'.')
    print('Reload the MCP connection or restart Codex to load its tools. Revoke it from AI connections at any time.')


if __name__=='__main__':
    main()
