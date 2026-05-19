export function buildLayerTree(container, layers, visibleIds, onChange, lang = 'en') {
  container.innerHTML = '';
  renderList(container, layers, visibleIds, onChange, lang, 0);
}

function renderList(container, layers, visibleIds, onChange, lang, depth) {
  for (const layer of layers) {
    container.appendChild(createItem(layer, visibleIds, onChange, lang, depth));
    if (layer.children) {
      const childWrap = document.createElement('div');
      renderList(childWrap, layer.children, visibleIds, onChange, lang, depth + 1);
      container.appendChild(childWrap);
    }
  }
}

function createItem(layer, visibleIds, onChange, lang, depth) {
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
  name.textContent = layer.name || (lang === 'he' ? '(ללא שם)' : '(unnamed)');
  item.appendChild(name);

  return item;
}
