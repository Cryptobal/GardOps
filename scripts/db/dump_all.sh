#!/bin/bash
set -euo pipefail

# Script para realizar dumps de PostgreSQL (Neon)
# Uso: ./dump_all.sh [full|schema|data|all|globals]

# Configurar PATH para usar la versión correcta de pg_dump
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

# Verificar que pg_dump esté disponible
if ! command -v pg_dump >/dev/null 2>&1; then
    echo "❌ Error: pg_dump no está instalado."
    echo ""
    echo "📦 Instalación requerida:"
    echo ""
    echo "macOS:"
    echo "  brew install libpq"
    echo "  brew link --force libpq"
    echo ""
    echo "Linux (Debian/Ubuntu):"
    echo "  sudo apt-get install postgresql-client"
    echo ""
    echo "Linux (CentOS/RHEL):"
    echo "  sudo yum install postgresql"
    echo ""
    echo "Windows:"
    echo "  Descargar PostgreSQL desde https://www.postgresql.org/download/windows/"
    echo "  Asegúrate de incluir 'Command Line Tools' durante la instalación"
    echo ""
    exit 1
fi

# Verificar que se proporcione un modo
if [ $# -eq 0 ]; then
    echo "❌ Error: Debes especificar un modo."
    echo "Uso: $0 [full|schema|data|all|globals]"
    exit 1
fi

MODE=$1

# Crear directorio dumps si no existe
mkdir -p dumps

# Timestamp para los archivos
TS=$(date "+%Y%m%d_%H%M%S")

# Función para verificar variables de entorno
check_env_vars() {
    local required_vars=("PGHOST" "PGDATABASE" "PGUSER")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            echo "❌ Error: Variable de entorno $var no está definida"
            exit 1
        fi
    done
    
    # Verificar PGPASSWORD
    if [ -z "${PGPASSWORD:-}" ]; then
        echo "❌ Error: Variable de entorno PGPASSWORD no está definida"
        exit 1
    fi
}

# Función para realizar dump completo
dump_full() {
    echo "🔄 Realizando dump completo..."
    pg_dump -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -d "$PGDATABASE" \
        -f "dumps/backup_${TS}.sql"
    echo "✅ Dump completo guardado en: dumps/backup_${TS}.sql"
}

# Función para realizar dump de estructura
dump_schema() {
    echo "🔄 Realizando dump de estructura..."
    pg_dump -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -d "$PGDATABASE" \
        --schema-only -f "dumps/estructura_${TS}.sql"
    echo "✅ Dump de estructura guardado en: dumps/estructura_${TS}.sql"
}

# Función para realizar dump de datos
dump_data() {
    echo "🔄 Realizando dump de datos..."
    pg_dump -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -d "$PGDATABASE" \
        --data-only -f "dumps/data_${TS}.sql"
    echo "✅ Dump de datos guardado en: dumps/data_${TS}.sql"
}

# Función para realizar dump de globales
dump_globals() {
    echo "🔄 Realizando dump de globales..."
    if pg_dumpall -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" \
        --globals-only -f "dumps/globals_${TS}.sql" 2>/dev/null; then
        echo "✅ Dump de globales guardado en: dumps/globals_${TS}.sql"
    else
        echo "⚠️  Advertencia: No se pudo realizar dump de globales (posiblemente no permitido por el servidor)"
        rm -f "dumps/globals_${TS}.sql"
    fi
}

# Verificar variables de entorno
check_env_vars

# Procesar modo
case $MODE in
    "full")
        dump_full
        ;;
    "schema")
        dump_schema
        ;;
    "data")
        dump_data
        ;;
    "all")
        echo "🔄 Ejecutando todos los dumps..."
        dump_schema
        dump_data
        dump_full
        ;;
    "globals")
        dump_globals
        ;;
    *)
        echo "❌ Error: Modo '$MODE' no válido"
        echo "Modos válidos: full, schema, data, all, globals"
        exit 1
        ;;
esac

echo "🎉 Proceso completado exitosamente!"
