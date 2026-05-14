const canvasViewport = document.getElementById("canvasViewport");
const layersContainer = document.getElementById("layersContainer");
const navGizmo = document.getElementById("navGizmo");
const gizmoDragHandle = document.getElementById("gizmoDragHandle");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");
const brushOpacity = document.getElementById("brushOpacity");
const brushOpacityText = document.getElementById("brushOpacityText");

const brushToolBtn = document.getElementById("brushToolBtn");
const inkToolBtn = document.getElementById("inkToolBtn");
const pencilToolBtn = document.getElementById("pencilToolBtn");
const markerToolBtn = document.getElementById("markerToolBtn");
const softToolBtn = document.getElementById("softToolBtn");
const watercolorToolBtn = document.getElementById("watercolorToolBtn");
const charcoalToolBtn = document.getElementById("charcoalToolBtn");
const smudgeToolBtn = document.getElementById("smudgeToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");
const panToolBtn = document.getElementById("panToolBtn");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const savePngBtn = document.getElementById("savePngBtn");

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

let layers = [];
let activeLayerId = null;
let nextLayerNumber = 1;

let currentTool = "brush";
let isDrawing = false;
let isPanning = false;

let lastPoint = null;
let lastMidPoint = null;
let panLastPoint = null;

let undoStack = [];
let redoStack = [];

let isDraggingGizmo = false;
let gizmoPointerId = null;
let gizmoOffset = null;

const maxLayers = 5;
const maxHistory = 30;

let view = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0
};

