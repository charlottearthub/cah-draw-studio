/* ═══════════════════════════════════════════════════════════════════════════════
   CHARLOTTE ART HUB — DRAW STUDIO INPUT PERFORMANCE PATCH
   Revision: 0.4.2

   WHAT THIS DOES:
   • Improves iPhone/iPad touch drawing responsiveness.
   • Uses pointerrawupdate when available for faster input delivery.
   • Keeps the existing pinch zoom and two-finger rotate behavior intact.
   • Prevents touch strokes from being ended by accidental pointerleave events.
   • Adds a lightweight touchmove bridge for iOS Safari when PointerEvents lag.
═══════════════════════════════════════════════════════════════════════════════ */

(function () {
  const BUILD = "Build 0.4.2";
  const viewport = document.getElementById("canvasViewport");
  const stage = document.getElementById("canvasStage");
  const layerStack = document.getElementById("layersContainer");

  if (!viewport || !stage || !layerStack) return;

  let fallbackTouchActive = false;
  let fallbackTouchIdentifier = null;
  let lastTouchFrameTime = 0;

  function updateBuildNumber() {
    const buildNumber = document.getElementById("buildNumber");
    if (buildNumber) buildNumber.textContent = BUILD;
  }

  function injectPerformanceStyles() {
    const style = document.createElement("style");
    style.id = "cah-draw-input-performance-patch";
    style.textContent = `
      html,
      body,
      .cah-draw-app,
      .cah-draw-shell,
      .cah-canvas-area,
      .cah-canvas-viewport,
      .cah-canvas-stage,
      .cah-layer-stack,
      .cah-layer-stack canvas {
        touch-action: none !important;
        overscroll-behavior: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      .cah-canvas-stage,
      .cah-layer-stack,
      .cah-layer-stack canvas {
        will-change: transform;
        contain: layout paint size;
      }
    `;
    document.head.appendChild(style);
  }

  function getPrimaryTouch(event) {
    if (!event.changedTouches || !event.changedTouches.length) return null;

    if (fallbackTouchIdentifier !== null) {
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        if (event.changedTouches[i].identifier === fallbackTouchIdentifier) {
          return event.changedTouches[i];
        }
      }
    }

    return event.changedTouches[0];
  }

  function makeTouchPointerEvent(type, touch) {
    let pointerEvent = null;

    try {
      pointerEvent = new PointerEvent(type, {
        pointerId: touch.identifier + 10000,
        pointerType: "touch",
        isPrimary: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        width: Math.max(1, touch.radiusX ? touch.radiusX * 2 : 1),
        height: Math.max(1, touch.radiusY ? touch.radiusY * 2 : 1),
        pressure: touch.force || 0.5,
        button: type === "pointerdown" ? 0 : -1,
        buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
        bubbles: true,
        cancelable: true
      });
    } catch (error) {
      pointerEvent = {
        pointerId: touch.identifier + 10000,
        pointerType: "touch",
        isPrimary: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        width: Math.max(1, touch.radiusX ? touch.radiusX * 2 : 1),
        height: Math.max(1, touch.radiusY ? touch.radiusY * 2 : 1),
        pressure: touch.force || 0.5,
        button: type === "pointerdown" ? 0 : -1,
        buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
        preventDefault() {},
        getCoalescedEvents() { return [this]; }
      };
    }

    return pointerEvent;
  }

  function shouldUseTouchFallback(event) {
    if (document.body.classList.contains("cah-submit-modal-open")) return false;
    if (!window.startDrawing || !window.draw || !window.stopDrawing) return false;
    if (event.touches && event.touches.length > 1) return false;
    return true;
  }

  function handleTouchStart(event) {
    if (!shouldUseTouchFallback(event)) return;
    const touch = getPrimaryTouch(event);
    if (!touch) return;

    fallbackTouchActive = true;
    fallbackTouchIdentifier = touch.identifier;
    lastTouchFrameTime = 0;

    event.preventDefault();
    window.startDrawing(makeTouchPointerEvent("pointerdown", touch));
  }

  function handleTouchMove(event) {
    if (!fallbackTouchActive || !shouldUseTouchFallback(event)) return;
    const touch = getPrimaryTouch(event);
    if (!touch) return;

    event.preventDefault();

    const now = performance.now();
    if (now - lastTouchFrameTime < 4) return;
    lastTouchFrameTime = now;

    window.draw(makeTouchPointerEvent("pointermove", touch));
  }

  function handleTouchEnd(event) {
    if (!fallbackTouchActive) return;
    const touch = getPrimaryTouch(event) || (event.changedTouches && event.changedTouches[0]);
    if (!touch) return;

    event.preventDefault();
    window.stopDrawing(makeTouchPointerEvent("pointerup", touch));

    fallbackTouchActive = false;
    fallbackTouchIdentifier = null;
    lastTouchFrameTime = 0;
  }

  function installPointerRawUpdate() {
    if (!window.draw || !("onpointerrawupdate" in window)) return;

    viewport.addEventListener(
      "pointerrawupdate",
      function (event) {
        if (event.pointerType !== "pen" && event.pointerType !== "touch") return;
        window.draw(event);
      },
      { passive: false }
    );
  }

  function preventPointerLeaveStrokeDrops() {
    if (window.stopDrawing) {
      viewport.removeEventListener("pointerleave", window.stopDrawing);
    }
  }

  function installTouchFallback() {
    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false });
  }

  updateBuildNumber();
  injectPerformanceStyles();
  preventPointerLeaveStrokeDrops();
  installPointerRawUpdate();
  installTouchFallback();
})();
