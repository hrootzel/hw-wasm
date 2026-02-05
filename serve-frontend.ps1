// Serve the web frontend for development
# Run from project root: .\serve-frontend.ps1

$port = 8080

Write-Host "Serving from project root at http://localhost:$port"
Write-Host "Access frontend at http://localhost:$port/web-frontend/"
Write-Host "Press Ctrl+C to stop"

# Serve from project root so ../share paths work
python -m http.server $port
