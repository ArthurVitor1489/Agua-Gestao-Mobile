@echo off
title Agua Gestao Mobile - Expo Server
cd /d "%~dp0"
echo ========================================================
echo       AGUA GESTAO MOBILE (EXPO ANDROID / WEB)
echo ========================================================
echo.
echo  Servidor Backend: http://192.168.1.71:3000/api
echo.
echo  - Pressione 'a' para abrir no Android Emulator
echo  - Pressione 'w' para abrir no Navegador Web
echo  - Ou escaneie o QR Code com o aplicativo Expo Go no celular!
echo ========================================================
echo.
npm.cmd start
pause
