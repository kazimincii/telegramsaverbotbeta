# Quick Start Guide

Get up and running with Telegram Saver Bot in 5 minutes!

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://python.org/))
- **Telegram API Credentials** ([Get them here](https://my.telegram.org/apps))

## Option 1: Automated Setup (Recommended)

### Linux/macOS
```bash
# Clone the repository
git clone https://github.com/kazimincii/telegramsaverbotbeta.git
cd telegramsaverbotbeta

# Run setup script
chmod +x setup-dev.sh
./setup-dev.sh

# Edit backend/.env with your API credentials
nano backend/.env  # or use your favorite editor

# Start the app
./start-desktop.sh
```

### Windows
```cmd
REM Clone the repository
git clone https://github.com/kazimincii/telegramsaverbotbeta.git
cd telegramsaverbotbeta

REM Run setup script (coming soon - manual steps below)

REM Edit backend/.env with your API credentials
notepad backend\.env

REM Start the app
start-desktop.bat
```

## Option 2: Manual Setup

### Step 1: Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
cd ..
```

**Desktop:**
```bash
cd desktop
npm install
cd ..
```

### Step 2: Configure Environment

**Create backend/.env:**
```bash
cp backend/.env.example backend/.env
```

**Edit backend/.env and add your credentials:**
```env
API_ID=your_api_id
API_HASH=your_api_hash
```

Get these from: https://my.telegram.org/apps

### Step 3: Start the Application

**Linux/macOS:**
```bash
chmod +x start-desktop.sh
./start-desktop.sh
```

**Windows:**
```cmd
start-desktop.bat
```

The desktop app will:
1. Start the Python backend (port 8000)
2. Start the React frontend (port 3000)
3. Launch the Electron window

## Building for Production

### Generate Icons (Optional but Recommended)

**Linux/macOS:**
```bash
cd desktop/resources
chmod +x generate-icons.sh
./generate-icons.sh
```

**Windows:**
```cmd
cd desktop\resources
generate-icons.bat
```

### Build Desktop App

**For your platform:**
```bash
cd desktop
npm run build
```

**For specific platforms:**
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

**Output location:** `desktop/dist/`

## Common Issues

### Port Already in Use

If port 8000 or 3000 is already in use:

**Kill processes:**
```bash
# Linux/macOS
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Python Dependencies Failed

Make sure you have Python 3.11+:
```bash
python3 --version
```

Upgrade pip:
```bash
pip3 install --upgrade pip
```

### Node Dependencies Failed

Clear npm cache:
```bash
npm cache clean --force
```

Remove node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Backend Won't Start

Check Python path in desktop/main.js:
```javascript
pythonCommand: process.platform === 'win32' ? 'python' : 'python3'
```

Test backend manually:
```bash
cd backend
python3 main.py
# Should see: "Uvicorn running on http://0.0.0.0:8000"
```

## Development Mode

Run each component separately for development:

**Terminal 1 - Backend:**
```bash
cd backend
python3 main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Desktop:**
```bash
cd desktop
npm start
```

## Cleaning Up

Remove all build artifacts and dependencies:

```bash
chmod +x clean-all.sh
./clean-all.sh
```

Then reinstall with `setup-dev.sh`

## Next Steps

1. **Read the full documentation:** `README.md`
2. **Desktop app guide:** `DESKTOP_APP_GUIDE.md`
3. **Release notes:** `RELEASE_NOTES.md`
4. **Configure features:** Edit `backend/.env`

## Getting Help

- **Issues:** https://github.com/kazimincii/telegramsaverbotbeta/issues
- **Documentation:** See `README.md`
- **Desktop Menu:** Help → Documentation (in the app)

## Feature Checklist

After setup, you can use:

- ✅ Telegram media download
- ✅ Multi-account support
- ✅ 8 language support
- ✅ Plugin system
- ✅ Cloud storage sync
- ✅ Auto-updates (production builds)
- ✅ Analytics (if enabled)
- ✅ Crash reporting
- ✅ Advanced logging

Enjoy using Telegram Saver Bot! 🎉
