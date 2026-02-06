param(
  [string]$BuildDir = "build/wasm",
  [string]$EmsdkRoot = "",
  [string]$LLVMBin = "C:\\Program Files\\LLVM\\bin",
  [string]$GhcBin = "C:\\Users\\andre\\ghc\\bin",
  [string]$EmsdkVersion = "5.0.0",
  [ValidateSet("Debug","Release","RelWithDebInfo")]
  [string]$Config = "Release",
  [switch]$Debug,
  [switch]$Release,
  [switch]$NoServer = $true,
  [switch]$NoVideoRec = $true,
  [switch]$LuaSystemOff = $true,
  [switch]$BuildEngineC = $true,
  [switch]$BuildEngineJS = $true,
  [switch]$SkipRust,
  [switch]$SkipPas2c,
  [switch]$WasmDebug,
  [switch]$StageData,
  [switch]$Clean,
  [switch]$Build,
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

if ($Debug -and $Release) {
  throw "Use only one of -Debug or -Release."
}
if ($Debug) { $Config = "Debug" }
if ($Release) { $Config = "Release" }
if ($Rebuild) { $Clean = $true; $Build = $true }

function Normalize-CMakePath([string]$Path) {
  if (-not $Path) { return "" }
  return ($Path.Trim() -replace "\\", "/").ToLowerInvariant()
}

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
Push-Location $emsdk
& ".\\emsdk" install $EmsdkVersion | Out-Null
& ".\\emsdk" activate $EmsdkVersion | Out-Null
Pop-Location
& "$emsdk\\emsdk_env.ps1" | Out-Null

$ninja = Resolve-Ninja
$env:PATH = (Split-Path $ninja) + ";" + $env:PATH
if (Test-Path $LLVMBin) {
  $env:PATH = $LLVMBin + ";" + $env:PATH
}
if (Test-Path $GhcBin) {
  $env:PATH = $GhcBin + ";" + $env:PATH
}
if ($env:GHC) {
  $env:PATH = (Split-Path $env:GHC) + ";" + $env:PATH
}
$ghcRoot = Split-Path $GhcBin -Parent
$ghcMingwBin = Join-Path $ghcRoot "mingw\\bin"
if (Test-Path $ghcMingwBin) {
  $env:PATH = $ghcMingwBin + ";" + $env:PATH
}
$env:CARGO_TARGET_WASM32_UNKNOWN_EMSCRIPTEN_LINKER = "emcc.bat"

if ($Clean -and (Test-Path $BuildDir)) {
  Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Generate minimal SDL2*Config.cmake stubs for Emscripten.
$buildDirFull = (Resolve-Path $BuildDir).Path
$cacheFile = Join-Path $buildDirFull "CMakeCache.txt"
if (Test-Path $cacheFile) {
  $cacheText = Get-Content -Raw $cacheFile
  $cacheSourceMatch = [regex]::Match($cacheText, "(?m)^CMAKE_HOME_DIRECTORY:INTERNAL=(.+)$")
  $cacheBuildMatch = [regex]::Match($cacheText, "(?m)^CMAKE_CACHEFILE_DIR:INTERNAL=(.+)$")
  $cacheSource = if ($cacheSourceMatch.Success) { $cacheSourceMatch.Groups[1].Value } else { "" }
  $cacheBuild = if ($cacheBuildMatch.Success) { $cacheBuildMatch.Groups[1].Value } else { "" }
  $expectedSource = (Resolve-Path $PSScriptRoot).Path
  $expectedBuild = $buildDirFull

  $isSourceMismatch = (Normalize-CMakePath $cacheSource) -ne (Normalize-CMakePath $expectedSource)
  $isBuildMismatch = (Normalize-CMakePath $cacheBuild) -ne (Normalize-CMakePath $expectedBuild)

  if ($isSourceMismatch -or $isBuildMismatch) {
    Write-Host "Detected stale/incompatible CMake cache in $BuildDir; cleaning CMake metadata."
    Remove-Item -Force $cacheFile
    $cmakeFilesDir = Join-Path $buildDirFull "CMakeFiles"
    if (Test-Path $cmakeFilesDir) {
      Remove-Item -Recurse -Force $cmakeFilesDir
    }
  }
}

$sdl2Config = Join-Path $buildDirFull "SDL2Config.cmake"
@'
set(SDL2_INCLUDE_DIRS "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
set(SDL2_LIBRARIES "")
if(NOT TARGET SDL2::SDL2)
  add_library(SDL2::SDL2 INTERFACE IMPORTED)
  set_target_properties(SDL2::SDL2 PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${SDL2_INCLUDE_DIRS}"
    INTERFACE_LINK_LIBRARIES "${SDL2_LIBRARIES}")
endif()
set(SDL2_FOUND TRUE)
'@ | Set-Content -Encoding ASCII $sdl2Config

$sdl2MixerConfig = Join-Path $buildDirFull "SDL2_mixerConfig.cmake"
@'
set(SDL2_MIXER_LIBRARY "")
set(SDL2_MIXER_LIBRARIES "")
if(NOT TARGET SDL2_mixer::SDL2_mixer)
  add_library(SDL2_mixer::SDL2_mixer INTERFACE IMPORTED)
  set_target_properties(SDL2_mixer::SDL2_mixer PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_mixer_FOUND TRUE)
'@ | Set-Content -Encoding ASCII $sdl2MixerConfig

$sdl2NetConfig = Join-Path $buildDirFull "SDL2_netConfig.cmake"
@'
set(SDL2_NET_LIBRARIES "")
if(NOT TARGET SDL2_net::SDL2_net)
  add_library(SDL2_net::SDL2_net INTERFACE IMPORTED)
  set_target_properties(SDL2_net::SDL2_net PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_net_FOUND TRUE)
'@ | Set-Content -Encoding ASCII $sdl2NetConfig

$sdl2ImageConfig = Join-Path $buildDirFull "SDL2_imageConfig.cmake"
@'
set(SDL2_IMAGE_LIBRARIES "")
if(NOT TARGET SDL2_image::SDL2_image)
  add_library(SDL2_image::SDL2_image INTERFACE IMPORTED)
  set_target_properties(SDL2_image::SDL2_image PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_image_FOUND TRUE)
'@ | Set-Content -Encoding ASCII $sdl2ImageConfig

$sdl2TtfConfig = Join-Path $buildDirFull "SDL2_ttfConfig.cmake"
@'
set(SDL2_TTF_LIBRARIES "")
if(NOT TARGET SDL2_ttf::SDL2_ttf)
  add_library(SDL2_ttf::SDL2_ttf INTERFACE IMPORTED)
  set_target_properties(SDL2_ttf::SDL2_ttf PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_SYSTEM_INCLUDE_PATH}/SDL")
endif()
set(SDL2_ttf_FOUND TRUE)
'@ | Set-Content -Encoding ASCII $sdl2TtfConfig

# Build a minimal PhysFS static library for wasm.
$physfsSrc = "misc\\libphysfs"
$physfsSrcFull = (Resolve-Path $physfsSrc).Path
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
  emcc -O2 -c $s -I$physfsSrcFull -DPHYSFS_NO_CDROM_SUPPORT=1 -D__unix__=1 -o $outObj
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
  "-DCMAKE_MAKE_PROGRAM=$ninja",
  "-DCMAKE_BUILD_TYPE=$Config",
  "-DBUILD_ENGINE_C=1",
  "-DBUILD_ENGINE_JS=$($BuildEngineJS.IsPresent.ToString().ToUpper())",
  "-DNOSERVER=ON",
  "-DLUA_SYSTEM=OFF",
  "-DNOVIDEOREC=1",
  "-DSKIP_RUST=$($SkipRust.IsPresent.ToString().ToUpper())",
  "-DSKIP_PAS2C=$($SkipPas2c.IsPresent.ToString().ToUpper())",
  "-DPHYSFS_LIBRARY=$physfsLib",
  "-DPHYSFS_INCLUDE_DIR=$physfsSrcFull",
  "-DSDL2_DIR=$buildDirFull",
  "-DCMAKE_PREFIX_PATH=$buildDirFull",
  "-DCARGO_FLAGS=--target=wasm32-unknown-emscripten",
  "-DHW_WASM_DEBUG=$($WasmDebug.IsPresent.ToString().ToUpper())"
)

if (-not $BuildEngineC) { $cmakeArgs += "-DBUILD_ENGINE_C=0" }
if (-not $NoServer) { $cmakeArgs += "-DNOSERVER=OFF" }
if (-not $LuaSystemOff) { $cmakeArgs += "-DLUA_SYSTEM=ON" }
if (-not $NoVideoRec) { $cmakeArgs += "-DNOVIDEOREC=OFF" }

emcmake cmake @cmakeArgs

if ($StageData) {
  $binDir = Join-Path $buildDirFull "bin"
  $dataSrc = Join-Path $PSScriptRoot "share\\hedgewars\\Data"
  $dataDst = Join-Path $binDir "Data"
  if (Test-Path $binDir) {
    if (Test-Path $dataDst) {
      Remove-Item -Recurse -Force $dataDst
    }
    if (Test-Path $dataSrc) {
      Copy-Item $dataSrc -Destination $dataDst -Recurse
      Write-Host "Staged Data to $dataDst"
    } else {
      Write-Warning "Data source not found at $dataSrc"
    }

    # Stage web frontend
    $frontendSrc = Join-Path $PSScriptRoot "web-frontend"
    $frontendDst = Join-Path $binDir "web-frontend"
    if (Test-Path $frontendSrc) {
      if (Test-Path $frontendDst) {
        Remove-Item -Recurse -Force $frontendDst
      }
      Copy-Item $frontendSrc -Destination $frontendDst -Recurse
      Write-Host "Staged web-frontend to $frontendDst"
    }

    # Stage root index (redirects to frontend)
    $rootIndexSrc = Join-Path $PSScriptRoot "index.html"
    $rootIndexDst = Join-Path $binDir "index.html"
    if (Test-Path $rootIndexSrc) {
      Copy-Item $rootIndexSrc -Destination $rootIndexDst -Force
      Write-Host "Staged index.html to $rootIndexDst"
    }
  } else {
    Write-Warning "Build bin directory not found yet: $binDir (run build first)"
  }
}

if ($Build) {
  Write-Host "Building in $BuildDir..."
  emmake cmake --build $BuildDir -j
} else {
  Write-Host "Configured in $BuildDir. Next: emmake cmake --build $BuildDir -j"
}
