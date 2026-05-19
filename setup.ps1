<#
.SYNOPSIS
    BookReady SaaS — first-run setup script.

.DESCRIPTION
    1. Scaffolds a fresh Laravel 11 skeleton in /api-skeleton
    2. Merges our custom BookReady source files on top (they win on conflict)
    3. Runs composer install, key:generate, migrate
    4. Scaffolds the Next.js 14 frontend in /web

.PREREQUISITES
    - PHP 8.2+ in PATH   (https://windows.php.net/download/)
    - Composer in PATH   (https://getcomposer.org/download/)
    - Node 20+ in PATH   (https://nodejs.org/)
    - MySQL 8 running with a 'bookready_central' database already created
    - Redis running on 127.0.0.1:6379

USAGE
    pwsh -ExecutionPolicy Bypass -File setup.ps1
#>

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Log($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# ── 1. Verify prerequisites ────────────────────────────────────────────────────
Log "Checking prerequisites..."

foreach ($cmd in @('php', 'composer', 'node', 'npm')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "$cmd not found in PATH. Please install it and retry."
        exit 1
    }
}

$phpVer = (php -r "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;")
if ([version]$phpVer -lt [version]'8.2') {
    Write-Error "PHP 8.2+ required. Found $phpVer."
    exit 1
}
Write-Host "PHP $phpVer OK" -ForegroundColor Green

# ── 2. Scaffold fresh Laravel 11 skeleton ────────────────────────────────────
$apiDir     = Join-Path $root 'api'
$skeletonDir = Join-Path $root 'api-skeleton'

Log "Creating fresh Laravel 11 skeleton in /api-skeleton..."
if (Test-Path $skeletonDir) {
    Remove-Item $skeletonDir -Recurse -Force
}

Push-Location $root
composer create-project laravel/laravel api-skeleton --prefer-dist --no-interaction
Pop-Location

# ── 3. Merge: skeleton first, then our custom files win ──────────────────────
Log "Merging BookReady custom files over Laravel skeleton..."

# Copy skeleton into /api (creates /api if it doesn't exist)
if (-not (Test-Path $apiDir)) {
    New-Item -ItemType Directory -Path $apiDir | Out-Null
}

# Skeleton files go first (don't overwrite what we already have)
Get-ChildItem $skeletonDir -Recurse -File | ForEach-Object {
    $rel  = $_.FullName.Substring($skeletonDir.Length + 1)
    $dest = Join-Path $apiDir $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    if (-not (Test-Path $dest)) {
        Copy-Item $_.FullName $dest
    }
}

# Remove the temp skeleton
Remove-Item $skeletonDir -Recurse -Force
Write-Host "Merged. Skeleton removed." -ForegroundColor Green

# ── 4. Install Composer dependencies ─────────────────────────────────────────
Log "Running composer install in /api..."
Push-Location $apiDir
composer install --no-interaction --prefer-dist
Pop-Location

# ── 5. Environment file ────────────────────────────────────────────────────────
Log "Configuring .env..."
$envFile    = Join-Path $apiDir '.env'
$envExample = Join-Path $apiDir '.env.example'

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "Copied .env.example -> .env" -ForegroundColor Green
    Write-Host ""
    Write-Host "ACTION REQUIRED: Open api/.env and set:" -ForegroundColor Yellow
    Write-Host "  DB_PASSWORD, STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter once you've filled in api/.env to continue..."
} else {
    Write-Host ".env already exists, skipping." -ForegroundColor Yellow
}

# ── 6. App key + storage link ─────────────────────────────────────────────────
Log "Generating app key and creating storage symlink..."
Push-Location $apiDir
php artisan key:generate --ansi
php artisan storage:link
Pop-Location

# ── 7. Central (landlord) migrations ──────────────────────────────────────────
Log "Running central database migrations..."
Push-Location $apiDir
php artisan migrate --force
Pop-Location

# ── 8. Next.js frontend ───────────────────────────────────────────────────────
$webDir = Join-Path $root 'web'
Log "Scaffolding Next.js 14 in /web..."

if (-not (Test-Path (Join-Path $webDir 'package.json'))) {
    Push-Location $root
    npx --yes create-next-app@14 web `
        --typescript `
        --tailwind `
        --eslint `
        --app `
        --src-dir `
        --import-alias "@/*" `
        --no-git
    Pop-Location
} else {
    Write-Host "/web already exists, skipping." -ForegroundColor Yellow
}

# ── Done ───────────────────────────────────────────────────────────────────────
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║  BookReady setup complete!                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Start the API:    cd api  && php artisan serve               ║
║  Start the UI:     cd web  && npm run dev                     ║
║                                                               ║
║  Create first tenant:                                         ║
║    POST http://localhost:8000/api/v1/auth/register            ║
║    { owner_name, email, password, password_confirmation,      ║
║      business_name, template:"the-fade-room" }                ║
║                                                               ║
║  Local wildcard DNS (add to C:\Windows\System32\drivers\etc\hosts):
║    127.0.0.1  bookready.test                                  ║
║    127.0.0.1  *.bookready.test  (needs Acrylic DNS or similar)
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
