@echo off
setlocal enabledelayedexpansion
title SENTINAL APP LAUNCHER (ELECTRON)

REM Color Scheme (Cyan on Black)
color 0B

cls
echo.
echo  ========================================================================
echo  .d88888b. 88888888888     d8888 8888888b.  888    d8P  
echo d88P" "Y88b    888        d88888 888   Y88b 888   d8P   
echo Y88b.          888       d88P888 888    888 888  d8P    
echo  "Y888b.       888      d88P 888 888   d88P 888d88K     
echo     "Y88b.     888     d88P  888 8888888P"  8888888b    
echo       "888     888    d88P   888 888 T88b   888  Y88b   
echo Y88b  d88P     888   d8888888888 888  T88b  888   Y88b  
echo  "Y8888P"      888  d88P     888 888   T88b 888    Y88b 
echo.
echo         JASSIE INDUSTRIES ^| SYSTEM INTEGRITY CHECK
echo  ========================================================================
echo.

REM Check for Administrator rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [SYSTEM] WARNING: Running without admin privileges.
    echo [SYSTEM] Some protocols may be restricted.
    echo.
)

REM =====================
REM PHASE 0: PORT CLEANUP
REM =====================
echo [PHASE 0] Scanning Network Ports...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [SYSTEM] Detected zombie process on Port 3000.
    echo [SYSTEM] Initiating purge protocol...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
        echo [SYSTEM] Process %%a terminated.
    )
    timeout /t 2 /nobreak >nul
) else (
    echo [SYSTEM] Port 3000 is clear.
)
echo.

REM =====================
REM PHASE 1: OLLAMA CHECK
REM =====================
echo [PHASE 1] Initializing AI Core (Ollama)...

REM Find Ollama
set "OLLAMA_EXE=ollama"
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    if exist "C:\Program Files\Ollama\ollama.exe" set "OLLAMA_EXE=C:\Program Files\Ollama\ollama.exe"
)

REM Check availability
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [AI] Ollama server offline. Attempting launch...
    start "" "!OLLAMA_EXE!" serve
    
    echo [AI] Waiting for core systems...
    :wait_loop
    timeout /t 2 /nobreak >nul
    curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
    if !errorlevel! neq 0 goto wait_loop
    echo [AI] Connection established.
) else (
    echo [AI] Core systems online.
)
echo.

REM =====================
REM PHASE 2: MODEL SYNC
REM =====================
echo [PHASE 2] Verifying Neural Models...

set "MODELS=llama3.2 llava"

for %%m in (%MODELS%) do (
    echo [AI] Scanning for model: %%m...
    curl -s http://127.0.0.1:11434/api/tags ^| findstr /i "%%m" >nul
    if !errorlevel! neq 0 (
        echo [AI] Model missing. Downloading %%m [This may take time]...
        call "!OLLAMA_EXE!" pull %%m
        echo [AI] %%m installed successfully.
    ) else (
        echo [AI] %%m confirmed.
    )
)
echo.

REM =====================
REM PHASE 3: DEPENDENCIES
REM =====================
echo [PHASE 3] Checking Runtime Environment...

if not exist "node_modules\" (
    echo [NODE] First run detected. Installing libraries...
    call npm install
    if !errorlevel! neq 0 (
        echo [FATAL] Dependency installation failed.
        pause
        exit /b 1
    )
) else (
    echo [NODE] Libraries verified.
)
echo.

REM =====================
REM PHASE 4: LAUNCH
REM =====================
echo [PHASE 4] ACTIVATING JASSIE PROTOCOL...
echo.

echo [SYSTEM] Launching SENTINAL Core Server...
start "JASSIE SERVER" cmd /k node server.js

REM Wait for server to be ready
echo [SYSTEM] Connecting to Neural Network...
set "retries=0"
:wait_server
timeout /t 2 /nobreak >nul
set /a retries+=1
if %retries% geq 30 (
    echo [ERROR] Connection Timeout. Server did not respond.
    echo [TIP] Check the "JASSIE SERVER" window for error messages.
    pause
    exit /b 1
)
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 goto wait_server

echo [SYSTEM] Server Online. Initializing Interface...
start http://localhost:3000

echo.
echo [SYSTEM] Session initialized.
pause
