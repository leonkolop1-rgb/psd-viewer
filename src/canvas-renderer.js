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
