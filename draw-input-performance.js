(function () {
  const CAH_DRAW_BUILD = "Build 0.5.3";
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = CAH_DRAW_BUILD;

  const viewport = document.getElementById("canvasViewport");
  const style = document.createElement("style");
  style.textContent = "html,body,.cah-draw-app,.cah-draw-shell,.cah-canvas-area,.cah-canvas-viewport,.cah-canvas-stage,.cah-layer-stack,.cah-layer-stack canvas{touch-action:none!important;overscroll-behavior:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;}input,textarea,select{-webkit-user-select:text!important;user-select:text!important;}";
  document.head.appendChild(style);

  try {
    isLikelyPalm = function (event) {
      if (!event || event.pointerType !== "touch") return false;
      const width = event.width || 1;
      const height = event.height || 1;
      return width >= 72 || height >= 72 || width * height >= 3200;
    };

    shouldRejectTouchDrawing = function (event) {
      if (!event || event.pointerType !== "touch") return false;
      const now = Date.now();
      if (isLikelyPalm(event)) return true;
      if (penHasBeenDetected && now - lastPenInputTime < 1400) return true;
      if (getTouchPointers().length >= 2) return true;
      return false;
    };
  } catch (error) {
    console.warn("CAH touch threshold patch failed", error);
  }

  function clonePointerEvent(event) {
    return {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      clientX: event.clientX,
      clientY: event.clientY,
      width: event.width || 1,
      height: event.height || 1,
      pressure: event.pressure || 0.5,
      button: event.button,
      buttons: event.buttons,
      preventDefault: function () {},
      getCoalescedEvents: function () { return [this]; }
    };
  }

  function installQueuedStrokeProcessor() {
    if (!viewport || typeof window.draw !== "function") return;
    if (window.__cahQueuedStrokeProcessorInstalled) return;
    window.__cahQueuedStrokeProcessorInstalled = true;

    const originalDraw = window.draw;
    const activeTouchPointers = new Set();
    const pointQueue = [];
    let framePending = false;

    function flushQueue() {
      framePending = false;
      const items = pointQueue.splice(0, pointQueue.length);
      for (let i = 0; i < items.length; i += 1) {
        originalDraw(items[i]);
      }
    }

    function queueDraw(event) {
      pointQueue.push(clonePointerEvent(event));
      if (pointQueue.length > 32) {
        flushQueue();
        return;
      }
      if (!framePending) {
        framePending = true;
        requestAnimationFrame(flushQueue);
      }
    }

    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") activeTouchPointers.add(event.pointerId);
    }, { capture: true, passive: true });

    viewport.addEventListener("pointerup", function (event) {
      if (event.pointerType === "touch") activeTouchPointers.delete(event.pointerId);
      if (event.pointerType === "touch" || event.pointerType === "pen") flushQueue();
    }, { capture: true, passive: true });

    viewport.addEventListener("pointercancel", function (event) {
      if (event.pointerType === "touch") activeTouchPointers.delete(event.pointerId);
      if (event.pointerType === "touch" || event.pointerType === "pen") flushQueue();
    }, { capture: true, passive: true });

    window.draw = function (event) {
      if (!event || (event.pointerType !== "touch" && event.pointerType !== "pen")) {
        originalDraw(event);
        return;
      }

      if (event.pointerType === "touch" && activeTouchPointers.size >= 2) {
        flushQueue();
        originalDraw(event);
        return;
      }

      if (event.cancelable) event.preventDefault();
      queueDraw(event);
    };
  }

  installQueuedStrokeProcessor();
})();
