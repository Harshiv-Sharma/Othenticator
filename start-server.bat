@echo off

echo ========================================
echo  Othenticator Backend Server Setup
 ========================================

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if MongoDB is running
echo Checking MongoDB status...
tasklist /FI "IMAGENAME eq mongod.exe" 2>nul | find /i "mongod.exe" >nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] MongoDB does not appear to be running
    echo Attempting to start MongoDB service...
    net start MongoDB >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to start MongoDB service
        echo Please ensure MongoDB is installed and running
        echo Download from: https://www.mongodb.com/try/download/community
        pause
        exit /b 1
    )
    echo MongoDB service started successfully
)

:: Navigate to the backend directory
cd /d "%~dp0authenticator-backend"

:: Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy /Y .env.example .env >nul
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create .env file
        pause
        exit /b 1
    )
    echo Please edit the .env file with your configuration
)

:: Install dependencies
echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

:: Create logs directory if it doesn't exist
if not exist "logs" (
    mkdir logs
)

:: Start the server
echo.
echo Starting Othenticator Backend Server...
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo ========================================
echo.

set NODE_ENV=development
node server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server failed to start
    echo Check the logs in authenticator-backend/logs/ for more information
    pause
    exit /b 1
)
