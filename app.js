const canvasViewport = document.getElementById("canvasViewport");
const canvasStage = document.getElementById("canvasStage");
const layersContainer = document.getElementById("layersContainer");
const navGizmo = document.getElementById("navGizmo");
const gizmoDragHandle = document.getElementById("gizmoDragHandle");

const colorPicker = document.getElementById("colorPicker");
const railColorButton = document.getElementById("railColorButton");
const colorWheel = document.getElementById("colorWheel");
const colorWheelHandle = document.getElementById("colorWheelHandle");
const colorSquare = document.getElementById("colorSquare");
const colorSquareHandle = document.getElementById("colorSquareHandle");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");
const brushOpacity = document.getElementById("brushOpacity");
const brushOpacityText = document.getElementById("brushOpacityText");
const brushFlow = document.getElementById("brushFlow");
const brushFlowText = document.getElementById("brushFlowText");
const brushSpacing = document.getElementById("brushSpacing");
const brushSpacingText = document.getElementById("brushSpacingText");
const brushSoftness = document.getElementById("brushSoftness");
const brushSoftnessText = document.getElementById("brushSoftnessText");
const resetBrushSettingsBtn = document.getElementById("resetBrushSettingsBtn");
const smudgeStrength = document.getElementById("smudgeStrength");
const smudgeStrengthText = document.getElementById("smudgeStrengthText");
const blendStrength = document.getElementById("blendStrength");
const blendStrengthText = document.getElementById("blendStrengthText");

const brushSelect = document.getElementById("brushSelect");
const drawToolBtn = document.getElementById("drawToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");
const canvasPresetSelect = document.getElementById("canvasPresetSelect");
const applyCanvasPresetBtn = document.getElementById("applyCanvasPresetBtn");

const openSubmitModalBtn = document.getElementById("openSubmitModalBtn");
const closeSubmitModalBtn = document.getElementById("closeSubmitModalBtn");
const cancelSubmitModalBtn = document.getElementById("cancelSubmitModalBtn");
const submitModal = document.getElementById("submitModal");
const submitPreviewCanvas = document.getElementById("submitPreviewCanvas");

const submitArtistName = document.getElementById("submitArtistName");
const submitContact = document.getElementById("submitContact");
const submitTitle = document.getElementById("submitTitle");
const submitAgeGroup = document.getElementById("submitAgeGroup");
const submitGuardianName = document.getElementById("submitGuardianName");
const submitDescription = document.getElementById("submitDescription");
const submitPermission = document.getElementById("submitPermission");
const submitDrawingBtn = document.getElementById("submitDrawingBtn");
const submitStatus = document.getElementById("submitStatus");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const savePngBtn = document.getElementById("savePngBtn");
const resetPanelsBtn = document.getElementById("resetPanelsBtn");

const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetViewBtn = document.getElementById("resetViewBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const rotateLeftBtn = document.getElementById("rotateLeftBtn");
const rotateRightBtn = document.getElementById("rotateRightBtn");
const panUpBtn = document.getElementById("panUpBtn");
const panDownBtn = document.getElementById("panDownBtn");
const panLeftBtn = document.getElementById("panLeftBtn");
const panRightBtn = document.getElementById("panRightBtn");
const toggleUiBtn = document.getElementById("toggleUiBtn");
const layersList = document.getElementById("layersList");
const addLayerTopBtn = document.getElementById("addLayerTopBtn");

const shell = document.querySelector(".cah-draw-shell");
const headerPanel = document.querySelector(".cah-app-bar");
const canvasPanel = document.querySelector(".cah-canvas-panel");
const brushPanel = document.querySelector(".cah-brush-library");
const settingsPanel = document.querySelector(".cah-brush-settings");
const colorPanel = document.querySelector(".cah-color-panel");
const layersPanel = document.querySelector(".cah-layers-panel");

let layers = [];
let activeLayerId = null;
let nextLayerNumber = 1;
let selectedBrush = "brush";
let activeMode = "draw";
let isDrawing = false;
let isPanning = false;
let isRotating = false;
let isGizmoPanning = false;
let isRightMousePanning = false;
let isMiddleMouseRotating = false;
let isSubmitting = false;
let activeDrawPointerId = null;
let activePointers = new Map();
let gestureState = null;
let penHasBeenDetected = false;
let lastPenInputTime = 0;
let lastPoint = null;
let lastMidPoint = null;
let panLastPoint = null;
let rotateLastPoint = null;
let smudgeBufferCanvas = null;
let smudgeBufferCtx = null;
let smudgeStampCanvas = null;
let smudgeStampCtx = null;
let smudgeStrokeDistance = 0;
let smudgeStrokeEnergy = 1;
let egbertAngleJitter = 0;
let undoStack = [];
let redoStack = [];
let activeMovingPanel = null;
let movingPointerId = null;
let movingOffset = null;
let canvasWidth = 1920;
let canvasHeight = 1080;
let pickerHue = 220;
let pickerSaturation = 92;
let pickerValue = 93;
let activeBrushFilter = "all";
let recentBrushes = [];
let favoriteBrushes = new Set();

const maxLayers = 5;
const maxHistory = 30;
const panelStorageKey = "cahDrawStudioPanelStateV11";
const panelMap = {
  header: headerPanel,
  canvas: canvasPanel,
  brushes: brushPanel,
  settings: settingsPanel,
  color: colorPanel,
  layers: layersPanel,
  gizmo: navGizmo
};

let view = { x: 0, y: 0, scale: 1, rotation: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSoftnessBlur(size, multiplier = 0.22) {
  const softness = Number(brushSoftness.value) / 100;
  if (softness <= 0) return 0;
  return Math.min(1.1, Math.max(0, Math.sqrt(size) * softness * multiplier * 0.55));
}

function getSoftnessAlphaFeather() {
  return Number(brushSoftness.value) / 100;
}

function hexToRgba(hex, alpha) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hsvToHex(h, s, v) {
  const sat = s / 100;
  const val = v / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function hexToHsv(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100
  };
}

function setSubmitStatus(message, type = "") {
  submitStatus.textContent = message;
  submitStatus.className = "cah-submit-status";
  if (type) submitStatus.classList.add(type);
}

function getViewportSize() {
  const rect = canvasViewport.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function applyViewTransform() {
  canvasStage.style.width = canvasWidth + "px";
  canvasStage.style.height = canvasHeight + "px";
  canvasStage.style.transform = `translate(${view.x}px, ${view.y}px) rotate(${view.rotation}deg) scale(${view.scale})`;
}

function fitCanvasToScreen() {
  const viewport = getViewportSize();
  const fitScale = Math.min(viewport.width / canvasWidth, viewport.height / canvasHeight) * 0.82;
  view.scale = clamp(fitScale, 0.05, 2);
  view.rotation = 0;
  view.x = viewport.width / 2 - (canvasWidth * view.scale) / 2;
  view.y = viewport.height / 2 - (canvasHeight * view.scale) / 2;
  applyViewTransform();
}

function screenToWorld(screenX, screenY, sourceView = view) {
  const rad = (-sourceView.rotation * Math.PI) / 180;
  const dx = screenX - sourceView.x;
  const dy = screenY - sourceView.y;
  const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);
  return { x: rotatedX / sourceView.scale, y: rotatedY / sourceView.scale };
}

function getTransformedPoint(worldX, worldY, targetView) {
  const scaledX = worldX * targetView.scale;
  const scaledY = worldY * targetView.scale;
  const rad = (targetView.rotation * Math.PI) / 180;
  return {
    x: scaledX * Math.cos(rad) - scaledY * Math.sin(rad),
    y: scaledX * Math.sin(rad) + scaledY * Math.cos(rad)
  };
}

function getViewportCenter() {
  const viewport = getViewportSize();
  return { x: viewport.width / 2, y: viewport.height / 2 };
}

function getViewportPoint(clientX, clientY) {
  const rect = canvasViewport.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function zoomAtViewportPoint(factor, viewportX, viewportY) {
  const world = screenToWorld(viewportX, viewportY);
  view.scale = clamp(view.scale * factor, 0.03, 12);
  const transformed = getTransformedPoint(world.x, world.y, view);
  view.x = viewportX - transformed.x;
  view.y = viewportY - transformed.y;
  applyViewTransform();
}

function zoomAtCenter(factor) {
  const center = getViewportCenter();
  zoomAtViewportPoint(factor, center.x, center.y);
}

function rotateAtViewportPoint(amount, viewportX, viewportY) {
  const world = screenToWorld(viewportX, viewportY);
  view.rotation += amount;
  if (view.rotation >= 360 || view.rotation <= -360) view.rotation %= 360;
  const transformed = getTransformedPoint(world.x, world.y, view);
  view.x = viewportX - transformed.x;
  view.y = viewportY - transformed.y;
  applyViewTransform();
}

function rotateAtCenter(amount) {
  const center = getViewportCenter();
  rotateAtViewportPoint(amount, center.x, center.y);
}

function panView(dx, dy) {
  view.x += dx;
  view.y += dy;
  applyViewTransform();
}

function setupCanvas(layer) {
  layer.canvas.width = canvasWidth;
  layer.canvas.height = canvasHeight;
  layer.canvas.style.width = canvasWidth + "px";
  layer.canvas.style.height = canvasHeight + "px";
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.lineCap = "round";
  layer.ctx.lineJoin = "round";
  layer.ctx.imageSmoothingEnabled = true;
}

function createLayer(name, afterLayerId = null) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const layer = {
    id: "layer-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    name,
    canvas,
    ctx,
    visible: true,
    locked: false,
    opacity: 1
  };
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  setupCanvas(layer);

  if (afterLayerId) {
    const index = layers.findIndex((item) => item.id === afterLayerId);
    layers.splice(index + 1, 0, layer);
  } else {
    layers.push(layer);
  }

  layersContainer.appendChild(canvas);
  setActiveLayer(layer.id);
  renderLayers();
  return layer;
}

function getActiveLayer() {
  return layers.find((layer) => layer.id === activeLayerId) || layers[0];
}

function setActiveLayer(id) {
  activeLayerId = id;
  layers.forEach((layer, index) => {
    layer.canvas.style.zIndex = String(index + 1);
    layer.canvas.style.display = layer.visible ? "block" : "none";
    layer.canvas.style.opacity = String(layer.opacity ?? 1);
  });
  renderLayers();
}

function addLayerAfter(layerId) {
  if (layers.length >= maxLayers) return;
  saveHistory();
  const layer = createLayer("Layer " + nextLayerNumber, layerId);
  nextLayerNumber += 1;
  setActiveLayer(layer.id);
}

function deleteLayerById(layerId) {
  if (layers.length <= 1) return;
  const layer = layers.find((item) => item.id === layerId);
  if (!layer) return;
  saveHistory();
  layer.canvas.remove();
  layers = layers.filter((item) => item.id !== layerId);
  setActiveLayer(layers[Math.max(0, layers.length - 1)].id);
}

function toggleLayerVisibility(layerId) {
  const layer = layers.find((item) => item.id === layerId);
  if (!layer) return;
  saveHistory();
  layer.visible = !layer.visible;
  layer.canvas.style.display = layer.visible ? "block" : "none";
  renderLayers();
}

function toggleLayerLock(layerId) {
  const layer = layers.find((item) => item.id === layerId);
  if (!layer) return;
  layer.locked = !layer.locked;
  renderLayers();
}

function setLayerOpacity(layerId, opacityValue) {
  const layer = layers.find((item) => item.id === layerId);
  if (!layer) return;
  layer.opacity = clamp(Number(opacityValue) / 100, 0, 1);
  layer.canvas.style.opacity = String(layer.opacity);
  renderLayers();
}

function previewLayerOpacity(layerId, opacityValue) {
  const layer = layers.find((item) => item.id === layerId);
  if (!layer) return;
  layer.opacity = clamp(Number(opacityValue) / 100, 0, 1);
  layer.canvas.style.opacity = String(layer.opacity);
}

function renderLayers() {
  layersList.innerHTML = "";
  [...layers].reverse().forEach((layer) => {
    const row = document.createElement("div");
    row.className = "cah-layer-item" + (layer.id === activeLayerId ? " active" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = layer.visible;
    checkbox.className = "cah-layer-check";
    checkbox.title = "Layer visibility";
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLayerVisibility(layer.id);
    });

    const name = document.createElement("button");
    name.type = "button";
    name.className = "cah-layer-name";
    name.innerHTML = `<span>${layer.name}</span><small>${Math.round((layer.opacity ?? 1) * 100)}%</small>`;
    name.addEventListener("click", () => setActiveLayer(layer.id));

    const opacity = document.createElement("input");
    opacity.type = "range";
    opacity.min = "0";
    opacity.max = "100";
    opacity.value = String(Math.round((layer.opacity ?? 1) * 100));
    opacity.className = "cah-layer-opacity-inline";
    opacity.title = "Layer opacity";
    opacity.addEventListener("pointerdown", (event) => event.stopPropagation());
    opacity.addEventListener("click", (event) => event.stopPropagation());
    opacity.addEventListener("input", (event) => {
      event.stopPropagation();
      previewLayerOpacity(layer.id, event.target.value);
      name.querySelector("small").textContent = event.target.value + "%";
    });
    opacity.addEventListener("change", (event) => {
      event.stopPropagation();
      setLayerOpacity(layer.id, event.target.value);
    });

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "cah-layer-mini";
    addButton.textContent = "+";
    addButton.title = "Add layer above";
    addButton.disabled = layers.length >= maxLayers;
    addButton.addEventListener("click", (event) => {
      event.stopPropagation();
      addLayerAfter(layer.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "cah-layer-mini";
    deleteButton.textContent = "Del";
    deleteButton.title = "Delete layer";
    deleteButton.disabled = layers.length <= 1;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteLayerById(layer.id);
    });

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "cah-layer-mini";
    lockButton.textContent = layer.locked ? "🔒" : "🔓";
    lockButton.title = layer.locked ? "Unlock layer" : "Lock layer";
    lockButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLayerLock(layer.id);
    });

    row.append(checkbox, name, opacity, lockButton, addButton, deleteButton);
    layersList.appendChild(row);
  });
}

