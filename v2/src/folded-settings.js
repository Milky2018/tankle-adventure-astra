import { DEFAULT_BINDINGS, clamp } from './mechanics.js';

const DEFAULT_CITY_BINDINGS = { ...DEFAULT_BINDINGS, camera: 'KeyC' };
const cameraFields = {
  third: [
    ['pitch', 'Pitch', -30, 54, 0.1, 15.3, '°'],
    ['distance', 'Follow distance', 6, 20, 0.5, 15, ''],
    ['height', 'Camera height', 0, 5, 0.1, 2.5, ''],
    ['shoulder', 'Shoulder offset', -3, 3, 0.1, 0, ''],
    ['sensitivity', 'Mouse sensitivity', 1, 10, 0.1, 3, ''],
  ],
  overhead: [
    [
      'angle',
      'Overhead angle',
      30,
      70,
      1,
      (Math.atan2(39.6, Math.hypot(28, 28)) * 180) / Math.PI,
      '°',
    ],
    ['scale', 'View scale', 12, 28, 0.5, 17, ''],
  ],
};

// Keep the same objects for input, HUD and camera consumers when resetting values.
export function createFoldedPreferences(saved, persist) {
  const values = {
    ...saved,
    bindings: { ...DEFAULT_CITY_BINDINGS, ...saved.bindings },
    volume: saved.volume ?? 0.55,
    music: saved.music ?? true,
    sfx: saved.sfx ?? true,
    quality: saved.quality || 'high',
    cameraView: saved.cameraView || 'third',
    cameraSettings: Object.fromEntries(
      Object.entries(cameraFields).map(([view, fields]) => [
        view,
        Object.fromEntries(
          fields.map(([key, , min, max, , fallback]) => {
            const value = saved.cameraSettings?.[view]?.[key];
            return [key, Number.isFinite(value) ? clamp(value, min, max) : fallback];
          }),
        ),
      ]),
    ),
  };
  return {
    values,
    save: () => persist(values),
    bind(action, code) {
      const old = values.bindings[action];
      for (const other of Object.keys(values.bindings))
        if (other !== action && values.bindings[other] === code) values.bindings[other] = old;
      values.bindings[action] = code;
    },
    resetBindings() {
      for (const action of Object.keys(values.bindings)) delete values.bindings[action];
      Object.assign(values.bindings, DEFAULT_CITY_BINDINGS);
    },
    resetCamera(view) {
      for (const [key, , , , , value] of cameraFields[view])
        values.cameraSettings[view][key] = value;
    },
  };
}

export function keyGlyph(el, code) {
  el.classList.toggle('mouse-key', code.startsWith('Mouse'));
  el.dataset.button = code;
  el.textContent = code.startsWith('Mouse') ? '' : code.replace('Key', '').replace('Left', '');
}

