Wedgewars - The WASM Hedgewars build for in browser gaming
==========================================================
Try it on <https://hrootzel.github.io/hw-wasm/>

Status
------
- Emscripten + CMake pipeline: pas2c -> C -> Emscripten -> WASM
- WebGL2 engine runs in-browser with packed assets
- **Canvas-based web frontend** replaces the old shell.html menu
- Local autostart works via `--webcfg64` config injection
- Engine quit now returns automatically to `/web-frontend/`
- Engine launch args include Qt-style audio flags (`--volume`, `--nosound`, `--nomusic`)
- Web control bindings are exported to engine config using `bind` commands

Required Tools
--------------
1. Emscripten SDK (emsdk)
2. CMake
3. Ninja
4. LLVM/Clang (host tools)
5. Cabal + GHC (for pas2c Haskell tool)
6. Rust with `wasm32-unknown-emscripten` target
7. Python 3 (for dev server)

Environment Setup
-----------------
`build.ps1` auto-detects emsdk from `$env:EMSDK`, `C:\Users\andre\emsdk`, or
the `-EmsdkRoot` parameter. It installs and activates the correct version
automatically. Manual setup is only needed for `emmake` after configure:

```powershell
& "$env:EMSDK\emsdk_env.ps1"
```

Quick Start
-----------

### 1. Build the engine

```powershell
# Configure and stage data (first time or after changes)
.\build.ps1 -StageData

# Build
emmake cmake --build build/wasm -j
```

`build.ps1` automatically finds emsdk, installs/activates the correct version,
and sources the environment. The `-StageData` flag copies both
`share/hedgewars/Data`, `web-frontend/`, and `index.html` into `build/wasm/bin/`.

### 2. Serve and play

```bat
serve.bat
```

Open **http://localhost:8080/** in your browser (redirects to the frontend).

Linux/macOS:

```bash
./serve.sh
```

The serve script auto-detects the best directory:
- `build/wasm/bin` if engine is built (full experience)
- Project root as fallback (dev mode, frontend only)

### 3. Dev mode (frontend only, no engine)

If you just want to iterate on the frontend without building the engine:

```bat
serve.bat 8080 .
```

Open **http://localhost:8080/web-frontend/**. The frontend works fully but
"Start Game" will fail since there's no engine.

Web Frontend
------------

A canvas-based JavaScript frontend in `web-frontend/` that replaces the old
HTML form in `shell.html`. It provides a retained-mode scene graph UI styled
to match the original Hedgewars look and feel.

### Features
- Main menu with Hedgewars logo, clouds background, theme music
- Local Game setup: map type/theme/seed, team selection, scheme & weapon set
- Team Editor: name, difficulty, hat/flag/grave selection with previews, 8 hog names
- Scheme Editor: all game settings (sliders/dropdowns) and modifier flags
- Weapon Editor: weapon icons from sprite sheet, ammo count and delay per weapon
- Settings: in-game master volume + in-game music/sound toggles, frontend music/SFX volume, fullscreen toggle
- Controls: key binding configuration with conflict detection
- All data persisted to localStorage