function captureState() {
  return {
    canvasWidth,
    canvasHeight,
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity ?? 1,
      data: layer.canvas.toDataURL("image/png")
    }))
  };
}

function saveHistory() {
  try {
    undoStack.push(captureState());
    if (undoStack.length > maxHistory) undoStack.shift();
    redoStack = [];
  } catch (error) {
    console.log("History failed");
  }
}

function restoreState(snapshot) {
  if (!snapshot) return;
  canvasWidth = snapshot.canvasWidth || canvasWidth;
  canvasHeight = snapshot.canvasHeight || canvasHeight;
  layersContainer.innerHTML = "";
  layers = [];
  let loaded = 0;
  const savedLayers = snapshot.layers || snapshot;
  savedLayers.forEach((savedLayer) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const layer = {
      id: savedLayer.id,
      name: savedLayer.name,
      canvas,
      ctx,
      visible: savedLayer.visible,
      locked: Boolean(savedLayer.locked),
      opacity: savedLayer.opacity ?? 1
    };
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    layersContainer.appendChild(canvas);
    layers.push(layer);
    setupCanvas(layer);
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
      loaded += 1;
      if (loaded === savedLayers.length) {
        if (!layers.find((item) => item.id === activeLayerId) && layers[0]) activeLayerId = layers[0].id;
        setActiveLayer(activeLayerId);
        applyViewTransform();
      }
    };
    image.src = savedLayer.data;
  });
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(captureState());
  restoreState(undoStack.pop());
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(captureState());
  restoreState(redoStack.pop());
}

function getCanvasPoint(event) {
  const rect = canvasViewport.getBoundingClientRect();
  const point = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
  return { x: clamp(point.x, 0, canvasWidth), y: clamp(point.y, 0, canvasHeight) };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function prepareBrush(ctx) {
  const size = Number(brushSize.value);
  const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
  const softness = Number(brushSoftness.value) / 100;
  const color = hexToRgba(colorPicker.value, opacity);
  ctx.globalAlpha = activeMode === "erase" ? opacity : 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.filter = "none";
  ctx.globalCompositeOperation = activeMode === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = activeMode === "erase" ? "#000000" : color;
  ctx.fillStyle = activeMode === "erase" ? "#000000" : color;

  if (selectedBrush === "flat") ctx.lineWidth = Math.max(2, size * 0.9);
  else if (selectedBrush === "bright") ctx.lineWidth = Math.max(2, size * 0.78);
  else if (selectedBrush === "filbert") ctx.lineWidth = Math.max(2, size * 0.92);
  else if (selectedBrush === "round") ctx.lineWidth = Math.max(1, size * 0.58);
  else if (selectedBrush === "fan") ctx.lineWidth = Math.max(2, size * 1.15);
  else if (selectedBrush === "glaze") ctx.lineWidth = Math.max(4, size * 2.6);
  else if (selectedBrush === "shader") ctx.lineWidth = Math.max(2, size * 0.72);
  else if (selectedBrush === "catTongue") ctx.lineWidth = Math.max(2, size * 0.86);
  else if (selectedBrush === "liner") ctx.lineWidth = Math.max(0.6, size * 0.16);
  else if (selectedBrush === "script") ctx.lineWidth = Math.max(0.5, size * 0.11);
  else if (selectedBrush === "detailLiner") ctx.lineWidth = Math.max(0.35, size * 0.065);
  else if (selectedBrush === "egbert") ctx.lineWidth = Math.max(2, size * 0.52);
  else if (selectedBrush === "mop") ctx.lineWidth = Math.max(4, size * 2.1);
  else if (selectedBrush === "ink") ctx.lineWidth = Math.max(1, size * 0.68);
  else if (selectedBrush === "pencil") ctx.lineWidth = Math.max(0.8, size * 0.34);
  else if (selectedBrush === "marker") ctx.lineWidth = size * 1.15;
  else if (selectedBrush === "soft") ctx.lineWidth = size * 1.9;
  else if (selectedBrush === "watercolor") ctx.lineWidth = size * 2.4;
  else if (selectedBrush === "charcoal") ctx.lineWidth = size * 1.35;
  else ctx.lineWidth = size;

  if (activeMode === "draw") {
  if (selectedBrush === "flat") {
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.86);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.86);
    ctx.lineWidth = size * 0.72;
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
  } else if (selectedBrush === "bright") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.94);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.94);
    } else if (selectedBrush === "filbert") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.76);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.76);
      ctx.shadowBlur = size * 0.08;
      ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.18);
    } else if (selectedBrush === "round") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.9);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.9);
    } else if (selectedBrush === "fan") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.36);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.36);
  } else if (selectedBrush === "glaze") {
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.13);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.13);
  } else if (selectedBrush === "shader") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.88);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.88);
    } else if (selectedBrush === "catTongue") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.72);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.72);
    } else if (selectedBrush === "liner" || selectedBrush === "script" || selectedBrush === "detailLiner") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.96);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.96);
    } else if (selectedBrush === "egbert") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.72);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.72);
    } else if (selectedBrush === "mop") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.18);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.18);
      ctx.shadowBlur = size * 0.8;
      ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.24);
    } else if (selectedBrush === "pencil") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.72);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.72);
    } else if (selectedBrush === "marker") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.78);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.78);
    } else if (selectedBrush === "soft") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.28);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.28);
      ctx.shadowBlur = size * 0.65;
      ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.35);
    } else if (selectedBrush === "watercolor") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.16);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.16);
      ctx.shadowBlur = size * 0.7;
      ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.22);
    } else if (selectedBrush === "charcoal") {
      ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.52);
      ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.52);
    }
  }

  if (softness > 0 && activeMode !== "erase") {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.filter = "none";
  }
}