// Settings owns its DOM, rebinding transaction and preference persistence.
// The camera adapter previews/selects a view without advancing simulation.
export function mountFoldedSettings({ preferences, audio, renderer, camera, actions }) {
  const $ = (id) => document.getElementById(id),
    prefs = preferences.values;
  const { bindings, cameraSettings } = prefs;
  let rebind = null,
    resetArmed = false;
  function renderBindings() {
    $('bindings').replaceChildren();
    const labels = {
      up: 'Move forward',
      left: 'Move left',
      down: 'Move back',
      right: 'Move right',
      fire: 'Fire',
      magnet: 'Magnet',
      weapon: 'Cycle weapons',
      camera: 'Switch camera',
      flotation: 'Flotation',
      overdrive: 'Boost',
      map: 'Map',
      repair: 'Use / repair',
      skip: 'Skip',
      pause: 'Pause',
    };
    for (const action of Object.keys(DEFAULT_CITY_BINDINGS)) {
      const label = document.createElement('span'),
        b = document.createElement('button');
      label.textContent = labels[action];
      b.setAttribute('aria-label', `${labels[action]}: ${bindings[action]}`);
      b.classList.toggle('binding-listening', rebind === action);
      b.textContent =
        rebind === action
          ? 'Press a key…'
          : bindings[action]
              .replace(/^Key/, '')
              .replace('ShiftLeft', 'Left Shift')
              .replace('ShiftRight', 'Right Shift')
              .replace('Mouse0', 'Left mouse')
              .replace('Mouse1', 'Middle mouse')
              .replace('Mouse2', 'Right mouse')
              .replace('Space', 'Space')
              .replace('Escape', 'Esc');
      b.onclick = () => {
        rebind = action;
        renderBindings();
        $('bindings').querySelector('.binding-listening').focus();
      };
      $('bindings').append(label, b);
    }
    actions.bindingsChanged();
  }

  $('reset-bindings').onclick = () => {
    preferences.resetBindings();
    renderBindings();
    preferences.save();
  };
  $('new-game').onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      $('new-game').textContent = 'Erase save & restart';
      return;
    }
    actions.restart();
  };
  $('fullscreen').onclick = () =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
  $('volume').value = audio.volume;
  $('music').checked = audio.music;
  $('sfx').checked = audio.sfx;
  for (const id of ['volume', 'music', 'sfx'])
    $(id).onchange = () => {
      prefs.volume = audio.volume = Number($('volume').value);
      prefs.music = audio.music = $('music').checked;
      prefs.sfx = audio.sfx = $('sfx').checked;
      if (!audio.sfx) audio.effects?.setEnabled(false);
      audio.master?.gain.setTargetAtTime(audio.volume * 0.4, audio.ctx.currentTime, 0.15);
      if (audio.score?.state) audio.score.update({ ...audio.score.state, enabled: audio.music });
      preferences.save();
    };
  function quality() {
    const low = $('quality').value === 'low';
    renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = !low;
  }
  $('quality').value = prefs.quality;
  prefs.quality = $('quality').value;
  $('quality').onchange = () => {
    prefs.quality = $('quality').value;
    quality();
    preferences.save();
  };
  quality();
  const viewLabel = document.createElement('label');
  viewLabel.textContent = 'Camera view';
  const viewSelect = document.createElement('select');
  viewSelect.id = 'camera-view';
  viewSelect.setAttribute('aria-label', 'Camera view');
  viewSelect.innerHTML =
    '<option value="third">Third person</option><option value="overhead">Overhead</option>';
  viewLabel.append(viewSelect);
  $('quality').parentElement.after(viewLabel);
  const cameraTuning = document.createElement('section');
  cameraTuning.id = 'camera-tuning';
  cameraTuning.hidden = true;
  cameraTuning.setAttribute('aria-label', 'Camera adjustment');
  $('settings').append(cameraTuning);
  const tuneButton = document.createElement('button');
  tuneButton.textContent = 'Adjust camera';
  viewLabel.after(tuneButton);
  function closeCameraTuning() {
    const wasOpen = !cameraTuning.hidden;
    cameraTuning.hidden = true;
    $('settings').classList.remove('camera-tuning');
    if (wasOpen) tuneButton.focus();
  }
  function previewCamera() {
    camera.preview();
    preferences.save();
  }
  function openCameraTuning() {
    const view = prefs.cameraView,
      thirdPerson = view === 'third';
    cameraTuning.replaceChildren();
    cameraTuning.hidden = false;
    $('settings').classList.add('camera-tuning');
    const heading = document.createElement('h2');
    heading.textContent = thirdPerson ? 'Third-person camera' : 'Overhead camera';
    cameraTuning.append(heading);
    for (const [key, title, min, max, step, , suffix] of cameraFields[view]) {
      const label = document.createElement('label'),
        name = document.createElement('span'),
        output = document.createElement('output'),
        slider = document.createElement('input');
      name.textContent = title;
      slider.type = 'range';
      slider.id = `camera-${view}-${key}`;
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.setAttribute('aria-label', title);
      const value =
        thirdPerson && key === 'pitch' ? (camera.pitch * 180) / Math.PI : cameraSettings[view][key];
      slider.value = clamp(value, min, max);
      output.textContent = `${Number(value.toFixed(1))}${suffix}`;
      output.htmlFor = slider.id;
      label.append(name, output, slider);
      cameraTuning.append(label);
      slider.oninput = () => {
        const value = Number(slider.value);
        cameraSettings[view][key] = value;
        output.textContent = `${value}${suffix}`;
        if (view === 'third' && key === 'pitch') camera.pitch = (value * Math.PI) / 180;
        previewCamera();
      };
    }
    const reset = document.createElement('button');
    reset.textContent = 'Reset this view';
    reset.onclick = () => {
      preferences.resetCamera(view);
      if (thirdPerson) camera.pitch = (cameraSettings.third.pitch * Math.PI) / 180;
      previewCamera();
      openCameraTuning();
    };
    const back = document.createElement('button');
    back.textContent = 'Back to settings';
    back.onclick = closeCameraTuning;
    const resume = document.createElement('button');
    resume.textContent = 'Resume';
    resume.onclick = () => {
      actions.resume();
    };
    cameraTuning.append(reset, back, resume);
    cameraTuning.querySelector('input').focus();
  }
  tuneButton.onclick = openCameraTuning;

  viewSelect.onchange = () => {
    camera.select(viewSelect.value);
    preferences.save();
  };
  renderBindings();
  return {
    get rebind() {
      return rebind;
    },
    acceptBinding(code) {
      if (!rebind) return false;
      const index = Object.keys(DEFAULT_CITY_BINDINGS).indexOf(rebind);
      preferences.bind(rebind, code);
      rebind = null;
      renderBindings();
      $('bindings').querySelectorAll('button')[index].focus();
      preferences.save();
      return true;
    },
    setPaused(value) {
      if (!value) closeCameraTuning();
      $('settings').hidden = !value;
      rebind = null;
      resetArmed = false;
      $('reset-confirm').hidden = true;
      $('new-game').textContent = 'Restart';
      renderBindings();
    },
    setView(value) {
      prefs.cameraView = value !== 'overhead' ? 'third' : 'overhead';
      viewSelect.value = prefs.cameraView;
    },
    captureUnavailable() {
      tuneButton.setAttribute('title', 'Middle mouse to look');
    },
  };
}
