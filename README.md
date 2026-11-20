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
- **Central Campfire Clearing**: Ring of granite stones, wood stack, animated flickering flame meshes, floating ember particles, and cozy sitting logs.
- **Scenic Mountain Hiking Trail**: Winding switchback trail with wooden markers leading up to **Eagle Peak** (lookout deck, summit bench, telescope, and pennant flag).
- **Choppable Pine Forest**: 30+ low-poly coniferous pine trees with trunk health, wobble physics, wood-chip particles, and falling firewood logs.
- **Lake Area**: Low-poly water with gentle wave motion, shoreline reeds, and a wooden fishing dock/pier.
- **Smooth Day-to-Night Lighting Cycle**: Moving sun and moon, dynamic sky and fog gradients (Dawn, Noon, Sunset, Dusk, Midnight), 650+ twinkling stars at night, and warm campfire lighting that glows brighter when firewood is added.

### 3. PC & Mobile Touch Controls + Interactions
- **PC Controls**:
  - `W`, `A`, `S`, `D` / Arrows: Move
  - `Shift`: Sprint
  - `Space`: Jump / Stand up
  - Mouse Drag / Pointer Lock: Look around smoothly
  - `E`: Contextual interaction (Chop, Fish, Pick up log, Add firewood, Sit)
- **Mobile Touch Controls**:
  - Virtual Joystick on the bottom-left with draggable thumb knob.
  - Camera touch-drag area on the right half of the screen.
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
│   │   ├── campsite.js         # Procedural terrain, lake, campfire, hiking trail, forest
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
