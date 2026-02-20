# {{name}} - PixiJS 2D Game

A high-performance 2D game built with PixiJS on the VAG (Vibe AI Game Engine) platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── main.ts              # Entry point
├── engine/
│   ├── Engine.ts        # Core engine
│   ├── World.ts         # World management
│   └── Input.ts         # Input handling
├── game/
│   └── MainScene.ts     # Main game scene
├── audio/
│   └── AudioSystem.ts   # Audio management
└── platform/
    └── Bridge.ts        # Platform communication
```

## Features

- **PixiJS 8** - High-performance 2D WebGL rendering
- **TypeScript** - Type-safe game development
- **Vite** - Fast development with HMR
- **Audio System** - Built-in sound management

## Controls

- **Arrow Keys / WASD** - Movement
- Customize controls in `Input.ts`

## Author

Created with **VAG - Vibe AI Game Engine**

## Design Notes

*Add your game design notes here*

- Game concept
- Core mechanics
- Visual style
- Performance targets

## AI Prompts Used

*Record the AI prompts that helped create this game*

```
Example: "Create a particle effects system for explosions"
```

## License

MIT
