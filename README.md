# 🏕️ CAMING-WITH-FRIENDS — 3D Multiplayer Browser Campsite & Voice Chat

A cozy, low-poly 3D multiplayer browser camping game for up to 5 friends built with **Three.js**, **Vite**, and **PeerJS (WebRTC)**. Features 3D spatial gameplay, real-time voice chat, day/night lighting cycles, interactive forestry and fishing, and synced campfire party games. Works smoothly on both **PC and mobile touchscreens**, hosted as a **100% static site** with zero backend server required.

---

## ✨ Features

### 1. Lobby, Character Select & Voice Chat (Max 5 Campers)
- **Private 5-Player Lobbies**: Create or join a private campsite using a custom **Room Name** and **Room Password**.
- **4 Distinct 3D Camper Avatars**:
  1. 🤠 **Ranger Rick**: Forest green park ranger outfit, wide-brim felt hat, ranger badge, and utility boots.
  2. 🧣 **Cozy Billie**: Mustard yellow knit sweater, cherry red pom-pom beanie, woolen scarf, and blue jeans.
  3. 🧭 **Explorer Ash**: Safari adventurer fedora with feather, rolled sleeves, utility vest, and canvas backpack.
  4. 🧢 **Scout Maya**: Red plaid flannel shirt, denim overalls, backward baseball cap, and canteen bottle.
- **PeerJS P2P Networking**: Host peer ID is derived from the Room Name (`campfire-v1-[roomName]`); host validates the room password when campers join.
- **WebRTC Voice Chat (Mic)**: Campers talk live with friends over microphones in crystal-clear P2P audio. Includes on-screen **Mic Toggle** and dynamic speaking indicator bubbles above players' heads.

### 2. 3D Campsite World & Day/Night Cycle
- **Spacious Wooden Log Cabin House**:
  - Replaces canvas tents with a cozy low-poly log cabin sitting firmly on the terrain near the campsite clearing.
  - Features stone foundation, warm glowing windows that illuminate softly at night, a pitched wooden gable roof, and a front porch with steps and railings.
  - Cozy interior with rustic furniture: red braided rug, dining table with benches, stone fireplace hearth with glowing embers, sleeping bunk, and interior ceiling lantern.
  - **Functional Hinged Front Door**: Press [E] on PC or the mobile Interact button to smoothly swing the door open/closed with audio creak effects. Door state syncs in real time across all players via PeerJS, allowing campers to enter and hang out inside!
  - Solid wall obstacle colliders prevent walking through cabin walls, with dynamic doorway collision that clears when the door is opened.
- **Central Campfire Clearing**: Ring of granite stones, wood stack, animated flickering flame meshes, floating ember particles, and cozy sitting logs.
- **Scenic Mountain Hiking Trail**: Winding switchback trail with wooden markers leading up to **Eagle Peak** (lookout deck, summit bench, telescope, and pennant flag).
- **Choppable Pine Forest**: 30+ low-poly coniferous pine trees with trunk health, wobble physics, wood-chip particles, and falling firewood logs.
- **Solid Fishing Pier & Animated Swimming Fish**:
  - Solid wooden fishing dock extending into the lake with walkable planks that campers can walk onto and fish from without falling through.
  - **12–15 Animated Swimming Fish**: Colorful low-poly fish swimming gracefully below the water surface with wiggling tail fins, wandering along curved paths, confined within lake boundaries, reacting to fishing lines, and startling away from swimming players.
- **Realistic Lake Sinking & Swimming Physics**:
  - Stepping or diving into the lake water submerges the character down to chest/neck level (`waterY - 0.78`) with water bobbing and breaststroke swimming animations, rather than walking unrealistically on top of the water.
- **Smooth 16-Minute Day-to-Night Lighting Cycle**:
  - **10-Minute Daytime (600s)**: Bright sunny skies, warm atmospheric mountain colors, clear visibility, and crisp directional sunlight.
  - **6-Minute Nighttime (360s)**: Seamless transition to a true dark starry night with a deep navy-black sky, 700+ twinkling stars, dimmed cool moonlight, and warm glowing campfire, lantern, and cabin window lights.
  - **Synchronized HUD Clock**: Automatically stays in sync with the 16-minute day/night cycle.
- **Exact Surface Snapping**: Zero floating gap—character feet sit firmly on the ground surface, solid dock planks, and cabin floors using multi-mesh downward raycasting.

### 3. PC Mouse & Trackpad 360° Camera Orbit Controls
- **PC Pointer Lock (No-Click Mouse & Trackpad Look)**:
  - Clicking anywhere on the 3D game canvas activates **Pointer Lock** (`requestPointerLock()`), allowing natural 360° camera look (yaw and pitch) simply by moving the mouse or sliding one finger on a laptop trackpad without holding down any mouse button.
  - Pressing `ESC` unlocks the cursor normally to click HUD buttons, view cards, or type in chat. Clicking back on the 3D canvas re-locks the cursor.
  - Traditional click-and-drag camera orbiting remains fully supported as a fallback.
