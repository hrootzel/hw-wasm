WASM Build Environment (So Far)

Status
- Emscripten + CMake are installed.
- We are using the pas2c -> C -> Emscripten pipeline.
- We can now configure and link a WASM build (see build commands below).
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

Stubs for browser builds
- SDL_net is stubbed for local play (no server/IPC).
- SDL_mixer and SDL_image are stubbed to avoid linking issues while we focus
  on gameplay and rendering.

Current Issues (Warnings to Fix)
- ABI mismatch between Pascal and Rust AI functions:
  - `ai_add_team_hedgehog` expects f64 in C but f32 in Rust.
  - `ai_have_plan` signature mismatch.
- SDL2 signatures:
  - `SDL_DestroyWindow` return type mismatch.
  - `SDL_SetWindowFullscreen` return type mismatch.

Next Step
Run `build.ps1` to configure the wasm build dir, then:
```powershell
& "C:\\Users\\andre\\emsdk\\emsdk_env.ps1" | Out-Null
ninja -C build/wasm8 -j 1
```