function setStatus(message) {
  console.log(message);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSize() {
  const rect = canvasViewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  return {
    cssWidth: Math.max(1, Math.floor(rect.width)),
    cssHeight: Math.max(1, Math.floor(rect.height)),
    pixelWidth: Math.max(1, Math.floor(rect.width * dpr)),
    pixelHeight: Math.max(1, Math.floor(rect.height * dpr)),
    dpr
  };
}

function applyViewTransform() {
  layersContainer.style.transform = `translate(${view.x}px, ${view.y}px) rotate(${view.rotation}deg) scale(${view.scale})`;
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
  const rect = canvasViewport.getBoundingClientRect();

  return {
    x: rect.width / 2,
    y: rect.height / 2
  };
}

function resetView() {
  view.x = 0;
  view.y = 0;
  view.scale = 1;
  view.rotation = 0;
  applyViewTransform();
}

function zoomAtCenter(factor) {
  const center = getViewportCenter();
  const world = screenToWorld(center.x, center.y);

  view.scale = clamp(view.scale * factor, 0.35, 4);

  const after = worldToScreen(world.x, world.y);

  view.x += center.x - after.x;
  view.y += center.y - after.y;

  applyViewTransform();
}

function rotateAtCenter(amount) {
  const center = getViewportCenter();
  const world = screenToWorld(center.x, center.y);

  view.rotation += amount;

  if (view.rotation >= 360 || view.rotation <= -360) {
    view.rotation = view.rotation % 360;
  }

  const after = worldToScreen(world.x, world.y);

  view.x += center.x - after.x;
  view.y += center.y - after.y;

  applyViewTransform();
}

function panView(dx, dy) {
  view.x += dx;
  view.y += dy;
  applyViewTransform();
}

function setupCanvas(layer) {
  const size = getSize();

  layer.canvas.width = size.pixelWidth;
  layer.canvas.height = size.pixelHeight;
  layer.canvas.style.width = size.cssWidth + "px";
  layer.canvas.style.height = size.cssHeight + "px";

  layer.ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
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
  canvas.style.width = "100%";
  canvas.style.height = "100%";
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
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    data: layer.canvas.toDataURL("image/png")
  }));
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

  layersContainer.innerHTML = "";
  layers = [];

  let loaded = 0;

  snapshot.forEach((savedLayer) => {
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
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    layersContainer.appendChild(canvas);
    layers.push(layer);

    setupCanvas(layer);

    const image = new Image();

    image.onload = () => {
      const size = getSize();
      ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
      ctx.drawImage(image, 0, 0, size.cssWidth, size.cssHeight);

      loaded += 1;

      if (loaded === snapshot.length) {
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
  return screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
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

  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = size;
    return;
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = colorPicker.value;
  ctx.fillStyle = colorPicker.value;

  if (currentTool === "ink") {
    ctx.lineWidth = Math.max(1, size * 0.68);
    ctx.globalAlpha = Math.min(1, opacity + 0.12);
    return;
  }

  if (currentTool === "pencil") {
    ctx.lineWidth = Math.max(1, size * 0.46);
    ctx.globalAlpha = opacity * 0.62;
    return;
  }

  if (currentTool === "marker") {
    ctx.lineWidth = size * 1.15;
    ctx.globalAlpha = opacity * 0.72;
    return;
  }

  if (currentTool === "soft") {
    ctx.lineWidth = size * 1.9;
    ctx.globalAlpha = opacity * 0.24;
    ctx.shadowBlur = size * 0.65;
    ctx.shadowColor = colorPicker.value;
    return;
  }

  if (currentTool === "watercolor") {
    ctx.lineWidth = size * 2.2;
    ctx.globalAlpha = opacity * 0.18;
    ctx.shadowBlur = size * 0.45;
    ctx.shadowColor = colorPicker.value;
    return;
  }

  if (currentTool === "charcoal") {
    ctx.lineWidth = size * 1.35;
    ctx.globalAlpha = opacity * 0.54;
    return;
  }

  ctx.lineWidth = size;
}

function finishBrush(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

function drawCharcoalTexture(ctx, point) {
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const count = Math.max(4, Math.floor(size / 2));

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = colorPicker.value;
  ctx.globalAlpha = opacity * 0.24;

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

function drawSoftRoundSmudge(layer, point) {
  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;
    return;
  }

  const ctx = layer.ctx;
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;
  const radius = Math.max(6, Math.floor(size * 0.72));
  const sampleSize = radius * 2;

  const sx = Math.floor(lastPoint.x - radius);
  const sy = Math.floor(lastPoint.y - radius);
  const dx = Math.floor(point.x - radius);
  const dy = Math.floor(point.y - radius);

  try {
    const sample = ctx.getImageData(sx, sy, sampleSize, sampleSize);

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;
    tempCtx.putImageData(sample, 0, 0);

    ctx.save();
    ctx.globalAlpha = opacity * 0.38;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "blur(2px)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, dx, dy);
    ctx.restore();
  } catch (error) {
    /* ignore edge reads */
  }

  lastPoint = point;
  lastMidPoint = point;
}

function drawSmoothPoint(point) {
  const layer = getActiveLayer();

  if (!layer || !layer.visible) return;

  if (currentTool === "smudge") {
    drawSoftRoundSmudge(layer, point);
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

function startDrawing(event) {
  if (event.isPrimary === false) return;

  event.preventDefault();

  if (currentTool === "pan") {
    isPanning = true;
    panLastPoint = getScreenPoint(event);
    layersContainer.classList.add("pan-dragging");
    canvasViewport.setPointerCapture?.(event.pointerId);
    return;
  }

  const layer = getActiveLayer();

  if (!layer || !layer.visible) return;

  saveHistory();

  isDrawing = true;
  lastPoint = null;
  lastMidPoint = null;

  canvasViewport.setPointerCapture?.(event.pointerId);
  drawSmoothPoint(getCanvasPoint(event));
}

function draw(event) {
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

  event.preventDefault();

  const events = typeof event.getCoalescedEvents === "function"
    ? event.getCoalescedEvents()
    : [event];

  events.forEach((pointerEvent) => {
    drawSmoothPoint(getCanvasPoint(pointerEvent));
  });
}

function stopDrawing(event) {
  if (isPanning) {
    event.preventDefault();

    isPanning = false;
    panLastPoint = null;
    layersContainer.classList.remove("pan-dragging");
    return;
  }

  if (!isDrawing) return;

  event.preventDefault();

  isDrawing = false;
  lastPoint = null;
  lastMidPoint = null;
}

function setTool(tool) {
  currentTool = tool;

  brushToolBtn.classList.toggle("active", tool === "brush");
  inkToolBtn.classList.toggle("active", tool === "ink");
  pencilToolBtn.classList.toggle("active", tool === "pencil");
  markerToolBtn.classList.toggle("active", tool === "marker");
  softToolBtn.classList.toggle("active", tool === "soft");
  watercolorToolBtn.classList.toggle("active", tool === "watercolor");
  charcoalToolBtn.classList.toggle("active", tool === "charcoal");
  smudgeToolBtn.classList.toggle("active", tool === "smudge");
  eraserToolBtn.classList.toggle("active", tool === "eraser");
  panToolBtn.classList.toggle("active", tool === "pan");

  layersContainer.classList.toggle("pan-active", tool === "pan");
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

  const size = getSize();

  layers.forEach((layer) => {
    layer.ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
  });
}

function savePng() {
  const size = getSize();

  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");

  exportCanvas.width = size.pixelWidth;
  exportCanvas.height = size.pixelHeight;

  exportCtx.fillStyle = "#fffaf4";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  layers.forEach((layer) => {
    if (!layer.visible) return;
    exportCtx.drawImage(layer.canvas, 0, 0);
  });

  const link = document.createElement("a");
  link.download = "cah-drawing.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function resizeLayers() {
  if (layers.length === 0) return;

  const snapshots = captureState();

  layers.forEach((layer) => {
    setupCanvas(layer);
  });

  restoreState(snapshots);
}

function toggleUi() {
  const isHidden = document.body.classList.toggle("cah-ui-hidden");
  toggleUiBtn.textContent = isHidden ? "Show UI" : "Hide UI";

  if (!isHidden) {
    document.body.classList.remove(
      "cah-panel-header-hidden",
      "cah-panel-tools-hidden",
      "cah-panel-layers-hidden",
      "cah-panel-gizmo-hidden"
    );
  }
}

function hidePanel(panelName) {
  document.body.classList.add("cah-panel-" + panelName + "-hidden");
}

function startGizmoDrag(event) {
  event.preventDefault();
  event.stopPropagation();

  isDraggingGizmo = true;
  gizmoPointerId = event.pointerId;

  const shellRect = document.querySelector(".cah-draw-shell").getBoundingClientRect();
  const gizmoRect = navGizmo.getBoundingClientRect();

  navGizmo.style.left = gizmoRect.left - shellRect.left + "px";
  navGizmo.style.top = gizmoRect.top - shellRect.top + "px";
  navGizmo.style.right = "auto";
  navGizmo.style.bottom = "auto";

  const updatedRect = navGizmo.getBoundingClientRect();

  gizmoOffset = {
    x: event.clientX - updatedRect.left,
    y: event.clientY - updatedRect.top
  };

  navGizmo.classList.add("is-moving");

  document.addEventListener("pointermove", moveGizmo, { passive: false });
  document.addEventListener("pointerup", stopGizmoDrag, { passive: false });
  document.addEventListener("pointercancel", stopGizmoDrag, { passive: false });

  try {
    gizmoDragHandle.setPointerCapture(event.pointerId);
  } catch (error) {
    /* pointer capture can fail on some browsers */
  }
}

function moveGizmo(event) {
  if (!isDraggingGizmo) return;
  if (gizmoPointerId !== null && event.pointerId !== gizmoPointerId) return;

  event.preventDefault();

  const shellRect = document.querySelector(".cah-draw-shell").getBoundingClientRect();
  const gizmoRect = navGizmo.getBoundingClientRect();

  const left = clamp(
    event.clientX - shellRect.left - gizmoOffset.x,
    8,
    shellRect.width - gizmoRect.width - 8
  );

  const top = clamp(
    event.clientY - shellRect.top - gizmoOffset.y,
    8,
    shellRect.height - gizmoRect.height - 8
  );

  navGizmo.style.left = left + "px";
  navGizmo.style.top = top + "px";
  navGizmo.style.right = "auto";
  navGizmo.style.bottom = "auto";
}

function stopGizmoDrag(event) {
  if (!isDraggingGizmo) return;

  if (event && gizmoPointerId !== null && event.pointerId !== gizmoPointerId) return;

  if (event) {
    event.preventDefault();
  }

  isDraggingGizmo = false;
  gizmoPointerId = null;
  gizmoOffset = null;

  navGizmo.classList.remove("is-moving");

  document.removeEventListener("pointermove", moveGizmo);
  document.removeEventListener("pointerup", stopGizmoDrag);
  document.removeEventListener("pointercancel", stopGizmoDrag);
}

brushSize.addEventListener("input", () => {
  brushSizeText.textContent = brushSize.value;
});

brushOpacity.addEventListener("input", () => {
  brushOpacityText.textContent = brushOpacity.value + "%";
});

brushToolBtn.addEventListener("click", () => setTool("brush"));
inkToolBtn.addEventListener("click", () => setTool("ink"));
pencilToolBtn.addEventListener("click", () => setTool("pencil"));
markerToolBtn.addEventListener("click", () => setTool("marker"));
softToolBtn.addEventListener("click", () => setTool("soft"));
watercolorToolBtn.addEventListener("click", () => setTool("watercolor"));
charcoalToolBtn.addEventListener("click", () => setTool("charcoal"));
smudgeToolBtn.addEventListener("click", () => setTool("smudge"));
eraserToolBtn.addEventListener("click", () => setTool("eraser"));
panToolBtn.addEventListener("click", () => setTool("pan"));

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearCanvasBtn.addEventListener("click", clearCanvas);
savePngBtn.addEventListener("click", savePng);

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

document.querySelectorAll("[data-hide-panel]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    hidePanel(button.dataset.hidePanel);
  });
});

gizmoDragHandle.addEventListener("pointerdown", startGizmoDrag);

canvasViewport.addEventListener("pointerdown", startDrawing);
canvasViewport.addEventListener("pointermove", draw);
canvasViewport.addEventListener("pointerup", stopDrawing);
canvasViewport.addEventListener("pointercancel", stopDrawing);
canvasViewport.addEventListener("pointerleave", stopDrawing);

window.addEventListener("resize", () => {
  if (layers.length > 0) {
    resizeLayers();
    applyViewTransform();
  }
});

createLayer("Layer 1");
nextLayerNumber = 2;
setTool("brush");
resetView();
