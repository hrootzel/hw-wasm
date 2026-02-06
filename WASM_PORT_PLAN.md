WASM Port Plan (Draft)

Goal
Port the Hedgewars engine to WebAssembly and replace platform layers (graphics, audio, input, file I/O, and IPC) with browser equivalents. Initial graphics target is WebGL 2, with a later WebGPU migration.

What I Found in This Repo (Relevant Hotspots)
- SDL2 is the core platform layer (window, events, input, timers).
  - `hedgewars/hwengine.pas` main loop uses `SDL_PeepEvents`, `SDL_GetTicks`, `SDL_Delay`, window events, mouse/keyboard/joystick.
  - `hedgewars/SDLh.pas` exposes SDL2, SDL_image, SDL_ttf, SDL_mixer, SDL_net bindings.
- OpenGL is the graphics backend (fixed pipeline + optional GL2 shaders).
  - `hedgewars/uRender.pas`, `hedgewars/uRenderUtils.pas`, `hedgewars/uGearsRender.pas`, `hedgewars/uTextures.pas`
  - `hedgewars/uStore.pas` creates SDL window + GL context, loads textures/fonts/images.
- Audio uses SDL_mixer (OGG/OPUS) and SDL_ttf for fonts.
  - `hedgewars/uSound.pas`
  - Fonts rendered via SDL_ttf in `hedgewars/uStore.pas`
- Input is SDL events + custom bindings.
  - `hedgewars/uInputHandler.pas`
  - Touch path in `hedgewars/uTouch.pas`
- Networking/IPC uses SDL_net TCP sockets (mostly localhost IPC).
  - `hedgewars/uIO.pas`
- Files/Assets use PhysFS and on-disk assets under `share/`.
  - `hedgewars/uPhysFSLayer.pas`, plus many `LoadDataImage*` paths in `hedgewars/uStore.pas`
- Video recording uses `glReadPixels` + ffmpeg wrapper in `hedgewars/avwrapper/`.
  - `hedgewars/uVideoRec.pas`

Port Surface Areas (What Must Change for Web)
1) Build pipeline / language target
   - Engine is FreePascal. There are `PAS2C` code paths which hint at a Pascal-to-C path.
   - Decide between:
     - FPC -> wasm (if viable for your toolchain and the SDL/OpenGL bindings).
     - pas2c -> C -> Emscripten/wasm (existing `PAS2C` conditionals suggest this may already be exercised).

2) Graphics (Phase 1: WebGL 2)
   - Current code assumes OpenGL (fixed pipeline + optional GL2 shaders).
   - WebGL 2 can map to the GL2 path more directly than WebGPU.
   - SDL window/context creation must be replaced; rendering target is the WebGL 2 canvas.

3) Audio
   - Replace SDL_mixer usage with WebAudio:
     - Decode OGG/OPUS in JS (or pre-decode on build).
     - Implement channel mixing, loops, and volume logic exposed via C/Pascal bindings.

4) Input
   - Replace SDL event loop with browser event handling:
     - Keyboard/mouse/touch/gamepad -> translate to the engine’s `ProcessKey`, `ProcessMouse*`, `Controller*` calls.

5) File I/O / assets
   - PhysFS must be backed by a virtual FS or asset pack in wasm.
   - All `LoadDataImage*` and sound/font assets need preloading.

6) Networking / IPC
   - SDL_net TCP sockets won’t work in browsers.
   - Replace IPC with JS-side messaging (e.g., WebSocket to server; or direct in-page calls if frontend is JS).

7) Video recording
   - `uVideoRec.pas` depends on OpenGL readback + ffmpeg.
   - Likely disable for web or replace with JS MediaRecorder + WebGPU readback path.

Feasibility Summary
Feasible but non-trivial. The biggest lifts are:
- Getting Pascal -> wasm working reliably with all runtime features.
- Replacing the OpenGL renderer with WebGL 2 (moderate rewrite).
- Replacing SDL_mixer + SDL_net with Web APIs (audio + networking).
WebGL 2 as the initial target is significantly more manageable than a direct WebGPU rewrite.

