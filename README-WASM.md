WASM Build Environment (So Far)

Status
- Emscripten + CMake are installed.
- We are using the pas2c -> C -> Emscripten pipeline.
- Current blockers for a full configure are:
  - GHC (for pas2c build)
  - PhysFS (system or wasm-compatible build)
  - SDL2 CMake config (we are using a stub for Emscripten)
  - Corrosion/Rust target integration (optional for wasm; currently errors in cross-compile)

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

Current CMake Configure (baseline)
```powershell
emcmake cmake -S . -B build/wasm -G Ninja `
  -DCMAKE_BUILD_TYPE=Release `
  -DBUILD_ENGINE_C=1 `
  -DNOSERVER=ON `
  -DLUA_SYSTEM=OFF `
  -DNOVIDEOREC=1
```

PhysFS (temporary wasm build)
We don’t have a native PhysFS package for wasm. A workaround is to build a
minimal static library from `misc/libphysfs` using Emscripten, then point
CMake at it via `PHYSFS_LIBRARY` and `PHYSFS_INCLUDE_DIR`.

This is automated in `build.ps1`. The minimal build excludes Windows and LZMA
code paths and defines `PHYSFS_NO_CDROM_SUPPORT` for wasm.

SDL2 (Emscripten)
The project’s `misc/libphyslayer` expects an SDL2 CMake config. For wasm we
generate a tiny `SDL2Config.cmake` in the build directory that points to
Emscripten’s internal SDL2.

Why GHC?
`tools/pas2c` is written in Haskell and requires `ghc` to build. Cabal alone
is not enough. Options:
- Install GHC (via ghcup or Stack) and re-run configure.
- Or temporarily disable pas2c if you only want non-C engine builds.

Next Step
Run `build.ps1` to configure a repeatable wasm build dir.

