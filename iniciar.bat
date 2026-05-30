@echo off
title Wasa Bot - Lanzador
echo.
echo ==========================================
echo    INICIANDO WASA BOT + API
echo ==========================================
echo.

if not exist ".env" (
    echo [ERROR] No se encontro el archivo .env. Ejecuta instalar.bat primero.
    pause
    exit /b 1
)

echo [INFO] Iniciando servicios...
echo [INFO] Recuerda abrir el Dashboard en el puerto 5500.
echo.

npm run start

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El proceso se cerro inesperadamente.
    pause
)
