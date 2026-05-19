# PSD Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based PSD viewer with layer visibility toggling and PNG export.

**Architecture:** Single-page Vite + Vanilla JS app. ag-psd parses the PSD file entirely in the browser, extracting per-layer canvas data. A canvas renderer composites visible layers bottom-to-top on re-render. A sidebar shows the layer tree with checkboxes and group collapse/expand.

**Tech Stack:** Vite 5, Vanilla JS (ES modules), ag-psd, Vitest

---

## File Map

| File | Responsibility |
|------|----------------|
| `index.html` | App shell — drop zone + viewer layout |
| `src/styles.css` | Dark theme, layout, layer tree styles |
| `src/psd-parser.js` | Parse PSD with ag-psd, assign stable IDs to layers |
| `src/canvas-renderer.js` | Composite visible layers onto a canvas element |
| `src/layer-tree.js` | Build sidebar DOM, handle checkbox/collapse events |
| `src/main.js` | Wire everything: drag & drop, file input, download |
| `tests/psd-parser.test.js` | Unit tests for ID assignment and tree flattening |
| `tests/canvas-renderer.test.js` | Unit tests for visibility filtering logic |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "psd-viewer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "ag-psd": "^18.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules` created, no errors.

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PSD Viewer</title>
  <link rel="stylesheet" href="/src/styles.css" />
</head>
<body>
  <div id="app">
    <div id="drop-zone">
      <p>גרור קובץ PSD לכאן</p>
      <p>או</p>
      <button id="open-btn">בחר קובץ</button>
      <input type="file" id="file-input" accept=".psd" hidden />
    </div>
    <div id="viewer" hidden>
      <aside id="sidebar">
        <div id="layer-tree"></div>
        <button id="download-btn">הורד PNG</button>
      </aside>
      <main id="canvas-container">
        <canvas id="preview-canvas"></canvas>
      </main>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Initialize git and commit**

```bash
git init
git add package.json vite.config.js index.html
git commit -m "feat: project scaffold"
```

---

### Task 2: CSS Styles

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: Write styles**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #000000;
  --sidebar-bg: #111111;
  --accent: #dcff2a;
  --text: #ffffff;
  --hover: #1a1a1a;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
  height: 100vh;
  overflow: hidden;
}

#app { height: 100vh; display: flex; }

/* Drop zone */
#drop-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 2px dashed #333;
  margin: 40px;
  border-radius: 12px;
  transition: border-color 0.2s;
}
#drop-zone.drag-over { border-color: var(--accent); }
#drop-zone p { color: #888; font-size: 14px; }

/* Buttons */
button {
  background: var(--accent);
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover { opacity: 0.85; }

/* Viewer layout */
#viewer {
  flex: 1;
  display: flex;
  overflow: hidden;
}

#sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

#layer-tree {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Layer items */
.layer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  user-select: none;
}
.layer-item:hover { background: var(--hover); }
.layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-toggle {
  width: 14px;
  text-align: center;
  cursor: pointer;
  color: #888;
  font-size: 10px;
}
.group-toggle:hover { color: var(--accent); }

input[type="checkbox"] { accent-color: var(--accent); cursor: pointer; }

/* Canvas */
#canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 20px;
}

#preview-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: dark theme CSS"
```

---

### Task 3: PSD Parser

**Files:**
- Create: `src/psd-parser.js`
- Create: `tests/psd-parser.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/psd-parser.test.js
import { describe, it, expect } from 'vitest';
import { assignIds, flattenLayers } from '../src/psd-parser.js';

describe('assignIds', () => {
  it('assigns sequential ids to flat layers', () => {
    const layers = [
      { name: 'A' },
      { name: 'B' },
    ];
    assignIds(layers);
    expect(layers[0].id).toBe(0);
    expect(layers[1].id).toBe(1);
  });

  it('assigns ids to nested layers', () => {
    const layers = [
      { name: 'Group', children: [
        { name: 'Child' }
      ]},
    ];
    assignIds(layers);
    expect(layers[0].id).toBe(0);
    expect(layers[0].children[0].id).toBe(1);
  });

  it('starts counter fresh on each call via counter param', () => {
    const layers1 = [{ name: 'X' }];
    const layers2 = [{ name: 'Y' }];
    assignIds(layers1);
    assignIds(layers2);
    expect(layers1[0].id).toBe(0);
    expect(layers2[0].id).toBe(0);
  });
});

describe('flattenLayers', () => {
  it('returns flat array of all layers including nested', () => {
    const layers = [
      { id: 0, name: 'Group', children: [
        { id: 1, name: 'Child' }
      ]},
      { id: 2, name: 'Flat' },
    ];
    const flat = flattenLayers(layers);
    expect(flat.map(l => l.id)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `assignIds is not a function`

- [ ] **Step 3: Write implementation**

```js
// src/psd-parser.js
import { readPsd } from 'ag-psd';