### Architecture
```
web-frontend/
|-- index.html   # Entry point
|-- main.js      # Bootstrap, asset loading, audio init
|-- assets.js    # Asset loader (auto-detects build vs dev paths)
|-- ui/          # Scene graph, widgets, theme
|-- pages/       # All UI pages
|-- data/        # Storage, defaults, schemes, weapons, config builder
`-- util/        # Input, audio, math helpers
```
### Game Launch Flow
1. User configures game in Local Game page
2. Frontend builds engine config text (matching IPC protocol)
3. Config is base64-encoded and stored in `localStorage['hw-wasm-webcfg64']`
4. Browser navigates to `/hwengine.html`
5. Engine shell reads config and settings from localStorage
6. Shell builds engine args (`--prefix`, `--user-prefix`, `--webcfg64`, `--volume`, optional `--nosound`, optional `--nomusic`)
7. Engine starts the match
8. On engine exit/abort, shell redirects back to `/web-frontend/`

### Config Builder (`data/config-builder.js`)
Generates the same line-based config the Qt frontend sends via IPC:
- Map: `mapgen`, `theme`, `seed`
- Scheme: `turntime`, `sd_turns`, `damagepct`, `gmflags`, etc.
- Ammo: `ammloadt`, `ammprob`, `ammdelay`, `ammreinf` (one char per weapon in TAmmoType order)
- Teams: `addteam`, `grave`, `fort`, `flag`, `voicepack`, `addhh`, `hat`
- Binds: per-team `bind <key> <command>` lines generated from web Controls settings

Build Scripts
-------------

### `build.ps1` - Engine WASM build
Configures and optionally stages data for the Emscripten engine build.

Key flags:
- `-StageData` - Copy `Data/` and `web-frontend/` into `build/wasm/bin/`
- `-Build` - Build immediately after configure
- `-Rebuild` - Clean + configure + build
- `-CleanupBuild` - Delete non-runtime build outputs (keep only files needed to serve/run from `build/wasm/bin/`)
- `-Debug` / `-Release` - Set build type
- `-WasmDebug` - Enable SAFE_HEAP + stack overflow checks
- `-Clean` - Remove build dir before configuring
- `-SkipRust` - Skip Rust mapgen build
- `-SkipPas2c` - Skip pas2c rebuild

### `build-was-docker.sh` - Linux Docker build
Builds in a Linux container and writes outputs to host `build/`.

```bash
# Build image + configure + compile + stage assets
./build-was-docker.sh

# Debug CMake build type
BUILD_TYPE=Debug ./build-was-docker.sh

# Explicit release build type (default)
BUILD_TYPE=Release ./build-was-docker.sh

# Enable Emscripten debug checks (separate from CMake build type)
WASM_DEBUG=ON ./build-was-docker.sh

# Reconfigure from a clean build dir
CLEAN=1 ./build-was-docker.sh

# Keep only runtime files under build output (deployment cleanup)
CLEANUP_BUILD=1 ./build-was-docker.sh
```

Container inputs/outputs:
- Project root mounted at `/workspace`
- Host `build/` mounted at `/workspace/build`
- Expected output at `build/wasm/bin/hwengine.html`

Key environment toggles:
- `BUILD_TYPE=Release|Debug|RelWithDebInfo` (default: `Release`)
- `WASM_DEBUG=ON|OFF` (default: `OFF`)
- `CLEAN=1` to remove the build dir before configure
- `STAGE_DATA=1|0` (default: `1`) to copy `Data/`, `web-frontend/`, and `frontend-qt6/res` into `build/wasm/bin/`
- `SPLIT_DATA_PACK=1|0` (default: `0`) to split `hwengine.data` into `.partN` chunks after build
- `DATA_CHUNK_MB=50` (default: `50`) size of each `.partN` chunk
- `KEEP_ORIGINAL_DATA_PACK=1|0` (default: `0`) keep the unsplit `hwengine.data` (not recommended for size-limited hosts)
- `CLEANUP_BUILD=1|0` (default: `0`) remove non-runtime outputs and trim staged UI assets (requires `STAGE_DATA=1`)

### `serve.bat` - Windows CMD server
Equivalent launcher for Command Prompt users.

```bat
serve.bat
serve.bat 9000
serve.bat 8080 build\wasm\bin
```

### `serve.sh` - Linux/macOS server
Equivalent launcher for Bash environments.

```bash
./serve.sh
./serve.sh 9000
./serve.sh 8080 build/wasm/bin
```

Engine Shell (`project_files/web/shell.html`)
---------------------------------------------
Minimal HTML template used by Emscripten's `--shell-file`. It:
- Reads config from `localStorage['hw-wasm-webcfg64']`
- Reads settings from `localStorage['hw.settings']`
- Auto-launches the game once WASM data is loaded
- Applies Qt-style audio args:
  - `--volume floor(engineVolume * 128 / 100)`
  - `--nosound` when in-game sound is disabled
  - `--nomusic` when in-game music is disabled
- Redirects back to `/web-frontend/` when engine exits/aborts
- Handles SDL audio context unlock on first interaction
- Contains the `{{{ SCRIPT }}}` placeholder for Emscripten

Important: `shell.html` is baked into generated `hwengine.html`/`hwengine.js` during build.
Staging frontend files alone does not update it. Rebuild engine output after shell changes.

Technical Notes
---------------

### Emscripten Version
- Engine build: current/latest emsdk (5.0.0 default in build.ps1)

### Data Pack And Static Hosting Limits
The WASM engine build uses Emscripten `--preload-file` to bundle `share/hedgewars/Data`
into a single data package (typically `hwengine.data`). Some static hosts have per-file
size limits, which can make a single large `.data` file impractical.

This fork supports splitting the `.data` package into smaller chunks (for example 50 MB)
so hosting can store multiple smaller files instead of one huge file.

How it works:
- Build step splits `hwengine.data` into `hwengine.data.part0`, `hwengine.data.part1`, ...
- Runtime loader hook in `project_files/web/shell.html` intercepts `fetch('hwengine.data')` and
  streams `hwengine.data.part0`, `part1`, ... sequentially as a single response body.

Notes:
- The engine still needs the full pack before starting. Splitting helps with hosting
  limits, not startup time or total download size.
- The split-pack loader must run before `hwengine.js`. In this repo it lives in
  `project_files/web/shell.html` and is baked into `build/wasm/bin/hwengine.html` at build time.
  Changing it requires rebuilding engine output (staging alone is not enough).

#### Split Pack (Windows PowerShell)
```powershell
# Configure + build + split data pack into 50 MB parts (deletes the original .data by default)
.\build.ps1 -Build -SplitDataPack -DataPackChunkMB 50

