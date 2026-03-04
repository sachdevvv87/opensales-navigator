# OpenSales Navigator - Stop Dev Environment
Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
docker compose -f docker-compose.dev.yml down
Write-Host "Done. Docker containers stopped." -ForegroundColor Green
Read-Host "Press Enter to exit"
