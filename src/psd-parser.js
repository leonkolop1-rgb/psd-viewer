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
  const psd = readPsd(buffer, { skipLayerImageData: false });
  if (psd.children) assignIds(psd.children);
  return psd;
}
