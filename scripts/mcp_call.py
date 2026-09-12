"""One real MCP stdio session for diagnostics and E2E tests. JSON request on stdin.

Use SELFHOARD_TOKEN / SELFHOARD_URL or --credential-file. Never print credentials.
The MCP server is a distinct subprocess; discovery and tool calls use the official SDK.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
import sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--credential-file', type=Path)
    args=parser.parse_args()
    request=json.load(sys.stdin)
    server=Path(__file__).resolve().parents[1]/'selfhoard'/'mcp_server.py'
    launch=[str(server)]
    if args.credential_file:
        launch.extend(['--credential-file',str(args.credential_file.resolve())])
    parameters=StdioServerParameters(command=sys.executable,args=launch,env={
        'SELFHOARD_URL':os.environ.get('SELFHOARD_URL','http://127.0.0.1:8741'),
        'SELFHOARD_TOKEN':os.environ.get('SELFHOARD_TOKEN','')})
    async with stdio_client(parameters) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            if request.get('tool')=='__list_tools__':
                result=(await session.list_tools()).model_dump(mode='json')
            else:
                result=(await session.call_tool(request['tool'],request.get('arguments',{}))).model_dump(mode='json')
            print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':
    sys.stdin.reconfigure(encoding='utf-8-sig')
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(main())
