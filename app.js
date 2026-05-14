const canvasViewport = document.getElementById("canvasViewport");
const canvasStage = document.getElementById("canvasStage");
const layersContainer = document.getElementById("layersContainer");
const navGizmo = document.getElementById("navGizmo");
const gizmoDragHandle = document.getElementById("gizmoDragHandle");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");
const brushOpacity = document.getElementById("brushOpacity");
const brushOpacityText = document.getElementById("brushOpacityText");
const smudgeStrength = document.getElementById("smudgeStrength");
const smudgeStrengthText = document.getElementById("smudgeStrengthText");
const blendStrength = document.getElementById("blendStrength");
const blendStrengthText = document.getElementById("blendStrengthText");

const brushSelect = document.getElementById("brushSelect");
const drawToolBtn = document.getElementById("drawToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");
const panToolBtn = document.getElementById("panToolBtn");

const canvasPresetSelect = document.getElementById("canvasPresetSelect");
const applyCanvasPresetBtn = document.getElementById("applyCanvasPresetBtn");

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

const addLayerBtn = document.getElementById("addLayerBtn");
const deleteLayerBtn = document.getElementById("deleteLayerBtn");
const layersList = document.getElementById("layersList");

const shell = document.querySelector(".cah-draw-shell");
const headerPanel = document.querySelector(".cah-floating-header");
const canvasPanel = document.querySelector(".cah-canvas-panel");
const submitPanel = document.querySelector(".cah-submit-panel");
const brushPanel = document.querySelector(".cah-brush-panel");
const modifierPanel = document.querySelector(".cah-modifier-panel");
const layersPanel = document.querySelector(".cah-layers-panel");

let layers = [];
let activeLayerId = null;
let nextLayerNumber = 1;

let selectedBrush = "brush";
let currentTool = "brush";

let isDrawing = false;
let isPanning = false;
let isRotating = false;
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

let undoStack = [];
let redoStack = [];

let activeMovingPanel = null;
let movingPointerId = null;
let movingOffset = null;

let canvasWidth = 1920;
let canvasHeight = 1080;

const maxLayers = 5;
const maxHistory = 30;
const panelStorageKey = "cahDrawStudioPanelStateV7";

const panelMap = {
  header: headerPanel,
  canvas: canvasPanel,
  submit: submitPanel,
  brushes: brushPanel,
  modifiers: modifierPanel,
  layers: layersPanel,
  gizmo: navGizmo
};

let view = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0
};

function setStatus(message) {
  console.log(message);
}

function setSubmitStatus(message, type = "") {
  submitStatus.textContent = message;
  submitStatus.className = "cah-submit-status";

  if (type) {
    submitStatus.classList.add(type);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex, alpha) {
  const cleanHex = hex.replace("#", "");

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getViewportSize() {
  const rect = canvasViewport.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height
  };
}

function applyViewTransform() {
  canvasStage.style.width = canvasWidth + "px";
  canvasStage.style.height = canvasHeight + "px";
  canvasStage.style.transform = `translate(${view.x}px, ${view.y}px) rotate(${view.rotation}deg) scale(${view.scale})`;
}

function fitCanvasToScreen() {
  const viewport = getViewportSize();

  const scaleX = viewport.width / canvasWidth;
  const scaleY = viewport.height / canvasHeight;
  const fitScale = Math.min(scaleX, scaleY) * 0.82;

  view.scale = clamp(fitScale, 0.05, 2);
  view.rotation = 0;
  view.x = viewport.width / 2 - (canvasWidth * view.scale) / 2;
  view.y = viewport.height / 2 - (canvasHeight * view.scale) / 2;

  applyViewTransform();
}

function screenToWorld(screenX, screenY) {
  const rad = (-view.rotation * Math.PI) / 180;
  const dx = screenX - view.x;
  const dy = screenY - view.y;

  const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

  return {
    x: rotatedX / view.scale,
    y: rotatedY / view.scale
  };
}

function worldToScreen(worldX, worldY) {
  const scaledX = worldX * view.scale;
  const scaledY = worldY * view.scale;
  const rad = (view.rotation * Math.PI) / 180;

  return {
    x: view.x + scaledX * Math.cos(rad) - scaledY * Math.sin(rad),
    y: view.y + scaledX * Math.sin(rad) + scaledY * Math.cos(rad)
  };
}

function getViewportCenter() {
  const viewport = getViewportSize();

  return {
    x: viewport.width / 2,
    y: viewport.height / 2
  };
}

function getViewportPoint(clientX, clientY) {
  const rect = canvasViewport.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function resetView() {
  fitCanvasToScreen();
}

function zoomAtViewportPoint(factor, viewportX, viewportY) {
  const world = screenToWorld(viewportX, viewportY);

  view.scale = clamp(view.scale * factor, 0.03, 12);

  const after = worldToScreen(world.x, world.y);

  view.x += viewportX - after.x;
  view.y += viewportY - after.y;

  applyViewTransform();
}

function zoomAtCenter(factor) {
  const center = getViewportCenter();
  zoomAtViewportPoint(factor, center.x, center.y);
}

function rotateAtViewportPoint(amount, viewportX, viewportY) {
  const world = screenToWorld(viewportX, viewportY);

  view.rotation += amount;

  if (view.rotation >= 360 || view.rotation <= -360) {
    view.rotation = view.rotation % 360;
  }

  const after = worldToScreen(world.x, world.y);

  view.x += viewportX - after.x;
  view.y += viewportY - after.y;

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

function createLayer(name) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const layer = {
    id: "layer-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    name,
    canvas,
    ctx,
    visible: true
  };

  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";

  layersContainer.appendChild(canvas);
  layers.push(layer);

  setupCanvas(layer);
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
  });

  renderLayers();
}

