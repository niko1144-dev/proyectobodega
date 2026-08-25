# Sistema de Gestión de Activos TI (ITAM) — ChileAtiende / IPS

Sistema integral de administración, trazabilidad, recepción, asignación y reportería de activos informáticos e insumos para el **Instituto de Previsión Social (IPS) / ChileAtiende**.

---

## 📋 Requisitos Previos

- **Node.js** 18 o superior
- **npm** 9 o superior
- **PostgreSQL** 15+ (Local vía Homebrew/Postgres App o mediante Docker)
- **Git**

---

## 🚀 Guía de Instalación y Replicación en Casa

### 1. Clonar el Repositorio
```bash
git clone <URL_DEL_REPOSITORIO> "Bodega Final"
cd "Bodega Final"
```

### 2. Instalar Dependencias
```bash
# Instala dependencias del monorepo, backend y frontend
npm run install:all
```

---

### 3. Configurar Base de Datos PostgreSQL

#### Opción A: Levantar PostgreSQL con Docker (Fácil y Rápido)
```bash
docker compose up -d
```

#### Opción B: Usar PostgreSQL Local (Homebrew en Mac o Windows/Linux)
Asegúrate de que PostgreSQL esté corriendo:
```bash
# Iniciar servicio en Mac
brew services start postgresql@17
```

---

### 4. Configurar Variables de Entorno (`backend/.env`)

Copia el archivo de ejemplo o edita `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Verifica la variable `DATABASE_URL`:
```env
# Ejemplo con usuario local de tu computador:
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/itam_chileatiende?schema=public"

# Ejemplo Docker por defecto:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/itam_chileatiende?schema=public"
```

---

### 5. Replicar la Base de Datos con todos los Datos (1.827 Funcionarios AD + Activos)

#### Método 1: Restaurar el Backup SQL Completo (Recomendado ⭐)
Este método restaura la base de datos idéntica a la del trabajo, incluyendo los 1.827 funcionarios de Active Directory, sucursales, tipologías y registros:

```bash
# 1. Crear la base de datos si no existe
createdb itam_chileatiende

# 2. Restaurar el backup SQL exportado
psql -d itam_chileatiende < backend/prisma/backup_itam_chileatiende.sql
```

#### Método 2: Usar Prisma Push y Seed
```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

---

### 6. Iniciar el Sistema en Desarrollo

Puedes iniciar ambos servidores simultáneamente desde la carpeta raíz:

```bash
npm run dev
```

O en terminales separadas:

- **Terminal 1 - Backend API (Puerto 4000):**
  ```bash
  cd backend && npm run dev
  ```
- **Terminal 2 - Frontend App (Puerto 3000):**
  ```bash
  cd frontend && npm run dev
  ```

Abre tu navegador en: **`http://localhost:3000`**

---

## 🔑 Credenciales de Acceso Rápidas

| Rol / Perfil | Usuario / RUT | Contraseña |
| :--- | :--- | :--- |
| **Administrador DTI** | `admin.ti` / `15.678.901-2` | `admin123` |
| **Jefe de Bodega** | `jefe.bodega` / `12.345.678-5` | `bodega123` |
| **Técnico Soporte** | `soporte.ti` / `16.789.012-3` | `soporte123` |
| **Auditor / CGR** | `auditor.cgr` / `10.987.654-3` | `auditor123` |
| **Active Directory Real** | `ngalarceg.srv@chileatiende.cl` | `cha.2029` |

---

## 🛠 Estructura del Proyecto

```
├── docker-compose.yml              # Contenedor PostgreSQL 16
├── package.json                    # Scripts del Monorepo
├── .gitignore                      # Exclusiones de control de versiones
│
├── backend/                        # API REST Express + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma           # Modelos relacionales PostgreSQL
│   │   ├── seed.ts                 # Script de población de datos
│   │   └── backup_itam_chileatiende.sql # Backup SQL completo con 1.827 usuarios AD
│   ├── src/
│   │   ├── services/ldapService.ts # Conexión real con Active Directory cha.cl:389
│   │   ├── routes/                 # Endpoints REST (activos, actas, directorio, etc.)
│   │   └── utils/                  # Homologación de RUT y normalización de texto
│   └── package.json
│
└── frontend/                       # Aplicación Web React + Vite + Tailwind CSS
    ├── src/
    │   ├── api/client.ts           # Cliente HTTP Axios / Fetch
    │   ├── components/             # Dashboard, Recepción, Inventario, Asignaciones, Devoluciones
    │   ├── services/               # Generador de Actas PDF con QR y Firma Digital
    │   └── utils/                  # Formatters, validadores de RUT y normalización diacrítica
    └── package.json
```

---

## 📞 Soporte y Mesa de Ayuda

- **Correo de Soporte TI:** `soporteti@chileatiende.cl`
- **Anexo Mesa de Ayuda:** `8700`
