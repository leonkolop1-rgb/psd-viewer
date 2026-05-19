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
let totalLayerCount = 0;
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
  const allLayers = flattenLayers(psd.children ?? []);
  totalLayerCount = allLayers.length;
  visibleIds = new Set(allLayers.map(l => l.id));

  dropZone.hidden = true;
  viewer.hidden = false;

  buildLayerTree(layerTreeEl, psd.children ?? [], visibleIds, redraw);
  redraw();
  showResolutionToast(psd.width, psd.height);
}

function redraw() {
  if (!currentPsd) return;
  const allVisible = visibleIds.size === totalLayerCount;
  renderToCanvas(canvas, currentPsd, visibleIds, allVisible);
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function aspectRatio(w, h) {
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

function showResolutionToast(w, h) {
  const existing = document.getElementById('resolution-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'resolution-toast';
  toast.textContent = `${w} × ${h}  |  ${aspectRatio(w, h)}`;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
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
