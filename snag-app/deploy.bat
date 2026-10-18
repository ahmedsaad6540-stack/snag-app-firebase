@echo off
chcp 65001 >nul
echo ========================================================
echo   Smart Mall OS - Build ^& Firebase Hosting Deployment
echo ========================================================
cd /d "%~dp0"

echo [1/3] Building production bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Build failed!
  pause
  exit /b %ERRORLEVEL%
)

echo [2/3] Checking Firebase authentication...
call npx --yes firebase-tools projects:list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Opening browser for one-time Firebase Login...
  call npx --yes firebase-tools login
)

echo [3/3] Deploying to Firebase Hosting (studio-8880425692-c7045)...
call npx --yes firebase-tools deploy --only hosting
echo.
echo ========================================================
echo   Deployment Complete: https://studio-8880425692-c7045.web.app/
echo ========================================================
pause
