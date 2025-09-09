# Sistema de Backups de PostgreSQL (Neon)

Este sistema permite realizar dumps completos de bases de datos PostgreSQL alojadas en Neon, incluyendo estructura, datos y configuraciones globales.

## 📋 Requisitos Previos

### Instalación de pg_dump

**macOS:**
```bash
brew install libpq
brew link --force libpq
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install postgresql-client
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install postgresql
```

**Windows:**
1. Descargar PostgreSQL desde [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Durante la instalación, asegúrate de incluir "Command Line Tools"
3. Alternativa con Chocolatey: `choco install postgresql`

## 🚀 Configuración

### 1. Crear archivo .env

Copia `.env.example` a `.env` y configura tus credenciales de Neon:

```bash
cp .env.example .env
```

Edita `.env` con tus datos reales:
```env
PGHOST=tu-host.neon.tech
PGPORT=5432
PGDATABASE=tu_base_de_datos
PGUSER=tu_usuario
PGPASSWORD=tu_password
PGSSLMODE=require
```

### 2. Instalar dependencias

```bash
npm install
```

## 📦 Comandos Disponibles

### macOS/Linux

```bash
# Dump completo (estructura + datos)
npm run dump:full

# Solo estructura (DDL)
npm run dump:schema

# Solo datos (DML)
npm run dump:data

# Todos los dumps (schema + data + full)
npm run dump:all

# Dump de globales (roles, configuraciones)
npm run dump:globals
```

### Windows

```bash
# Dump completo (estructura + datos)
npm run dump:full:win

# Solo estructura (DDL)
npm run dump:schema:win

# Solo datos (DML)
npm run dump:data:win

# Todos los dumps (schema + data + full)
npm run dump:all:win

# Dump de globales (roles, configuraciones)
npm run dump:globals:win
```

## 📁 Archivos Generados

Los dumps se guardan en el directorio `dumps/` con timestamps:

- `dumps/backup_YYYYMMDD_HHMMSS.sql` - Dump completo
- `dumps/estructura_YYYYMMDD_HHMMSS.sql` - Solo estructura
- `dumps/data_YYYYMMDD_HHMMSS.sql` - Solo datos
- `dumps/globals_YYYYMMDD_HHMMSS.sql` - Configuraciones globales

## 🔄 Restauración

Para restaurar un dump en una base de datos local o en otro servidor:

```bash
# Restaurar dump completo
psql -h localhost -U usuario -d db_destino -f dumps/backup_YYYYMMDD_HHMMSS.sql

# Restaurar solo estructura
psql -h localhost -U usuario -d db_destino -f dumps/estructura_YYYYMMDD_HHMMSS.sql

# Restaurar solo datos
psql -h localhost -U usuario -d db_destino -f dumps/data_YYYYMMDD_HHMMSS.sql
```

## 🐳 Alternativa con Docker

Si no quieres instalar pg_dump localmente, puedes usar Docker:

```bash
# Dump completo con Docker
docker run --rm \
  -e PGPASSWORD=$PGPASSWORD \
  -v "$PWD/dumps:/backup" \
  postgres:16 \
  pg_dump -h $PGHOST -p ${PGPORT:-5432} -U $PGUSER -d $PGDATABASE -f /backup/backup_$(date "+%Y%m%d_%H%M%S").sql
```

**Nota:** Requiere Docker Desktop activo.

## 🔧 Troubleshooting

### Error de autenticación
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que `PGSSLMODE=require` esté configurado para Neon

### Error de timeout
- Verifica tu conexión a internet
- Comprueba que el host de Neon esté accesible

### Error de permisos
- Verifica que tu usuario tenga permisos de lectura en la base de datos
- Para dumps de globales, algunos servidores pueden no permitirlo

### pg_dump no encontrado
- Sigue las instrucciones de instalación según tu sistema operativo
- En macOS, asegúrate de ejecutar `brew link --force libpq`

### Variables de entorno no definidas
- Verifica que el archivo `.env` exista y tenga todas las variables requeridas
- Asegúrate de que no haya espacios extra en las variables

## 📝 Notas Importantes

- **SSL**: Neon requiere SSL, por eso `PGSSLMODE=require` es obligatorio
- **Seguridad**: Nunca comitees el archivo `.env` con credenciales reales
- **Backups**: Los archivos de dump pueden ser grandes, considera comprimirlos
- **Automatización**: Puedes programar dumps automáticos con cron (Linux/macOS) o Task Scheduler (Windows)

## 🗂️ Estructura de Archivos

```
├── .env.example          # Plantilla de variables de entorno
├── scripts/db/
│   ├── dump_all.sh       # Script bash para macOS/Linux
│   └── dump_all.ps1      # Script PowerShell para Windows
├── dumps/                # Directorio donde se guardan los dumps
└── README_BACKUPS.md     # Esta documentación
```

## 🔒 Seguridad

- El archivo `.env` está en `.gitignore` para evitar commitear credenciales
- Los dumps contienen datos sensibles, mantén el directorio `dumps/` seguro
- Considera encriptar los archivos de dump si contienen información confidencial
