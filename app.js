const canvasViewport = document.getElementById("canvasViewport");
const layersContainer = document.getElementById("layersContainer");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");
const brushOpacity = document.getElementById("brushOpacity");
const brushOpacityText = document.getElementById("brushOpacityText");

const brushToolBtn = document.getElementById("brushToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");
const panToolBtn = document.getElementById("panToolBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const savePngBtn = document.getElementById("savePngBtn");

const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetViewBtn = document.getElementById("resetViewBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const toggleUiBtn = document.getElementById("toggleUiBtn");

const addLayerBtn = document.getElementById("addLayerBtn");
const deleteLayerBtn = document.getElementById("deleteLayerBtn");
const toggleLayerBtn = document.getElementById("toggleLayerBtn");
const layersList = document.getElementById("layersList");

const statusText = document.getElementById("statusText");

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

const maxLayers = 5;
const maxHistory = 30;

let view = {
  x: 0,
  y: 0,
  scale: 1
};

function setStatus(message) {
  statusText.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyViewTransform() {
  layersContainer.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

function resetView() {
  view.x = 0;
  view.y = 0;
  view.scale = 1;
  applyViewTransform();
  setStatus("View reset");
}

function zoomAtCenter(factor) {
  const rect = canvasViewport.getBoundingClientRect();

  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const oldScale = view.scale;
  const newScale = clamp(oldScale * factor, 0.35, 4);

  const worldX = (centerX - view.x) / oldScale;
  const worldY = (centerY - view.y) / oldScale;

  view.scale = newScale;
  view.x = centerX - worldX * newScale;
  view.y = centerY - worldY * newScale;

  applyViewTransform();
  setStatus("Zoom " + Math.round(view.scale * 100) + "%");
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
  const ctx = canvas.getContext("2d");

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

function renderLayers() {
  layersList.innerHTML = "";

  [...layers].reverse().forEach((layer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cah-layer-item" + (layer.id === activeLayerId ? " active" : "");
    button.innerHTML = `
      <span>${layer.name}</span>
      <span class="eye">${layer.visible ? "On" : "Off"}</span>
    `;

    button.addEventListener("click", () => {
      setActiveLayer(layer.id);
      setStatus(layer.name + " selected");
    });

    layersList.appendChild(button);
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
  undoStack.push(captureState());

  if (undoStack.length > maxHistory) {
    undoStack.shift();
  }

  redoStack = [];
}

function restoreState(snapshot) {
  if (!snapshot) return;

  layersContainer.innerHTML = "";
  layers = [];

  let loaded = 0;

  snapshot.forEach((savedLayer) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

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
        if (!layers.find((l) => l.id === activeLayerId) && layers[0]) {
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
  if (undoStack.length === 0) {
    setStatus("Nothing to undo");
    return;
  }

  redoStack.push(captureState());
  restoreState(undoStack.pop());
  setStatus("Undo");
}

function redo() {
  if (redoStack.length === 0) {
    setStatus("Nothing to redo");
    return;
  }

  undoStack.push(captureState());
  restoreState(redoStack.pop());
  setStatus("Redo");
}

function getCanvasPoint(event) {
  const rect = canvasViewport.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left - view.x) / view.scale,
    y: (event.clientY - rect.top - view.y) / view.scale
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

  ctx.globalAlpha = opacity;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = colorPicker.value;
    ctx.fillStyle = colorPicker.value;
  }
}

function finishBrush(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawSmoothPoint(point) {
  const layer = getActiveLayer();

  if (!layer || !layer.visible) return;

  const ctx = layer.ctx;
  prepareBrush(ctx);

  if (!lastPoint) {
    lastPoint = point;
    lastMidPoint = point;

    ctx.beginPath();
    ctx.arc(point.x, point.y, Number(brushSize.value) / 2, 0, Math.PI * 2);
    ctx.fill();

    finishBrush(ctx);
    return;
  }

  const mid = midpoint(lastPoint, point);

  ctx.beginPath();
  ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
  ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, mid.x, mid.y);
  ctx.stroke();

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
    setStatus("Panning");
    return;
  }

  const layer = getActiveLayer();

  if (!layer) {
    setStatus("No active layer");
    return;
  }

  if (!layer.visible) {
    setStatus("Active layer is hidden");
    return;
  }

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
    setStatus("Pan saved");
    return;
  }

  if (!isDrawing) return;

  event.preventDefault();

  isDrawing = false;
  lastPoint = null;
  lastMidPoint = null;

  setStatus("Saved stroke");
}

function setTool(tool) {
  currentTool = tool;

  brushToolBtn.classList.toggle("active", tool === "brush");
  eraserToolBtn.classList.toggle("active", tool === "eraser");
  panToolBtn.classList.toggle("active", tool === "pan");

  layersContainer.classList.toggle("pan-active", tool === "pan");

  if (tool === "brush") setStatus("Brush selected");
  if (tool === "eraser") setStatus("Eraser selected");
  if (tool === "pan") setStatus("Pan selected");
}

function addLayer() {
  if (layers.length >= maxLayers) {
    setStatus("5 layer max");
    return;
  }

  saveHistory();

  const layer = createLayer("Layer " + nextLayerNumber);
  nextLayerNumber += 1;

  setActiveLayer(layer.id);
  setStatus(layer.name + " added");
}

function deleteLayer() {
  if (layers.length <= 1) {
    setStatus("Keep at least one layer");
    return;
  }

  const activeLayer = getActiveLayer();
  if (!activeLayer) return;

  saveHistory();

  activeLayer.canvas.remove();
  layers = layers.filter((layer) => layer.id !== activeLayer.id);

  setActiveLayer(layers[layers.length - 1].id);
  setStatus("Layer deleted");
}

function toggleLayerVisibility() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;

  saveHistory();

  activeLayer.visible = !activeLayer.visible;
  activeLayer.canvas.style.display = activeLayer.visible ? "block" : "none";

  renderLayers();
  setStatus(activeLayer.visible ? "Layer shown" : "Layer hidden");
}

function clearCanvas() {
  saveHistory();

  const size = getSize();

  layers.forEach((layer) => {
    layer.ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
  });

  setStatus("Canvas cleared");
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

  setStatus("PNG saved");
}

function resizeLayers() {
  const snapshots = captureState();

  layers.forEach((layer) => {
    setupCanvas(layer);
  });

  restoreState(snapshots);
}

function toggleUi() {
  const isHidden = document.body.classList.toggle("cah-ui-hidden");
  toggleUiBtn.textContent = isHidden ? "Show UI" : "Hide UI";
  setStatus(isHidden ? "UI hidden" : "UI shown");
}

brushSize.addEventListener("input", () => {
  brushSizeText.textContent = brushSize.value;
});

brushOpacity.addEventListener("input", () => {
  brushOpacityText.textContent = brushOpacity.value + "%";
});

brushToolBtn.addEventListener("click", () => setTool("brush"));
eraserToolBtn.addEventListener("click", () => setTool("eraser"));
panToolBtn.addEventListener("click", () => setTool("pan"));

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearCanvasBtn.addEventListener("click", clearCanvas);
savePngBtn.addEventListener("click", savePng);

zoomOutBtn.addEventListener("click", () => zoomAtCenter(0.8));
zoomInBtn.addEventListener("click", () => zoomAtCenter(1.25));
resetViewBtn.addEventListener("click", resetView);
toggleUiBtn.addEventListener("click", toggleUi);

addLayerBtn.addEventListener("click", addLayer);
deleteLayerBtn.addEventListener("click", deleteLayer);
toggleLayerBtn.addEventListener("click", toggleLayerVisibility);

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
setStatus("Ready");
