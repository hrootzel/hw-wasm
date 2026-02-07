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
  [switch]$SplitDataPack,
  [ValidateRange(1, 500)]
  [int]$DataPackChunkMB = 50,
  [switch]$KeepOriginalDataPack,
  [switch]$CleanupBuild,
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

function Invoke-PythonScript([string[]]$PyArgs) {
  & python @PyArgs
  if ($LASTEXITCODE -eq 0) { return }
  & py -3 @PyArgs
  if ($LASTEXITCODE -ne 0) { throw "Python script failed: $($PyArgs -join ' ')" }
}

function Cleanup-WasmRuntime([string]$BuildDirFull) {
  if (-not (Test-Path $BuildDirFull)) {
    throw "Build directory not found: $BuildDirFull"
  }

  $binDir = Join-Path $BuildDirFull "bin"
  if (-not (Test-Path $binDir)) {
    throw "Build bin directory not found: $binDir"
  }

  # Keep only what is needed to serve/run the web app.
  $keepDirs = @("Data", "web-frontend", "frontend-qt6")
  $keepFiles = @("index.html", "sw.js")

  # First, delete non-bin build products (CMake metadata, intermediates, etc).
  Get-ChildItem -Force -LiteralPath $BuildDirFull | ForEach-Object {
    if ($_.Name -ieq "bin") { return }
    Remove-Item -Recurse -Force -LiteralPath $_.FullName
  }

  # Then, prune bin/ to runtime essentials.
  Get-ChildItem -Force -LiteralPath $binDir | ForEach-Object {
    if ($_.PSIsContainer) {
      if ($keepDirs -icontains $_.Name) { return }
      Remove-Item -Recurse -Force -LiteralPath $_.FullName
      return
    }

    $name = $_.Name
    if ($keepFiles -icontains $name) { return }
    if ($name -ilike "hwengine.*") { return } # engine html/js/wasm + data or data parts

    Remove-Item -Force -LiteralPath $_.FullName
  }

  # Trim staged UI assets to deployment-friendly size:
  # - `Data/` is already packaged into hwengine.data for the engine; web UI only needs a small subset.
  # - `frontend-qt6/res` is only used for a small set of "skin" images referenced by web-frontend/assets.js.
  $trimScript = Join-Path $PSScriptRoot "tools\\trim_wasm_web_runtime_assets.py"
  if (Test-Path $trimScript) {
    Invoke-PythonScript -PyArgs @($trimScript, "--bin-dir", $binDir, "--repo-root", $PSScriptRoot)
  } else {
    Write-Host "Warning: missing trim script ($trimScript); skipping UI asset trim."
  }
}

# Allow a fast cleanup-only run without emsdk/cmake overhead.
if ($CleanupBuild -and -not $Build -and -not $StageData -and -not $SplitDataPack -and -not $Clean -and -not $Rebuild) {
  $buildDirFull = (Resolve-Path $BuildDir).Path
  Cleanup-WasmRuntime $buildDirFull
  Write-Host "CleanupBuild complete: kept runtime files in $buildDirFull\\bin"
  exit 0
}

function Split-WasmDataPacks([string]$BuildDirFull) {
  $binDir = Join-Path $BuildDirFull "bin"
  if (-not (Test-Path $binDir)) { return }

  $splitter = Join-Path $PSScriptRoot "tools\\split_wasm_data_pack.py"
  if (-not (Test-Path $splitter)) {
    throw "Missing splitter script: $splitter"
  }

  $dataFiles = Get-ChildItem -Path $binDir -File -Filter "*.data" |
    Where-Object { $_.Name -like "hwengine*.data" }

  foreach ($f in $dataFiles) {
    $part0 = $f.FullName + ".part0"
    if (Test-Path $part0) { continue }

    Write-Host "Splitting data pack: $($f.FullName) -> $DataPackChunkMB MB parts"
    $pyArgs = @($splitter, "--input", $f.FullName, "--chunk-mb", "$DataPackChunkMB")
    if (-not $KeepOriginalDataPack) { $pyArgs += "--delete-original" }
    Invoke-PythonScript -PyArgs $pyArgs
  }
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
  $physfsOpt = if ($Config -eq "Release" -or $Config -eq "RelWithDebInfo") { "-O3" } else { "-O0" }
  emcc $physfsOpt -c $s -I$physfsSrcFull -DPHYSFS_NO_CDROM_SUPPORT=1 -D__unix__=1 -o $outObj
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

    # Stage Qt frontend resources used by the web skin layer
    $qtResSrc = Join-Path $PSScriptRoot "frontend-qt6\\res"
    $qtResRootDst = Join-Path $binDir "frontend-qt6"
    $qtResDst = Join-Path $qtResRootDst "res"
    if (Test-Path $qtResSrc) {
      if (-not (Test-Path $qtResRootDst)) {
        New-Item -ItemType Directory -Path $qtResRootDst | Out-Null
      }
      if (Test-Path $qtResDst) {
        Remove-Item -Recurse -Force $qtResDst
      }
      Copy-Item $qtResSrc -Destination $qtResDst -Recurse
      Write-Host "Staged frontend-qt6 resources to $qtResDst"
    } else {
      Write-Warning "Qt resource source not found at $qtResSrc"
    }

    # Stage root index (redirects to frontend)
    $rootIndexSrc = Join-Path $PSScriptRoot "index.html"
    $rootIndexDst = Join-Path $binDir "index.html"
    if (Test-Path $rootIndexSrc) {
      Copy-Item $rootIndexSrc -Destination $rootIndexDst -Force
      Write-Host "Staged index.html to $rootIndexDst"
    }

    # Stage service worker (enables client-side caching of wasm + data pack parts).
    $swSrc = Join-Path $PSScriptRoot "project_files\\web\\sw.js"
    $swDst = Join-Path $binDir "sw.js"
    if (Test-Path $swSrc) {
      Copy-Item $swSrc -Destination $swDst -Force
      Write-Host "Staged sw.js to $swDst"
    }

    if ($SplitDataPack) {
      Split-WasmDataPacks $buildDirFull
    }
    # Important: cleanup is destructive to incremental builds (removes CMakeCache.txt).
    # Only run it here when we're not going to build in the same invocation.
    if ($CleanupBuild -and -not $Build) {
      Cleanup-WasmRuntime $buildDirFull
    }
  } else {
    Write-Warning "Build bin directory not found yet: $binDir (run build first)"
  }
}

if ($Build) {
  Write-Host "Building in $BuildDir..."
  emmake cmake --build $BuildDir -j
  if ($SplitDataPack) {
    Split-WasmDataPacks $buildDirFull
  }
  if ($CleanupBuild) {
    Cleanup-WasmRuntime $buildDirFull
  }
} else {
  Write-Host "Configured in $BuildDir. Next: emmake cmake --build $BuildDir -j"
}
