(function () {
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = "Build 0.4.8";

  const style = document.createElement("style");
  style.textContent = "html,body,.cah-draw-app,.cah-draw-shell,.cah-canvas-area,.cah-canvas-viewport,.cah-canvas-stage,.cah-layer-stack,.cah-layer-stack canvas{touch-action:none!important;overscroll-behavior:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}input,textarea,select{user-select:text!important;-webkit-user-select:text!important;}#navGizmo,.cah-nav-gizmo{display:none!important;pointer-events:none!important;}body.cah-panel-brushes-minimized [data-panel='brushes'],body.cah-panel-canvas-minimized [data-panel='canvas'],body.cah-panel-text-minimized [data-panel='text'],body.cah-panel-gizmo-minimized [data-panel='gizmo']{display:none!important;pointer-events:none!important;visibility:hidden!important;}.cah-toolbar-panel-button.is-open,.cah-tool-button.is-open{border-color:rgba(105,151,240,.72)!important;background:linear-gradient(180deg,rgba(81,130,226,.72),rgba(43,78,154,.72))!important;color:#f7faff!important;}";
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
    [["openBrushLibraryBtn", "brushes"], ["openCanvasPanelBtn", "canvas"], ["openTextPanelBtn", "text"]].forEach(function (pair) {
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

  function boot() {
    makeRailButton("openBrushLibraryBtn", "▤", "Library", "brushes");
    makeRailButton("openCanvasPanelBtn", "▣", "Canvas", "canvas");
    makeRailButton("openTextPanelBtn", "T", "Text Pane", "text");
    const textTool = document.querySelector('[data-tool-mode="text"]');
    if (textTool && textTool.dataset.panelToggleReady !== "true") {
      textTool.dataset.panelToggleReady = "true";
      textTool.addEventListener("click", function () { setPanel("text", true); updateButtons(); });
    }
    document.querySelectorAll("[data-min-panel]").forEach(function (button) {
      if (button.dataset.cahHideReady === "true") return;
      button.dataset.cahHideReady = "true";
      button.addEventListener("click", function () { setPanel(button.getAttribute("data-min-panel"), false); updateButtons(); });
    });
    setPanel("brushes", false);
    setPanel("canvas", false);
    setPanel("text", false);
    setPanel("gizmo", false);
    updateButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const script = document.createElement("script");
  script.src = "draw-input-performance.js?v=0.4.8";
  document.body.appendChild(script);
})();
