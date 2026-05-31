(function () {
  const CAH_DRAW_BUILD = "Build 0.6.1";
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = CAH_DRAW_BUILD;

  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  let lastOrientation = window.screen?.orientation?.angle ?? window.orientation ?? 0;
  let lastAllowedResizeAt = 0;

  function realScreenChange() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = window.screen?.orientation?.angle ?? window.orientation ?? 0;
    const widthDelta = Math.abs(width - lastWidth);
    const heightDelta = Math.abs(height - lastHeight);
    const orientationChanged = orientation !== lastOrientation;

    lastWidth = width;
    lastHeight = height;
    lastOrientation = orientation;

    return orientationChanged || widthDelta > 160 || heightDelta > 160;
  }

  function safeFitAfterRealChange() {
    const now = Date.now();
    if (now - lastAllowedResizeAt < 500) return;
    lastAllowedResizeAt = now;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (typeof fitCanvasToScreen === "function") fitCanvasToScreen();
      });
    });
  }

  window.addEventListener("resize", function (event) {
    event.stopImmediatePropagation();
    if (realScreenChange()) safeFitAfterRealChange();
  }, true);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function (event) {
      event.stopPropagation();
    }, { passive: true });
  }

  window.addEventListener("orientationchange", function () {
    lastOrientation = window.screen?.orientation?.angle ?? window.orientation ?? 0;
    setTimeout(safeFitAfterRealChange, 260);
  });
})();
