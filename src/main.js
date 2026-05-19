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
    unnamed: '(unnamed)',
  },
  he: {
    dragText: 'גרור קובץ PSD לכאן',
    orText: 'או',
    chooseFile: 'בחר קובץ',
    downloadPng: 'הורד PNG',
    checkResolution: 'בדוק רזולוציה',
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
const downloadBtn = document.getElementById('download-btn');
const resolutionBtn = document.getElementById('resolution-btn');
const langSelect = document.getElementById('lang-select');

let visibleIds = new Set();
let totalLayerCount = 0;
let currentPsd = null;

langSelect.addEventListener('change', () => setLanguage(langSelect.value));

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

  buildLayerTree(layerTreeEl, psd.children ?? [], visibleIds, redraw, currentLang);
  redraw();
  resolutionBtn.hidden = false;
  showResolutionToast(psd.width, psd.height);
}

function redraw() {
  if (!currentPsd) return;
  const allVisible = visibleIds.size === totalLayerCount;
  renderToCanvas(canvas, currentPsd, visibleIds, allVisible);
}

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
