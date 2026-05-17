(function () {
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = "Build 0.4.4";

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
    console.warn("CAH input patch failed", error);
  }
})();
