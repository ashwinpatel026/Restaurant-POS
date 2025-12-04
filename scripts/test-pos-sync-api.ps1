# POS Location Sync API Test Script (PowerShell)
# Usage: .\test-pos-sync-api.ps1 -StoreCode "LOC001" -ApiKey "api_key_123"

param(
    [string]$StoreCode = "LOC001",
    [string]$ApiKey = "api_key_123",
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "POS Location Sync API Test Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Store Code: $StoreCode"
Write-Host "Base URL: $BaseUrl"
Write-Host ""

# Test function
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = $null,
        [string]$Description
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "Endpoint: $Method $Endpoint"
    
    $headers = @{
        "x-api-key"    = $ApiKey
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Data) {
            $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" `
                -Method $Method `
                -Headers $headers `
                -Body $Data `
                -ErrorAction Stop
        }
        else {
            $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" `
                -Method $Method `
                -Headers $headers `
                -ErrorAction Stop
        }
        
        Write-Host "✓ Success" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 5
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "✗ Failed (HTTP $statusCode)" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
    Write-Host ""
}

# 1. Authentication Tests
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Authentication Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode" `
    -Description "Valid API Key Authentication"

# Test invalid API key
Write-Host "Testing: Invalid API Key" -ForegroundColor Yellow
try {
    $invalidHeaders = @{
        "x-api-key"    = "invalid_key"
        "Content-Type" = "application/json"
    }
    Invoke-RestMethod -Uri "$BaseUrl/api/pos/sync/location/$StoreCode" `
        -Method "GET" `
        -Headers $invalidHeaders `
        -ErrorAction Stop
    Write-Host "✗ Should have been rejected" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✓ Correctly rejected invalid API key" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Unexpected error" -ForegroundColor Red
    }
}
Write-Host ""

# 2. Location Info Tests
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "2. Location Information Sync Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode" `
    -Description "GET Location Info"

$updateData = @{
    phone = "+1987654321"
    email = "test@example.com"
} | ConvertTo-Json

Test-Endpoint -Method "POST" `
    -Endpoint "/api/pos/sync/location/$StoreCode" `
    -Data $updateData `
    -Description "POST Location Update"

# 3. Comprehensive Data Sync Tests
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "3. Comprehensive Store Data Sync Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode/data" `
    -Description "GET All Store Data (Full Sync)"

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode/data?incremental=true&lastSyncAt=2024-01-01T00:00:00Z" `
    -Description "GET All Store Data (Incremental Sync)"

$bulkData = @{
    data             = @{
        menu_items = @(
            @{
                menuItemCode = "TEST001"
                name         = "Test Item"
                cashPrice    = 9.99
                cardPrice    = 10.99
                isActive     = 1
                storeCode    = $StoreCode
            }
        )
    }
    conflictStrategy = "last-write-wins"
} | ConvertTo-Json -Depth 5

Test-Endpoint -Method "POST" `
    -Endpoint "/api/pos/sync/location/$StoreCode/data" `
    -Data $bulkData `
    -Description "POST Bulk Data Update"

# 4. Table-Specific Sync Tests
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "4. Table-Specific Sync Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode/menu_items" `
    -Description "GET Menu Items"

Test-Endpoint -Method "GET" `
    -Endpoint "/api/pos/sync/location/$StoreCode/menu_items?limit=5&offset=0" `
    -Description "GET Menu Items with Pagination"

$menuItemData = @{
    data      = @{
        menuItemCode = "TEST002"
        name         = "New Test Item"
        cashPrice    = 8.99
        isActive     = 1
        storeCode    = $StoreCode
    }
    operation = "upsert"
} | ConvertTo-Json -Depth 5

Test-Endpoint -Method "POST" `
    -Endpoint "/api/pos/sync/location/$StoreCode/menu_items" `
    -Data $menuItemData `
    -Description "POST Menu Item (Upsert)"

# 5. Conflict Resolution Tests
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "5. Conflict Resolution Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$posWinsData = @{
    data             = @{
        menuItemCode = "TEST001"
        name         = "Updated from POS"
        cashPrice    = 11.99
    }
    conflictStrategy = "pos-wins"
} | ConvertTo-Json -Depth 5

Test-Endpoint -Method "POST" `
    -Endpoint "/api/pos/sync/location/$StoreCode/menu_items" `
    -Data $posWinsData `
    -Description "POST with POS-Wins Strategy"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Script Completed" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