function finishBrush(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.filter = "none";
}

function drawCharcoalTexture(ctx, point) {
  if (activeMode === "erase") return;
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const count = Math.max(4, Math.floor(size / 2));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.24);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.42;
    const radius = Math.random() * Math.max(1, size * 0.09);
    ctx.beginPath();
    ctx.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBrushTexture(ctx, point) {
  if (activeMode === "erase") return;

  const size = Number(brushSize.value);
  const flow = Number(brushFlow.value) / 100;
  const opacity = Number(brushOpacity.value) / 100;

  if (selectedBrush === "flat" || selectedBrush === "bright" || selectedBrush === "shader") {
    const stiff = selectedBrush !== "flat";
    const marks = stiff ? 5 : 4;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * flow * (stiff ? 0.22 : 0.18));
    ctx.lineWidth = Math.max(0.8, size * (stiff ? 0.035 : 0.028));

    for (let i = 0; i < marks; i += 1) {
      const yOffset = (i - (marks - 1) / 2) * size * (stiff ? 0.1 : 0.13);
      const length = size * (stiff ? 0.55 : 0.92);
      ctx.beginPath();
      ctx.moveTo(point.x - length * 0.5, point.y + yOffset);
      ctx.lineTo(point.x + length * 0.5, point.y + yOffset + (Math.random() - 0.5) * size * 0.08);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (selectedBrush === "filbert" || selectedBrush === "catTongue" || selectedBrush === "egbert") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * flow * 0.12);
    ctx.beginPath();
    const pointiness = selectedBrush === "catTongue" ? 0.72 : selectedBrush === "egbert" ? 0.42 : 0.1;
    ctx.ellipse(point.x, point.y - size * pointiness * 0.08, size * 0.34, size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (selectedBrush === "round") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * flow * 0.16);
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(1, size * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (selectedBrush === "fan") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * flow * 0.2);
    ctx.lineWidth = Math.max(0.6, size * 0.025);

    for (let i = -3; i <= 3; i += 1) {
      const angle = (-0.75 + i * 0.22) + (Math.random() - 0.5) * 0.12;
      const length = size * (0.45 + Math.random() * 0.26);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + Math.cos(angle) * length, point.y + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (selectedBrush === "glaze" || selectedBrush === "mop") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = opacity * flow * (selectedBrush === "mop" ? 0.09 : 0.055);
    ctx.fillStyle = colorPicker.value;

    for (let i = 0; i < (selectedBrush === "mop" ? 5 : 3); i += 1) {
      const radius = size * (selectedBrush === "mop" ? 0.7 : 0.95) * (0.62 + Math.random() * 0.35);
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 0.36;
      ctx.beginPath();
      ctx.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (selectedBrush === "liner" || selectedBrush === "script" || selectedBrush === "detailLiner") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * flow * 0.08);
    const dotSize = selectedBrush === "detailLiner" ? 0.025 : selectedBrush === "script" ? 0.04 : 0.055;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(0.5, size * dotSize), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (selectedBrush === "charcoal") {
    drawCharcoalTexture(ctx, point);
    return;
  }

  if (selectedBrush === "pencil") {
    const marks = Math.max(2, Math.floor(size * 0.28));
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * flow * 0.22);
    ctx.lineWidth = Math.max(0.5, size * 0.035);

    for (let i = 0; i < marks; i += 1) {
      const angle = -0.55 + Math.random() * 0.32;
      const distance = Math.random() * size * 0.42;
      const length = Math.max(2, size * (0.14 + Math.random() * 0.16));
      const x = point.x + Math.cos(angle + Math.PI / 2) * distance;
      const y = point.y + Math.sin(angle + Math.PI / 2) * distance;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (selectedBrush === "watercolor") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = opacity * flow * 0.08;
    ctx.fillStyle = colorPicker.value;

    for (let i = 0; i < 3; i += 1) {
      const radius = size * (0.35 + Math.random() * 0.25);
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 0.28;
      ctx.beginPath();
      ctx.arc(
        point.x + Math.cos(angle) * distance,
        point.y + Math.sin(angle) * distance,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (selectedBrush === "marker") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * flow * 0.12);
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, size * 0.52, size * 0.22, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function addStrokeTextureSamples(ctx, fromPoint, toPoint) {
  const size = Number(brushSize.value);
  const spacing = Number(brushSpacing.value) / 100;
  const distance = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
  const stepSize = Math.max(2, size * spacing);
  const steps = Math.max(1, Math.ceil(distance / stepSize));

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    drawBrushTexture(ctx, {
      x: fromPoint.x + (toPoint.x - fromPoint.x) * t,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * t
    });
  }
}

function usesShapedDabs() {
  return [
    "bright",
    "filbert",
    "round",
    "fan",
    "glaze",
    "shader",
    "catTongue",
    "egbert",
    "mop"
  ].includes(selectedBrush);
}

function getBrushDabSpacing(size) {
  const spacing = Number(brushSpacing.value) / 100;

  if (selectedBrush === "fan") return Math.max(3, size * Math.max(0.08, spacing * 0.55));
  if (selectedBrush === "glaze") return Math.max(10, size * Math.max(0.32, spacing * 1.85));
  if (selectedBrush === "mop") return Math.max(12, size * Math.max(0.36, spacing * 1.95));
  if (selectedBrush === "round") return Math.max(2, size * Math.max(0.08, spacing * 0.55));

  return Math.max(2, size * Math.max(0.07, spacing * 0.45));
}

function setDabPaint(ctx) {
  const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
  const softness = Number(brushSoftness.value) / 100;

  ctx.globalCompositeOperation = activeMode === "erase" ? "destination-out" : "source-over";
  ctx.globalAlpha = activeMode === "erase" ? opacity : 1;
  ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity);
  ctx.strokeStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.filter = "none";
}

function drawOrientedRect(ctx, width, height) {
  ctx.fillRect(-width / 2, -height / 2, width, height);
}

function drawCatTongueShape(ctx, width, height) {
  ctx.beginPath();
  ctx.moveTo(width * 0.5, 0);
  ctx.quadraticCurveTo(width * 0.16, -height * 0.5, -width * 0.45, -height * 0.45);
  ctx.quadraticCurveTo(-width * 0.62, 0, -width * 0.45, height * 0.45);
  ctx.quadraticCurveTo(width * 0.16, height * 0.5, width * 0.5, 0);
  ctx.fill();
}

function drawFanDab(ctx, size) {
  const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
  ctx.lineWidth = Math.max(0.7, size * 0.035);
  ctx.strokeStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.55);

  for (let i = -4; i <= 4; i += 1) {
    const spread = i / 4;
    const angle = spread * 0.48;
    const length = size * (0.68 + Math.random() * 0.22);
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, 0);
    ctx.quadraticCurveTo(
      length * 0.25,
      spread * size * 0.22,
      Math.cos(angle) * length,
      Math.sin(angle) * length
    );
    ctx.stroke();
  }
}