Proposed Plan (Initial)
1) Build path decision + minimal wasm bootstrap
   - Use `pas2c` to generate C, then Emscripten to wasm.
   - Produce a minimal wasm build that runs the engine loop with stubbed render/audio.
   - Outcome: a headless or no-op render build that runs game ticks.

2) Platform abstraction layer
   - Introduce a thin “platform” module that isolates:
     - timers, window size, input queue, audio play/stop, texture upload, file loads.
   - Replace direct SDL calls in `hwengine.pas`, `uStore.pas`, `uSound.pas`, `uIO.pas` with wrappers.

3) Web input implementation
   - JS event handlers -> feed an input queue exported to wasm.
   - Map to `ProcessKey`, `ProcessMouseButton`, `ProcessMouseMotion`, touch handlers.

4) Web audio implementation
   - Build a JS audio backend mirroring `uSound` functions (play, loop, stop, volume, fade).
   - Start with OGG only, fallback to WAV if needed.

5) WebGL 2 renderer (initial)
   - Replace OpenGL texture creation/render calls with a WebGL 2 backend.
   - Port `uRender`/`uRenderUtils` to build draw lists and issue WebGL calls.
   - Implement a minimal subset first: sprites, basic primitives, text textures.

6) WebGPU migration (later)
   - Once WebGL 2 is stable, plan a WebGPU renderer swap.
   - Use the WebGL 2 draw list as the API boundary to keep the rewrite contained.

6) Asset pipeline
   - Bundle `share/` assets into a preload pack.
   - Provide a virtual FS mapping expected paths to in-memory assets.

7) Networking/IPCs
   - Replace `SDL_net` IPC with a JS message bridge.
   - If multiplayer is needed, wire a WebSocket client.

8) Optional features
   - Video recording: disable or re-implement via JS capture.
   - Gamepad support: map Gamepad API to controller events.

Build Pipeline (Flexible, Spacegame-Style)
- Keep the CMake + Emscripten build as the core pipeline.
- Output artifacts into a predictable folder (e.g., `build/wasm/hedgewars.js` + `hedgewars.wasm` + data pack).
- Add a lightweight web wrapper (similar to `spacegame/index.html`) that:
  - Creates the canvas.
  - Loads the Emscripten module.
  - Wires JS input/audio/FS glue.
- Optional: add a dev server/bundler layer for ergonomics (e.g., Vite) while keeping the wasm output decoupled.
  - This makes it easy to swap UI frameworks or host on any static server.

Concrete Folder Layout
- `build/wasm/` (CMake/Emscripten output)
  - `hedgewars.js`
  - `hedgewars.wasm`
  - `hedgewars.data` (packed assets)
- `web/`
  - `index.html`
  - `app.js`

Exact Build Commands (Windows, PowerShell)
1) Configure:
```powershell
emcmake cmake -S . -B build/wasm `
  -DCMAKE_BUILD_TYPE=Release `
  -DBUILD_ENGINE_C=1
```

2) Build:
```powershell
emmake cmake --build build/wasm -j
```

3) Asset pack flags (set in CMake cache for the Emscripten link step):
```powershell
emcmake cmake -S . -B build/wasm `
  -DCMAKE_BUILD_TYPE=Release `
  -DBUILD_ENGINE_C=1 `
  -DCMAKE_EXE_LINKER_FLAGS="--preload-file share@/share -s FORCE_FILESYSTEM=1 -s USE_SDL=2 -s USE_WEBGL2=1 -s FULL_ES3=1"
```

Notes:
- You can add more folders to `--preload-file` as needed (e.g., `doc@/doc`, `hedgewars/Data@/Data` if applicable).
- For debug builds, add `-s ASSERTIONS=1 -s SAFE_HEAP=1` to `CMAKE_EXE_LINKER_FLAGS`.

Risks / Open Questions
- The exact viability of FPC -> wasm vs pas2c -> C -> wasm on this codebase.
- SDL_image/SDL_ttf paths used for intermediate surfaces before texture upload (needs replacement).
- Performance of immediate-mode style rendering in WebGPU without batching (may require batching refactor).

Notes for Next Iteration
This plan should be updated once we pick the wasm toolchain and confirm a minimal build path.
