const layersContainer = document.getElementById("layersContainer");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");
const brushOpacity = document.getElementById("brushOpacity");
const brushOpacityText = document.getElementById("brushOpacityText");

const brushToolBtn = document.getElementById("brushToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const savePngBtn = document.getElementById("savePngBtn");

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

let lastPoint = null;
let lastMidPoint = null;

let undoStack = [];
let redoStack = [];

const maxLayers = 5;
const maxHistory = 30;

function setStatus(message) {
  statusText.textContent = message;
}

function getSize() {
  const rect = layersContainer.getBoundingClientRect();
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

function getPoint(event) {
  const rect = layersContainer.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
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
  event.preventDefault();

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

  layersContainer.setPointerCapture?.(event.pointerId);

  drawSmoothPoint(getPoint(event));
}

function draw(event) {
  if (!isDrawing) return;

  event.preventDefault();

  const events = typeof event.getCoalescedEvents === "function"
    ? event.getCoalescedEvents()
    : [event];

  events.forEach((pointerEvent) => {
    drawSmoothPoint(getPoint(pointerEvent));
  });
}

function stopDrawing(event) {
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

  setStatus(tool === "brush" ? "Brush selected" : "Eraser selected");
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

brushSize.addEventListener("input", () => {
  brushSizeText.textContent = brushSize.value;
});

brushOpacity.addEventListener("input", () => {
  brushOpacityText.textContent = brushOpacity.value + "%";
});

brushToolBtn.addEventListener("click", () => setTool("brush"));
eraserToolBtn.addEventListener("click", () => setTool("eraser"));

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearCanvasBtn.addEventListener("click", clearCanvas);
savePngBtn.addEventListener("click", savePng);

addLayerBtn.addEventListener("click", addLayer);
deleteLayerBtn.addEventListener("click", deleteLayer);
toggleLayerBtn.addEventListener("click", toggleLayerVisibility);

layersContainer.addEventListener("pointerdown", startDrawing);
layersContainer.addEventListener("pointermove", draw);
layersContainer.addEventListener("pointerup", stopDrawing);
layersContainer.addEventListener("pointercancel", stopDrawing);
layersContainer.addEventListener("pointerleave", stopDrawing);

window.addEventListener("resize", () => {
  if (layers.length > 0) {
    resizeLayers();
  }
});

createLayer("Layer 1");
nextLayerNumber = 2;
setTool("brush");
setStatus("Ready");
