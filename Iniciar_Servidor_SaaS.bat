@echo off
title Servidor SaaS Agua Gestao + Tunel Seguro HTTPS
cd /d "%~dp0"
echo ========================================================
echo       SERVIDOR BACKEND SAAS - AGUA GESTAO (0.0.0.0:3000)
echo       + TUNEL SEGURO HTTPS: https://aguagestao-api.loca.lt
echo ========================================================
echo.
start "Tunel HTTPS Agua Gestao" node "%~dp0\scripts\tunnel.js"
cd /d "%~dp0\..\aqua-gestao-saas"
npx.cmd next dev -H 0.0.0.0 -p 3000
pause
