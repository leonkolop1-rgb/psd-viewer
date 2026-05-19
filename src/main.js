import { parsePSD, flattenLayers } from './psd-parser.js';
import { renderToCanvas } from './canvas-renderer.js';
import { buildLayerTree } from './layer-tree.js';

const translations = {
  en: {
    dragText: 'Drag PSD file here',
    orText: 'or',
    chooseFile: 'Choose File',
    downloadPng: 'Download PNG',
    checkResolution: 'Check Resolution',
    openNew: 'Open New PSD',
    unnamed: '(unnamed)',
  },
  he: {
    dragText: 'גרור קובץ PSD לכאן',
    orText: 'או',
    chooseFile: 'בחר קובץ',
    downloadPng: 'הורד PNG',
    checkResolution: 'בדוק רזולוציה',
    openNew: 'פתח PSD חדש',
    unnamed: '(ללא שם)',
  },
};

let currentLang = 'en';

function t(key) { return translations[currentLang][key]; }

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = translations[lang][el.dataset.i18n] ?? el.textContent;
  });
  if (currentPsd) {
    buildLayerTree(layerTreeEl, currentPsd.children ?? [], visibleIds, redraw, currentLang);
  }
}

const dropZone = document.getElementById('drop-zone');
const openBtn = document.getElementById('open-btn');
const fileInput = document.getElementById('file-input');
const viewer = document.getElementById('viewer');
const layerTreeEl = document.getElementById('layer-tree');
const canvas = document.getElementById('preview-canvas');
const canvasContainer = document.getElementById('canvas-container');
const downloadBtn = document.getElementById('download-btn');
const resolutionBtn = document.getElementById('resolution-btn');
const openNewBtn = document.getElementById('open-new-btn');
const langSelect = document.getElementById('lang-select');
const zoomControls = document.getElementById('zoom-controls');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLabel = document.getElementById('zoom-label');

let visibleIds = new Set();
let totalLayerCount = 0;
let currentPsd = null;
let currentZoom = 1.0;
let currentArtboardData = null;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.05;

langSelect.addEventListener('change', () => setLanguage(langSelect.value));
openBtn.addEventListener('click', () => fileInput.click());
openNewBtn.addEventListener('click', () => fileInput.click());

zoomSlider.addEventListener('input', () => setZoom(zoomSlider.value / 100));
canvasContainer.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(currentZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
}, { passive: false });
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

function setZoom(zoom) {
  currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
  zoomSlider.value = Math.round(currentZoom * 100);
  if (canvasContainer.classList.contains('artboard-mode')) {
    applyArtboardZoom();
  } else {
    applySingleZoom();
  }
}

function applySingleZoom() {
  if (!currentPsd || canvas.hidden) return;
  const pad = 12;
  const containerW = canvasContainer.clientWidth - pad;
  const containerH = canvasContainer.clientHeight - pad;
  const fitScale = Math.min(containerW / currentPsd.width, containerH / currentPsd.height);
  canvas.style.width = `${Math.round(currentPsd.width * fitScale * currentZoom)}px`;
  canvas.style.height = `${Math.round(currentPsd.height * fitScale * currentZoom)}px`;
}

function applyArtboardZoom() {
  if (!currentArtboardData) return;
  const { rects, baseScale } = currentArtboardData;
  canvasContainer.querySelectorAll('.artboard-wrapper').forEach((wrapper, i) => {
    const { w, h } = rects[i];
    const cvs = wrapper.querySelector('canvas');
    cvs.style.width = `${Math.round(w * baseScale * currentZoom)}px`;
    cvs.style.height = `${Math.round(h * baseScale * currentZoom)}px`;
  });
}

