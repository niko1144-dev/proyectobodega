# Reglas y Autorización de Ejecución — ITAM ChileAtiende

## Autorización de Comandos y Herramientas
- El agente cuenta con autorización total para ejecutar comandos de consola (PowerShell / terminal), scripts de Node.js, comandos de Prisma ORM, compilaciones (`npm run build`), pruebas y manipulación de archivos necesarios para el desarrollo, mantenimiento y despliegue del proyecto.
- Ejecutar las tareas de forma autónoma sin requerir confirmaciones adicionales para comandos estándar del proyecto (npm, node, npx, tsc, prisma, psql, git).

## Entorno del Servidor
- **Sistema Operativo:** Windows
- **Base de Datos:** PostgreSQL 17 local (`localhost:5432`, servicio `postgresql-x64-17`)
- **Backend API:** Node.js / Express en puerto 4000
- **Frontend:** React + Vite / SPA servida en puerto 4000 (o 3000 en desarrollo)