function drawBrushDab(ctx, point, angle) {
  const size = Number(brushSize.value);
  const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
  const softness = Number(brushSoftness.value) / 100;

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  setDabPaint(ctx);

  if (selectedBrush === "flat") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.82);
    drawOrientedRect(ctx, size * (1.65 + softness * 0.2), Math.max(2, size * (0.30 + softness * 0.10)));
  } else if (selectedBrush === "bright") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.92);
    drawOrientedRect(ctx, size * 1.32, Math.max(2, size * 0.40));
    ctx.globalAlpha *= 0.34;
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillRect(-size * 0.64, i * size * 0.085, size * 1.28, Math.max(1, size * 0.018));
    }
  } else if (selectedBrush === "filbert") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.72);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.78, Math.max(2, size * 0.30), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (selectedBrush === "round") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.86);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1.2, size * 0.26), Math.max(1.2, size * 0.26), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (selectedBrush === "fan") {
    drawFanDab(ctx, size);
  } else if (selectedBrush === "glaze") {
    ctx.globalAlpha = activeMode === "erase" ? opacity : opacity * 0.105;
    ctx.filter = "none";
    ctx.fillStyle = activeMode === "erase" ? "#000" : colorPicker.value;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * (1.18 + softness * 0.24), Math.max(3, size * (0.32 + softness * 0.12)), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (selectedBrush === "shader") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.9);
    drawOrientedRect(ctx, size * 1.05, Math.max(2, size * 0.30));
  } else if (selectedBrush === "catTongue") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.76);
    drawCatTongueShape(ctx, size * 1.35, Math.max(3, size * 0.58));
  } else if (selectedBrush === "egbert") {
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.72);
    ctx.beginPath();
    ctx.moveTo(-size * 0.92, -size * 0.18);
    ctx.quadraticCurveTo(-size * 0.20, -size * 0.46, size * 0.88, -size * 0.30);
    ctx.quadraticCurveTo(size * 1.12, -size * 0.08, size * 0.70, size * 0.20);
    ctx.quadraticCurveTo(-size * 0.22, size * 0.44, -size * 0.96, size * 0.18);
    ctx.quadraticCurveTo(-size * 1.08, 0, -size * 0.92, -size * 0.18);
    ctx.fill();

    if (activeMode !== "erase") {
      ctx.globalAlpha *= 0.34;
      ctx.fillStyle = colorPicker.value;
      for (let i = -5; i <= 5; i += 1) {
        const x = -size * 0.82 + Math.random() * size * 1.55;
        const y = i * size * 0.035 + (Math.random() - 0.5) * size * 0.04;
        ctx.fillRect(x, y, size * (0.08 + Math.random() * 0.10), Math.max(1, size * 0.018));
      }
    }
  } else if (selectedBrush === "mop") {
    ctx.globalAlpha = activeMode === "erase" ? opacity : opacity * 0.13;
    ctx.filter = "none";
    ctx.fillStyle = activeMode === "erase" ? "#000" : colorPicker.value;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * (0.82 + softness * 0.22), Math.max(4, size * (0.42 + softness * 0.14)), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawShapedDabs(fromPoint, toPoint) {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;

  const ctx = layer.ctx;
  const size = Number(brushSize.value);
  const distance = Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
  const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
  const stepSize = getBrushDabSpacing(size);
  const rawSteps = Math.max(1, Math.ceil(distance / stepSize));
  const steps = selectedBrush === "glaze" || selectedBrush === "mop"
    ? Math.min(rawSteps, 5)
    : rawSteps;

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    let dabAngle = angle;

    if (selectedBrush === "egbert") {
      egbertAngleJitter = clamp(
        egbertAngleJitter + (Math.random() - 0.5) * 0.18,
        -0.42,
        0.42
      );
      dabAngle = angle + egbertAngleJitter;
    }

    drawBrushDab(ctx, {
      x: fromPoint.x + (toPoint.x - fromPoint.x) * t,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * t
    }, dabAngle);
  }
}

function drawFastSmudge(layer, point) {
  if (activeMode === "erase") {
    drawNormalStroke(point);
    return;
  }

  if (!smudgeBufferCanvas) {
    smudgeBufferCanvas = document.createElement("canvas");
    smudgeBufferCtx = smudgeBufferCanvas.getContext("2d", { willReadFrequently: true });
  }

  if (!smudgeStampCanvas) {
    smudgeStampCanvas = document.createElement("canvas");
    smudgeStampCtx = smudgeStampCanvas.getContext("2d", { willReadFrequently: true });
  }

  if (!lastPoint) {
    const size = Number(brushSize.value);
    const strength = Number(smudgeStrength.value) / 100;
    const radius = Math.max(8, Math.floor(size * (0.58 + strength * 0.35)));
    const bufferSize = radius * 2;

    smudgeBufferCanvas.width = bufferSize;
    smudgeBufferCanvas.height = bufferSize;
    smudgeBufferCtx.clearRect(0, 0, bufferSize, bufferSize);
    smudgeBufferCtx.drawImage(
      layer.canvas,
      Math.floor(point.x - radius),
      Math.floor(point.y - radius),
      bufferSize,
      bufferSize,
      0,
      0,
      bufferSize,
      bufferSize
    );

    smudgeStrokeDistance = 0;
    smudgeStrokeEnergy = 1;
    lastPoint = point;
    lastMidPoint = point;
    return;
  }

  const ctx = layer.ctx;
  const size = Number(brushSize.value);
  const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
  const strength = Number(smudgeStrength.value) / 100;
  const radius = Math.max(8, Math.floor(size * (0.58 + strength * 0.35)));
  const sampleSize = radius * 2;
  const movementX = point.x - lastPoint.x;
  const movementY = point.y - lastPoint.y;
  const distance = Math.hypot(movementX, movementY);
  const steps = Math.max(1, Math.min(8, Math.ceil(distance / Math.max(4, radius * 0.45))));
  const fadeDistance = Math.max(radius * 4.5, 80 + Number(brushSize.value) * 2.2);
  const baseAlpha = clamp(opacity * (0.24 + strength * 0.38), 0.06, 0.72);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true;

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const currentX = lastPoint.x + movementX * t;
    const currentY = lastPoint.y + movementY * t;
    const stepDistance = distance / steps;

    smudgeStrokeDistance += stepDistance;
    smudgeStrokeEnergy = clamp(1 - smudgeStrokeDistance / fadeDistance, 0, 1);
    const stampAlpha = baseAlpha * (0.12 + smudgeStrokeEnergy * 0.88);
    const pickupAlpha = clamp((0.025 + strength * 0.09) * smudgeStrokeEnergy, 0.006, 0.16);
    const bufferFade = clamp(0.04 + (1 - smudgeStrokeEnergy) * 0.10, 0.04, 0.16);

    if (smudgeBufferCanvas.width !== sampleSize || smudgeBufferCanvas.height !== sampleSize) {
      const oldBuffer = document.createElement("canvas");
      oldBuffer.width = smudgeBufferCanvas.width;
      oldBuffer.height = smudgeBufferCanvas.height;
      oldBuffer.getContext("2d").drawImage(smudgeBufferCanvas, 0, 0);
      smudgeBufferCanvas.width = sampleSize;
      smudgeBufferCanvas.height = sampleSize;
      smudgeBufferCtx = smudgeBufferCanvas.getContext("2d", { willReadFrequently: true });
      smudgeBufferCtx.drawImage(oldBuffer, 0, 0, sampleSize, sampleSize);
    }

    if (smudgeStampCanvas.width !== sampleSize || smudgeStampCanvas.height !== sampleSize) {
      smudgeStampCanvas.width = sampleSize;
      smudgeStampCanvas.height = sampleSize;
      smudgeStampCtx = smudgeStampCanvas.getContext("2d", { willReadFrequently: true });
    }

    try {
      smudgeStampCtx.clearRect(0, 0, sampleSize, sampleSize);
      smudgeStampCtx.globalCompositeOperation = "source-over";
      smudgeStampCtx.globalAlpha = 1;
      smudgeStampCtx.drawImage(smudgeBufferCanvas, 0, 0, sampleSize, sampleSize);

      const falloff = smudgeStampCtx.createRadialGradient(
        radius,
        radius,
        radius * 0.18,
        radius,
        radius,
        radius
      );
      falloff.addColorStop(0, "rgba(0,0,0,0.92)");
      falloff.addColorStop(0.25, "rgba(0,0,0,0.68)");
      falloff.addColorStop(0.68, "rgba(0,0,0,0.22)");
      falloff.addColorStop(1, "rgba(0,0,0,0)");

      smudgeStampCtx.globalCompositeOperation = "destination-in";
      smudgeStampCtx.fillStyle = falloff;
      smudgeStampCtx.fillRect(0, 0, sampleSize, sampleSize);
      smudgeStampCtx.globalCompositeOperation = "source-over";

      ctx.globalAlpha = stampAlpha;
      ctx.drawImage(smudgeStampCanvas, Math.floor(currentX - radius), Math.floor(currentY - radius));
    } catch (error) {
      console.warn("Smudge stamp failed", error);
    }

    smudgeBufferCtx.save();
    smudgeBufferCtx.globalCompositeOperation = "destination-out";
    smudgeBufferCtx.globalAlpha = bufferFade;
    smudgeBufferCtx.fillRect(0, 0, sampleSize, sampleSize);
    smudgeBufferCtx.restore();

    smudgeBufferCtx.save();
    smudgeBufferCtx.globalAlpha = pickupAlpha;
    smudgeBufferCtx.globalCompositeOperation = "source-over";
    smudgeBufferCtx.drawImage(
      layer.canvas,
      Math.floor(currentX - radius),
      Math.floor(currentY - radius),
      sampleSize,
      sampleSize,
      0,
      0,
      sampleSize,
      sampleSize
    );
    smudgeBufferCtx.restore();
  }

  ctx.restore();
  lastPoint = point;
  lastMidPoint = point;
}

