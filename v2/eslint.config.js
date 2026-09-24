import globals from 'globals';

// Guard the extracted code against missing references without imposing a
// repository-wide style migration on the historical game.
export default [
  {
    files: [
      'src/app/session.js',
      'src/content/compile.js',
      'src/progression/save-migrations.js',
      'src/rendering/palette.js',
      'src/app/state.js',
      'src/machinery/state.js',
      'src/combat/enemy-state.js',
      'src/progression/commands.js',
      'src/machinery/signal-state.js',
      'src/rendering/render-policy.js',
      'src/rendering/occlusion.js',
      'src/machinery/circuits.js',
      'src/world/terrain.js',
      'src/rendering/scene.js',
      'src/rendering/presentation.js',
      'src/rendering/visibility.js',
      'src/player/upgrades.js',
      'src/combat/ballistics.js',
      'src/content/exploration-layout.js',
      'src/rendering/materials.js',
      'src/rendering/backdrop.js',
      'src/rendering/regional-scenery.js',
      'src/audio/playback.js',
      'src/audio/sound-effects.js',
      'src/rendering/player-death.js',
      'src/ui/settings.js',
      'src/rendering/effects.js',
      'src/app/profiler.js',
      'src/combat/enemy-ai.js',
      'src/combat/enemy-rules.js',
      'src/rendering/enemy-view.js',

      'src/combat/projectiles.js',
      'src/app/input.js',
      'src/ui/map.js',
      'src/progression/save.js',
      'src/combat/weapons.js',
      'src/combat/laser.js',
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
