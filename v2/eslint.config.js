import globals from 'globals';

// Guard the extracted code against missing references without imposing a
// repository-wide style migration on the historical game.
export default [
  {
    files: [
      'src/folded.js',
      'src/folded-content.js',
      'src/folded-save-migrations.js',
      'src/folded-palette.js',
      'src/folded-state.js',
      'src/folded-progression.js',
      'src/folded-signal-state.js',
      'src/folded-render-policy.js',
      'src/folded-occlusion.js',
      'src/folded-circuits.js',
      'src/folded-layout.js',
      'src/folded-world.js',
      'src/folded-presentation.js',
      'src/folded-visibility.js',
      'src/folded-upgrades.js',
      'src/folded-ballistics.js',
      'src/folded-exploration-layout.js',
      'src/folded-materials.js',
      'src/folded-backdrop.js',
      'src/folded-regional-scenery.js',
      'src/audio.js',
      'src/sound-effects.js',
      'src/folded-death.js',
      'src/folded-settings.js',
      'src/folded-effects.js',
      'src/folded-profiler.js',
      'src/folded-ai.js',
      'src/folded-enemy-rules.js',
      'src/folded-enemy-view.js',

      'src/folded-projectiles.js',
      'src/folded-input.js',
      'src/folded-map.js',
      'src/folded-save.js',
      'src/folded-weapons.js',
      'src/folded-laser.js',
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
