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
let nextLayerId = 1;

let isDrawing = false;
let currentTool = "brush";
let points = [];

let undoStack = [];
let redoStack = [];
const maxHistory = 30;
const maxLayers = 5;

function setStatus(message) {
  statusText.textContent = message;
}

function getCanvasSize() {
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

function configureContext(layer) {
  const size = getCanvasSize();

  layer.ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  layer.ctx.lineCap = "round";
  layer.ctx.lineJoin = "round";
  layer.ctx.imageSmoothingEnabled = true;
}

function createLayer(name) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const id = "layer-" + nextLayerId++;

  const layer = {
    id,
    name,
    canvas,
    ctx,
    visible: true
  };

  canvas.dataset.layerId = id;
  layersContainer.appendChild(canvas);
  layers.push(layer);

  resizeSingleLayer(layer);
  setActiveLayer(id);
  renderLayersList();

  return layer;
}

function resizeSingleLayer(layer) {
  const size = getCanvasSize();

  const oldCanvas = document.createElement("canvas");
  oldCanvas.width = layer.canvas.width;
  oldCanvas.height = layer.canvas.height;

  if (oldCanvas.width > 0 && oldCanvas.height > 0) {
    oldCanvas.getContext("2d").drawImage(layer.canvas, 0, 0);
  }

  layer.canvas.width = size.pixelWidth;
  layer.canvas.height = size.pixelHeight;
  layer.canvas.style.width = size.cssWidth + "px";
  layer.canvas.style.height = size.cssHeight + "px";

  configureContext(layer);

  if (oldCanvas.width > 0 && oldCanvas.height > 0) {
    layer.ctx.drawImage(oldCanvas, 0, 0, size.cssWidth, size.cssHeight);
  }
}

function resizeAllLayers() {
  layers.forEach(resizeSingleLayer);
}

function getActiveLayer() {
  return layers.find((layer) => layer.id === activeLayerId) || layers[0];
}

function setActiveLayer(id) {
  activeLayerId = id;
  layers.forEach((layer) => {
    layer.canvas.style.pointerEvents = layer.id === activeLayerId ? "auto" : "none";
  });
  renderLayersList();
}

function renderLayersList() {
  layersList.innerHTML = "";

  [...layers].reverse().forEach((layer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cah-layer-item" + (layer.id === activeLayerId ? " active" : "");
    button.dataset.layerId = layer.id;

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

function saveState() {
  try {
    undoStack.push(captureState());

    if (undoStack.length > maxHistory) {
      undoStack.shift();
    }

    redoStack = [];
  } catch (error) {
    setStatus("History save failed");
  }
}

function restoreState(snapshot) {
  if (!snapshot) return;

  const loadPromises = snapshot.map((savedLayer, index) => {
    return new Promise((resolve) => {
      let layer = layers[index];

      if (!layer) {
        layer = createLayer(savedLayer.name || "Layer");
      }

      layer.name = savedLayer.name;
      layer.visible = savedLayer.visible;

      const image = new Image();
      image.onload = () => {
        const size = getCanvasSize();

        layer.ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
        layer.ctx.drawImage(image, 0, 0, size.cssWidth, size.cssHeight);
        layer.canvas.style.display = layer.visible ? "block" : "none";
        resolve();
      };

      image.src = savedLayer.data;
    });
  });

  Promise.all(loadPromises).then(() => {
    while (layers.length > snapshot.length) {
      const layer = layers.pop();
      layer.canvas.remove();
    }

    if (!layers.find((layer) => layer.id === activeLayerId) && layers[0]) {
      activeLayerId = layers[0].id;
    }

    renderLayersList();
  });
}

function undo() {
  if (undoStack.length === 0) {
    setStatus("Nothing to undo");
    return;
  }

  redoStack.push(captureState());
  const previous = undoStack.pop();
  restoreState(previous);
  setStatus("Undo");
}

function redo() {
  if (redoStack.length === 0) {
    setStatus("Nothing to redo");
    return;
  }

  undoStack.push(captureState());
  const next = redoStack.pop();
  restoreState(next);
  setStatus("Redo");
}

function getPoint(event) {
  const rect = layersContainer.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startDrawing(event) {
  event.preventDefault();

  const activeLayer = getActiveLayer();

  if (!activeLayer || !activeLayer.visible) {
    setStatus("Active layer is hidden");
    return;
  }

  saveState();

  isDrawing = true;
  points = [getPoint(event)];

  activeLayer.ctx.beginPath();
}

function draw(event) {
  if (!isDrawing) return;

  event.preventDefault();

  const activeLayer = getActiveLayer();
  if (!activeLayer) return;

  const point = getPoint(event);
  points.push(point);

  drawSmoothStroke(activeLayer);
}

function stopDrawing(event) {
  if (!isDrawing) return;

  event.preventDefault();

  const activeLayer = getActiveLayer();

  if (activeLayer && points.length === 1) {
    drawDot(activeLayer, points[0]);
  }

  if (activeLayer) {
    activeLayer.ctx.beginPath();
  }

  isDrawing = false;
  points = [];
  setStatus("Saved stroke");
}

function prepareBrush(layer) {
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;

  layer.ctx.globalAlpha = opacity;
  layer.ctx.lineWidth = size;

  if (currentTool === "eraser") {
    layer.ctx.globalCompositeOperation = "destination-out";
    layer.ctx.strokeStyle = "rgba(0,0,0,1)";
    layer.ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    layer.ctx.globalCompositeOperation = "source-over";
    layer.ctx.strokeStyle = colorPicker.value;
    layer.ctx.fillStyle = colorPicker.value;
  }

  layer.ctx.lineCap = "round";
  layer.ctx.lineJoin = "round";
}

function drawSmoothStroke(layer) {
  if (points.length < 3) return;

  prepareBrush(layer);

  const p0 = points[points.length - 3];
  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];

  const mid1 = {
    x: (p0.x + p1.x) / 2,
    y: (p0.y + p1.y) / 2
  };

  const mid2 = {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };

  layer.ctx.beginPath();
  layer.ctx.moveTo(mid1.x, mid1.y);
  layer.ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
  layer.ctx.stroke();

  layer.ctx.globalAlpha = 1;
  layer.ctx.globalCompositeOperation = "source-over";
}

function drawDot(layer, point) {
  prepareBrush(layer);

  const radius = Number(brushSize.value) / 2;

  layer.ctx.beginPath();
  layer.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  layer.ctx.fill();

  layer.ctx.globalAlpha = 1;
  layer.ctx.globalCompositeOperation = "source-over";
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

  saveState();

  const layer = createLayer("Layer " + (layers.length + 1));
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

  saveState();

  activeLayer.canvas.remove();
  layers = layers.filter((layer) => layer.id !== activeLayer.id);

  setActiveLayer(layers[layers.length - 1].id);
  renderLayersList();
  setStatus("Layer deleted");
}

function toggleLayerVisibility() {
  const activeLayer = getActiveLayer();
  if (!activeLayer) return;

  saveState();

  activeLayer.visible = !activeLayer.visible;
  activeLayer.canvas.style.display = activeLayer.visible ? "block" : "none";

  renderLayersList();
  setStatus(activeLayer.visible ? "Layer shown" : "Layer hidden");
}

function clearCanvas() {
  saveState();

  const size = getCanvasSize();

  layers.forEach((layer) => {
    layer.ctx.clearRect(0, 0, size.cssWidth, size.cssHeight);
  });

  setStatus("Canvas cleared");
}

function savePng() {
  const size = getCanvasSize();

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

window.addEventListener("resize", resizeAllLayers);

createLayer("Layer 1");
setTool("brush");
setStatus("Ready");