function toggleLayerVisibility(layerId) {
  const layer = layers.find((item) => item.id === layerId);

  if (!layer) return;

  saveHistory();

  layer.visible = !layer.visible;
  layer.canvas.style.display = layer.visible ? "block" : "none";

  renderLayers();
}

function renderLayers() {
  layersList.innerHTML = "";

  [...layers].reverse().forEach((layer) => {
    const row = document.createElement("button");
    row.type = "button";
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

    const name = document.createElement("span");
    name.className = "cah-layer-name";
    name.textContent = layer.name;

    row.appendChild(checkbox);
    row.appendChild(name);

    row.addEventListener("click", () => {
      setActiveLayer(layer.id);
    });

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
      data: layer.canvas.toDataURL("image/png")
    }))
  };
}

function saveHistory() {
  try {
    undoStack.push(captureState());

    if (undoStack.length > maxHistory) {
      undoStack.shift();
    }

    redoStack = [];
  } catch (error) {
    setStatus("History failed");
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
      visible: savedLayer.visible
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
        if (!layers.find((layerItem) => layerItem.id === activeLayerId) && layers[0]) {
          activeLayerId = layers[0].id;
        }

        setActiveLayer(activeLayerId);
        renderLayers();
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

  return {
    x: clamp(point.x, 0, canvasWidth),
    y: clamp(point.y, 0, canvasHeight)
  };
}

function getScreenPoint(event) {
  return {
    x: event.clientX,
    y: event.clientY
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function prepareBrush(ctx) {
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const color = hexToRgba(colorPicker.value, opacity);

  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.filter = "none";

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,${opacity})`;
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    ctx.lineWidth = size;
    return;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (currentTool === "ink") {
    ctx.lineWidth = Math.max(1, size * 0.68);
    return;
  }

  if (currentTool === "pencil") {
    ctx.lineWidth = Math.max(1, size * 0.46);
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.72);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.72);
    return;
  }

  if (currentTool === "marker") {
    ctx.lineWidth = size * 1.15;
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.78);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.78);
    return;
  }

  if (currentTool === "soft") {
    ctx.lineWidth = size * 1.9;
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.28);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.28);
    ctx.shadowBlur = size * 0.65;
    ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.35);
    return;
  }

  if (currentTool === "watercolor") {
    ctx.lineWidth = size * 2.2;
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.22);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.22);
    ctx.shadowBlur = size * 0.45;
    ctx.shadowColor = hexToRgba(colorPicker.value, opacity * 0.28);
    return;
  }

  if (currentTool === "charcoal") {
    ctx.lineWidth = size * 1.35;
    ctx.strokeStyle = hexToRgba(colorPicker.value, opacity * 0.64);
    ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.64);
    return;
  }

  ctx.lineWidth = size;
}

function finishBrush(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.filter = "none";
}

function drawCharcoalTexture(ctx, point) {
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const count = Math.max(4, Math.floor(size / 2));

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hexToRgba(colorPicker.value, opacity * 0.24);
  ctx.globalAlpha = 1;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * size * 0.42;
    const radius = Math.random() * Math.max(1, size * 0.09);

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
}

function drawFastSmudge(layer, point) {
  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;
    return;
  }

  const ctx = layer.ctx;
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const strength = Number(smudgeStrength.value) / 100;

  const radius = Math.max(4, Math.floor(size * (0.34 + strength * 0.16)));
  const sampleSize = radius * 2;

  const movementX = point.x - lastPoint.x;
  const movementY = point.y - lastPoint.y;
  const distance = Math.hypot(movementX, movementY);

  const steps = Math.max(1, Math.min(3, Math.ceil(distance / Math.max(14, radius * 1.9))));
  const dragLag = 0.08 + strength * 0.28;
  const alpha = opacity * (0.06 + strength * 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.filter = "none";

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;

    const currentX = lastPoint.x + movementX * t;
    const currentY = lastPoint.y + movementY * t;

    const sourceX = currentX - movementX * dragLag;
    const sourceY = currentY - movementY * dragLag;

    const sampleX = Math.floor(sourceX - radius);
    const sampleY = Math.floor(sourceY - radius);
    const drawX = Math.floor(currentX - radius);
    const drawY = Math.floor(currentY - radius);

    try {
      ctx.save();
      ctx.beginPath();
      ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        layer.canvas,
        sampleX,
        sampleY,
        sampleSize,
        sampleSize,
        drawX,
        drawY,
        sampleSize,
        sampleSize
      );

      ctx.restore();
    } catch (error) {
      ctx.restore();
    }
  }

  ctx.restore();

  lastPoint = point;
  lastMidPoint = point;
}

function drawFastBlend(layer, point) {
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

    const sampleX = Math.floor(currentX - radius);
    const sampleY = Math.floor(currentY - radius);
    const drawX = Math.floor(currentX - radius);
    const drawY = Math.floor(currentY - radius);

    try {
      ctx.save();
      ctx.beginPath();
      ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        layer.canvas,
        sampleX,
        sampleY,
        sampleSize,
        sampleSize,
        drawX,
        drawY,
        sampleSize,
        sampleSize
      );

      ctx.restore();
    } catch (error) {
      ctx.restore();
    }
  }

  ctx.restore();

  lastPoint = point;
  lastMidPoint = point;
}

function drawSmoothPoint(point) {
  const layer = getActiveLayer();

  if (!layer || !layer.visible) return;

  if (currentTool === "smudge") {
    drawFastSmudge(layer, point);
    return;
  }

  if (currentTool === "blend") {
    drawFastBlend(layer, point);
    return;
  }

  const ctx = layer.ctx;
  prepareBrush(ctx);

  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;

    ctx.beginPath();
    ctx.arc(point.x, point.y, Number(brushSize.value) / 2, 0, Math.PI * 2);
    ctx.fill();

    if (currentTool === "charcoal") {
      drawCharcoalTexture(ctx, point);
    }

    finishBrush(ctx);
    return;
  }

  const mid = midpoint(lastPoint, point);

  ctx.beginPath();
  ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
  ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
  ctx.stroke();

  if (currentTool === "charcoal") {
    drawCharcoalTexture(ctx, point);
  }

  lastPoint = point;
  lastMidPoint = mid;

  finishBrush(ctx);
}

function rememberPointer(event) {
  activePointers.set(event.pointerId, {
    id: event.pointerId,
    pointerType: event.pointerType,
    x: event.clientX,
    y: event.clientY,
    width: event.width || 1,
    height: event.height || 1,
    pressure: event.pressure || 0,
    event
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
  stored.event = event;
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

  return {
    x: (a.x + b.x) / 2 - rect.left,
    y: (a.y + b.y) / 2 - rect.top
  };
}

function isLikelyPalm(event) {
  if (event.pointerType !== "touch") return false;

  const width = event.width || 1;
  const height = event.height || 1;
  const contactArea = width * height;

  if (width >= 32 || height >= 32) return true;
  if (contactArea >= 700) return true;

  return false;
}

function shouldRejectTouchDrawing(event) {
  if (event.pointerType !== "touch") return false;

  const now = Date.now();

  if (isLikelyPalm(event)) return true;

  if (penHasBeenDetected && now - lastPenInputTime < 2500) {
    return true;
  }

  if (getTouchPointers().length >= 2) {
    return true;
  }

  return false;
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

  gestureState = {
    startDistance: distanceBetweenPointers(first, second),
    startAngle: angleBetweenPointers(first, second),
    startCenter: center,
    startView: {
      x: view.x,
      y: view.y,
      scale: view.scale,
      rotation: view.rotation
    }
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

  const startWorld = screenToWorld(
    gestureState.startCenter.x,
    gestureState.startCenter.y
  );

  view.scale = clamp(gestureState.startView.scale * scaleFactor, 0.03, 12);
  view.rotation = gestureState.startView.rotation + angleDelta;

  const after = worldToScreen(startWorld.x, startWorld.y);

  view.x += currentCenter.x - after.x;
  view.y += currentCenter.y - after.y;

  applyViewTransform();

  return true;
}

function shouldStartDrawFromPointer(event) {
  if (event.pointerType === "pen") {
    penHasBeenDetected = true;
    lastPenInputTime = Date.now();
    return true;
  }

  if (event.pointerType === "mouse") {
    return event.button === 0;
  }

  if (event.pointerType === "touch") {
    return !shouldRejectTouchDrawing(event);
  }

  return false;
}

function startDrawing(event) {
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
    rotateLastPoint = getScreenPoint(event);
    canvasViewport.setPointerCapture?.(event.pointerId);
    return;
  }

  if (event.button === 2 || currentTool === "pan") {
    isPanning = true;
    isRightMousePanning = event.button === 2;
    panLastPoint = getScreenPoint(event);
    canvasStage.classList.add("pan-dragging");
    canvasViewport.setPointerCapture?.(event.pointerId);
    return;
  }

  if (!shouldStartDrawFromPointer(event)) return;

  const layer = getActiveLayer();

  if (!layer || !layer.visible) return;

  saveHistory();

  isDrawing = true;
  activeDrawPointerId = event.pointerId;
  lastPoint = null;
  lastMidPoint = null;

  canvasViewport.setPointerCapture?.(event.pointerId);
  drawSmoothPoint(getCanvasPoint(event));
}

function draw(event) {
  updateRememberedPointer(event);

  if (event.pointerType === "pen") {
    penHasBeenDetected = true;
    lastPenInputTime = Date.now();
  }

  if (event.pointerType === "touch") {
    if (gestureState || getTouchPointers().length >= 2) {
      event.preventDefault();

      if (!gestureState) {
        beginTouchGestureIfNeeded();
      }

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

    const currentPoint = getScreenPoint(event);
    const dx = currentPoint.x - rotateLastPoint.x;
    const dy = currentPoint.y - rotateLastPoint.y;

    const rotationAmount = dx * 0.35 + dy * 0.12;

    rotateAtCenter(rotationAmount);

    rotateLastPoint = currentPoint;
    return;
  }

  if (isPanning) {
    event.preventDefault();

    const currentPoint = getScreenPoint(event);

    view.x += currentPoint.x - panLastPoint.x;
    view.y += currentPoint.y - panLastPoint.y;

    panLastPoint = currentPoint;

    applyViewTransform();
    return;
  }

  if (!isDrawing) return;
  if (activeDrawPointerId !== event.pointerId) return;

  event.preventDefault();

  const events = typeof event.getCoalescedEvents === "function"
    ? event.getCoalescedEvents()
    : [event];

  events.forEach((pointerEvent) => {
    drawSmoothPoint(getCanvasPoint(pointerEvent));
  });
}

function stopDrawing(event) {
  forgetPointer(event);

  if (event.pointerType === "touch") {
    if (getTouchPointers().length < 2) {
      gestureState = null;
    }
  }

  if (isRotating) {
    event.preventDefault();

    isRotating = false;
    isMiddleMouseRotating = false;
    rotateLastPoint = null;
    return;
  }

  if (isPanning) {
    event.preventDefault();

    isPanning = false;
    isRightMousePanning = false;
    panLastPoint = null;
    canvasStage.classList.remove("pan-dragging");
    return;
  }

  if (!isDrawing) return;
  if (activeDrawPointerId !== event.pointerId) return;

  event.preventDefault();

  isDrawing = false;
  activeDrawPointerId = null;
  lastPoint = null;
  lastMidPoint = null;
}

function handleWheel(event) {
  event.preventDefault();

  const point = getViewportPoint(event.clientX, event.clientY);
  const factor = event.deltaY < 0 ? 1.12 : 0.88;

  zoomAtViewportPoint(factor, point.x, point.y);
}

function preventCanvasContextMenu(event) {
  event.preventDefault();
}

function preventMiddleMouseAutoScroll(event) {
  if (event.button === 1) {
    event.preventDefault();
  }
}

function updateBrushBodyClass() {
  document.body.classList.remove("cah-brush-smudge", "cah-brush-blend");

  if (selectedBrush === "smudge") {
    document.body.classList.add("cah-brush-smudge");
  }

  if (selectedBrush === "blend") {
    document.body.classList.add("cah-brush-blend");
  }
}

function setTool(tool) {
  currentTool = tool;

  drawToolBtn.classList.toggle("active", tool === selectedBrush);
  eraserToolBtn.classList.toggle("active", tool === "eraser");
  panToolBtn.classList.toggle("active", tool === "pan");

  canvasStage.classList.toggle("pan-active", tool === "pan");
}

function selectBrush(brushName) {
  selectedBrush = brushName;
  currentTool = brushName;

  drawToolBtn.classList.add("active");
  eraserToolBtn.classList.remove("active");
  panToolBtn.classList.remove("active");
  canvasStage.classList.remove("pan-active");

  updateBrushBodyClass();
}

function addLayer() {
  if (layers.length >= maxLayers) return;

  saveHistory();

  const layer = createLayer("Layer " + nextLayerNumber);
  nextLayerNumber += 1;

  setActiveLayer(layer.id);
}

function deleteLayer() {
  if (layers.length <= 1) return;

  const activeLayer = getActiveLayer();
  if (!activeLayer) return;

  saveHistory();

  activeLayer.canvas.remove();
  layers = layers.filter((layer) => layer.id !== activeLayer.id);

  setActiveLayer(layers[layers.length - 1].id);
}

function clearCanvas() {
  saveHistory();

  layers.forEach((layer) => {
    layer.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  });
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
    exportCtx.drawImage(layer.canvas, 0, 0);
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

function applyCanvasPreset() {
  const value = canvasPresetSelect.value;
  const [width, height] = value.split("x").map(Number);

  if (!width || !height) return;

  const shouldResize = window.confirm("Apply this canvas size? This will scale your current drawing to the new canvas.");
  if (!shouldResize) return;

  saveHistory();

  const oldLayers = layers.map((layer) => ({
    layer,
    image: layer.canvas
  }));

  canvasWidth = width;
  canvasHeight = height;

  canvasStage.style.width = canvasWidth + "px";
  canvasStage.style.height = canvasHeight + "px";

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
  const artistName = submitArtistName.value.trim();
  const title = submitTitle.value.trim();
  const ageGroup = submitAgeGroup.value;
  const guardianName = submitGuardianName.value.trim();

  if (!artistName) {
    return "Please add an artist name.";
  }

  if (!title) {
    return "Please add a title.";
  }

  if (ageGroup === "Child" && !guardianName) {
    return "Please add a parent or guardian name for child submissions.";
  }

  if (!submitPermission.checked) {
    return "Please confirm permission before submitting.";
  }

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
    const imageDataUrl = exportCanvas.toDataURL("image/png");

    const payload = {
      imageDataUrl,
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result || !result.ok) {
      throw new Error(result?.error || "Submission failed.");
    }

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
      "cah-panel-submit-minimized",
      "cah-panel-brushes-minimized",
      "cah-panel-modifiers-minimized",
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
    button.textContent = isNowMinimized ? "+" : "−";
  });

  savePanelState();
}

function isPanelDragHandle(target) {
  const panel = target.closest(".cah-panel");

  if (!panel) return false;

  const panelName = panel.dataset.panel;

  if (panelName === "header" || panelName === "submit") {
    return false;
  }

  return Boolean(
    target.id === "gizmoDragHandle" ||
    target.closest(".cah-panel-title")
  );
}

function shouldIgnorePanelDrag(target) {
  return !isPanelDragHandle(target);
}

function startPanelMove(panel, event) {
  if (!panel) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (shouldIgnorePanelDrag(event.target)) return;

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

  movingOffset = {
    x: event.clientX - updatedRect.left,
    y: event.clientY - updatedRect.top
  };

  panel.classList.add("is-moving");

  document.addEventListener("pointermove", movePanel, { passive: false });
  document.addEventListener("pointerup", stopPanelMove, { passive: false });
  document.addEventListener("pointercancel", stopPanelMove, { passive: false });

  try {
    panel.setPointerCapture(event.pointerId);
  } catch (error) {
    /* pointer capture can fail on some browsers */
  }
}

function movePanel(event) {
  if (!activeMovingPanel) return;
  if (movingPointerId !== null && event.pointerId !== movingPointerId) return;

  event.preventDefault();

  const shellRect = shell.getBoundingClientRect();
  const panelRect = activeMovingPanel.getBoundingClientRect();

  const left = clamp(
    event.clientX - shellRect.left - movingOffset.x,
    4,
    shellRect.width - panelRect.width - 4
  );

  const top = clamp(
    event.clientY - shellRect.top - movingOffset.y,
    4,
    shellRect.height - panelRect.height - 4
  );

  activeMovingPanel.style.left = left + "px";
  activeMovingPanel.style.top = top + "px";
  activeMovingPanel.style.right = "auto";
  activeMovingPanel.style.bottom = "auto";
  activeMovingPanel.style.transform = "none";
}

function stopPanelMove(event) {
  if (!activeMovingPanel) return;

  if (event && movingPointerId !== null && event.pointerId !== movingPointerId) return;

  if (event) {
    event.preventDefault();
  }

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

  const minimized = {
    header: document.body.classList.contains("cah-panel-header-minimized"),
    canvas: document.body.classList.contains("cah-panel-canvas-minimized"),
    submit: document.body.classList.contains("cah-panel-submit-minimized"),
    brushes: document.body.classList.contains("cah-panel-brushes-minimized"),
    modifiers: document.body.classList.contains("cah-panel-modifiers-minimized"),
    layers: document.body.classList.contains("cah-panel-layers-minimized"),
    gizmo: document.body.classList.contains("cah-panel-gizmo-minimized")
  };

  try {
    localStorage.setItem(panelStorageKey, JSON.stringify({ panelState, minimized }));
  } catch (error) {
    setStatus("Panel state save failed");
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
    setStatus("Panel reset storage failed");
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
    "cah-panel-submit-minimized",
    "cah-panel-brushes-minimized",
    "cah-panel-modifiers-minimized",
    "cah-panel-layers-minimized",
    "cah-panel-gizmo-minimized"
  );

  document.querySelectorAll("[data-min-panel]").forEach((button) => {
    button.textContent = "−";
  });
}

function wirePanelMovement() {
  Object.values(panelMap).forEach((panel) => {
    if (!panel) return;
    panel.addEventListener("pointerdown", (event) => startPanelMove(panel, event));
  });
}

brushSize.addEventListener("input", () => {
  brushSizeText.textContent = brushSize.value;
});

brushOpacity.addEventListener("input", () => {
  brushOpacityText.textContent = brushOpacity.value + "%";
});

smudgeStrength.addEventListener("input", () => {
  smudgeStrengthText.textContent = smudgeStrength.value + "%";
});

blendStrength.addEventListener("input", () => {
  blendStrengthText.textContent = blendStrength.value + "%";
});

brushSelect.addEventListener("change", () => {
  selectBrush(brushSelect.value);
});

drawToolBtn.addEventListener("click", () => selectBrush(selectedBrush));
eraserToolBtn.addEventListener("click", () => setTool("eraser"));
panToolBtn.addEventListener("click", () => setTool("pan"));

applyCanvasPresetBtn.addEventListener("click", applyCanvasPreset);

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
resetViewBtn.addEventListener("click", resetView);
toggleUiBtn.addEventListener("click", toggleUi);

addLayerBtn.addEventListener("click", addLayer);
deleteLayerBtn.addEventListener("click", deleteLayer);

document.querySelectorAll("[data-min-panel]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanelMin(button.dataset.minPanel);
  });
});

wirePanelMovement();
loadPanelState();

canvasViewport.addEventListener("pointerdown", startDrawing);
canvasViewport.addEventListener("pointermove", draw);
canvasViewport.addEventListener("pointerup", stopDrawing);
canvasViewport.addEventListener("pointercancel", stopDrawing);
canvasViewport.addEventListener("pointerleave", stopDrawing);
canvasViewport.addEventListener("wheel", handleWheel, { passive: false });
canvasViewport.addEventListener("contextmenu", preventCanvasContextMenu);
canvasViewport.addEventListener("auxclick", preventMiddleMouseAutoScroll);

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

window.addEventListener("resize", () => {
  fitCanvasToScreen();
});

createLayer("Layer 1");
nextLayerNumber = 2;
selectBrush("brush");
updateSubmitAgeGroup();
fitCanvasToScreen();
