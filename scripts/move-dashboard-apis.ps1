# PowerShell script to move dashboard APIs to /api/dashboard/

$apiRoot = "src/app/api"
$dashboardApiRoot = "src/app/api/dashboard"

# Folders to move to dashboard
$foldersToMove = @(
    "menu",
    "orders",
    "tables",
    "tax",
    "station",
    "printer",
    "prep-zone",
    "events",
    "modifiers",
    "modifier-groups",
    "modifier-items",
    "reports",
    "settings",
    "users",
    "outlets"
)

Write-Host "Moving dashboard API folders..." -ForegroundColor Green

foreach ($folder in $foldersToMove) {
    $sourcePath = Join-Path $apiRoot $folder
    $destPath = Join-Path $dashboardApiRoot $folder
    
    if (Test-Path $sourcePath) {
        Write-Host "Moving $folder..." -ForegroundColor Yellow
        if (Test-Path $destPath) {
            Write-Host "  Warning: $destPath already exists, skipping..." -ForegroundColor Red
        } else {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
            Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force
            Write-Host "  ✓ Moved $folder" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠ $folder not found, skipping..." -ForegroundColor Yellow
    }
}

Write-Host "`nDone! Now update frontend API calls and remove old folders." -ForegroundColor Green

