/* CHARLOTTE ART HUB — DRAW STUDIO INPUT PATCH
   Revision: 0.4.3
   Safe rollback: removes the iOS touch fallback that caused one-finger canvas panning.
*/

(function () {
  const buildNumber = document.getElementById("buildNumber");
  if (buildNumber) buildNumber.textContent = "Build 0.4.3";

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
      -webkit-tap-highlight-color: transparent !important;
    }

    input,
    textarea,
    select {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);
})();
