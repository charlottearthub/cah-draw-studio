(function () {
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = "Build 0.4.6";

  const style = document.createElement("style");
  style.textContent = "html,body,.cah-draw-app,.cah-draw-shell,.cah-canvas-area,.cah-canvas-viewport,.cah-canvas-stage,.cah-layer-stack,.cah-layer-stack canvas{touch-action:none!important;overscroll-behavior:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}input,textarea,select{user-select:text!important;-webkit-user-select:text!important;}#navGizmo,.cah-nav-gizmo{display:none!important;pointer-events:none!important;}.cah-toolbar-panel-button.is-open{border-color:rgba(105,151,240,.72)!important;background:linear-gradient(180deg,rgba(81,130,226,.72),rgba(43,78,154,.72))!important;color:#f7faff!important;}";
  document.head.appendChild(style);

  function panelClass(name) {
    return "cah-panel-" + name + "-minimized";
  }

  function setPanel(name, open) {
    const panel = document.querySelector('[data-panel="' + name + '"]');
    if (!panel) return;
    document.body.classList.toggle(panelClass(name), !open);
    document.querySelectorAll('[data-min-panel="' + name + '"]').forEach(function (button) {
      button.textContent = open ? "-" : "+";
    });
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
    return !document.body.classList.contains(panelClass(name));
  }

  function updateButtons() {
    const pairs = [
      ["openBrushLibraryBtn", "brushes"],
      ["openCanvasPanelBtn", "canvas"],
      ["openTextPanelBtn", "text"]
    ];
    pairs.forEach(function (pair) {
      const button = document.getElementById(pair[0]);
      if (button) button.classList.toggle("is-open", isOpen(pair[1]));
    });
  }

  function addButton(id, label, panelName) {
    const bar = document.querySelector(".cah-header-actions");
    if (!bar || document.getElementById(id)) return;
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = "cah-toolbar-panel-button";
    button.textContent = label;
    button.addEventListener("click", function () {
      setPanel(panelName, !isOpen(panelName));
      updateButtons();
    });
    const saveButton = document.getElementById("savePngBtn");
    if (saveButton && saveButton.parentNode === bar) bar.insertBefore(button, saveButton);
    else bar.appendChild(button);
  }

  function boot() {
    addButton("openBrushLibraryBtn", "Brushes", "brushes");
    addButton("openCanvasPanelBtn", "Canvas", "canvas");
    addButton("openTextPanelBtn", "Text", "text");
    setPanel("brushes", false);
    setPanel("canvas", false);
    setPanel("text", false);
    setPanel("gizmo", false);
    updateButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const script = document.createElement("script");
  script.src = "draw-input-performance.js?v=0.4.6";
  document.body.appendChild(script);
})();