function drawFastBlend(layer, point) {
  if (activeMode === "erase") {
    drawNormalStroke(point);
    return;
  }
  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;
    return;
  }
  const ctx = layer.ctx;
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const strength = Number(blendStrength.value) / 100;
  const radius = Math.max(5, Math.floor(size * (0.45 + strength * 0.2)));
  const sampleSize = radius * 2;
  const movementX = point.x - lastPoint.x;
  const movementY = point.y - lastPoint.y;
  const distance = Math.hypot(movementX, movementY);
  const steps = Math.max(1, Math.min(3, Math.ceil(distance / Math.max(14, radius * 1.8))));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = opacity * (0.05 + strength * 0.18);
  ctx.imageSmoothingEnabled = true;
  ctx.filter = "blur(1px)";
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const currentX = lastPoint.x + movementX * t;
    const currentY = lastPoint.y + movementY * t;
    try {
      ctx.save();
      ctx.beginPath();
      ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(layer.canvas, Math.floor(currentX - radius), Math.floor(currentY - radius), sampleSize, sampleSize, Math.floor(currentX - radius), Math.floor(currentY - radius), sampleSize, sampleSize);
      ctx.restore();
    } catch (error) {
      ctx.restore();
    }
  }
  ctx.restore();
  lastPoint = point;
  lastMidPoint = point;
}

function drawNormalStroke(point) {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;

  if (usesShapedDabs()) {
    if (!lastPoint) {
      lastPoint = point;
      lastMidPoint = point;
      drawBrushDab(layer.ctx, point, 0);
      return;
    }

    drawShapedDabs(lastPoint, point);
    lastPoint = point;
    lastMidPoint = point;
    return;
  }

  const ctx = layer.ctx;
  prepareBrush(ctx);
  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;
    if (selectedBrush === "flat" || selectedBrush === "liner" || selectedBrush === "script" || selectedBrush === "detailLiner") {
      return;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, Number(brushSize.value) / 2, 0, Math.PI * 2);
    ctx.fill();
    if (selectedBrush === "charcoal") drawCharcoalTexture(ctx, point);
    finishBrush(ctx);
    return;
  }
  const mid = midpoint(lastPoint, point);
  ctx.beginPath();
  ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
  ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
  ctx.stroke();
  addStrokeTextureSamples(ctx, lastPoint, point);
  if (selectedBrush === "flat") {
    const angle = Math.atan2(point.y - lastPoint.y, point.x - lastPoint.x);
    const size = Number(brushSize.value);
    const opacity = (Number(brushOpacity.value) / 100) * (Number(brushFlow.value) / 100);
    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = activeMode === "erase" ? "destination-out" : "source-over";
    ctx.fillStyle = activeMode === "erase" ? "#000" : hexToRgba(colorPicker.value, opacity * 0.18);
    ctx.fillRect(-size * 0.52, -size * 0.36, size * 1.04, Math.max(1, size * 0.08));
    ctx.restore();
  }
  lastPoint = point;
  lastMidPoint = mid;
  finishBrush(ctx);
}

function drawSmoothPoint(point) {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;
  if (selectedBrush === "smudge") {
    drawFastSmudge(layer, point);
  } else if (selectedBrush === "blend") {
    drawFastBlend(layer, point);
  } else {
    drawNormalStroke(point);
  }
}

function rememberPointer(event) {
  activePointers.set(event.pointerId, {
    id: event.pointerId,
    pointerType: event.pointerType,
    x: event.clientX,
    y: event.clientY,
    width: event.width || 1,
    height: event.height || 1,
    pressure: event.pressure || 0
  });
}

function updateRememberedPointer(event) {
  const stored = activePointers.get(event.pointerId);
  if (!stored) {
    rememberPointer(event);
    return;
  }
  stored.x = event.clientX;
  stored.y = event.clientY;
  stored.width = event.width || 1;
  stored.height = event.height || 1;
  stored.pressure = event.pressure || 0;
}

function forgetPointer(event) {
  activePointers.delete(event.pointerId);
}

function getTouchPointers() {
  return [...activePointers.values()].filter((pointer) => pointer.pointerType === "touch");
}

