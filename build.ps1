param(
  [string]$BuildDir = "build/wasm",
  [string]$EmsdkRoot = "",
  [string]$LLVMBin = "C:\\Program Files\\LLVM\\bin",
  [switch]$NoServer = $true,
  [switch]$NoVideoRec = $true,
  [switch]$LuaSystemOff = $true,
  [switch]$BuildEngineC = $true,
  [switch]$BuildEngineJS = $true,
  [switch]$SkipPas2c,
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Resolve-EmsdkRoot {
  if ($EmsdkRoot -and (Test-Path $EmsdkRoot)) { return $EmsdkRoot }
  if ($env:EMSDK -and (Test-Path $env:EMSDK)) { return $env:EMSDK }
  $candidate = Join-Path $env:USERPROFILE "emsdk"
  if (Test-Path $candidate) { return $candidate }
  throw "EMSDK not found. Set -EmsdkRoot or EMSDK env var."
}

function Resolve-Ninja {
  $localAppData = $env:LOCALAPPDATA
  $candidates = @()
  if ($localAppData) {
    $candidates += "$localAppData\\Microsoft\\WinGet\\Links\\ninja.exe"
  }
  $candidates += "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\IDE\\CommonExtensions\\Microsoft\\CMake\\Ninja\\ninja.exe"
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  $cmd = Get-Command ninja -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "ninja.exe not found. Install Ninja (winget install Ninja-build.Ninja)."
}

$emsdk = Resolve-EmsdkRoot
& "$emsdk\\emsdk_env.ps1" | Out-Null

$ninja = Resolve-Ninja
$env:PATH = (Split-Path $ninja) + ";" + $env:PATH
if (Test-Path $LLVMBin) {
  $env:PATH = $LLVMBin + ";" + $env:PATH
}

if ($Clean -and (Test-Path $BuildDir)) {
  Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Generate a minimal SDL2Config.cmake pointing at Emscripten's internal SDL2.
$buildDirFull = (Resolve-Path $BuildDir).Path
$sdl2Config = Join-Path $buildDirFull "SDL2Config.cmake"
@'
set(SDL2_INCLUDE_DIRS "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
set(SDL2_LIBRARIES "sdl2_emscripten_internal")
if(NOT TARGET SDL2::SDL2)
  add_library(SDL2::SDL2 INTERFACE IMPORTED)
  set_target_properties(SDL2::SDL2 PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${SDL2_INCLUDE_DIRS}"
    INTERFACE_LINK_LIBRARIES "${SDL2_LIBRARIES}")
endif()
'@ | Set-Content -Encoding ASCII $sdl2Config

# Build a minimal PhysFS static library for wasm.
$physfsSrc = "misc\\libphysfs"
$physfsOut = Join-Path $buildDirFull "physfs"
New-Item -ItemType Directory -Force -Path $physfsOut | Out-Null

$excludeNames = @(
  "platform_windows.c",
  "platform_winrt.cpp",
  "platform_macosx.c",
  "platform_beos.cpp",
  "archiver_lzma.c"
)

$sources = Get-ChildItem -Recurse -Path $physfsSrc -Filter *.c |
  Where-Object {
    ($excludeNames -notcontains $_.Name) -and
    (-not ($_.FullName -match "([/\\\\])lzma([/\\\\])"))
  } |
  ForEach-Object { $_.FullName }

foreach ($s in $sources) {
  $outObj = Join-Path $physfsOut ((Split-Path $s -Leaf) + ".o")
  emcc -O2 -c $s -I$physfsSrc -DPHYSFS_NO_CDROM_SUPPORT=1 -D__unix__=1 -o $outObj
  if ($LASTEXITCODE -ne 0) { throw "emcc failed for $s" }
}

$physfsLib = Join-Path $physfsOut "libphysfs2.a"
if (Test-Path $physfsLib) { Remove-Item $physfsLib -Force }
emar rcs $physfsLib
Get-ChildItem -Path $physfsOut -Filter *.o | ForEach-Object { emar q $physfsLib $_.FullName }
if ($LASTEXITCODE -ne 0) { throw "emar failed for PhysFS library" }

$cmakeArgs = @(
  "-S", ".",
  "-B", $buildDirFull,
  "-G", "Ninja",
  "-DCMAKE_BUILD_TYPE=Release",
  "-DBUILD_ENGINE_C=1",
  "-DBUILD_ENGINE_JS=$($BuildEngineJS.IsPresent.ToString().ToUpper())",
  "-DNOSERVER=ON",
  "-DLUA_SYSTEM=OFF",
  "-DNOVIDEOREC=1",
  "-DSKIP_RUST=ON",
  "-DSKIP_PAS2C=$($SkipPas2c.IsPresent.ToString().ToUpper())",
  "-DPHYSFS_LIBRARY=$physfsLib",
  "-DPHYSFS_INCLUDE_DIR=$physfsSrc",
  "-DSDL2_DIR=$buildDirFull",
  "-DCMAKE_PREFIX_PATH=$buildDirFull"
)

if (-not $BuildEngineC) { $cmakeArgs += "-DBUILD_ENGINE_C=0" }
if (-not $NoServer) { $cmakeArgs += "-DNOSERVER=OFF" }
if (-not $LuaSystemOff) { $cmakeArgs += "-DLUA_SYSTEM=ON" }
if (-not $NoVideoRec) { $cmakeArgs += "-DNOVIDEOREC=OFF" }

emcmake cmake @cmakeArgs

Write-Host "Configured in $BuildDir. Next: emmake cmake --build $BuildDir -j"
