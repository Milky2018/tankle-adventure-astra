import { initialFoldedState, serializeFoldedState } from '../app/state.js';

export const SETTINGS_KEY = 'furnace-born-v2-settings';

// Storage failure must never interrupt play. Loading preserves the existing
// campaign/preview keys and delegates old-save migration to the game rules.
export function createFoldedSave(route, storage = () => localStorage) {
  const freight = route === 'freight';
  const garden = route === 'garden';
  const preview = freight || garden || route === 'foundry';
  const key = preview ? `furnace-born-v2-folded-${route}` : 'furnace-born-v2-city';

  function read(key) {
    try {
      return JSON.parse(storage().getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function write(key, data) {
    try {
      storage().setItem(key, JSON.stringify(data));
    } catch {
      // A denied or full store leaves the running game usable.
    }
  }

  function load() {
    const start =
      freight || garden
        ? {
            anchor: freight ? 'loading-entry' : 'garden-entry',
            discovered: [freight ? 'loading' : 'ferry-approach'],
          }
        : { anchor: 'awakening', discovered: ['foundry-awakening'] };
    const prior =
      freight || garden
        ? {
            foundry: true,
            prototype: true,
            overdrive: true,
            'overdrive-return': true,
            relays: true,
            'relay-west': true,
            'relay-east': true,
            ...(garden ? { magnetModule: true } : { mortarModule: true, 'bridge-crane': true }),
          }
        : {};
    return initialFoldedState({ ...(read(key) || start), ...prior });
  }

  return {
    load,
    save: (state) => write(key, serializeFoldedState(state)),
    loadSettings: () => read(SETTINGS_KEY) || {},
    saveSettings: (settings) => write(SETTINGS_KEY, settings),
    reset() {
      try {
        storage().removeItem(key);
      } catch {
        /* Keep the current session usable. */
      }
    },
  };
}
