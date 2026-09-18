import { DEFAULT_BINDINGS, clamp } from './mechanics.js';

const DEFAULT_CITY_BINDINGS = { ...DEFAULT_BINDINGS, camera: 'KeyC' };
const cameraFields = {
  third: [
    ['pitch', '俯仰角', -30, 54, 1, (0.32 * 180) / Math.PI, '°'],
    ['distance', '跟随距离', 6, 20, 0.5, 12, ''],
    ['height', '镜头高度', 0, 5, 0.1, 1.6, ''],
    ['shoulder', '左右偏移', -3, 3, 0.1, 1.2, ''],
    ['sensitivity', '鼠标灵敏度', 0.25, 3, 0.05, 1, '×'],
  ],
  overhead: [
    ['angle', '俯视角度', 30, 70, 1, (Math.atan2(39.6, Math.hypot(28, 28)) * 180) / Math.PI, '°'],
    ['scale', '视野范围', 12, 28, 0.5, 17, ''],
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
      up: '前进',
      left: '向左',
      down: '后退',
      right: '向右',
      fire: '射击',
      magnet: '磁力牵引',
      weapon: '切换武器',
      camera: '切换视角',
      flotation: '浮航',
      overdrive: '加速',
      map: '地图',
      repair: '使用 / 修复',
      skip: '跳过',
      pause: '暂停',
    };
    for (const action of Object.keys(DEFAULT_CITY_BINDINGS)) {
      const label = document.createElement('span'),
        b = document.createElement('button');
      label.textContent = labels[action];
      b.setAttribute('aria-label', `${labels[action]}：${bindings[action]}`);
      b.classList.toggle('binding-listening', rebind === action);
      b.textContent =
        rebind === action
          ? '按下新按键…'
          : bindings[action]
              .replace(/^Key/, '')
              .replace('ShiftLeft', '左 Shift')
              .replace('ShiftRight', '右 Shift')
              .replace('Mouse0', '鼠标左键')
              .replace('Mouse1', '鼠标中键')
              .replace('Mouse2', '鼠标右键')
              .replace('Space', '空格')
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
      $('reset-confirm').hidden = false;
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
  viewLabel.textContent = '视角';
  const viewSelect = document.createElement('select');
  viewSelect.id = 'camera-view';
  viewSelect.setAttribute('aria-label', '视角');
  viewSelect.innerHTML =
    '<option value="third">第三人称</option><option value="overhead">俯视</option>';
  viewLabel.append(viewSelect);
  $('quality').parentElement.after(viewLabel);
  const cameraNote = document.createElement('p');
  cameraNote.className = 'binding-note';
  cameraNote.textContent = '第三人称：点击画面后移动鼠标转动视角，WASD 移动；Esc 释放鼠标。';
  viewLabel.after(cameraNote);
  const cameraTuning = document.createElement('section');
  cameraTuning.id = 'camera-tuning';
  cameraTuning.hidden = true;
  cameraTuning.setAttribute('aria-label', '镜头调整');
  $('settings').append(cameraTuning);
  const tuneButton = document.createElement('button');
  tuneButton.textContent = '调整镜头';
  cameraNote.after(tuneButton);
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
    heading.textContent = thirdPerson ? '第三人称镜头' : '俯视镜头';
    cameraTuning.append(heading);
    const note = document.createElement('p');
    note.className = 'binding-note';
    note.textContent = thirdPerson
      ? '拖动滑块实时预览。游戏已暂停；遮挡物会半透明化，跟随距离保持不变。俯仰角作为下次进入游戏的起始角度，游玩时仍可用鼠标转动。'
      : '拖动滑块实时预览。视野范围越大，能看到的区域越广。';
    cameraTuning.append(note);
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
    reset.textContent = '恢复此视角默认';
    reset.onclick = () => {
      preferences.resetCamera(view);
      if (thirdPerson) camera.pitch = (cameraSettings.third.pitch * Math.PI) / 180;
      previewCamera();
      openCameraTuning();
    };
    const back = document.createElement('button');
    back.textContent = '返回设置';
    back.onclick = closeCameraTuning;
    const resume = document.createElement('button');
    resume.textContent = '继续游戏';
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
      renderBindings();
    },
    setView(value) {
      prefs.cameraView = value !== 'overhead' ? 'third' : 'overhead';
      viewSelect.value = prefs.cameraView;
      cameraNote.hidden = prefs.cameraView !== 'third';
    },
    captureUnavailable() {
      cameraNote.textContent =
        '第三人称：按住鼠标中键拖动视角，WASD 移动；左键射击，右键磁力牵引。';
    },
  };
}
