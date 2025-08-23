# start_all.ps1  — tek tıkla başlat / tam otomasyon (Windows PowerShell)
# Bu dosyayı projenin köküne koy (yanında backend ve frontend olmalı)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Telegram Archiver — Starter"

# ---- Yol ayarları
$Root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend   = Join-Path $Root "backend"
$Frontend  = Join-Path $Root "frontend"
$Venv      = Join-Path $Backend ".venv"
$PyExe     = ""
$Now       = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")

# ---- Yardımcılar
function Find-Python {
  $candidates = @(
    "python", "py -3.11", "py -3.10", "py -3",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
    "C:\Program Files\Python311\python.exe",
    "C:\Program Files\Python310\python.exe"
  )
  foreach ($c in $candidates) {
    try {
      $v = & $c --version 2>$null
      if ($LASTEXITCODE -eq 0) { return $c }
    } catch {}
  }
  return $null
}

function Start-Window($title, $workdir, $command) {
  $ps = "powershell.exe"
  $args = @("-NoExit","-ExecutionPolicy","Bypass","-Command",$command)
  Start-Process -FilePath $ps -WorkingDirectory $workdir -ArgumentList $args -WindowStyle Normal
}

function Say($msg) { Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan }

# ---- Ön kontrol
if (-not (Test-Path $Backend) -or -not (Test-Path $Frontend)) {
  Write-Host "`nHATA: Bu betik projenin kökünde koşmalı. Klasörlerde 'backend' ve 'frontend' olmalı." -ForegroundColor Red
  Write-Host "Örn: C:\Users\Administrator\Desktop\telegram-bot-telethon\start_all.ps1"
  exit 1
}

# ---- Python bul / venv
Say "Python aranıyor…"
$PyExe = Find-Python
if (-not $PyExe) {
  Write-Host "Python bulunamadı. Microsoft Store ya da python.org'dan 3.11 kur ve tekrar çalıştır." -ForegroundColor Yellow
  exit 1
}
Say "Python: $PyExe"

if (-not (Test-Path $Venv)) {
  Say "Venv oluşturuluyor…"
  & $PyExe -m venv $Venv
}
# pip güncelle + gereksinimler
Say "Python paketleri kuruluyor (backend)…"
& "$Venv\Scripts\python.exe" -m pip install --upgrade pip > $null
if (Test-Path "$Backend\requirements.txt") {
  & "$Venv\Scripts\python.exe" -m pip install -r "$Backend\requirements.txt"
} else {
  # Emniyet için temel paketler
  & "$Venv\Scripts\python.exe" -m pip install fastapi "uvicorn[standard]" telethon qrcode[pil] pydantic
}

# ---- İlk oturum kontrolü
$SessionName = "tg_media"
try {
  $cfgPath = Join-Path $Backend "config.json"
  if (Test-Path $cfgPath) {
    $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
    if ($cfg.session) { $SessionName = $cfg.session }
  }
} catch {}
$SessionFile = Join-Path $Backend "$SessionName.session"

if (-not (Test-Path $SessionFile)) {
  Say "Telegram oturumu yok. Giriş için ayrı pencere açılıyor (login_once.py)…"
  $loginCmd = "& `"$Venv\Scripts\python.exe`" `"login_once.py`""
  Start-Window "Administrator: login_once" $Backend $loginCmd
  Start-Sleep -Seconds 3
  Write-Host "`n>>> Telefon numaran ve Telegram kodu istenecek. Giriş tamamlanınca bu pencereyi kapatıp tekrar 'start_all.ps1' çalıştırabilirsin." -ForegroundColor Yellow
}

# ---- Backend'i başlat
Say "Backend başlatılıyor (FastAPI / Uvicorn)…"
$uvicornCmd = "& `"$Venv\Scripts\python.exe`" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
Start-Window "Administrator: backend" $Backend $uvicornCmd

# ---- Frontend'i başlat
Say "Frontend bağımlılıkları yükleniyor (npm)…"
if (-not (Test-Path (Join-Path $Frontend "package.json"))) {
  Write-Host "HATA: frontend/package.json bulunamadı. Frontend kaynakları eksik." -ForegroundColor Red
  exit 1
}
# REACT_APP_API_BASE backend’i doğru göstersin
$env:REACT_APP_API_BASE = "http://127.0.0.1:8000"
$npmInstall = "npm install"
$npmStart   = "`$env:REACT_APP_API_BASE='http://127.0.0.1:8000'; npm start"
Start-Window "Administrator: frontend" $Frontend $npmStart

# ---- Tarayıcıyı aç
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Say "Hepsi tamam. Açılan iki terminal penceresinde logları görebilirsin."
