param(
  [int]$Port = 8001,
  [string]$Dir = "build/wasm8/bin"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Dir)) {
  throw "Directory not found: $Dir"
}

$fullDir = (Resolve-Path $Dir).Path
Write-Host "Serving $fullDir on http://localhost:$Port"
python -m http.server $Port -d $fullDir
