@echo off
title Instalacion de Wasa Bot
echo.
echo ==========================================
echo    INSTALACION DE WASA BOT (SOPORTE)
echo ==========================================
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Por favor instalalo.
    pause
    exit /b 1
)

:: Crear .env si no existe
if not exist ".env" (
    echo [INFO] Creando archivo .env...
    copy ".env.example" ".env" >nul
    echo [INFO] Abriendo .env para configuracion...
    timeout /t 2 >nul
    notepad ".env"
    echo.
    echo Una vez guardado el .env, presiona una tecla para continuar...
    pause >nul
)

:: Instalando BOT
echo [1/3] Instalando dependencias del Bot...
cd bot
call npm install
cd ..

:: Instalando API
echo [2/3] Instalando dependencias de la API...
cd api
call npm install
cd ..

:: Instalando Herramientas Raiz
echo [3/3] Instalando herramientas de ejecucion...
call npm install
echo.

echo ==========================================
echo    INSTALACION COMPLETADA
echo ==========================================
echo.
echo Para iniciar el bot usa: iniciar.bat
echo.
pause
