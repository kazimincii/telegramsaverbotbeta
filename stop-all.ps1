Get-Process uvicorn,python,python3 -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host 'Durduruldu.'
