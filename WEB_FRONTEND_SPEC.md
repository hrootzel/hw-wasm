# Hedgewars Web Frontend Specification

## Overview

A canvas-based JavaScript frontend for Hedgewars WASM, providing feature parity with the Qt desktop frontend for single-player functionality. Uses custom-rendered UI widgets styled with original game graphics.

## Design Decisions

- **Rendering**: Retained-mode scene graph on HTML5 Canvas 2D
- **Resolution**: Fixed internal resolution (1024×768), scaled to fit browser window
- **Audio**: Web Audio API for UI sounds
- **Storage**: localStorage for teams, schemes, weapon sets, key bindings
- **Engine Integration**: Launch via `Module.callMain(['--webcfg64', base64config])`

---

## Project Structure

```
web-frontend/
├── index.html              # Entry point, canvas container
├── main.js                 # Bootstrap, asset loading, app init
├── assets.js               # Asset manifest and loader
│
├── ui/
│   ├── core.js             # Canvas setup, render loop, event routing
│   ├── scene.js            # Scene graph (Node, Container, Page)
│   ├── widgets.js          # Button, Label, Checkbox, Slider, TextInput
│   ├── widgets-adv.js      # Dropdown, ScrollList, TabPanel
│   ├── weapon-grid.js      # Weapon selection matrix widget
│   ├── theme.js            # Sprite refs, colors, fonts, UI sounds
│   └── transitions.js      # Page transition animations
│
├── pages/
│   ├── main-menu.js        # Front page (logo, main buttons)
│   ├── single-player.js    # Single player submenu
│   ├── local-game.js       # Map/team selection, game launch
│   ├── team-editor.js      # Team creation/editing
│   ├── team-select.js      # Team picker for local game
│   ├── scheme-editor.js    # Game scheme configuration
│   ├── weapon-editor.js    # Weapon set configuration
│   ├── settings.js         # General settings (audio, video)
│   ├── controls.js         # Key binding configuration
│   └── page-base.js        # Base page class
│
├── data/
│   ├── storage.js          # localStorage wrapper (teams, schemes, etc)
│   ├── defaults.js         # Default teams, schemes, weapon sets
│   └── config-builder.js   # Build webcfg64 for engine launch
│
└── util/
    ├── input.js            # Keyboard/mouse event normalization
    ├── audio.js            # Web Audio wrapper
    └── math.js             # Rect, Point, clamp, lerp
```

---

## Core UI Framework

### Scene Graph (`ui/scene.js`)

```
Node (base)
├── x, y, width, height, visible, alpha, rotation, scale
├── parent, children[]
├── hitTest(x, y) → bool
├── localToGlobal(x, y) / globalToLocal(x, y)
├── addChild(node) / removeChild(node)
└── draw(ctx) — override in subclasses

Container extends Node
└── Clips children to bounds (optional)

Page extends Container
├── onEnter() / onExit() — lifecycle hooks
├── onResize(w, h) — layout adjustment
└── transition state (entering/exiting/active)
```

### Core Loop (`ui/core.js`)

- `init(canvas)` — setup canvas, start loop
- `pushPage(page)` / `popPage()` / `replacePage(page)`
- `render()` — traverse scene graph, draw dirty nodes
- `update(dt)` — animations, transitions
- Event dispatch: `mousedown`, `mouseup`, `mousemove`, `keydown`, `keyup`

### Widget Set (`ui/widgets.js`)

| Widget | Description |
|--------|-------------|
| `Button` | Image + text, states: normal/hover/active/disabled, click sound |
| `ImageButton` | Image-only button (for icons) |
| `Label` | Styled text, alignment, word wrap |
| `Checkbox` | Custom graphic toggle |
| `Slider` | Horizontal slider with custom track/thumb |
| `TextInput` | Single-line text entry, cursor, selection |
| `NumericInput` | TextInput constrained to numbers |

### Advanced Widgets (`ui/widgets-adv.js`)

| Widget | Description |
|--------|-------------|
| `Dropdown` | Button that opens a selection list |
| `ScrollList` | Scrollable item list with custom scrollbar |
| `ScrollPanel` | Scrollable container (for large content) |
| `TabPanel` | Tabbed container |
| `ItemGrid` | Grid of selectable items (hats, graves, flags) |

