# Serve the web frontend for development
# Run from project root: .\serve-frontend.ps1

$port = 8080
$path = Join-Path $PSScriptRoot "web-frontend"

Write-Host "Serving web-frontend at http://localhost:$port"
Write-Host "Press Ctrl+C to stop"

# Use Python's built-in HTTP server
python -m http.server $port --directory $path