export function assignIds(layers, counter = { value: 0 }) {
  for (const layer of layers) {
    layer.id = counter.value++;
    if (layer.children) assignIds(layer.children, counter);
  }
}

export function flattenLayers(layers) {
  const result = [];
  for (const layer of layers) {
    result.push(layer);
    if (layer.children) result.push(...flattenLayers(layer.children));
  }
  return result;
}

export async function parsePSD(file) {
  const buffer = await file.arrayBuffer();
  const psd = readPsd(new Uint8Array(buffer), {
    skipCompositeImageData: true,
    skipLayerImageData: false,
  });
  if (psd.children) assignIds(psd.children);
  return psd;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/psd-parser.js tests/psd-parser.test.js
git commit -m "feat: psd parser with layer id assignment"
```

---

### Task 4: Canvas Renderer

**Files:**
- Create: `src/canvas-renderer.js`
- Create: `tests/canvas-renderer.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/canvas-renderer.test.js
import { describe, it, expect } from 'vitest';
import { collectVisibleLeaves } from '../src/canvas-renderer.js';

describe('collectVisibleLeaves', () => {
  it('returns only pixel layers in visibleIds', () => {
    const visibleIds = new Set([0, 2]);
    const layers = [
      { id: 0, canvas: {}, children: undefined },
      { id: 1, canvas: {}, children: undefined },
      { id: 2, canvas: {}, children: undefined },
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result.map(l => l.id)).toEqual([0, 2]);
  });

  it('excludes children of a hidden group', () => {
    const visibleIds = new Set([1]); // group 0 hidden, child 1 visible
    const layers = [
      { id: 0, children: [
        { id: 1, canvas: {}, children: undefined },
      ]},
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result).toHaveLength(0);
  });

  it('includes children of a visible group', () => {
    const visibleIds = new Set([0, 1]);
    const layers = [
      { id: 0, children: [
        { id: 1, canvas: {}, children: undefined },
      ]},
    ];
    const result = collectVisibleLeaves(layers, visibleIds);
    expect(result.map(l => l.id)).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `collectVisibleLeaves is not a function`

- [ ] **Step 3: Write implementation**

```js
// src/canvas-renderer.js

// Returns pixel layers that are visible (parentVisible = group ancestor is visible).
// Layers array is ordered top-to-bottom (ag-psd convention: index 0 = topmost).
export function collectVisibleLeaves(layers, visibleIds, parentVisible = true) {
  const result = [];
  for (const layer of layers) {
    const visible = parentVisible && visibleIds.has(layer.id);
    if (layer.children) {
      result.push(...collectVisibleLeaves(layer.children, visibleIds, visible));
    } else if (visible && layer.canvas) {
      result.push(layer);
    }
  }
  return result;
}

export function renderToCanvas(canvas, psd, visibleIds) {
  const ctx = canvas.getContext('2d');
  canvas.width = psd.width;
  canvas.height = psd.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Collect visible leaves ordered top-to-bottom, then draw bottom-to-top.
  const leaves = collectVisibleLeaves(psd.children ?? [], visibleIds);
  for (let i = leaves.length - 1; i >= 0; i--) {
    const layer = leaves[i];
    ctx.save();
    ctx.globalAlpha = (layer.opacity ?? 255) / 255;
    ctx.drawImage(layer.canvas, layer.left ?? 0, layer.top ?? 0);
    ctx.restore();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add src/canvas-renderer.js tests/canvas-renderer.test.js
git commit -m "feat: canvas renderer with visibility filtering"
```

---

### Task 5: Layer Tree UI

**Files:**
- Create: `src/layer-tree.js`

- [ ] **Step 1: Write implementation**

```js
// src/layer-tree.js

export function buildLayerTree(container, layers, visibleIds, onChange) {
  container.innerHTML = '';
  renderList(container, layers, visibleIds, onChange, 0);
}

function renderList(container, layers, visibleIds, onChange, depth) {
  for (const layer of layers) {
    container.appendChild(createItem(layer, visibleIds, onChange, depth));
    if (layer.children) {
      const childWrap = document.createElement('div');
      renderList(childWrap, layer.children, visibleIds, onChange, depth + 1);
      container.appendChild(childWrap);
    }
  }
}

function createItem(layer, visibleIds, onChange, depth) {
  const item = document.createElement('div');
  item.className = 'layer-item';
  item.style.paddingLeft = `${6 + depth * 14}px`;

  if (layer.children) {
    const arrow = document.createElement('span');
    arrow.className = 'group-toggle';
    arrow.textContent = '▼';
    arrow.addEventListener('click', () => {
      const wrap = item.nextElementSibling;
      if (!wrap) return;
      wrap.hidden = !wrap.hidden;
      arrow.textContent = wrap.hidden ? '▶' : '▼';
    });
    item.appendChild(arrow);
  } else {
    const spacer = document.createElement('span');
    spacer.style.width = '14px';
    spacer.style.display = 'inline-block';
    item.appendChild(spacer);
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = visibleIds.has(layer.id);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) visibleIds.add(layer.id);
    else visibleIds.delete(layer.id);
    onChange();
  });
  item.appendChild(checkbox);

  const name = document.createElement('span');
  name.className = 'layer-name';
  name.textContent = layer.name || '(unnamed)';
  item.appendChild(name);

  return item;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/layer-tree.js
git commit -m "feat: layer tree sidebar with collapse/expand"
```

---

### Task 6: Main Entry Point

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Write implementation**

```js
// src/main.js
import { parsePSD, flattenLayers } from './psd-parser.js';
import { renderToCanvas } from './canvas-renderer.js';
import { buildLayerTree } from './layer-tree.js';

const dropZone = document.getElementById('drop-zone');
const openBtn = document.getElementById('open-btn');
const fileInput = document.getElementById('file-input');
const viewer = document.getElementById('viewer');
const layerTreeEl = document.getElementById('layer-tree');
const canvas = document.getElementById('preview-canvas');
const downloadBtn = document.getElementById('download-btn');

let visibleIds = new Set();
let currentPsd = null;

openBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file?.name.toLowerCase().endsWith('.psd')) loadFile(file);
});

async function loadFile(file) {
  const psd = await parsePSD(file);
  currentPsd = psd;
  visibleIds = new Set(flattenLayers(psd.children ?? []).map(l => l.id));

  dropZone.hidden = true;
  viewer.hidden = false;

  buildLayerTree(layerTreeEl, psd.children ?? [], visibleIds, redraw);
  redraw();
}

function redraw() {
  if (!currentPsd) return;
  renderToCanvas(canvas, currentPsd, visibleIds);
}

downloadBtn.addEventListener('click', () => {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
});
```

- [ ] **Step 2: Run dev server and verify UI**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected: Black screen, centered dashed-border drop zone, yellow-green "בחר קובץ" button.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: main entry, drag & drop, download PNG"
```

---

### Task 7: End-to-End Smoke Test

- [ ] **Step 1: Load a PSD**

Drag any `.psd` file onto the drop zone or click the button to pick one.
Expected: Drop zone disappears, sidebar shows layer names with checkboxes, canvas shows the PSD composite.

- [ ] **Step 2: Toggle a single layer**

Uncheck one layer in the sidebar.
Expected: Canvas re-renders immediately without that layer.

- [ ] **Step 3: Toggle a group**

Uncheck a group layer.
Expected: All child layers disappear from the canvas regardless of their individual checkbox state.

- [ ] **Step 4: Collapse a group**

Click the ▼ arrow next to a group.
Expected: Arrow becomes ▶, child layer rows hide (collapsed). Canvas is unaffected (collapse is UI only).

- [ ] **Step 5: Download PNG**

Click "הורד PNG".
Expected: Browser downloads `export.png` with only the currently visible layers rendered.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: psd viewer complete"
```
