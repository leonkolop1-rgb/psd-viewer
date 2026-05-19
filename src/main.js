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
const resolutionBtn = document.getElementById('resolution-btn');

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
  console.log('PSD size:', psd.width, 'x', psd.height, '| composite canvas:', !!psd.canvas);
  (psd.children ?? []).forEach((l, i) =>
    console.log(`  [${i}] "${l.name}" | canvas:${!!l.canvas} | group:${!!l.children}`)
  );
  currentPsd = psd;
  const allLayers = flattenLayers(psd.children ?? []);
  totalLayerCount = allLayers.length;
  visibleIds = new Set(allLayers.map(l => l.id));

  dropZone.hidden = true;
  viewer.hidden = false;

  buildLayerTree(layerTreeEl, psd.children ?? [], visibleIds, redraw);
  redraw();
  resolutionBtn.hidden = false;
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

  const text = document.createElement('span');
  text.textContent = `${w} × ${h}  |  ${aspectRatio(w, h)}`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.id = 'resolution-toast-close';
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  });

  toast.appendChild(text);
  toast.appendChild(closeBtn);
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('visible'), 10);
}

resolutionBtn.addEventListener('click', () => {
  if (currentPsd) showResolutionToast(currentPsd.width, currentPsd.height);
});

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
