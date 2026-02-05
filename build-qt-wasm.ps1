param(
  [string]$QtWasm = $(if ($env:QT_WASM) { $env:QT_WASM } else { "C:\\Qt\\6.10.2\\wasm_singlethread" }),
  [string]$Emsdk = $(if ($env:EMSDK) { $env:EMSDK } else { "C:\\Users\\andre\\emsdk" }),
  [string]$BuildDir = "build/qt-wasm",
  [string]$Config = "Release",
  [switch]$Clean
)

if (-not $QtWasm -or -not (Test-Path $QtWasm)) {
  Write-Error "QT_WASM is not set or does not point to a valid Qt for WASM installation. Set `$env:QT_WASM to the Qt WASM root (e.g. C:\Qt\6.10.2\wasm_singlethread or wasm_multithread). Default attempted: C:\Qt\6.10.2\wasm_singlethread"
  exit 1
}

if (-not $Emsdk -or -not (Test-Path $Emsdk)) {
  Write-Error "EMSDK is not set or does not point to a valid Emscripten SDK. Set `$env:EMSDK to your emsdk path (e.g. C:\Users\andre\emsdk). Default attempted: C:\Users\andre\emsdk"
  exit 1
}

Push-Location $Emsdk
& ".\\emsdk" install 4.0.7 | Out-Null
& ".\\emsdk" activate 4.0.7 | Out-Null
Pop-Location
& "$Emsdk\\emsdk_env.ps1" | Out-Null

$qtCmake = Join-Path $QtWasm "bin\qt-cmake.bat"
if (-not (Test-Path $qtCmake)) {
  $qtCmake = Join-Path $QtWasm "bin\qt-cmake"
}
if (-not (Test-Path $qtCmake)) {
  Write-Error "qt-cmake not found under $QtWasm\bin. Check your Qt WASM install."
  exit 1
}

$buildPath = Resolve-Path -Path (Join-Path $PSScriptRoot $BuildDir) -ErrorAction SilentlyContinue
if ($Clean -and $buildPath) {
  Remove-Item -Recurse -Force $buildPath
  $buildPath = $null
}
if (-not $buildPath) {
  New-Item -ItemType Directory -Path $BuildDir | Out-Null
  $buildPath = Resolve-Path -Path $BuildDir
}

& $qtCmake -S frontend-qt6 -B $buildPath -G Ninja -DCMAKE_BUILD_TYPE:STRING=$Config -DCMAKE_CONFIGURATION_TYPES=$Config
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

cmake --build $buildPath --config $Config

$qtLoaderSrc = Join-Path $QtWasm "plugins\\platforms\\qtloader.js"
$qtLogoSrc = Join-Path $QtWasm "plugins\\platforms\\qtlogo.svg"
if (Test-Path $qtLoaderSrc) {
  Copy-Item $qtLoaderSrc -Destination $buildPath -Force
}
if (Test-Path $qtLogoSrc) {
  Copy-Item $qtLogoSrc -Destination $buildPath -Force
}