### Weapon Grid (`ui/weapon-grid.js`)

Special widget for weapon/utility configuration:
- Grid of weapon icons
- Per-weapon: ammo count (0-9, ∞), delay, crate probability
- Scrollable if needed
- Tooltip on hover

---

## Pages

### Main Menu (`pages/main-menu.js`)

- Hedgewars logo (animated)
- Background (from Frontend graphics)
- Buttons:
  - **Local Game** → `local-game.js`
  - **Settings** → `settings.js`
  - Exit (closes/hides — optional)
- Flying hedgehogs background animation (optional, later)

### Single Player Menu (`pages/single-player.js`)

- **Simple Game** (quick match vs AI)
- **Local Game** (full configuration)
- **Back** → main menu

### Local Game (`pages/local-game.js`)

- Map selection panel:
  - Map type dropdown (random, maze, drawn, preset)
  - Theme selector
  - Map preview
  - Seed input
  - Template/maze size (contextual)
- Team selection:
  - Available teams list
  - Playing teams (2+ slots)
  - Team color picker
  - Hedgehog count per team
- Game scheme dropdown
- Weapon set dropdown
- **Start Game** button → build config, launch engine
- **Back** → single player menu

### Team Editor (`pages/team-editor.js`)

- Team list (left panel)
- Edit panel (right):
  - Team name
  - 8 hedgehog names
  - Fort selection (grid)
  - Flag selection (grid)
  - Grave selection (grid)
  - Voice selection (dropdown + preview)
  - Difficulty (for AI teams)
- **New Team** / **Delete Team** / **Save** / **Back**

### Scheme Editor (`pages/scheme-editor.js`)

- Scheme list (left)
- Edit panel (right):
  - All game modifiers (checkboxes, sliders, dropdowns)
  - Grouped by category
- **New** / **Delete** / **Save** / **Back**

### Weapon Editor (`pages/weapon-editor.js`)

- Weapon set list (left)
- Weapon grid (right):
  - Initial ammo
  - Probability (crate drops)
  - Delay (turns before available)
  - Crate ammo
- **New** / **Delete** / **Save** / **Back**

### Settings (`pages/settings.js`)

- **Controls** → `controls.js`
- Audio volume (music, effects)
- Language (dropdown)
- **Back**

### Controls (`pages/controls.js`)

- Scrollable list of actions
- Current binding display
- Click to rebind (capture next key)
- Reset to defaults
- **Back**

---

## Asset Loading

### Required Assets (from `share/hedgewars/Data/`)

```
Graphics/Frontend/
  - Background, buttons, UI elements
  - Hedgehog sprites for menu animation

Graphics/AmmoMenu/
  - Weapon icons (Ammos.png atlas or individual)

Graphics/Flags/
Graphics/Graves/
Graphics/Hats/
Graphics/Forts/
  - Team customization options

Graphics/Maps/
  - Map previews (or generate via engine)

Fonts/
  - Primary UI font

Sounds/
  - UI click, hover sounds
  - Voice previews
```

### Asset Manifest (`assets.js`)

Define which assets to preload vs lazy-load:
- **Preload**: Frontend graphics, fonts, UI sounds, weapon icons
- **Lazy**: Hats, graves, flags, forts, map previews (load when page opens)

---

## Data Storage

### localStorage Keys

| Key | Content |
|-----|---------|
| `hw.teams` | JSON array of team objects |
| `hw.schemes` | JSON array of scheme objects |
| `hw.weapons` | JSON array of weapon set objects |
| `hw.bindings` | JSON key binding map |
| `hw.settings` | JSON settings (volume, language, etc) |

### Default Data (`data/defaults.js`)

- 2-3 default teams (Hedgehogs, Ninjas, etc)
- Default schemes (Normal, Pro Mode, Shoppa, etc)
- Default weapon sets (Normal, Pro Mode, etc)
- Default key bindings (matching desktop defaults)

---

## Engine Integration

### Config Builder (`data/config-builder.js`)

Build the `webcfg64` base64 string from:
- Selected map configuration
- Playing teams (with colors, hog counts)
- Selected scheme
- Selected weapon set
- Seed

Format matches what the Qt frontend sends via IPC.

### Launch Flow

