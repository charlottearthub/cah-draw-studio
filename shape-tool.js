(function () {
  const CAH_DRAW_BUILD = "Build 0.5.6";
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = CAH_DRAW_BUILD;

  const viewport = document.getElementById("canvasViewport");
  const rail = document.querySelector(".cah-tool-rail");
  const shapeButton = document.querySelector('[data-tool-mode="shape"]');
  const shell = document.querySelector(".cah-draw-shell");

  if (!viewport || !rail || !shapeButton || !shell) return;
  if (window.__cahShapeToolInstalled) return;
  window.__cahShapeToolInstalled = true;

  let shapePanel = null;
  let previewCanvas = null;
  let previewCtx = null;
  let pendingPoint = null;
  let shapeModeActive = false;

  function getColor() {
    const picker = document.getElementById("colorPicker");
    return picker ? picker.value : "#111111";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function panelClass(name) {
    return "cah-panel-" + name + "-minimized";
  }

  function getCanvasPointFromEvent(event) {
    if (typeof getCanvasPoint === "function") return getCanvasPoint(event);

    const rect = viewport.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (typeof screenToWorld === "function") return screenToWorld(x, y);
    return { x, y };
  }

  function makePanel() {
    if (shapePanel) return shapePanel;

    shapePanel = document.createElement("section");
    shapePanel.className = "cah-shape-panel cah-panel";
    shapePanel.setAttribute("data-panel", "shape");
    shapePanel.innerHTML = `
      <button class="cah-panel-min" data-min-panel="shape" type="button">-</button>
      <div class="cah-panel-title">Shapes</div>

      <div class="cah-shape-grid">
        <button type="button" class="active" data-shape-choice="rectangle">▭<span>Rectangle</span></button>
        <button type="button" data-shape-choice="square">□<span>Square</span></button>
        <button type="button" data-shape-choice="circle">○<span>Circle</span></button>
        <button type="button" data-shape-choice="ellipse">⬭<span>Ellipse</span></button>
        <button type="button" data-shape-choice="triangle">△<span>Triangle</span></button>
        <button type="button" data-shape-choice="line">╱<span>Line</span></button>
        <button type="button" data-shape-choice="arrow">➜<span>Arrow</span></button>
      </div>

      <label class="cah-control"><span>Width <b id="shapeWidthText">240</b></span><input id="shapeWidth" type="range" min="20" max="1200" value="240" /></label>
      <label class="cah-control"><span>Height <b id="shapeHeightText">160</b></span><input id="shapeHeight" type="range" min="20" max="1200" value="160" /></label>
      <label class="cah-control"><span>Rotation <b id="shapeRotationText">0°</b></span><input id="shapeRotation" type="range" min="-180" max="180" value="0" /></label>
      <label class="cah-control"><span>Stroke <b id="shapeStrokeText">8</b></span><input id="shapeStroke" type="range" min="1" max="80" value="8" /></label>

      <div class="cah-shape-checks">
        <label><input id="shapeFill" type="checkbox" checked /> Fill</label>
        <label><input id="shapeOutline" type="checkbox" checked /> Outline</label>
      </div>

      <div class="cah-shape-actions">
        <button id="shapePlaceCenterBtn" type="button">Place Center</button>
        <button id="shapeCancelBtn" type="button">Cancel</button>
      </div>
      <p class="cah-shape-note">Tap the canvas to place. Adjust size and rotation before placing.</p>
    `;

    shell.appendChild(shapePanel);
    wirePanel();
    return shapePanel;
  }

  function injectStyle() {
    if (document.getElementById("cah-shape-tool-style")) return;
    const style = document.createElement("style");
    style.id = "cah-shape-tool-style";
    style.textContent = `
      body.cah-panel-shape-minimized [data-panel='shape'] {
        display: none !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }

      .cah-shape-panel {
        position: absolute;
        z-index: 100000;
        width: min(340px, calc(100vw - 84px));
        max-height: calc(100vh - 92px);
        overflow: auto;
      }

      .cah-shape-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin: 10px 0 12px;
      }

      .cah-shape-grid button {
        min-height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.045);
        color: rgba(247,244,237,0.9);
        font-weight: 900;
        cursor: pointer;
      }

      .cah-shape-grid button.active {
        border-color: rgba(105,151,240,.72);
        background: linear-gradient(180deg,rgba(81,130,226,.72),rgba(43,78,154,.72));
        color: #f7faff;
      }

      .cah-shape-grid span {
        font-size: 11px;
      }

      .cah-shape-checks {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
      }

      .cah-shape-checks label {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 800;
        color: rgba(247,244,237,0.82);
      }

      .cah-shape-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
      }

      .cah-shape-actions button {
        min-height: 34px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.06);
        color: rgba(247,244,237,0.9);
        font-weight: 900;
      }

      .cah-shape-note {
        margin: 10px 0 0;
        font-size: 11px;
        line-height: 1.35;
        color: rgba(247,244,237,0.58);
      }

      .cah-shape-preview-canvas {
        position: absolute;
        inset: 0;
        z-index: 9990;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function getShapeSettings() {
    const typeButton = shapePanel.querySelector("[data-shape-choice].active");
    return {
      type: typeButton ? typeButton.getAttribute("data-shape-choice") : "rectangle",
      width: Number(document.getElementById("shapeWidth").value),
      height: Number(document.getElementById("shapeHeight").value),
      rotation: Number(document.getElementById("shapeRotation").value),
      stroke: Number(document.getElementById("shapeStroke").value),
      fill: document.getElementById("shapeFill").checked,
      outline: document.getElementById("shapeOutline").checked,
      color: getColor()
    };
  }

  function updateReadouts() {
    const w = document.getElementById("shapeWidth");
    const h = document.getElementById("shapeHeight");
    const r = document.getElementById("shapeRotation");
    const s = document.getElementById("shapeStroke");
    if (document.getElementById("shapeWidthText")) document.getElementById("shapeWidthText").textContent = w.value;
    if (document.getElementById("shapeHeightText")) document.getElementById("shapeHeightText").textContent = h.value;
    if (document.getElementById("shapeRotationText")) document.getElementById("shapeRotationText").textContent = r.value + "°";
    if (document.getElementById("shapeStrokeText")) document.getElementById("shapeStrokeText").textContent = s.value;
    drawPreview();
  }

  function makePreviewCanvas() {
    if (previewCanvas) return;
    previewCanvas = document.createElement("canvas");
    previewCanvas.className = "cah-shape-preview-canvas";
    previewCanvas.width = canvasWidth;
    previewCanvas.height = canvasHeight;
    previewCanvas.style.width = canvasWidth + "px";
    previewCanvas.style.height = canvasHeight + "px";
    previewCtx = previewCanvas.getContext("2d");
    document.getElementById("layersContainer").appendChild(previewCanvas);
  }

  function clearPreview() {
    if (previewCtx) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }

  function drawShapePath(ctx, settings) {
    const w = settings.type === "square" || settings.type === "circle" ? Math.min(settings.width, settings.height) : settings.width;
    const h = settings.type === "square" || settings.type === "circle" ? Math.min(settings.width, settings.height) : settings.height;
    const halfW = w / 2;
    const halfH = h / 2;

    ctx.beginPath();

    if (settings.type === "circle" || settings.type === "ellipse") {
      ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
    } else if (settings.type === "triangle") {
      ctx.moveTo(0, -halfH);
      ctx.lineTo(halfW, halfH);
      ctx.lineTo(-halfW, halfH);
      ctx.closePath();
    } else if (settings.type === "line") {
      ctx.moveTo(-halfW, 0);
      ctx.lineTo(halfW, 0);
    } else if (settings.type === "arrow") {
      ctx.moveTo(-halfW, 0);
      ctx.lineTo(halfW * 0.62, 0);
      ctx.moveTo(halfW * 0.28, -halfH * 0.45);
      ctx.lineTo(halfW, 0);
      ctx.lineTo(halfW * 0.28, halfH * 0.45);
    } else {
      ctx.rect(-halfW, -halfH, w, h);
    }
  }

  function drawShapeToContext(ctx, point, ghost) {
    if (!point) return;
    const settings = getShapeSettings();
    const opacity = Number(document.getElementById("brushOpacity") ? document.getElementById("brushOpacity").value : 100) / 100;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate((settings.rotation * Math.PI) / 180);
    ctx.lineWidth = settings.stroke;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = ghost ? 0.42 : opacity;
    ctx.strokeStyle = settings.color;
    ctx.fillStyle = settings.color;

    drawShapePath(ctx, settings);

    if (settings.fill && settings.type !== "line" && settings.type !== "arrow") ctx.fill();
    if (settings.outline || settings.type === "line" || settings.type === "arrow") ctx.stroke();

    ctx.restore();
  }

  function drawPreview() {
    if (!shapeModeActive || !pendingPoint) return;
    makePreviewCanvas();
    clearPreview();
    drawShapeToContext(previewCtx, pendingPoint, true);
  }

  function placeShape(point) {
    const layer = typeof getActiveLayer === "function" ? getActiveLayer() : null;
    if (!layer || !layer.ctx || layer.locked) return;
    if (typeof saveHistory === "function") saveHistory();
    drawShapeToContext(layer.ctx, point, false);
    pendingPoint = point;
    drawPreview();
  }

  function setShapePanel(open) {
    makePanel();
    document.body.classList.toggle(panelClass("shape"), !open);
    shapePanel.style.display = open ? "block" : "none";
    shapePanel.style.pointerEvents = open ? "auto" : "none";
    shapePanel.style.visibility = open ? "visible" : "hidden";
    shapeButton.classList.toggle("is-open", open);
    shapeModeActive = open;

    if (open) {
      const shellRect = shell.getBoundingClientRect();
      const panelRect = shapePanel.getBoundingClientRect();
      const toolbarOffset = window.innerWidth <= 720 ? 58 : 72;
      const topOffset = window.innerWidth <= 720 ? 58 : 76;
      shapePanel.style.left = toolbarOffset + "px";
      shapePanel.style.top = topOffset + "px";
      shapePanel.style.maxHeight = Math.max(220, shellRect.height - topOffset - 12) + "px";
      shapePanel.style.maxWidth = Math.max(240, Math.min(340, shellRect.width - toolbarOffset - 18)) + "px";
      pendingPoint = { x: canvasWidth / 2, y: canvasHeight / 2 };
      makePreviewCanvas();
      drawPreview();
    } else {
      pendingPoint = null;
      clearPreview();
    }
  }

  function wirePanel() {
    shapePanel.querySelectorAll("[data-shape-choice]").forEach(function (button) {
      button.addEventListener("click", function () {
        shapePanel.querySelectorAll("[data-shape-choice]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        updateReadouts();
      });
    });

    ["shapeWidth", "shapeHeight", "shapeRotation", "shapeStroke", "shapeFill", "shapeOutline"].forEach(function (id) {
      const control = document.getElementById(id);
      if (!control) return;
      control.addEventListener("input", updateReadouts);
      control.addEventListener("change", updateReadouts);
    });

    shapePanel.querySelector('[data-min-panel="shape"]').addEventListener("click", function () {
      setShapePanel(false);
    });

    document.getElementById("shapeCancelBtn").addEventListener("click", function () {
      setShapePanel(false);
    });

    document.getElementById("shapePlaceCenterBtn").addEventListener("click", function () {
      placeShape(pendingPoint || { x: canvasWidth / 2, y: canvasHeight / 2 });
    });
  }

  shapeButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setShapePanel(!shapeModeActive);
  }, true);

  viewport.addEventListener("pointermove", function (event) {
    if (!shapeModeActive) return;
    pendingPoint = getCanvasPointFromEvent(event);
    drawPreview();
  }, { passive: true });

  viewport.addEventListener("pointerdown", function (event) {
    if (!shapeModeActive) return;
    if (event.pointerType === "touch" && typeof getTouchPointers === "function" && getTouchPointers().length >= 1) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingPoint = getCanvasPointFromEvent(event);
    placeShape(pendingPoint);
  }, true);

  injectStyle();
  makePanel();
  setShapePanel(false);
})();
