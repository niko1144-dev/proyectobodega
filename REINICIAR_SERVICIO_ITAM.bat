@echo off
title REINICIAR SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo   REINICIANDO SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo.
net stop itam_chileatiende_server.exe
timeout /t 2 /nobreak > nul
net start itam_chileatiende_server.exe
echo.
echo ========================================================
echo  Servicio reiniciado con exito.
echo ========================================================
echo.
pause
