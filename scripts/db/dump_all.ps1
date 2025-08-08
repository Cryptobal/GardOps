# Script PowerShell para realizar dumps de PostgreSQL (Neon)
# Uso: .\dump_all.ps1 -Mode [full|schema|data|all|globals]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("full", "schema", "data", "all", "globals")]
    [string]$Mode
)

# Función para escribir mensajes con colores
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Verificar que pg_dump esté disponible
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-ColorMessage "❌ Error: pg_dump no está instalado." "Red"
    Write-ColorMessage ""
    Write-ColorMessage "📦 Instalación requerida:" "Yellow"
    Write-ColorMessage ""
    Write-ColorMessage "Windows:" "Cyan"
    Write-ColorMessage "  Descargar PostgreSQL desde https://www.postgresql.org/download/windows/" "White"
    Write-ColorMessage "  Asegúrate de incluir 'Command Line Tools' durante la instalación" "White"
    Write-ColorMessage ""
    Write-ColorMessage "Alternativa con Chocolatey:" "Cyan"
    Write-ColorMessage "  choco install postgresql" "White"
    Write-ColorMessage ""
    exit 1
}

# Crear directorio dumps si no existe
if (-not (Test-Path "dumps")) {
    New-Item -ItemType Directory -Path "dumps" | Out-Null
}

# Timestamp para los archivos
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

# Función para verificar variables de entorno
function Test-EnvVars {
    $requiredVars = @("PGHOST", "PGDATABASE", "PGUSER")
    
    foreach ($var in $requiredVars) {
        if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($var))) {
            Write-ColorMessage "❌ Error: Variable de entorno $var no está definida" "Red"
            exit 1
        }
    }
    
    # Verificar PGPASSWORD
    if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable("PGPASSWORD"))) {
        Write-ColorMessage "❌ Error: Variable de entorno PGPASSWORD no está definida" "Red"
        exit 1
    }
}

# Función para realizar dump completo
function Dump-Full {
    Write-ColorMessage "🔄 Realizando dump completo..." "Yellow"
    $outputFile = "dumps/backup_${ts}.sql"
    
    $env:PGPASSWORD = [Environment]::GetEnvironmentVariable("PGPASSWORD")
    pg_dump -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -f $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "✅ Dump completo guardado en: $outputFile" "Green"
    } else {
        Write-ColorMessage "❌ Error al realizar dump completo" "Red"
        exit 1
    }
}

# Función para realizar dump de estructura
function Dump-Schema {
    Write-ColorMessage "🔄 Realizando dump de estructura..." "Yellow"
    $outputFile = "dumps/estructura_${ts}.sql"
    
    $env:PGPASSWORD = [Environment]::GetEnvironmentVariable("PGPASSWORD")
    pg_dump -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE --schema-only -f $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "✅ Dump de estructura guardado en: $outputFile" "Green"
    } else {
        Write-ColorMessage "❌ Error al realizar dump de estructura" "Red"
        exit 1
    }
}

# Función para realizar dump de datos
function Dump-Data {
    Write-ColorMessage "🔄 Realizando dump de datos..." "Yellow"
    $outputFile = "dumps/data_${ts}.sql"
    
    $env:PGPASSWORD = [Environment]::GetEnvironmentVariable("PGPASSWORD")
    pg_dump -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE --data-only -f $outputFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "✅ Dump de datos guardado en: $outputFile" "Green"
    } else {
        Write-ColorMessage "❌ Error al realizar dump de datos" "Red"
        exit 1
    }
}

# Función para realizar dump de globales
function Dump-Globals {
    Write-ColorMessage "🔄 Realizando dump de globales..." "Yellow"
    $outputFile = "dumps/globals_${ts}.sql"
    
    $env:PGPASSWORD = [Environment]::GetEnvironmentVariable("PGPASSWORD")
    pg_dumpall -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER --globals-only -f $outputFile 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "✅ Dump de globales guardado en: $outputFile" "Green"
    } else {
        Write-ColorMessage "⚠️  Advertencia: No se pudo realizar dump de globales (posiblemente no permitido por el servidor)" "Yellow"
        if (Test-Path $outputFile) {
            Remove-Item $outputFile
        }
    }
}

# Verificar variables de entorno
Test-EnvVars

# Procesar modo
switch ($Mode) {
    "full" {
        Dump-Full
    }
    "schema" {
        Dump-Schema
    }
    "data" {
        Dump-Data
    }
    "all" {
        Write-ColorMessage "🔄 Ejecutando todos los dumps..." "Yellow"
        Dump-Schema
        Dump-Data
        Dump-Full
    }
    "globals" {
        Dump-Globals
    }
    default {
        Write-ColorMessage "❌ Error: Modo '$Mode' no válido" "Red"
        Write-ColorMessage "Modos válidos: full, schema, data, all, globals" "White"
        exit 1
    }
}

Write-ColorMessage "🎉 Proceso completado exitosamente!" "Green"
