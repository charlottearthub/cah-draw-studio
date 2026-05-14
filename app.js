const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

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
const statusText = document.getElementById("statusText");

let isDrawing = false;
let currentTool = "brush";
let lastX = 0;
let lastY = 0;

let undoStack = [];
let redoStack = [];
const maxHistory = 30;

function setStatus(message) {
  statusText.textContent = message;
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const oldImage = document.createElement("canvas");
  const oldCtx = oldImage.getContext("2d");

  oldImage.width = canvas.width;
  oldImage.height = canvas.height;
  oldCtx.drawImage(canvas, 0, 0);

  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "#fffaf4";
  ctx.fillRect(0, 0, rect.width, rect.height);

  if (oldImage.width > 0 && oldImage.height > 0) {
    ctx.drawImage(oldImage, 0, 0, rect.width, rect.height);
  }
}

function saveState() {
  try {
    undoStack.push(canvas.toDataURL("image/png"));

    if (undoStack.length > maxHistory) {
      undoStack.shift();
    }

    redoStack = [];
    setStatus("Saved stroke");
  } catch (error) {
    setStatus("Could not save history");
  }
}

function restoreFromDataUrl(dataUrl) {
  const image = new Image();
  const rect = canvas.parentElement.getBoundingClientRect();

  image.onload = () => {
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fffaf4";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.drawImage(image, 0, 0, rect.width, rect.height);
  };

  image.src = dataUrl;
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startDrawing(event) {
  event.preventDefault();

  saveState();

  isDrawing = true;

  const point = getPoint(event);
  lastX = point.x;
  lastY = point.y;

  drawLine(point.x, point.y);
}

function draw(event) {
  if (!isDrawing) return;

  event.preventDefault();

  const point = getPoint(event);

  drawLine(point.x, point.y);

  lastX = point.x;
  lastY = point.y;
}

function stopDrawing(event) {
  if (!isDrawing) return;

  event.preventDefault();

  isDrawing = false;
  ctx.beginPath();
}

function drawLine(x, y) {
  const size = Number(brushSize.value);
  const opacity = Number(brushOpacity.value) / 100;

  ctx.globalAlpha = opacity;
  ctx.lineWidth = size;

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = colorPicker.value;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function setTool(tool) {
  currentTool = tool;

  brushToolBtn.classList.toggle("active", tool === "brush");
  eraserToolBtn.classList.toggle("active", tool === "eraser");

  setStatus(tool === "brush" ? "Brush selected" : "Eraser selected");
}

function undo() {
  if (undoStack.length === 0) {
    setStatus("Nothing to undo");
    return;
  }

  redoStack.push(canvas.toDataURL("image/png"));
  const previous = undoStack.pop();
  restoreFromDataUrl(previous);
  setStatus("Undo");
}

function redo() {
  if (redoStack.length === 0) {
    setStatus("Nothing to redo");
    return;
  }

  undoStack.push(canvas.toDataURL("image/png"));
  const next = redoStack.pop();
  restoreFromDataUrl(next);
  setStatus("Redo");
}

function clearCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();

  saveState();

  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#fffaf4";
  ctx.fillRect(0, 0, rect.width, rect.height);

  setStatus("Canvas cleared");
}

function savePng() {
  const link = document.createElement("a");
  link.download = "cah-drawing.png";
  link.href = canvas.toDataURL("image/png");
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

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
setTool("brush");
setStatus("Ready");
