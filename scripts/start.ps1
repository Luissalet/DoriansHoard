param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
$dataPath = Join-Path $projectRoot 'data'
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath $pythonPath)) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ is required.' }
    & $pythonPath -m pip install -r requirements-lock.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend\dist\index.html'))) {
    Push-Location (Join-Path $projectRoot 'frontend')
    try {
        npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'UI installation failed.' }
        npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'UI build failed.' }
    } finally { Pop-Location }
}
$existing = $false
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8741/api/session' -TimeoutSec 2
    $existing = $health.mode -eq 'local' -and $health.version -eq '0.1.0'
} catch {}
if (-not $existing) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    $process = Start-Process -FilePath $pythonPath -ArgumentList @('-m','selfhoard') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log')
    $process.Id | Set-Content -LiteralPath (Join-Path $dataPath 'server.pid')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8741/api/session' -TimeoutSec 1
            if ($health.mode -eq 'local') { $ready = $true; break }
        } catch {}
        if ($process.HasExited) { throw 'Self Hoard could not start. See data/server-error.log.' }
    }
    if (-not $ready) { throw 'Self Hoard did not respond. See data/server-error.log.' }
}
if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:8741' -WindowStyle Hidden }
