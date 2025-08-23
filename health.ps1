# health.ps1 — hızlı teşhis
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "== Sağlık Kontrolü ==" -ForegroundColor Cyan
if (-not (Test-Path $Backend)) { Write-Host "Eksik: backend" -ForegroundColor Red } else { Write-Host "OK: backend" -ForegroundColor Green }
if (-not (Test-Path $Frontend)) { Write-Host "Eksik: frontend" -ForegroundColor Red } else { Write-Host "OK: frontend" -ForegroundColor Green }

# API_BASE çevresi
Write-Host ("REACT_APP_API_BASE: " + ($env:REACT_APP_API_BASE ?? "<yok>"))
Write-Host "Tarayıcı: http://localhost:3000, Backend: http://127.0.0.1:8000"
