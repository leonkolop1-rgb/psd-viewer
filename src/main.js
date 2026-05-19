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
