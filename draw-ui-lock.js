(function () {
  const CAH_DRAW_BUILD = "Build 0.5.4";
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = CAH_DRAW_BUILD;

  const style = document.createElement("style");
  style.textContent = "html,body,.cah-draw-app,.cah-draw-shell,.cah-canvas-area,.cah-canvas-viewport,.cah-canvas-stage,.cah-layer-stack,.cah-layer-stack canvas{touch-action:none!important;overscroll-behavior:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}input,textarea,select{user-select:text!important;-webkit-user-select:text!important;}#navGizmo,.cah-nav-gizmo{display:none!important;pointer-events:none!important;}[data-tool-mode='transform'],[data-tool-mode='hand'],[data-tool-mode='zoomIn'],[data-tool-mode='zoomOut']{display:none!important;pointer-events:none!important;visibility:hidden!important;}body.cah-panel-brushes-minimized [data-panel='brushes'],body.cah-panel-canvas-minimized [data-panel='canvas'],body.cah-panel-text-minimized [data-panel='text'],body.cah-panel-color-minimized [data-panel='color'],body.cah-panel-layers-minimized [data-panel='layers'],body.cah-panel-settings-minimized [data-panel='settings'],body.cah-panel-gizmo-minimized [data-panel='gizmo']{display:none!important;pointer-events:none!important;visibility:hidden!important;}[data-panel='settings'].cah-settings-merged{display:block!important;position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;width:100%!important;margin-top:12px!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;}.cah-merged-settings-title{margin:12px 0 8px!important;padding-top:12px!important;border-top:1px solid rgba(255,255,255,.09)!important;color:rgba(247,244,237,.86)!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.08em!important;}.cah-toolbar-panel-button.is-open,.cah-tool-button.is-open{border-color:rgba(105,151,240,.72)!important;background:linear-gradient(180deg,rgba(81,130,226,.72),rgba(43,78,154,.72))!important;color:#f7faff!important;}.cah-app-bar{grid-template-columns:minmax(150px,auto) minmax(0,1fr)!important;gap:8px!important;align-items:center!important;overflow:hidden!important;}.cah-project-block{min-width:0!important;}.cah-project-block h1{font-size:clamp(13px,2.2vw,18px)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}.cah-project-block span:not(.cah-build-number){display:none!important;}.cah-build-number{font-size:10px!important;opacity:.7!important;}.cah-header-actions{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:flex-end!important;gap:5px!important;min-width:0!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;}.cah-header-actions::-webkit-scrollbar{display:none!important;}.cah-header-actions button{flex:0 0 auto!important;min-width:32px!important;min-height:30px!important;height:30px!important;padding:0 8px!important;border-radius:6px!important;font-size:11px!important;line-height:1!important;letter-spacing:0!important;white-space:nowrap!important;}#toggleUiBtn{width:32px!important;min-width:32px!important;padding:0!important;}#railColorButton{display:none!important;}[data-panel='color']{min-width:260px!important;max-width:min(340px,calc(100vw - 84px))!important;z-index:99999!important;}@media(max-width:720px){.cah-app-bar{padding:8px!important;grid-template-columns:minmax(96px,auto) minmax(0,1fr)!important;}.cah-project-block{gap:6px!important;}.cah-project-block h1{font-size:12px!important;}.cah-build-number{display:block!important;font-size:9px!important;}.cah-header-actions button{min-width:30px!important;height:28px!important;min-height:28px!important;padding:0 7px!important;font-size:10px!important;}[data-panel='color']{max-width:calc(100vw - 76px)!important;}}";
  document.head.appendChild(style);

  function panelClass(name) { return "cah-panel-" + name + "-minimized"; }

  function positionPanel(panel, name) {
    if (!panel || panel.classList.contains("cah-settings-merged")) return;

    const shell = document.querySelector(".cah-draw-shell");
    const shellRect = shell ? shell.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const panelRect = panel.getBoundingClientRect();
    const toolbarOffset = window.innerWidth <= 720 ? 58 : 72;
    const topOffset = window.innerWidth <= 720 ? 58 : 76;
    const margin = 8;

    const availableWidth = Math.max(220, shellRect.width - toolbarOffset - margin * 2);
    const availableHeight = Math.max(220, shellRect.height - topOffset - margin * 2);

    panel.style.maxWidth = availableWidth + "px";
    panel.style.maxHeight = availableHeight + "px";
    panel.style.overflow = "auto";
    panel.style.zIndex = "99999";

    const width = Math.min(panelRect.width || 300, availableWidth);
    const height = Math.min(panelRect.height || 360, availableHeight);

    let left = name === "color" ? toolbarOffset : Math.max(toolbarOffset, shellRect.width - width - 16);
    let top = topOffset;

    left = Math.max(toolbarOffset, Math.min(left, shellRect.width - width - margin));
    top = Math.max(topOffset, Math.min(top, shellRect.height - height - margin));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function setPanel(name, open) {
    const panel = document.querySelector('[data-panel="' + name + '"]');
    if (!panel) return;

    document.body.classList.toggle(panelClass(name), !open);
    panel.style.display = open ? "block" : "none";
    panel.style.pointerEvents = open ? "auto" : "none";
    panel.style.visibility = open ? "visible" : "hidden";

    document.querySelectorAll('[data-min-panel="' + name + '"]').forEach(function (button) { button.textContent = open ? "-" : "+"; });
    if (!open) return;

    positionPanel(panel, name);
    window.requestAnimationFrame(function () { positionPanel(panel, name); });
  }

  function isOpen(name) {
    const panel = document.querySelector('[data-panel="' + name + '"]');
    return Boolean(panel) && !document.body.classList.contains(panelClass(name)) && panel.style.display !== "none";
  }

  function updateButtons() {
    [["drawToolBtn", "brushes"], ["openCanvasPanelBtn", "canvas"], ["openColorPanelBtn", "color"], ["openLayersPanelBtn", "layers"]].forEach(function (pair) {
      const button = document.getElementById(pair[0]);
      if (button) button.classList.toggle("is-open", isOpen(pair[1]));
    });
    const textTool = document.querySelector('[data-tool-mode="text"]');
    if (textTool) textTool.classList.toggle("is-open", isOpen("text"));
  }

  function makeRailButton(id, icon, label, panelName) {
    const rail = document.querySelector(".cah-tool-rail");
    if (!rail || document.getElementById(id)) return;
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = "cah-tool-button cah-toolbar-panel-button";
    button.innerHTML = "<span>" + icon + "</span><b>" + label + "</b>";
    button.addEventListener("click", function () { setPanel(panelName, !isOpen(panelName)); updateButtons(); });
    const colorButton = document.getElementById("railColorButton");
    if (colorButton && colorButton.parentNode === rail) rail.insertBefore(button, colorButton);
    else rail.appendChild(button);
  }

  function wireBrushButton() {
    const brushButton = document.getElementById("drawToolBtn");
    if (!brushButton) return;
    const oldBrushesButton = document.getElementById("openBrushLibraryBtn");
    if (oldBrushesButton) oldBrushesButton.remove();
    if (brushButton.dataset.panelToggleReady === "true") return;
    brushButton.dataset.panelToggleReady = "true";
    brushButton.addEventListener("click", function () { setPanel("brushes", !isOpen("brushes")); updateButtons(); });
  }

  function mergeBrushSettings() {
    const brushPanel = document.querySelector('[data-panel="brushes"]');
    const settingsPanel = document.querySelector('[data-panel="settings"]');
    if (!brushPanel || !settingsPanel || settingsPanel.dataset.mergedIntoBrushes === "true") return;

    settingsPanel.dataset.mergedIntoBrushes = "true";
    settingsPanel.classList.add("cah-settings-merged");
    settingsPanel.style.display = "block";
    settingsPanel.style.pointerEvents = "auto";
    settingsPanel.style.visibility = "visible";

    const minButton = settingsPanel.querySelector('[data-min-panel="settings"]');
    if (minButton) minButton.remove();

    const title = settingsPanel.querySelector(".cah-panel-title");
    if (title) {
      title.textContent = "Brush Settings";
      title.classList.add("cah-merged-settings-title");
    }

    brushPanel.appendChild(settingsPanel);
    document.body.classList.remove(panelClass("settings"));
  }

  function compactTopBarButtons() {
    const labels = { undoBtn: "↶", redoBtn: "↷", savePngBtn: "PNG", openSubmitModalBtn: "Submit", clearCanvasBtn: "Clear", resetPanelsBtn: "Reset" };
    Object.keys(labels).forEach(function (id) {
      const button = document.getElementById(id);
      if (!button) return;
      button.textContent = labels[id];
      button.title = id === "undoBtn" ? "Undo" : id === "redoBtn" ? "Redo" : id === "savePngBtn" ? "Save PNG" : id === "openSubmitModalBtn" ? "Submit" : id === "clearCanvasBtn" ? "Clear" : "Reset UI";
      button.setAttribute("aria-label", button.title);
    });
  }

  function boot() {
    mergeBrushSettings();
    wireBrushButton();
    makeRailButton("openCanvasPanelBtn", "▣", "Canvas", "canvas");
    makeRailButton("openColorPanelBtn", "◉", "Color", "color");
    makeRailButton("openLayersPanelBtn", "▦", "Layers", "layers");
    compactTopBarButtons();

    const duplicateBrushesButton = document.getElementById("openBrushLibraryBtn");
    if (duplicateBrushesButton) duplicateBrushesButton.remove();

    const textPaneButton = document.getElementById("openTextPanelBtn");
    if (textPaneButton) textPaneButton.remove();

    const textTool = document.querySelector('[data-tool-mode="text"]');
    if (textTool && textTool.dataset.panelToggleReady !== "true") {
      textTool.dataset.panelToggleReady = "true";
      textTool.addEventListener("click", function () { setPanel("text", !isOpen("text")); updateButtons(); });
    }

    document.querySelectorAll("[data-min-panel]").forEach(function (button) {
      if (button.dataset.cahHideReady === "true") return;
      button.dataset.cahHideReady = "true";
      button.addEventListener("click", function () { setPanel(button.getAttribute("data-min-panel"), false); updateButtons(); });
    });

    setPanel("brushes", false);
    setPanel("canvas", false);
    setPanel("text", false);
    setPanel("color", false);
    setPanel("layers", false);
    setPanel("gizmo", false);
    updateButtons();
  }

  window.addEventListener("resize", function () {
    ["brushes", "canvas", "text", "color", "layers"].forEach(function (name) {
      if (isOpen(name)) positionPanel(document.querySelector('[data-panel="' + name + '"]'), name);
    });
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const script = document.createElement("script");
  script.src = "draw-input-performance.js?v=0.5.4";
  document.body.appendChild(script);
})();
