@echo off
title INICIAR SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo   INICIANDO SERVICIO WINDOWS ITAM CHILEATIENDE
echo ========================================================
echo.
net start itam_chileatiende_server.exe
echo.
echo ========================================================
echo  Servicio iniciado en segundo plano.
echo  Accesos:
echo   - HTTPS: https://10.66.20.19
echo   - HTTP:  http://10.66.20.19
echo   - API:   http://localhost:4000
echo ========================================================
echo.
pause
