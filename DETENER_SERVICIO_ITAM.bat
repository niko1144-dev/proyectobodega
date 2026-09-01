@echo off
title DETENER SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo   DETENIENDO SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo.
net stop itam_chileatiende_server.exe
echo.
echo ========================================================
echo  Servicio detenido.
echo ========================================================
echo.
pause