function distanceBetweenPointers(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleBetweenPointers(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function centerBetweenPointers(a, b) {
  const rect = canvasViewport.getBoundingClientRect();
  return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
}

function isLikelyPalm(event) {
  if (event.pointerType !== "touch") return false;
  const width = event.width || 1;
  const height = event.height || 1;
  return width >= 32 || height >= 32 || width * height >= 700;
}

function shouldRejectTouchDrawing(event) {
  if (event.pointerType !== "touch") return false;
  const now = Date.now();
  if (isLikelyPalm(event)) return true;
  if (penHasBeenDetected && now - lastPenInputTime < 2500) return true;
  return getTouchPointers().length >= 2;
}

function beginTouchGestureIfNeeded() {
  const touches = getTouchPointers();
  if (touches.length < 2) {
    gestureState = null;
    return false;
  }
  const first = touches[0];
  const second = touches[1];
  const center = centerBetweenPointers(first, second);
  const startView = { ...view };
  gestureState = {
    startDistance: distanceBetweenPointers(first, second),
    startAngle: angleBetweenPointers(first, second),
    startWorld: screenToWorld(center.x, center.y, startView),
    startView
  };
  isDrawing = false;
  activeDrawPointerId = null;
  lastPoint = null;
  lastMidPoint = null;
  return true;
}

function updateTouchGesture() {
  const touches = getTouchPointers();
  if (touches.length < 2 || !gestureState) return false;
  const first = touches[0];
  const second = touches[1];
  const currentDistance = distanceBetweenPointers(first, second);
  const currentAngle = angleBetweenPointers(first, second);
  const currentCenter = centerBetweenPointers(first, second);
  const scaleFactor = currentDistance / Math.max(1, gestureState.startDistance);
  const angleDelta = ((currentAngle - gestureState.startAngle) * 180) / Math.PI;
  view.scale = clamp(gestureState.startView.scale * scaleFactor, 0.05, 8);
  view.rotation = gestureState.startView.rotation + angleDelta;
  const transformed = getTransformedPoint(gestureState.startWorld.x, gestureState.startWorld.y, view);
  view.x = currentCenter.x - transformed.x;
  view.y = currentCenter.y - transformed.y;
  applyViewTransform();
  return true;
}

function shouldStartDrawFromPointer(event) {
  if (event.pointerType === "pen") {
    penHasBeenDetected = true;
    lastPenInputTime = Date.now();
    return true;
  }
  if (event.pointerType === "mouse") return event.button === 0;
  if (event.pointerType === "touch") return !shouldRejectTouchDrawing(event);
  return false;
}

function startDrawing(event) {
  if (document.body.classList.contains("cah-submit-modal-open")) return;
  if (event.isPrimary === false && event.pointerType !== "touch") return;
  event.preventDefault();
  rememberPointer(event);
  if (event.pointerType === "pen") {
    penHasBeenDetected = true;
    lastPenInputTime = Date.now();
  }
  if (event.pointerType === "touch") {
    if (beginTouchGestureIfNeeded()) {
      canvasViewport.setPointerCapture?.(event.pointerId);
      return;
    }
    if (shouldRejectTouchDrawing(event)) {
      canvasViewport.setPointerCapture?.(event.pointerId);
      return;
    }
  }
  if (event.button === 1) {
    isRotating = true;
    isMiddleMouseRotating = true;
    rotateLastPoint = { x: event.clientX, y: event.clientY };
    canvasViewport.setPointerCapture?.(event.pointerId);
    return;
  }
  if (event.button === 2 || activeMode === "hand" || activeMode === "transform") {
    isPanning = true;
    isRightMousePanning = event.button === 2;
    panLastPoint = { x: event.clientX, y: event.clientY };
    canvasStage.classList.add("pan-dragging");
    canvasViewport.setPointerCapture?.(event.pointerId);
    return;
  }
  if (activeMode === "fill") {
    fillActiveLayer();
    return;
  }
  if (activeMode === "eyedropper") {
    pickColorFromPoint(getCanvasPoint(event));
    return;
  }
  if (activeMode === "shape") {
    drawShapeAtPoint(getCanvasPoint(event));
    return;
  }
  if (activeMode === "text") {
    addTextAtPoint(getCanvasPoint(event));
    return;
  }
  if (activeMode === "zoomIn") {
    const point = getViewportPoint(event.clientX, event.clientY);
    zoomAtViewportPoint(1.18, point.x, point.y);
    return;
  }
  if (activeMode === "zoomOut") {
    const point = getViewportPoint(event.clientX, event.clientY);
    zoomAtViewportPoint(0.84, point.x, point.y);
    return;
  }
  if (!["draw", "erase", "smudge"].includes(activeMode)) {
    return;
  }
  if (!shouldStartDrawFromPointer(event)) return;
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;
  saveHistory();
  isDrawing = true;
  activeDrawPointerId = event.pointerId;
  lastPoint = null;
  lastMidPoint = null;
  smudgeBufferCanvas = null;
  smudgeBufferCtx = null;
  smudgeStampCanvas = null;
  smudgeStampCtx = null;
  smudgeStrokeDistance = 0;
  smudgeStrokeEnergy = 1;
  egbertAngleJitter = 0;
  canvasViewport.setPointerCapture?.(event.pointerId);
  drawSmoothPoint(getCanvasPoint(event));
}

function draw(event) {
  updateRememberedPointer(event);
  if (document.body.classList.contains("cah-submit-modal-open")) return;
  if (event.pointerType === "pen") {
    penHasBeenDetected = true;
    lastPenInputTime = Date.now();
  }
  if (event.pointerType === "touch") {
    if (gestureState || getTouchPointers().length >= 2) {
      event.preventDefault();
      if (!gestureState) beginTouchGestureIfNeeded();
      updateTouchGesture();
      return;
    }
    if (shouldRejectTouchDrawing(event)) {
      event.preventDefault();
      return;
    }
  }
  if (isRotating) {
    event.preventDefault();
    const currentPoint = { x: event.clientX, y: event.clientY };
    rotateAtCenter((currentPoint.x - rotateLastPoint.x) * 0.35 + (currentPoint.y - rotateLastPoint.y) * 0.12);
    rotateLastPoint = currentPoint;
    return;
  }
  if (isPanning) {
    event.preventDefault();
    const currentPoint = { x: event.clientX, y: event.clientY };
    panView(currentPoint.x - panLastPoint.x, currentPoint.y - panLastPoint.y);
    panLastPoint = currentPoint;
    return;
  }
  if (!isDrawing || activeDrawPointerId !== event.pointerId) return;
  event.preventDefault();
  const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
  events.forEach((pointerEvent) => drawSmoothPoint(getCanvasPoint(pointerEvent)));
}

function stopDrawing(event) {
  forgetPointer(event);
  if (event.pointerType === "touch" && getTouchPointers().length < 2) gestureState = null;
  if (isRotating) {
    event.preventDefault();
    isRotating = false;
    isMiddleMouseRotating = false;
    rotateLastPoint = null;
    smudgeBufferCanvas = null;
    smudgeBufferCtx = null;
    smudgeStampCanvas = null;
    smudgeStampCtx = null;
    smudgeStrokeDistance = 0;
    smudgeStrokeEnergy = 1;
    egbertAngleJitter = 0;
    return;
  }
  if (isPanning) {
    event.preventDefault();
    isPanning = false;
    isRightMousePanning = false;
    panLastPoint = null;
    canvasStage.classList.remove("pan-dragging");
    smudgeBufferCanvas = null;
    smudgeBufferCtx = null;
    smudgeStampCanvas = null;
    smudgeStampCtx = null;
    smudgeStrokeDistance = 0;
    smudgeStrokeEnergy = 1;
    egbertAngleJitter = 0;
    return;
  }
  if (!isDrawing || activeDrawPointerId !== event.pointerId) return;
  event.preventDefault();
  isDrawing = false;
  activeDrawPointerId = null;
  lastPoint = null;
  lastMidPoint = null;
  smudgeBufferCanvas = null;
  smudgeBufferCtx = null;
  smudgeStampCanvas = null;
  smudgeStampCtx = null;
  smudgeStrokeDistance = 0;
  smudgeStrokeEnergy = 1;
  egbertAngleJitter = 0;
}

function handleWheel(event) {
  event.preventDefault();
  const point = getViewportPoint(event.clientX, event.clientY);
  zoomAtViewportPoint(event.deltaY < 0 ? 1.12 : 0.88, point.x, point.y);
}

function updateBrushBodyClass() {
  document.body.classList.remove("cah-brush-smudge", "cah-brush-blend", "cah-erase-mode");
  if (selectedBrush === "smudge") document.body.classList.add("cah-brush-smudge");
  if (selectedBrush === "blend") document.body.classList.add("cah-brush-blend");
  if (activeMode === "erase") document.body.classList.add("cah-erase-mode");
}

function setMode(mode) {
  activeMode = mode;
  document.querySelectorAll("[data-tool-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.toolMode === mode);
  });
  updateBrushBodyClass();
}

function selectBrush(brushName) {
  selectedBrush = brushName;
  brushSelect.value = brushName;
  rememberRecentBrush(brushName);
  document.querySelectorAll(".cah-brush-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.brush === brushName);
  });
  renderBrushLibrary();
  updateBrushBodyClass();
}

function rememberRecentBrush(brushName) {
  recentBrushes = [brushName, ...recentBrushes.filter((item) => item !== brushName)].slice(0, 5);
}

function renderBrushLibrary() {
  document.querySelectorAll(".cah-brush-card").forEach((button) => {
    const brush = button.dataset.brush;
    const category = button.dataset.category;
    const isFavorite = favoriteBrushes.has(brush);
    const isRecent = recentBrushes.includes(brush);
    const show =
      activeBrushFilter === "all" ||
      (activeBrushFilter === "favorites" && isFavorite) ||
      (activeBrushFilter === "recent" && isRecent) ||
      activeBrushFilter === category;

    button.hidden = !show;
    button.style.display = show ? "" : "none";
    button.classList.toggle("is-favorite", isFavorite);
    button.classList.toggle("active", brush === selectedBrush);
  });
}

function clearCanvas() {
  saveHistory();
  layers.forEach((layer) => layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight));
}

function fillActiveLayer() {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;
  saveHistory();
  layer.ctx.save();
  layer.ctx.globalCompositeOperation = "source-over";
  layer.ctx.globalAlpha = Number(brushOpacity.value) / 100;
  layer.ctx.fillStyle = colorPicker.value;
  layer.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  layer.ctx.restore();
}

function pickColorFromPoint(point) {
  const layer = getActiveLayer();
  if (!layer) return;
  const pixel = layer.ctx.getImageData(
    clamp(Math.floor(point.x), 0, canvasWidth - 1),
    clamp(Math.floor(point.y), 0, canvasHeight - 1),
    1,
    1
  ).data;

  if (pixel[3] === 0) return;

  const toHex = (value) => value.toString(16).padStart(2, "0");
  colorPicker.value = "#" + toHex(pixel[0]) + toHex(pixel[1]) + toHex(pixel[2]);
  syncPickerFromHex(colorPicker.value);
}

function drawShapeAtPoint(point) {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;
  const size = Number(brushSize.value) * 2;
  saveHistory();
  layer.ctx.save();
  layer.ctx.globalAlpha = Number(brushOpacity.value) / 100;
  layer.ctx.strokeStyle = colorPicker.value;
  layer.ctx.lineWidth = Math.max(1, Number(brushSize.value) * 0.08);
  layer.ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  layer.ctx.restore();
}

function addTextAtPoint(point) {
  const layer = getActiveLayer();
  if (!layer || !layer.visible || layer.locked) return;
  const text = window.prompt("Text");
  if (!text) return;
  saveHistory();
  layer.ctx.save();
  layer.ctx.globalAlpha = Number(brushOpacity.value) / 100;
  layer.ctx.fillStyle = colorPicker.value;
  layer.ctx.font = Math.max(12, Number(brushSize.value) * 2) + "px Arial";
  layer.ctx.fillText(text, point.x, point.y);
  layer.ctx.restore();
}

function createExportCanvas() {
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;
  exportCtx.fillStyle = "#fffaf4";
  exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  layers.forEach((layer) => {
    if (!layer.visible) return;
    exportCtx.save();
    exportCtx.globalAlpha = layer.opacity ?? 1;
    exportCtx.drawImage(layer.canvas, 0, 0);
    exportCtx.restore();
  });
  return exportCanvas;
}

function savePng() {
  const exportCanvas = createExportCanvas();
  const link = document.createElement("a");
  link.download = "cah-drawing.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function updateSubmitPreview() {
  if (!submitPreviewCanvas) return;
  const exportCanvas = createExportCanvas();
  const ctx = submitPreviewCanvas.getContext("2d");
  const previewWidth = 640;
  const previewHeight = Math.max(220, Math.round((canvasHeight / canvasWidth) * previewWidth));
  submitPreviewCanvas.width = previewWidth;
  submitPreviewCanvas.height = previewHeight;
  ctx.fillStyle = "#fffaf4";
  ctx.fillRect(0, 0, previewWidth, previewHeight);
  ctx.drawImage(exportCanvas, 0, 0, previewWidth, previewHeight);
}

function openSubmitModal() {
  updateSubmitPreview();
  setSubmitStatus("");
  document.body.classList.add("cah-submit-modal-open");
  submitModal.setAttribute("aria-hidden", "false");
}

