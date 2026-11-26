param(
    [string]$BaseUrl = 'http://127.0.0.1:8000',
    [string]$Username = 'petugas',
    [string]$Password = 'petugas123'
)

$ErrorActionPreference = 'Stop'
$api = "$BaseUrl/backend/api.php"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Assert-Api([string]$Name, $Response) {
    if (-not $Response.success) { throw "$Name gagal: $($Response.message)" }
    Write-Host "PASS $Name" -ForegroundColor Green
}

$health = Invoke-RestMethod -Uri "$api/health" -Method Get
Assert-Api 'health database' $health

$login = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -WebSession $session -ContentType 'application/json' -Body (@{ username = $Username; password = $Password } | ConvertTo-Json)
Assert-Api 'login' $login

$me = Invoke-RestMethod -Uri "$api/auth/me" -Method Get -WebSession $session
Assert-Api 'session aktif' $me

$dashboard = Invoke-RestMethod -Uri "$api/dashboard" -Method Get -WebSession $session
Assert-Api 'dashboard' $dashboard

$areas = Invoke-RestMethod -Uri "$api/areas" -Method Get -WebSession $session
Assert-Api 'daftar area' $areas

$transactions = Invoke-RestMethod -Uri "$api/transactions?status=aktif" -Method Get -WebSession $session
Assert-Api 'daftar transaksi aktif' $transactions

$logout = Invoke-RestMethod -Uri "$api/auth/logout" -Method Post -WebSession $session
Assert-Api 'logout' $logout

Write-Host 'SMOKE TEST PASSED' -ForegroundColor Cyan
