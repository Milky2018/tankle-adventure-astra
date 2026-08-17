# Rejected Prototype

A compact 3D tank Metroidvania vertical slice built with Vite, TypeScript, and Three.js. The first level follows a complete ability-gated loop through an abandoned cartoon-industrial factory.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by Vite. The game targets a desktop browser with keyboard and mouse input.

## Controls

- `W` / `S`: drive forward or reverse
- `A` / `D`: steer the hull
- Mouse: orbit the camera and aim the turret
- Left mouse button: fire
- `Shift`: engage Overdrive after acquiring it
- `E`: activate a Repair Hive
- `Tab`: open or close the Region Map
- `Escape`: pause
- `Space`: skip the death sequence

Every gameplay key can be rebound from Settings.

## Quality gates

```sh
npm run check
npm test
npm run build
```

The complete game design is recorded in [GAME_DESIGN.md](./GAME_DESIGN.md). Architectural decisions live in [docs/adr](./docs/adr).
