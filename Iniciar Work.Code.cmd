@echo off
title Work.Code - servidor de desarrollo
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo   ============================================
echo    Work.Code - Plataforma IDE Educativa
echo   ============================================
echo.
echo   Iniciando el servidor en http://localhost:3000
echo   El navegador se abrira automaticamente.
echo.
echo   Para DETENER el servidor: cierra esta ventana
echo   o presiona Ctrl+C.
echo.

start "" cmd /c "timeout /t 7 /nobreak >nul & start http://localhost:3000"
npm run dev
pause
