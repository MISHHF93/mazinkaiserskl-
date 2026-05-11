#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not (Test-Path (Join-Path $Root "backend\.venv"))) {
    Write-Error "Create backend\.venv and: pip install -e .\backend\[dev]"
}

$be = @"
cd /d `"$Root\backend`"
call .venv\Scripts\activate.bat
uvicorn mazinkaiser.main:app --reload --host 0.0.0.0 --port 8000
"@
$fe = @"
cd /d `"$Root\frontend`"
npm run dev
"@

Start-Process cmd.exe -ArgumentList @("/k", $be)
Start-Process cmd.exe -ArgumentList @("/k", $fe)
Write-Host "Started backend and frontend in separate windows."