async function loadFile(file) {
  currentZoom = 1.0;
  currentArtboardData = null;
  const psd = await parsePSD(file);
  currentPsd = psd;
  const allLayers = flattenLayers(psd.children ?? []);
  totalLayerCount = allLayers.length;
  visibleIds = new Set(allLayers.map(l => l.id));

  dropZone.hidden = true;
  viewer.hidden = false;

  buildLayerTree(layerTreeEl, psd.children ?? [], visibleIds, redraw, currentLang);

  const artboards = getArtboards(psd);
  if (artboards.length > 1) {
    renderArtboards(artboards, psd);
    resolutionBtn.hidden = true;
    const existing = document.getElementById('resolution-toast');
    if (existing) existing.remove();
  } else {
    renderSingle();
    resolutionBtn.hidden = false;
    showResolutionToast(psd.width, psd.height);
  }

  zoomControls.hidden = false;
  setZoom(1.0);
}

// --- Artboard mode ---

function getArtboards(psd) {
  return (psd.children ?? []).filter(l => l.artboard);
}

function renderArtboards(artboards, psd) {
  canvasContainer.classList.add('artboard-mode');
  canvas.hidden = true;
  canvasContainer.querySelectorAll('.artboard-wrapper').forEach(el => el.remove());

  const rects = artboards.map(layer => {
    const rect = layer.artboard?.rect ?? {
      top: layer.top ?? 0,
      left: layer.left ?? 0,
      bottom: layer.bottom ?? psd.height,
      right: layer.right ?? psd.width,
    };
    return { rect, w: rect.right - rect.left, h: rect.bottom - rect.top };
  });

  // Compute a uniform scale so all artboards fit the visible area at once
  const gap = 40;
  const hPad = 64; // 32px padding each side
  const vPad = 64 + 32; // 32px padding + label + gap
  const availW = window.innerWidth - 200 - hPad - gap * (artboards.length - 1);
  const availH = window.innerHeight - vPad;
  const totalW = rects.reduce((sum, r) => sum + r.w, 0);
  const maxH = Math.max(...rects.map(r => r.h));
  const scale = Math.min(availW / totalW, availH / maxH);
  currentArtboardData = { rects, baseScale: scale };

  for (let i = 0; i < artboards.length; i++) {
    const { rect, w, h } = rects[i];

    const wrapper = document.createElement('div');
    wrapper.className = 'artboard-wrapper';

    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    cvs.style.width = `${Math.round(w * scale)}px`;
    cvs.style.height = `${Math.round(h * scale)}px`;

    if (psd.canvas) {
      const ctx = cvs.getContext('2d');
      ctx.drawImage(psd.canvas, rect.left, rect.top, w, h, 0, 0, w, h);
    }

    const label = document.createElement('div');
    label.className = 'artboard-label';
    label.textContent = `${w} × ${h}  |  ${aspectRatio(w, h)}`;

    wrapper.appendChild(cvs);
    wrapper.appendChild(label);
    canvasContainer.appendChild(wrapper);
  }
}

// --- Single canvas mode ---

function renderSingle() {
  canvasContainer.classList.remove('artboard-mode');
  canvas.hidden = false;
  canvasContainer.querySelectorAll('.artboard-wrapper').forEach(el => el.remove());
  redraw();
}

function redraw() {
  if (!currentPsd) return;
  const allVisible = visibleIds.size === totalLayerCount;
  renderToCanvas(canvas, currentPsd, visibleIds, allVisible);
  applySingleZoom();
}

// --- Resolution helpers ---

const COMMON_RATIOS = [
  { label: '16:9',  value: 16 / 9  },
  { label: '9:16',  value: 9  / 16 },
  { label: '1:1',   value: 1        },
  { label: '4:5',   value: 4  / 5  },
  { label: '2:3',   value: 2  / 3  },
  { label: '3:4',   value: 3  / 4  },
];

function aspectRatio(w, h) {
  const actual = w / h;
  let closest = COMMON_RATIOS[0];
  let minDiff = Infinity;
  for (const r of COMMON_RATIOS) {
    const diff = Math.abs(actual - r.value);
    if (diff < minDiff) { minDiff = diff; closest = r; }
  }
  return closest.label;
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
