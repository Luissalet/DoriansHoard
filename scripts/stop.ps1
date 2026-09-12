$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot 'data\server.pid'
if (Test-Path -LiteralPath $pidFile) {
    $serverProcessId = [int](Get-Content -LiteralPath $pidFile)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
    $expectedPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
    if ($process -and $process.ExecutablePath -eq $expectedPath -and $process.CommandLine -match '-m selfhoard') {
        Stop-Process -Id $serverProcessId
    }
    Remove-Item -LiteralPath $pidFile
}