function closeSubmitModal() {
  document.body.classList.remove("cah-submit-modal-open");
  submitModal.setAttribute("aria-hidden", "true");
}

function applyCanvasPreset() {
  const [width, height] = canvasPresetSelect.value.split("x").map(Number);
  if (!width || !height) return;
  if (!window.confirm("Apply this canvas size? This will scale your current drawing to the new canvas.")) return;
  saveHistory();
  const oldLayers = layers.map((layer) => ({ layer, image: layer.canvas }));
  canvasWidth = width;
  canvasHeight = height;
  oldLayers.forEach(({ layer, image }) => {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    tempCtx.drawImage(image, 0, 0);
    setupCanvas(layer);
    layer.ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
  });
  fitCanvasToScreen();
}

function updateSubmitAgeGroup() {
  document.body.classList.toggle("cah-submit-child", submitAgeGroup.value === "Child");
}

function validateSubmissionForm() {
  const ageGroup = submitAgeGroup.value;
  const guardianName = submitGuardianName.value.trim();
  if (ageGroup === "Child" && !guardianName) return "Please add a parent or guardian name for child submissions.";
  if (!submitPermission.checked) return "Please confirm permission before submitting.";
  return "";
}

async function submitDrawing() {
  if (isSubmitting) return;
  const validationError = validateSubmissionForm();
  if (validationError) {
    setSubmitStatus(validationError, "error");
    return;
  }
  try {
    isSubmitting = true;
    submitDrawingBtn.disabled = true;
    setSubmitStatus("Preparing drawing...");
    const exportCanvas = createExportCanvas();
    const payload = {
      imageDataUrl: exportCanvas.toDataURL("image/png"),
      artistName: submitArtistName.value.trim(),
      contact: submitContact.value.trim(),
      title: submitTitle.value.trim(),
      description: submitDescription.value.trim(),
      ageGroup: submitAgeGroup.value,
      guardianName: submitGuardianName.value.trim(),
      permissionConfirmed: submitPermission.checked
    };
    setSubmitStatus("Submitting for review...");
    const response = await fetch("/api/drawing-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) throw new Error(result?.error || "Submission failed.");
    setSubmitStatus("Submitted. It is now waiting for CAH review.", "success");
    submitTitle.value = "";
    submitDescription.value = "";
    submitPermission.checked = false;
  } catch (error) {
    console.error(error);
    setSubmitStatus("Submission failed. Check Render logs if this keeps happening.", "error");
  } finally {
    isSubmitting = false;
    submitDrawingBtn.disabled = false;
  }
}

function toggleUi() {
  const isHidden = document.body.classList.toggle("cah-ui-hidden");
  toggleUiBtn.textContent = isHidden ? "Show UI" : "Hide UI";
  if (!isHidden) {
    document.body.classList.remove(
      "cah-panel-header-minimized",
      "cah-panel-canvas-minimized",
      "cah-panel-brushes-minimized",
      "cah-panel-settings-minimized",
      "cah-panel-color-minimized",
      "cah-panel-layers-minimized",
      "cah-panel-gizmo-minimized"
    );
  }
  savePanelState();
}

function togglePanelMin(panelName) {
  const className = "cah-panel-" + panelName + "-minimized";
  const isNowMinimized = document.body.classList.toggle(className);
  document.querySelectorAll('[data-min-panel="' + panelName + '"]').forEach((button) => {
    button.textContent = isNowMinimized ? "+" : "-";
  });
  savePanelState();
}

function shouldIgnorePanelDrag(target, panel) {
  const panelName = panel.dataset.panel;
  if (panelName === "header") return true;
  if (panelName === "gizmo") return target !== navGizmo;
  return !target.closest(".cah-panel-title") && !target.closest(".cah-panel-title-row");
}

function startPanelMove(panel, event) {
  if (!panel) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (shouldIgnorePanelDrag(event.target, panel)) return;
  event.preventDefault();
  event.stopPropagation();
  activeMovingPanel = panel;
  movingPointerId = event.pointerId;
  const shellRect = shell.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  panel.style.left = panelRect.left - shellRect.left + "px";
  panel.style.top = panelRect.top - shellRect.top + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.transform = "none";
  const updatedRect = panel.getBoundingClientRect();
  movingOffset = { x: event.clientX - updatedRect.left, y: event.clientY - updatedRect.top };
  panel.classList.add("is-moving");
  document.addEventListener("pointermove", movePanel, { passive: false });
  document.addEventListener("pointerup", stopPanelMove, { passive: false });
  document.addEventListener("pointercancel", stopPanelMove, { passive: false });
}

function movePanel(event) {
  if (!activeMovingPanel || event.pointerId !== movingPointerId) return;
  event.preventDefault();
  const shellRect = shell.getBoundingClientRect();
  const panelRect = activeMovingPanel.getBoundingClientRect();
  const left = clamp(event.clientX - shellRect.left - movingOffset.x, 4, shellRect.width - panelRect.width - 4);
  const top = clamp(event.clientY - shellRect.top - movingOffset.y, 4, shellRect.height - panelRect.height - 4);
  activeMovingPanel.style.left = left + "px";
  activeMovingPanel.style.top = top + "px";
  activeMovingPanel.style.right = "auto";
  activeMovingPanel.style.bottom = "auto";
  activeMovingPanel.style.transform = "none";
}

function stopPanelMove(event) {
  if (!activeMovingPanel || (event && event.pointerId !== movingPointerId)) return;
  if (event) event.preventDefault();
  activeMovingPanel.classList.remove("is-moving");
  activeMovingPanel = null;
  movingPointerId = null;
  movingOffset = null;
  document.removeEventListener("pointermove", movePanel);
  document.removeEventListener("pointerup", stopPanelMove);
  document.removeEventListener("pointercancel", stopPanelMove);
  savePanelState();
}

function savePanelState() {
  const panelState = {};
  Object.entries(panelMap).forEach(([name, panel]) => {
    if (!panel) return;
    panelState[name] = {
      left: panel.style.left || "",
      top: panel.style.top || "",
      right: panel.style.right || "",
      bottom: panel.style.bottom || "",
      transform: panel.style.transform || ""
    };
  });
  const minimized = {};
  Object.keys(panelMap).forEach((name) => {
    minimized[name] = document.body.classList.contains("cah-panel-" + name + "-minimized");
  });
  try {
    localStorage.setItem(panelStorageKey, JSON.stringify({ panelState, minimized }));
  } catch (error) {
    console.log("Panel state save failed");
  }
}

function loadPanelState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(panelStorageKey));
  } catch (error) {
    saved = null;
  }
  if (!saved) return;
  if (saved.panelState) {
    Object.entries(saved.panelState).forEach(([name, state]) => {
      const panel = panelMap[name];
      if (!panel || !state) return;
      if (state.left) panel.style.left = state.left;
      if (state.top) panel.style.top = state.top;
      if (state.right !== undefined) panel.style.right = state.right;
      if (state.bottom !== undefined) panel.style.bottom = state.bottom;
      if (state.transform !== undefined) panel.style.transform = state.transform;
    });
  }
  if (saved.minimized) {
    Object.entries(saved.minimized).forEach(([name, isMinimized]) => {
      if (!isMinimized) return;
      document.body.classList.add("cah-panel-" + name + "-minimized");
      document.querySelectorAll('[data-min-panel="' + name + '"]').forEach((button) => {
        button.textContent = "+";
      });
    });
  }
}

function resetPanels() {
  try {
    localStorage.removeItem(panelStorageKey);
  } catch (error) {
    console.log("Panel reset storage failed");
  }
  Object.values(panelMap).forEach((panel) => {
    if (!panel) return;
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";
    panel.style.transform = "";
  });
  document.body.classList.remove(
    "cah-panel-header-minimized",
    "cah-panel-canvas-minimized",
    "cah-panel-brushes-minimized",
    "cah-panel-settings-minimized",
    "cah-panel-color-minimized",
    "cah-panel-layers-minimized",
    "cah-panel-gizmo-minimized"
  );
  document.querySelectorAll("[data-min-panel]").forEach((button) => {
    button.textContent = "-";
  });
}

function wirePanelMovement() {
  Object.values(panelMap).forEach((panel) => {
    if (!panel) return;
    panel.addEventListener("pointerdown", (event) => startPanelMove(panel, event));
  });
}

function startGizmoPan(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  isGizmoPanning = true;
  panLastPoint = { x: event.clientX, y: event.clientY };
  canvasStage.classList.add("pan-dragging");
  gizmoDragHandle.setPointerCapture?.(event.pointerId);
}

function moveGizmoPan(event) {
  if (!isGizmoPanning) return;
  event.preventDefault();
  const currentPoint = { x: event.clientX, y: event.clientY };
  panView(currentPoint.x - panLastPoint.x, currentPoint.y - panLastPoint.y);
  panLastPoint = currentPoint;
}

function stopGizmoPan(event) {
  if (!isGizmoPanning) return;
  event.preventDefault();
  isGizmoPanning = false;
  panLastPoint = null;
  canvasStage.classList.remove("pan-dragging");
}

