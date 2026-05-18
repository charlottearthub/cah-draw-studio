(function () {
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = "Build 0.5.1";

  const style = document.createElement("style");
  style.textContent = "html,body,.cah-draw-app,.cah-draw-shell,.cah-canvas-area,.cah-canvas-viewport,.cah-canvas-stage,.cah-layer-stack,.cah-layer-stack canvas{touch-action:none!important;overscroll-behavior:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}input,textarea,select{user-select:text!important;-webkit-user-select:text!important;}#navGizmo,.cah-nav-gizmo{display:none!important;pointer-events:none!important;}[data-tool-mode='transform'],[data-tool-mode='hand'],[data-tool-mode='zoomIn'],[data-tool-mode='zoomOut']{display:none!important;pointer-events:none!important;visibility:hidden!important;}body.cah-panel-brushes-minimized [data-panel='brushes'],body.cah-panel-canvas-minimized [data-panel='canvas'],body.cah-panel-text-minimized [data-panel='text'],body.cah-panel-color-minimized [data-panel='color'],body.cah-panel-layers-minimized [data-panel='layers'],body.cah-panel-settings-minimized [data-panel='settings'],body.cah-panel-gizmo-minimized [data-panel='gizmo']{display:none!important;pointer-events:none!important;visibility:hidden!important;}[data-panel='settings'].cah-settings-merged{display:block!important;position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;width:100%!important;margin-top:12px!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;}.cah-merged-settings-title{margin:12px 0 8px!important;padding-top:12px!important;border-top:1px solid rgba(255,255,255,.09)!important;color:rgba(247,244,237,.86)!important;font-size:12px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.08em!important;}.cah-toolbar-panel-button.is-open,.cah-tool-button.is-open{border-color:rgba(105,151,240,.72)!important;background:linear-gradient(180deg,rgba(81,130,226,.72),rgba(43,78,154,.72))!important;color:#f7faff!important;}";
  document.head.appendChild(style);

  function panelClass(name) { return "cah-panel-" + name + "-minimized"; }

  function setPanel(name, open) {
    const panel = document.querySelector('[data-panel="' + name + '"]');
    if (!panel) return;
    document.body.classList.toggle(panelClass(name), !open);
    panel.style.display = open ? "" : "none";
    panel.style.pointerEvents = open ? "" : "none";
    panel.style.visibility = open ? "" : "hidden";
    document.querySelectorAll('[data-min-panel="' + name + '"]').forEach(function (button) { button.textContent = open ? "-" : "+"; });
    if (!open) return;
    if (panel.classList.contains("cah-settings-merged")) return;
    const shell = document.querySelector(".cah-draw-shell");
    if (!shell) return;
    const shellRect = shell.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    panel.style.left = Math.max(8, shellRect.width - panelRect.width - 16) + "px";
    panel.style.top = "76px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function isOpen(name) {
    const panel = document.querySelector('[data-panel="' + name + '"]');
    return Boolean(panel) && !document.body.classList.contains(panelClass(name)) && panel.style.display !== "none";
  }

  function updateButtons() {
    [["openBrushLibraryBtn", "brushes"], ["openCanvasPanelBtn", "canvas"], ["openColorPanelBtn", "color"], ["openLayersPanelBtn", "layers"]].forEach(function (pair) {
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

  function wireRailColorButton() {
    const colorButton = document.getElementById("railColorButton");
    if (!colorButton || colorButton.dataset.panelToggleReady === "true") return;
    colorButton.dataset.panelToggleReady = "true";
    colorButton.addEventListener("click", function () { setPanel("color", !isOpen("color")); updateButtons(); });
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

  function boot() {
    mergeBrushSettings();
    makeRailButton("openBrushLibraryBtn", "▤", "Brushes", "brushes");
    makeRailButton("openCanvasPanelBtn", "▣", "Canvas", "canvas");
    makeRailButton("openColorPanelBtn", "◉", "Color", "color");
    makeRailButton("openLayersPanelBtn", "▦", "Layers", "layers");
    wireRailColorButton();

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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const script = document.createElement("script");
  script.src = "draw-input-performance.js?v=0.5.1";
  document.body.appendChild(script);
})();
