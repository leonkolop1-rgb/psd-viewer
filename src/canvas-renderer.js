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

export function renderToCanvas(canvas, psd, visibleIds, allVisible = false) {
  const ctx = canvas.getContext('2d');
  canvas.width = psd.width;
  canvas.height = psd.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // When all layers are visible, use the pre-rendered composite from ag-psd
  // (includes text, adjustment, shape layers that have no individual canvas).
  if (allVisible && psd.canvas) {
    ctx.drawImage(psd.canvas, 0, 0);
    return;
  }

  // Manual compositing for partial visibility (raster layers only).
  const leaves = collectVisibleLeaves(psd.children ?? [], visibleIds);
  for (let i = leaves.length - 1; i >= 0; i--) {
    const layer = leaves[i];
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.drawImage(layer.canvas, layer.left ?? 0, layer.top ?? 0);
    ctx.restore();
  }
}
