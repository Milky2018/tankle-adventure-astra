# Browser checks

From the repository root, build and serve the game in one terminal:

```sh
moonx scripts/build.mbtx
moonx cli/serve@0.1.5 --port 5175 dist
```

In another terminal, run:

```sh
moon run tests/browser
```

The runner uses the MoonBit JS target with Node.js 22.13 or newer and an installed Chrome or Chromium. It starts headless Chrome with a fresh temporary profile, communicates through its DevTools pipe, and removes the profile on exit. Set `TANKLE_URL` to select another server origin or `CHROME` to specify the browser executable.

To run one scenario, pass its name, for example `moon run tests/browser -- campaign`.

| Scenario | Coverage |
| --- | --- |
| `new-game` | Fresh menu, creation of an autosave, Continue with progress, replacement by New Game and reload. This check edits one progression flag in its own saved fixture. |
| `camera` | Compares 28 mouse-driven pitch samples across four headings in an open lane and at a wall. |
| `performance` | Measures startup and individual animation frames during a driving and firing loop. The MoonBit frame sampler runs inside the page. Percentiles are observations for the current machine. |
| `campaign` | Drives through the opening relay, reclaim fight, first boss, Overdrive acquisition and shortcut back to the repair station. Continues the resulting save to check map layers, settings, remapped movement, firing and pause. |

Screenshots and the performance report are written under `output/browser/`. The campaign uses keyboard and mouse input. Each movement uses the current camera heading from the game's diagnostic snapshot. A MoonBit probe runs in each page to read projected coordinates, interact with the DOM and collect frame samples. The driver and the probe share a MoonBit request enum. Chrome forwards one serialized request to the probe, which dispatches it through an exhaustive match.
