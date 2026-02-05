WASM Build Environment (So Far)

Status
- Emscripten + CMake are installed.
- We are using the pas2c -> C -> Emscripten pipeline.
- We can build and run the WebGL2 engine in-browser with assets packed.
- Local autostart works (no frontend/IPC).
- Remaining runtime/ABI warnings exist (see "Current Issues").

Required Tools (Installed/Verified)
1) Emscripten SDK (emsdk)
2) CMake
3) Ninja
4) LLVM/Clang (host tools for some checks)
5) Cabal + GHC (for pas2c)

Environment Setup (PowerShell)
```powershell
# adjust to your install
$env:EMSDK="C:\\Users\\andre\\emsdk"
& "$env:EMSDK\\emsdk_env.ps1"
```

Notes:
- Ninja was installed via winget and lives in:
  - `C:\Users\<you>\AppData\Local\Microsoft\WinGet\Links\ninja.exe`
- LLVM is installed in:
  - `C:\Program Files\LLVM\bin`
- GHC extracted to:
  - `C:\Users\andre\ghc` (bin at `C:\Users\andre\ghc\bin`)

Current CMake Configure (baseline)
```powershell
emcmake cmake -S . -B build/wasm -G Ninja `
  -DCMAKE_BUILD_TYPE=Release `
  -DBUILD_ENGINE_C=1 `
  -DBUILD_ENGINE_JS=TRUE `
  -DNOSERVER=ON `
  -DLUA_SYSTEM=OFF `
  -DNOVIDEOREC=1
```

PhysFS (temporary wasm build)
We don't have a native PhysFS package for wasm. A workaround is to build a
minimal static library from `misc/libphysfs` using Emscripten, then point
CMake at it via `PHYSFS_LIBRARY` and `PHYSFS_INCLUDE_DIR`.

This is automated in `build.ps1`. The minimal build excludes Windows and LZMA
code paths and defines `PHYSFS_NO_CDROM_SUPPORT` for wasm.

SDL2 (Emscripten)
The project's `misc/libphyslayer` expects an SDL2 CMake config. For wasm we
generate a tiny `SDL2Config.cmake` in the build directory that points to
Emscripten's internal SDL2.

Why GHC?
`tools/pas2c` is written in Haskell and requires `ghc` to build. Cabal alone
is not enough. Options:
- Install GHC (via ghcup or Stack) and re-run configure.
- Or temporarily disable pas2c if you only want non-C engine builds.

Rust mapgen (hwengine_future)
- We now link the Rust land generator into the WASM build as a static library.
- Rust target `wasm32-unknown-emscripten` must be installed:
  - `rustup target add wasm32-unknown-emscripten`
- Corrosion is used to build the Rust crate and copy `libhwengine_future.a`
  into the build output.

WebGL compatibility (GL2)
- `BUILD_ENGINE_JS` forces `GL2=ON`.
- We disabled the fixed-function validation block in `uMatrix.pas` for WEBGL
  because WebGL2 doesn't support `glPushMatrix`/`glLoadMatrixf`/`glMultMatrixf`.

Web build runtime notes
- The engine now runs under `emscripten_set_main_loop` and keeps resources alive.
  This avoids early cleanup that caused WebGL texture deletion errors.
- The shell includes a boot overlay canvas so you always see "Booting..." before
  the wasm runtime starts.
- We serve from `build/wasm8/bin` and use port 8001 by default (port 8000 was
  returning empty replies on this machine).

Stubs for browser builds
- SDL_net is stubbed for local play (no server/IPC).
- SDL_mixer is stubbed (audio optional). Rendering and textures load via SDL2_image.

Current Issues (Warnings to Fix)
- ABI mismatch between Pascal and Rust AI functions:
  - `ai_add_team_hedgehog` expects f64 in C but f32 in Rust.
  - `ai_have_plan` signature mismatch.
- SDL2 signatures:
  - `SDL_DestroyWindow` return type mismatch.
  - `SDL_SetWindowFullscreen` return type mismatch.

Local autostart (WEBGL)
- We inject a default local match configuration in `hedgewars/hwengine.pas` when
  running in WEBGL. This includes default ammo scheme strings from
  `frontend-qt6/weapons.h`. If you see "Incomplete or missing ammo scheme set",
  the strings are the wrong length.

