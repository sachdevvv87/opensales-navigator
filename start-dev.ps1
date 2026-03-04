# OpenSales Navigator - One-Click Dev Starter
# Run this file to start the full app locally with Docker
# Right-click -> "Run with PowerShell"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenSales Navigator - Starting Up" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start Docker infrastructure
Write-Host "[1/5] Starting Docker (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker compose -f docker-compose.dev.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker failed. Make sure Docker Desktop is running." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  Docker containers started." -ForegroundColor Green

# Step 2: Wait for PostgreSQL to be ready
Write-Host "[2/5] Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "  Database ready." -ForegroundColor Green

# Step 3: Install dependencies
Write-Host "[3/5] Installing dependencies (first time takes 2-3 min)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pnpm install failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green

# Step 4: Set up database schema + seed data
Write-Host "[4/5] Setting up database and loading demo data..." -ForegroundColor Yellow
pnpm --filter @opensales/database db:generate
pnpm --filter @opensales/database exec prisma db push --skip-generate --accept-data-loss
pnpm --filter @opensales/database exec tsx src/seed.ts
Write-Host "  Database ready with demo data." -ForegroundColor Green

# Step 5: Start the apps in separate windows
Write-Host "[5/5] Starting API and Web servers..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm --filter @opensales/api dev" -WindowStyle Normal
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm --filter @opensales/web dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  App is starting up!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Web App:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:      http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "  Login with:" -ForegroundColor White
Write-Host "    Email:    admin@acme.com" -ForegroundColor Cyan
Write-Host "    Password: password123" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Wait ~30 seconds for the servers to fully start," -ForegroundColor Gray
Write-Host "  then open http://localhost:3000 in your browser." -ForegroundColor Gray
Write-Host ""

# Open browser after a delay
Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"

Read-Host "Press Enter to exit this window (servers keep running)"
