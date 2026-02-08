const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const rowHeightInput = document.getElementById('rowHeight');
const fontSizeInput = document.getElementById('fontSize');
const fontStyleInput = document.getElementById('fontStyle');
const fontWeightInput = document.getElementById('fontWeight');
const fontFamilyInput = document.getElementById('fontFamily');
const fillColorInput = document.getElementById('fillColor');
const strokeColorInput = document.getElementById('strokeColor');
const textInput = document.getElementById('textInput');
const lineCountEl = document.getElementById('lineCount');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const errorBox = document.getElementById('errorBox');
const previewCanvas = document.getElementById('previewCanvas');
const ctx = previewCanvas.getContext('2d');
const genCountTotalEl = document.getElementById('genCountTotal');

let imageBitmap = null;
let imageWidth = 0;
let imageHeight = 0;

const maxSizeBytes = 10 * 1024 * 1024;
const marginX = 32;
const marginBottom = 16;
const marginTop = 16;
const rowSpacing = 4;
const bgColor = 'rgba(0,0,0,0.75)';
const bgRadius = 8;
const textPaddingX = 12;
const minFontSize = 12;
const maxLines = 20;
const maxCharsPerLine = 60;
const totalKey = 'subtitle_gen_total';

function fmt(n) {
  try { return Number(n).toLocaleString('zh-CN'); } catch { return String(n); }
}

function initCounts() {
  let total = Number(localStorage.getItem(totalKey) || 0);
  if (!Number.isFinite(total)) total = 0;
  if (genCountTotalEl) genCountTotalEl.textContent = fmt(total);
}

function incCounts() {
  const total = Number(localStorage.getItem(totalKey) || 0) + 1;
  localStorage.setItem(totalKey, String(total));
  if (genCountTotalEl) genCountTotalEl.textContent = fmt(total);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

function enableControls(enabled) {
  generateBtn.disabled = !enabled;
  saveBtn.disabled = true;
}

async function loadImage(file) {
  const typeOk = ['image/png', 'image/jpeg'].includes(file.type);
  if (!typeOk) {
    showError('仅支持 PNG/JPG 格式');
    enableControls(false);
    return;
  }
  if (file.size > maxSizeBytes) {
    showError('文件大小超过 10MB');
    enableControls(false);
    return;
  }
  showError('');
  const blobURL = URL.createObjectURL(file);
  const img = new Image();
  img.src = blobURL;
  await img.decode();
  imageBitmap = await createImageBitmap(img);
  imageWidth = imageBitmap.width;
  imageHeight = imageBitmap.height;
  fileInfo.textContent = `${file.name}（${imageWidth}×${imageHeight}）`;
  enableControls(true);
  URL.revokeObjectURL(blobURL);
}

function getLines() {
  const raw = textInput.value.split('\n').slice(0, maxLines);
  return raw.map(s => s.slice(0, maxCharsPerLine));
}

function updateLineCount() {
  lineCountEl.textContent = getLines().length;
}

function normalizeFamily(fam) {
  if (!fam) return 'sans-serif';
  return /[\\s,]/.test(fam) ? `"${fam}"` : fam;
}

function setFont(px) {
  const style = fontStyleInput.value || 'normal';
  const weight = fontWeightInput.value || '400';
  const fam = normalizeFamily(fontFamilyInput.value || 'sans-serif');
  ctx.font = `${style} ${weight} ${px}px ${fam}, sans-serif`;
}

function measure(text) {
  return ctx.measureText(text).width;
}

function fitText(text, targetWidth, desiredPx) {
  let px = desiredPx;
  setFont(px);
  let w = measure(text);
  if (w <= targetWidth) return { text, px };
  const scale = targetWidth / w;
  px = Math.max(Math.floor(px * scale), minFontSize);
  setFont(px);
  w = measure(text);
  if (w <= targetWidth) return { text, px };
  const ellipsis = '…';
  let t = text;
  while (t.length > 0 && measure(t + ellipsis) > targetWidth) {
    t = t.slice(0, -1);
  }
  return { text: t + ellipsis, px };
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function render() {
  if (!imageBitmap) return;
  const lines = getLines();
  const rowHeight = Number(rowHeightInput.value);
  const baseFontSize = Number(fontSizeInput.value);
  const fillColor = fillColorInput.value;
  const strokeColor = strokeColorInput.value;
  if (!Number.isFinite(rowHeight) || !Number.isFinite(baseFontSize)) {
    showError('参数不合法');
    return;
  }
  showError('');
  const n = lines.length;
  if (n === 0) return;
  previewCanvas.width = imageWidth;
  const appendedHeight = n > 1 ? (n - 1) * rowHeight : 0;
  previewCanvas.height = imageHeight + appendedHeight;
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.drawImage(imageBitmap, 0, 0);
  const rectX = 0;
  const rectWidth = imageWidth;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const firstText = lines[0] === undefined ? '' : lines[0];
  const firstTop = imageHeight - rowHeight;
  const innerWidthFirst = rectWidth - 2 * textPaddingX;
  const srcX = rectX + textPaddingX;
  const srcY = imageHeight - rowHeight;
  drawRoundedRect(rectX, firstTop, rectWidth, rowHeight, 0);
  ctx.fillStyle = bgColor;
  ctx.fill();
  const fittedFirst = fitText(firstText, innerWidthFirst, baseFontSize);
  setFont(fittedFirst.px);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.ceil(fittedFirst.px / 10);
  ctx.fillStyle = fillColor;
  const cxFirst = rectX + rectWidth / 2;
  const cyFirst = firstTop + rowHeight / 2;
  if (firstText.length > 0) {
    ctx.strokeText(fittedFirst.text, cxFirst, cyFirst);
    ctx.fillText(fittedFirst.text, cxFirst, cyFirst);
  }
  for (let i = 1; i < n; i++) {
    const text = lines[i] === undefined ? '' : lines[i];
    const top = imageHeight + (i - 1) * rowHeight;
    ctx.drawImage(imageBitmap, srcX, srcY, innerWidthFirst, rowHeight, rectX + textPaddingX, top, innerWidthFirst, rowHeight);
    drawRoundedRect(rectX, top, rectWidth, rowHeight, 0);
    ctx.fillStyle = bgColor;
    ctx.fill();
    const innerWidth = rectWidth - 2 * textPaddingX;
    const fitted = fitText(text, innerWidth, baseFontSize);
    setFont(fitted.px);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.ceil(fitted.px / 10);
    ctx.fillStyle = fillColor;
    const cx = rectX + rectWidth / 2;
    const cy = top + rowHeight / 2;
    if (text.length > 0) {
      ctx.strokeText(fitted.text, cx, cy);
      ctx.fillText(fitted.text, cx, cy);
    }
  }
  saveBtn.disabled = false;
  incCounts();
}

function save() {
  previewCanvas.toBlob(b => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = '字幕图.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await loadImage(file);
});

textInput.addEventListener('input', updateLineCount);
rowHeightInput.addEventListener('input', () => {});
fontSizeInput.addEventListener('input', () => {});
fillColorInput.addEventListener('input', () => {});
strokeColorInput.addEventListener('input', () => {});
generateBtn.addEventListener('click', render);
saveBtn.addEventListener('click', save);
updateLineCount();
initCounts();