- **Laptop Trackpad Two-Finger Gestures & Wheel Zoom**:
  - Two-finger horizontal swipe on laptop trackpads (`wheel` event `deltaX`) smoothly rotates the camera horizontally.
  - Vertical two-finger scroll (`deltaY`) or mouse wheel smoothly zooms the camera in and out.
- **Laptop Keyboard Look Orbit Fallback**:
  - Left / Right / Up / Down Arrow keys (or `I`, `J`, `K`, `L`) smoothly orbit the camera horizontally and vertically, allowing complete keyboard-only exploration without needing a mouse.
  - `W`, `A`, `S`, `D`: Move character relative to camera orientation.
  - `Shift`: Sprint | `Space`: Jump / Stand up / Splash | `E`: Contextual interact.
- **Clean On-Screen HUD Hint**: Subtle HUD indicator informing PC players: `🖱️ Click screen to look around with mouse/trackpad • ESC to unlock cursor`.
- **Mobile Touch Controls**:
  - Drag one finger on the right side of the screen to smoothly rotate the camera 360 degrees.
  - Virtual Joystick on the bottom-left with draggable thumb knob.
  - Large contextual **Interact** button and **Jump** button.
- **Contextual Interactions**:
  - **Chop Tree**: Swings axe, tree shakes, drops firewood logs.
  - **Firewood Gathering & Campfire Boosting**: Pick up logs and add them to the campfire to increase flame scale, light radius, and crackling sound.
  - **Lake Fishing**: Cast your line from the dock to play a timing mini-game. Catch Rainbow Trout, Brook Charr, Mountain Salmon, or the legendary Golden Alpine Carp!
  - **Lake Swimming**: Jumping or walking into the lake transitions into swimming mode with breaststroke animations.
  - **Sit by Campfire**: Sit on wooden logs around the fire to open the synced Campfire Party Games overlay.

### 4. Campfire Side Games (Synced Overlay)
- **Guess the Movie / TV Show / Actor**: Emoji trivia clues (e.g., 🧙‍♂️🧝‍♂️💍🌋, 🧪👨‍🔬🍗💰, 🦖🦕🏝️🚙, 🚢🧊💔🚪, 🦇🃏🌃, 🕸️🕷️🧑) with real-time guess submission, hints, and a live campfire leaderboard!
- **Worthwhile Q&A Deck**: Curated thoughtful, deep, and hilarious conversation starter cards with synced "Next Card" and "Previous Card" navigation.
- **Campers Live Chat**: Text chat feed with quick emoji reactions (🔥, 🌲, 🎣, ⛺️, 🎉).

---

## 🛠️ Tech Stack

- **3D Graphics:** Three.js
- **Bundler & Dev Server:** Vite
- **Multiplayer & Voice Chat:** PeerJS (WebRTC P2P Data & Media streams)
- **Procedural Audio:** Web Audio API (Synthesized crackling campfire, footsteps, wood chopping thuds, water splashes)
- **Hosting:** Static web deployment (GitHub Pages / Vercel / Netlify)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) and `npm`

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
npm run build
```
The optimized static build will be in the `dist/` directory, ready to deploy.

---

## 📁 Project Architecture

```
campfire/
├── index.html                  # HTML entry point with viewport & font setup
├── package.json                # Dependencies: three, peerjs, vite
├── vite.config.js              # Vite server configuration
├── src/
│   ├── main.js                 # Game loop, Three.js init, state coordinator
│   ├── style.css               # Glassmorphism theme, HUD, touch controls, modals
│   ├── network/
│   │   └── peerManager.js      # PeerJS P2P data & WebRTC voice connection manager
│   ├── world/
│   │   ├── campsite.js         # Procedural terrain, lake, solid dock, log cabin, campfire, hiking trail, forest
│   │   ├── lakeFish.js         # 14 animated swimming lake fish with wiggling tail fins & behavioral reactions
│   │   └── dayNightCycle.js    # Sun/moon lighting, sky colors, fog, and star dome
│   ├── player/
│   │   ├── characterModel.js   # 4 camper presets, low-poly body parts, nametags, animations
│   │   ├── playerController.js # PC/touch movement, third-person camera, collisions
│   │   └── otherPlayers.js     # Remote player interpolation, animation sync, speaking indicators
│   ├── interactions/
│   │   └── interactionManager.js # Chopping, firewood gathering, fishing mini-game, sitting
│   ├── games/
│   │   └── partyGames.js       # Synced movie emoji trivia & Worthwhile Q&A deck
│   └── utils/
│       └── soundFX.js          # Web Audio API procedural sound synthesizer (no external audio files needed)
```

---

## 🌐 Deployment

Because this project is a 100% static web app using PeerJS WebRTC connections, it can be hosted for free on **GitHub Pages**, **Vercel**, or **Netlify**.

*(Note: In production, `HTTPS` is required by web browsers for microphone permissions, which GitHub Pages, Vercel, and Netlify provide automatically).*