# Keep the original .data as well (not recommended for size-limited hosts)
.\build.ps1 -Build -SplitDataPack -DataPackChunkMB 50 -KeepOriginalDataPack
```

#### Split Pack (Docker build)
```bash
# Split the engine data pack after build (deletes the original .data)
SPLIT_DATA_PACK=1 DATA_CHUNK_MB=50 ./build-was-docker.sh

# Stage web runtime assets into build output (default is already STAGE_DATA=1)
STAGE_DATA=1 ./build-was-docker.sh

# Keep only runtime files and trim staged UI assets (useful for deployment bundles)
# Note: requires STAGE_DATA=1, since it operates on build/wasm/bin/Data and build/wasm/bin/frontend-qt6/res
STAGE_DATA=1 CLEANUP_BUILD=1 ./build-was-docker.sh
```

### Client-Side Caching (Service Worker)
Browsers should cache `hwengine.wasm` and `hwengine.data.partN` automatically when the host sets good cache headers.
For hosts that don’t (or for reliable offline-ish behavior), this repo ships a simple service worker:
- Source: `project_files/web/sw.js`
- Staged to build output root as: `sw.js`
- Registered from: `web-frontend/index.html` and the engine page (`shell.html`)

To invalidate caches after updating engine/data parts, bump `CACHE_VERSION` in `project_files/web/sw.js` and rebuild/stage.

### PhysFS
Built as a minimal static library from `misc/libphysfs` using Emscripten.
Automated in `build.ps1`. Excludes Windows/LZMA code paths.

### Rust mapgen
- `wasm32-unknown-emscripten` target required: `rustup target add wasm32-unknown-emscripten`
- Corrosion builds the Rust crate and produces `libhwengine_future.a`

### WebGL2 Compatibility
- `BUILD_ENGINE_JS` forces `GL2=ON`
- Fixed-function GL calls (`glPushMatrix` etc.) disabled for WEBGL in `uMatrix.pas`

### SDL Stubs
- SDL_net stubbed for local play (no server/IPC)
- SDL_mixer available via Emscripten ports

### Asset Paths
The web frontend auto-detects its asset base path:
- Build layout: `web-frontend/` and `Data/` are siblings in `build/wasm/bin/`
- Dev layout: `web-frontend/` uses `../share/hedgewars/Data/`

Current Issues
--------------
- ABI mismatch between Pascal and Rust AI functions (`ai_add_team_hedgehog` f64 vs f32)
- SDL2 signature mismatches (`SDL_DestroyWindow`, `SDL_SetWindowFullscreen` return types)