Next Step
Run `build.ps1` to configure the wasm build dir, then:
```powershell
& "C:\\Users\\andre\\emsdk\\emsdk_env.ps1" | Out-Null
ninja -C build/wasm8 -j 1
```

Serve and run
```powershell
.\serve.ps1
```
Open `http://localhost:8001/hwengine.html`

Qt WASM Single-Player Bridge (Experimental)
- The Qt WASM frontend writes the base64 web config to `localStorage` under `hw-wasm-webcfg64` and then navigates to `hwengine.html`.
- The engine shell (`project_files/web/shell.html`) reads `hw-wasm-webcfg64` and passes `--webcfg64` to the engine.
- Network play and training/campaign are stubbed out in the Qt WASM build.

Qt WASM Runtime Fixes (Current)
- Qt WASM is built with asyncify enabled so blocking `QDialog::exec()` calls do not abort in the browser.
- `qtloader.js` and `qtlogo.svg` are copied from the Qt WASM install into `build/qt-wasm` (and `build/qt-wasm/Release`) after build.
- We generate `qt-preload.json` for a **curated** asset subset (fonts, locale, misc keys, limited frontend graphics) to avoid thousands of concurrent fetches that cause `ERR_INSUFFICIENT_RESOURCES`.
- The full `share/hedgewars/Data` tree is copied into `build/qt-wasm/Data`, but only the allowlisted files are preloaded.
- Serve from `build/qt-wasm` (not `build/qt-wasm/Release`) to ensure `hedgewars.js/.wasm` and `qtloader.js` are present.

Qt Frontend (WebAssembly) Option (Experimental)

Frontend locations
- Qt6 Widgets frontend: `frontend-qt6/` (full-featured, closest to current UI)
- Qt5 Widgets frontend: `QTfrontend/` (legacy Qt5)
- Qt6 QML frontend: `qmlfrontend/` (minimal skeleton, not feature-complete)

Portability assessment (Qt6 Widgets)
- UI/Widgets: Mostly portable with Qt for WebAssembly.
- Networking: Not portable as-is (TCP/UDP, server browser, admin). Must be stubbed or hidden.
- SDLInteraction (audio/joystick): Must be stubbed or replaced (Qt for WASM has no native SDL/joystick).
- Engine launch: The Qt frontend expects to spawn `hwengine` as a process. In WASM, this must be replaced with a JS bridge to the engine wasm (use `Module.callMain([...])` with `--webcfg64`).

Minimum stubs for single-player (to implement)
- Disable net UI pages: `pageNet`, `pageNetGame`, `pageNetServer`, `pageRoomsList`, admin/net options.
- Stub `HWNewNet`, `HWNetServer`, `NetUDP*` references (or compile them out and guard usage in `hwform.cpp`).
- Stub `SDLInteraction` audio/joystick/resolution calls.
- Keep local game flow: `pageSinglePlayer`, `pageSelectWeapon`, `pageScheme`.

Build steps (Qt for WebAssembly)
1) Install Qt for WebAssembly (Qt 6.5+). Set:
   - `QT_WASM=C:\Qt\6.x.x\wasm_singlethread` (or `wasm_multithread`)
   - Default used by `build-qt-wasm.ps1` if `QT_WASM` is not set: `C:\Qt\wasm_singlethread`
2) Ensure Emscripten is configured:
   - `EMSDK=C:\Users\andre\emsdk`
   - Qt 6.10.2 wasm_singlethread expects Emscripten **4.0.7**
   - `build-qt-wasm.ps1` auto-runs `emsdk install 4.0.7` and `emsdk activate 4.0.7`
3) Build the Qt frontend:
```powershell
$env:QT_WASM="C:\Qt\6.x.x\wasm_singlethread"
$env:EMSDK="C:\Users\andre\emsdk"
.\build-qt-wasm.ps1
```

Integration notes
- The Qt WASM build produces `hedgewars.html`, `hedgewars.js`, `hedgewars.wasm` in `build/qt-wasm`.
- You will still need to wire a JS bridge so the frontend calls the engine wasm (single-player only).

Which path is faster?
- Short-term: the custom WebGL UI (current `project_files/web/shell.html`) is much faster because it already talks to the engine via `--webcfg64` and avoids Qt/WASM constraints.
- Long-term fidelity: Qt6 Widgets in WASM is closer to the original frontend but requires larger refactors (network stubs + engine launch bridge + SDLInteraction replacement).
