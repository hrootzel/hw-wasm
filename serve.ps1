param(
  [int]$Port = 8080,
  [string]$Dir = ""
)

$ErrorActionPreference = "Stop"

# Auto-detect: prefer build output (has engine + frontend), fall back to project root (dev mode)
if (-not $Dir) {
  if (Test-Path "build/wasm/bin/hwengine.html") {
    $Dir = "build/wasm/bin"
  } elseif (Test-Path "build/wasm8/bin/hwengine.html") {
    $Dir = "build/wasm8/bin"
  } else {
    # Dev mode: serve from project root so web-frontend/ and share/ paths both work
    $Dir = "."
  }
}

if (-not (Test-Path $Dir)) {
  throw "Directory not found: $Dir"
}

$fullDir = (Resolve-Path $Dir).Path
$isBuild = $Dir -ne "."

Write-Host "Hedgewars Web Frontend"
Write-Host "======================"
if ($isBuild) {
  Write-Host "Serving build output: $fullDir"
  Write-Host "Frontend: http://localhost:$Port/web-frontend/"
  Write-Host "Engine:   http://localhost:$Port/hwengine.html"
} else {
  Write-Host "Dev mode (no build output found)"
  Write-Host "Frontend: http://localhost:$Port/web-frontend/"
  Write-Host "Note: Engine launch requires a build (.\build.ps1 -StageData)"
}
Write-Host ""
Write-Host "Press Ctrl+C to stop"

python -m http.server $Port -d $fullDir
