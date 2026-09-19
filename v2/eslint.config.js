import globals from 'globals';

// Guard the extracted code against missing references without imposing a
// repository-wide style migration on the historical game.
export default [
  {
    files: [
      'src/folded.js',
      'src/folded-upgrades.js',
      'src/folded-ballistics.js',
      'src/folded-exploration-layout.js',
      'src/folded-materials.js',
      'src/folded-backdrop.js',
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
