@echo off

echo ========================================
echo  Starting Othenticator Backend Server
echo ========================================

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist "authenticator-backend\.env" (
    echo Creating .env file...
    copy /Y "authenticator-backend\.env.example" "authenticator-backend\.env"
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create .env file. Please create it manually from .env.example
        pause
        exit /b 1
    )
)

echo Starting MongoDB service...
net start MongoDB >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo MongoDB service is not running. Starting it now...
    net start MongoDB
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to start MongoDB. Please make sure MongoDB is installed and running.
        pause
        exit /b 1
    )
)

cd authenticator-backend

echo Installing dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo Starting backend server...
node server.js

pause
