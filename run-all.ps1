param([switch]$NoFrontend)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root/logs" | Out-Null
function Py() { (Get-Command py.exe -ErrorAction SilentlyContinue)?.Source ?? (Get-Command python.exe -ErrorAction Stop).Source }
$py = Py
if(!(Test-Path "$root/.venv/Scripts/python.exe")) { & $py -m venv "$root/.venv" }
$venv = "$root/.venv/Scripts/python.exe"
& $venv -m pip install --upgrade pip wheel
if(Test-Path "$root/backend/requirements.txt") { & $venv -m pip install -r "$root/backend/requirements.txt" } else { & $venv -m pip install fastapi uvicorn[standard] telethon qrcode[pil] python-dotenv }
& $venv -m backend.doctor --fix | Tee-Object -FilePath "$root/logs/doctor.log"
$backLog = "$root/logs/backend.log"
if(Test-Path $backLog){ Remove-Item $backLog -Force }
Start-Process -FilePath $venv -ArgumentList @('-m','uvicorn','backend.main:app','--host','0.0.0.0','--port','8000','--log-level','info') -RedirectStandardOutput $backLog -RedirectStandardError $backLog
if(-not $NoFrontend -and (Test-Path "$root/frontend/package.json")){
  $frontLog = "$root/logs/frontend.log"
  Push-Location "$root/frontend"
  if(!(Test-Path 'node_modules')){ npm install }
  Start-Process powershell -ArgumentList "-NoExit","-Command","`$env:REACT_APP_API_BASE='http://127.0.0.1:8000'; npm start 2>&1 | Tee-Object -FilePath '$frontLog'" | Out-Null
  Pop-Location
}
Start-Process "http://127.0.0.1:3000" -ErrorAction SilentlyContinue
Start-Process "http://127.0.0.1:8000/docs" -ErrorAction SilentlyContinue
Write-Host "`nBaslatildi. Loglar: logs\doctor.log, logs\backend.log, logs\frontend.log"