1. User clicks "Start Game"
2. Build config object
3. Encode to base64
4. Store in `localStorage['hw-wasm-webcfg64']`
5. Navigate to `hwengine.html` (or embed engine canvas)

---

## Rendering Details

### Internal Resolution

- Base: 1024×768
- Canvas scaled to fit window (maintain aspect ratio)
- Mouse coordinates transformed to internal space

### Theming (`ui/theme.js`)

```javascript
theme = {
  fonts: {
    title: { family: 'HW-Font', size: 48 },
    button: { family: 'HW-Font', size: 24 },
    body: { family: 'HW-Font', size: 18 },
  },
  colors: {
    text: '#FFFFFF',
    textShadow: '#000000',
    highlight: '#FFCC00',
  },
  sprites: {
    buttonNormal: { src: 'Frontend/Button.png', ... },
    buttonHover: { ... },
    scrollTrack: { ... },
    scrollThumb: { ... },
    checkbox: { ... },
    checkboxChecked: { ... },
  },
  sounds: {
    click: 'UI/Click.ogg',
    hover: 'UI/Hover.ogg',
  }
}
```

---

## Implementation Phases

### Phase 1: Core Framework
- [ ] Canvas setup, scaling, event handling
- [ ] Scene graph (Node, Container, Page)
- [ ] Page stack with transitions
- [ ] Basic widgets: Button, Label
- [ ] Asset loader (images, sounds)
- [ ] Audio system (Web Audio)
- [ ] Main menu page (static, buttons work)

### Phase 2: Settings & Teams
- [ ] Remaining widgets: Checkbox, Slider, TextInput, Dropdown, ScrollList
- [ ] localStorage wrapper
- [ ] Settings page (audio, language)
- [ ] Controls page (key bindings)
- [ ] Team editor page
- [ ] Item grids (hats, flags, graves, forts)

### Phase 3: Game Configuration
- [ ] Scheme editor page
- [ ] Weapon editor page (weapon grid widget)
- [ ] Local game page (map selection, team picker)
- [ ] Config builder
- [ ] Engine launch integration

### Phase 4: Polish
- [ ] Page transitions / animations
- [ ] Background animations (flying hogs)
- [ ] Sound effects throughout
- [ ] Error handling / validation
- [ ] Loading screen

---

## Out of Scope (Cut Features)

The following Qt frontend features are **not included** in this implementation:

### Networking
- Online multiplayer
- Server browser / room list
- Net game lobby
- Chat system
- Player registration / login

### Campaigns & Missions
- Campaign mode
- Training missions
- Mission browser

### Video
- Demo playback browser
- Video recording
- Video encoding settings

### Advanced Features
- Feedback dialog
- Data downloader (DLC)
- Auto-updater
- Statistics tracking (online)
- Admin panel

### Platform-Specific
- SDL audio/joystick integration
- Native file dialogs
- System tray

### Deferred (Maybe Later)
- Drawn map editor
- Map preview generation (use static images initially)
- Gamepad support
- Touch controls
- Localization (start English-only)

---

## File References

Key Qt frontend files for reference when implementing:

| Feature | Qt Source |
|---------|-----------|
| Main menu | `frontend-qt6/ui/page/pagemain.cpp` |
| Team editor | `frontend-qt6/ui/page/pageeditteam.cpp` |
| Scheme editor | `frontend-qt6/ui/page/pagescheme.cpp` |
| Weapon editor | `frontend-qt6/ui/widget/selectWeapon.cpp` |
| Key bindings | `frontend-qt6/ui/widget/keybinder.cpp` |
| Map container | `frontend-qt6/ui/widget/mapContainer.cpp` |
| Game config | `frontend-qt6/ui/widget/gamecfgwidget.cpp` |
| Team select | `frontend-qt6/ui/widget/teamselect.cpp` |
| Config builder | `frontend-qt6/game.cpp` (commonConfig, etc) |
| Default schemes | `frontend-qt6/model/gameSchemeModel.cpp` |
| Default weapons | `frontend-qt6/weapons.h` |
| Default bindings | `frontend-qt6/binds.cpp` |

---

## Notes

- The engine already handles all game logic; the frontend is purely configuration UI
- All game data (teams, schemes, weapons) is serialized to the same format the Qt frontend uses
- The `webcfg64` bridge is already implemented in the engine shell
