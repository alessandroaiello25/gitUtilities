@echo off
echo Installing dependencies for backend...
call npm install || exit /b 1

echo Installing dependencies for Angular frontend...
cd client
call npm install || exit /b 1

cd ..

echo Starting Node.js server...
start cmd /k "node server.js"

cd client
echo Starting Angular frontend...
start cmd /k "ng serve"

:: Wait for Angular to be ready
echo Waiting for Angular to start...
:loop
timeout /t 5 /nobreak >nul
curl --silent --head http://localhost:4200 >nul
if errorlevel 1 goto loop

echo Angular is ready. Starting Electron...
start cmd /k "npm run electron:serve"

echo All processes started successfully!
pause
exit