function updateColorSwatch() {
  if (railColorButton) railColorButton.style.background = colorPicker.value;
  if (colorSquare) {
    colorSquare.style.background = `
      linear-gradient(0deg, #000, transparent),
      linear-gradient(90deg, #fff, hsl(${pickerHue}, 100%, 50%))
    `;
  }
}

function syncPickerFromHex(hex) {
  const hsv = hexToHsv(hex);
  pickerHue = hsv.h;
  pickerSaturation = hsv.s;
  pickerValue = hsv.v;
  updateColorHandles();
  updateColorSwatch();
}

function updateColorHandles() {
  if (colorWheelHandle && colorWheel) {
    const rect = colorWheel.getBoundingClientRect();
    const radius = rect.width / 2;
    const angle = (pickerHue - 90) * (Math.PI / 180);
    colorWheelHandle.style.left = radius + Math.cos(angle) * (radius - 9) + "px";
    colorWheelHandle.style.top = radius + Math.sin(angle) * (radius - 9) + "px";
  }

  if (colorSquareHandle) {
    colorSquareHandle.style.left = pickerSaturation + "%";
    colorSquareHandle.style.top = 100 - pickerValue + "%";
  }
}

function setColorFromPicker() {
  colorPicker.value = hsvToHex(pickerHue, pickerSaturation, pickerValue);
  updateColorHandles();
  updateColorSwatch();
}

function pickHueFromEvent(event) {
  const rect = colorWheel.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  pickerHue = (Math.atan2(y, x) * 180) / Math.PI + 90;
  if (pickerHue < 0) pickerHue += 360;
  setColorFromPicker();
}

function pickSquareFromEvent(event) {
  const rect = colorSquare.getBoundingClientRect();
  pickerSaturation = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
  pickerValue = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100);
  setColorFromPicker();
}

function resetBrushSettings() {
  brushSize.value = 8;
  brushOpacity.value = 100;
  brushFlow.value = 100;
  brushSpacing.value = 12;
  brushSoftness.value = 30;
  smudgeStrength.value = 35;
  blendStrength.value = 45;
  brushSizeText.textContent = brushSize.value;
  brushOpacityText.textContent = brushOpacity.value + "%";
  brushFlowText.textContent = brushFlow.value + "%";
  brushSpacingText.textContent = brushSpacing.value + "%";
  brushSoftnessText.textContent = brushSoftness.value + "%";
  smudgeStrengthText.textContent = smudgeStrength.value + "%";
  blendStrengthText.textContent = blendStrength.value + "%";
}

brushSize.addEventListener("input", () => {
  brushSizeText.textContent = brushSize.value;
});
brushOpacity.addEventListener("input", () => {
  brushOpacityText.textContent = brushOpacity.value + "%";
});
brushFlow.addEventListener("input", () => {
  brushFlowText.textContent = brushFlow.value + "%";
});
brushSpacing.addEventListener("input", () => {
  brushSpacingText.textContent = brushSpacing.value + "%";
});
brushSoftness.addEventListener("input", () => {
  brushSoftnessText.textContent = brushSoftness.value + "%";
});
smudgeStrength.addEventListener("input", () => {
  smudgeStrengthText.textContent = smudgeStrength.value + "%";
});
blendStrength.addEventListener("input", () => {
  blendStrengthText.textContent = blendStrength.value + "%";
});
brushSelect.addEventListener("change", () => selectBrush(brushSelect.value));
resetBrushSettingsBtn.addEventListener("click", resetBrushSettings);
document.querySelectorAll("[data-tool-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.toolMode;
    if (mode === "smudge") {
      selectBrush("smudge");
      setMode("smudge");
      return;
    }
    setMode(mode);
  });
});
document.querySelectorAll(".cah-brush-card").forEach((button) => {
  button.addEventListener("click", () => {
    selectBrush(button.dataset.brush);
    if (activeMode !== "erase") {
      setMode(button.dataset.brush === "smudge" ? "smudge" : "draw");
    }
  });
});
document.querySelectorAll(".cah-brush-card[data-favorite='true']").forEach((button) => {
  favoriteBrushes.add(button.dataset.brush);
});
document.querySelectorAll(".cah-brush-card em").forEach((star) => {
  star.addEventListener("click", (event) => {
    event.stopPropagation();
    const button = star.closest(".cah-brush-card");
    const brush = button.dataset.brush;
    if (favoriteBrushes.has(brush)) {
      favoriteBrushes.delete(brush);
    } else {
      favoriteBrushes.add(brush);
    }
    renderBrushLibrary();
  });
});
document.querySelectorAll("[data-brush-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeBrushFilter = button.dataset.brushFilter;
    document.querySelectorAll("[data-brush-filter]").forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    renderBrushLibrary();
  });
});
document.querySelectorAll("[data-swatch]").forEach((button) => {
  button.addEventListener("click", () => {
    colorPicker.value = button.dataset.swatch;
    syncPickerFromHex(colorPicker.value);
  });
});
addLayerTopBtn.addEventListener("click", () => addLayerAfter(activeLayerId));
colorPicker.addEventListener("input", () => syncPickerFromHex(colorPicker.value));
colorWheel.addEventListener("pointerdown", (event) => {
  colorWheel.setPointerCapture?.(event.pointerId);
  pickHueFromEvent(event);
  colorWheel.addEventListener("pointermove", pickHueFromEvent);
});
colorWheel.addEventListener("pointerup", () => {
  colorWheel.removeEventListener("pointermove", pickHueFromEvent);
});
colorSquare.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  colorSquare.setPointerCapture?.(event.pointerId);
  pickSquareFromEvent(event);
  colorSquare.addEventListener("pointermove", pickSquareFromEvent);
});
colorSquare.addEventListener("pointerup", () => {
  colorSquare.removeEventListener("pointermove", pickSquareFromEvent);
});
applyCanvasPresetBtn.addEventListener("click", applyCanvasPreset);
openSubmitModalBtn.addEventListener("click", openSubmitModal);
closeSubmitModalBtn.addEventListener("click", closeSubmitModal);
cancelSubmitModalBtn.addEventListener("click", closeSubmitModal);
submitAgeGroup.addEventListener("change", updateSubmitAgeGroup);
submitDrawingBtn.addEventListener("click", submitDrawing);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearCanvasBtn.addEventListener("click", clearCanvas);
savePngBtn.addEventListener("click", savePng);
resetPanelsBtn.addEventListener("click", resetPanels);
zoomOutBtn.addEventListener("click", () => zoomAtCenter(0.8));
zoomInBtn.addEventListener("click", () => zoomAtCenter(1.25));
rotateLeftBtn.addEventListener("click", () => rotateAtCenter(-15));
rotateRightBtn.addEventListener("click", () => rotateAtCenter(15));
panUpBtn.addEventListener("click", () => panView(0, 42));
panDownBtn.addEventListener("click", () => panView(0, -42));
panLeftBtn.addEventListener("click", () => panView(42, 0));
panRightBtn.addEventListener("click", () => panView(-42, 0));
resetViewBtn.addEventListener("click", () => fitCanvasToScreen());
toggleUiBtn.addEventListener("click", toggleUi);

document.querySelectorAll("[data-min-panel]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanelMin(button.dataset.minPanel);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("cah-submit-modal-open")) closeSubmitModal();
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection) return;
  const activeElement = document.activeElement;
  const isTypingField = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);
  if (!isTypingField) selection.removeAllRanges();
});

wirePanelMovement();
loadPanelState();
syncPickerFromHex(colorPicker.value);
renderBrushLibrary();

gizmoDragHandle.addEventListener("pointerdown", startGizmoPan);
gizmoDragHandle.addEventListener("pointermove", moveGizmoPan);
gizmoDragHandle.addEventListener("pointerup", stopGizmoPan);
gizmoDragHandle.addEventListener("pointercancel", stopGizmoPan);

canvasViewport.addEventListener("pointerdown", startDrawing);
canvasViewport.addEventListener("pointermove", draw);
canvasViewport.addEventListener("pointerup", stopDrawing);
canvasViewport.addEventListener("pointercancel", stopDrawing);
canvasViewport.addEventListener("pointerleave", stopDrawing);
canvasViewport.addEventListener("wheel", handleWheel, { passive: false });
canvasViewport.addEventListener("contextmenu", (event) => event.preventDefault());
canvasViewport.addEventListener("auxclick", (event) => {
  if (event.button === 1) event.preventDefault();
});

window.addEventListener("pointerup", (event) => {
  forgetPointer(event);
  if (isMiddleMouseRotating && event.button === 1) {
    isRotating = false;
    isMiddleMouseRotating = false;
    rotateLastPoint = null;
  }
  if (isRightMousePanning && event.button === 2) {
    isPanning = false;
    isRightMousePanning = false;
    panLastPoint = null;
    canvasStage.classList.remove("pan-dragging");
  }
});

window.addEventListener("resize", fitCanvasToScreen);

createLayer("Layer 1");
nextLayerNumber = 2;
selectBrush("flat");
setMode("draw");
updateSubmitAgeGroup();
fitCanvasToScreen();
