param(
  [string]$QtWasm = $(if ($env:QT_WASM) { $env:QT_WASM } else { "C:\\Qt\\6.10.2\\wasm_singlethread" }),
  [string]$Emsdk = $(if ($env:EMSDK) { $env:EMSDK } else { "C:\\Users\\andre\\emsdk" }),
  [string]$BuildDir = "build/qt-wasm",
  [string]$Config = "Release",
  [string]$EngineDir = "build/wasm8/bin",
  [bool]$Asyncify = $true,
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

& $qtCmake -S frontend-qt6 -B $buildPath -G Ninja -DCMAKE_BUILD_TYPE:STRING=$Config -DCMAKE_CONFIGURATION_TYPES=$Config -DHW_WASM_ASYNCIFY=$($Asyncify.ToString().ToUpper())
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

cmake --build $buildPath --config $Config

$qtLoaderSrc = Join-Path $QtWasm "plugins\\platforms\\qtloader.js"
$qtLogoSrc = Join-Path $QtWasm "plugins\\platforms\\qtlogo.svg"
$copyTargets = @($buildPath, (Join-Path $buildPath "Release"))
foreach ($target in $copyTargets) {
  if (-not (Test-Path $target)) { continue }
  if (Test-Path $qtLoaderSrc) {
    Copy-Item $qtLoaderSrc -Destination $target -Force
  }
  if (Test-Path $qtLogoSrc) {
    Copy-Item $qtLogoSrc -Destination $target -Force
  }
}

$dataSrc = Join-Path $PSScriptRoot "share\\hedgewars\\Data"
foreach ($target in $copyTargets) {
  if (-not (Test-Path $target)) { continue }
  $dataDst = Join-Path $target "Data"
  if ((Test-Path $dataSrc) -and -not (Test-Path $dataDst)) {
    Copy-Item $dataSrc -Destination $dataDst -Recurse
  }
}

# Generate qt-preload.json and inject into hedgewars.html (build dir + Release)
if ((Test-Path $dataSrc) -and (Test-Path $buildPath)) {
  $dataDst = Join-Path $buildPath "Data"
  if (Test-Path $dataDst) {
    $entries = @()
    $base = (Resolve-Path $buildPath).Path
    $allowPrefixes = @(
      "Data/Fonts/",
      "Data/Locale/",
      "Data/misc/",
      "Data/Graphics/AmmoMenu/",
      "Data/Graphics/Flags/",
      "Data/Graphics/Graves/",
      "Data/Graphics/Frontend/",
      "Data/Graphics/Hedgehog/",
      "Data/Graphics/MapMasks/",
      "Data/Graphics/MapEdges/",
      "Data/Graphics/Buttons/",
      "Data/Graphics/Icons/"
    )
    $allowFiles = @(
      "Data/misc/keys.csv"
    )

    Get-ChildItem -Path $dataDst -Recurse -File | ForEach-Object {
      $full = (Resolve-Path $_.FullName).Path
      $rel = $full.Substring($base.Length).TrimStart('\', '/')
      $source = $rel.Replace('\', '/')

      $allowed = $false
      foreach ($prefix in $allowPrefixes) {
        if ($source.StartsWith($prefix)) { $allowed = $true; break }
      }
      if (-not $allowed -and ($allowFiles -contains $source)) {
        $allowed = $true
      }
      if (-not $allowed) { return }

      $entries += [pscustomobject]@{
        source = $source
        destination = "/" + $source
      }
    }

    foreach ($target in $copyTargets) {
      if (-not (Test-Path $target)) { continue }
      $preloadPath = Join-Path $target "qt-preload.json"
      $entries | ConvertTo-Json -Depth 4 | Set-Content -Path $preloadPath -Encoding UTF8

      $htmlPath = Join-Path $target "hedgewars.html"
      if (Test-Path $htmlPath) {
        $html = Get-Content -Path $htmlPath -Raw
        if ($html -notlike "*preload:*") {
          $needle = "entryFunction: window.hedgewars_entry,"
          $insert = "entryFunction: window.hedgewars_entry,`r`n                        preload: ['qt-preload.json'],"
          if ($html.Contains($needle)) {
            $html = $html.Replace($needle, $insert)
          } else {
            $html += "`r`n<!-- preload injection failed: entryFunction not found -->`r`n"
          }
          Set-Content -Path $htmlPath -Value $html -Encoding UTF8
        }
      }
    }
  }
}

# Simplify loader UI (remove Qt logo, keep basic status text)
$htmlPath = Join-Path $buildPath "hedgewars.html"
if (Test-Path $htmlPath) {
  $html = Get-Content -Path $htmlPath -Raw
  $pattern = '(?s)<figure[^>]*id="qtspinner"[^>]*>.*?</figure>'
  $replacement = '<div id="qtspinner" style="display:block; position:absolute; top:0; left:0; right:0; padding:16px; color:#fff; font-family:Arial, sans-serif; background:#111;"><strong>Hedgewars</strong> <span id="qtstatus">Loading...</span><noscript>JavaScript is disabled. Please enable JavaScript to use this application.</noscript></div>'
  $html = [System.Text.RegularExpressions.Regex]::Replace($html, $pattern, $replacement)
  Set-Content -Path $htmlPath -Value $html -Encoding UTF8
}

# Stage engine web artifacts into the Qt WASM output (so hwengine.html resolves).
$engineDirFull = Join-Path $PSScriptRoot $EngineDir
if (Test-Path $engineDirFull) {
  $engineFiles = @("hwengine.html","hwengine.js","hwengine.wasm","hwengine.data")
  foreach ($f in $engineFiles) {
    $src = Join-Path $engineDirFull $f
    if (Test-Path $src) {
      Copy-Item $src -Destination $buildPath -Force
    }
  }

  # Ensure we use our custom shell that reads hw-wasm-webcfg64
  $customShell = Join-Path $PSScriptRoot "project_files\\web\\shell.html"
  if (Test-Path $customShell) {
    Copy-Item $customShell -Destination (Join-Path $buildPath "hwengine.html") -Force
  }
}
