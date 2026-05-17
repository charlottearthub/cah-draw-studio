/* ═══════════════════════════════════════════════════════════════════════════════
   CHARLOTTE ART HUB — DRAW STUDIO UI LOCK PATCH
   Revision: 0.4.1

   WHAT THIS DOES:
   • Leaves pinch zoom and two-finger rotate alone.
   • Repairs panels that load partly off screen.
   • Keeps panels inside the visible app shell after resize/orientation changes.
   • Strengthens no-text-selection behavior across the studio UI.
   • Polishes the full-screen submit modal without changing the drawing engine.
═══════════════════════════════════════════════════════════════════════════════ */

(function () {
  const PANEL_STORAGE_KEY = "cahDrawStudioPanelStateV11";
  const APP_BUILD = "Build 0.4.1";

  function injectUiLockStyles() {
    const style = document.createElement("style");
    style.id = "cah-draw-ui-lock-patch";
    style.textContent = `
      html,
      body,
      .cah-draw-app,
      .cah-draw-shell,
      .cah-panel,
      .cah-panel *,
      .cah-tool-rail,
      .cah-tool-rail *,
      .cah-nav-gizmo,
      .cah-nav-gizmo *,
      .cah-canvas-area,
      .cah-canvas-viewport,
      .cah-canvas-stage,
      .cah-layer-stack {
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      input,
      textarea,
      select,
      input *,
      textarea *,
      select * {
        -webkit-user-select: text !important;
        user-select: text !important;
      }

      .cah-panel-title,
      .cah-panel-title-row {
        cursor: move;
      }

      .cah-app-bar .cah-panel-title,
      .cah-app-bar .cah-panel-title-row {
        cursor: default;
      }

      .cah-submit-modal {
        z-index: 999999 !important;
        padding: 14px !important;
      }

      body.cah-submit-modal-open {
        overflow: hidden !important;
      }

      .cah-submit-modal-backdrop {
        background: rgba(0, 0, 0, 0.78) !important;
      }

      .cah-submit-modal-card {
        width: min(980px, calc(100vw - 28px)) !important;
        max-height: calc(100vh - 28px) !important;
        border-radius: 16px !important;
      }

      .cah-submit-modal-header {
        position: sticky;
        top: 0;
        z-index: 5;
        margin: -16px -16px 12px;
        padding: 16px;
        background:
          radial-gradient(circle at 12% 10%, rgba(105, 151, 240, 0.12), transparent 26%),
          linear-gradient(180deg, rgba(28, 28, 28, 0.98), rgba(16, 16, 16, 0.96));
        border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      }

      .cah-modal-close {
        font-size: 18px !important;
      }

      @media (max-width: 720px) {
        .cah-submit-modal {
          padding: 8px !important;
        }

        .cah-submit-modal-card {
          width: calc(100vw - 16px) !important;
          max-height: calc(100vh - 16px) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getShell() {
    return document.querySelector(".cah-draw-shell");
  }

  function getPanels() {
    return Array.from(document.querySelectorAll(".cah-panel[data-panel]"));
  }

  function panelIsPositioned(panel) {
    return Boolean(panel.style.left || panel.style.top || panel.style.right || panel.style.bottom);
  }

  function clampPanel(panel) {
    const shell = getShell();
    if (!shell || !panel) return;

    const shellRect = shell.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    if (!shellRect.width || !shellRect.height || !panelRect.width || !panelRect.height) return;

    const margin = 6;
    const maxLeft = Math.max(margin, shellRect.width - Math.min(panelRect.width, shellRect.width - margin * 2) - margin);
    const maxTop = Math.max(margin, shellRect.height - Math.min(panelRect.height, shellRect.height - margin * 2) - margin);

    const currentLeft = panelRect.left - shellRect.left;
    const currentTop = panelRect.top - shellRect.top;

    const isOffLeft = currentLeft < margin;
    const isOffTop = currentTop < margin;
    const isOffRight = currentLeft + panelRect.width > shellRect.width - margin;
    const isOffBottom = currentTop + panelRect.height > shellRect.height - margin;

    if (!isOffLeft && !isOffTop && !isOffRight && !isOffBottom) return;

    const nextLeft = Math.min(Math.max(currentLeft, margin), maxLeft);
    const nextTop = Math.min(Math.max(currentTop, margin), maxTop);

    panel.style.left = nextLeft + "px";
    panel.style.top = nextTop + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function repairPanels() {
    getPanels().forEach((panel) => {
      if (!panelIsPositioned(panel)) {
        clampPanel(panel);
        return;
      }
      clampPanel(panel);
    });
  }

  function hardRepairBadStoredPanels() {
    let stored = null;

    try {
      stored = JSON.parse(localStorage.getItem(PANEL_STORAGE_KEY));
    } catch (error) {
      stored = null;
    }

    if (!stored || !stored.panelState) return;

    const shell = getShell();
    if (!shell) return;

    const shellRect = shell.getBoundingClientRect();
    let needsStorageReset = false;

    Object.values(stored.panelState).forEach((state) => {
      if (!state) return;
      const left = parseFloat(state.left || "0");
      const top = parseFloat(state.top || "0");

      if (
        Number.isFinite(left) &&
        (left < -20 || left > shellRect.width + 20)
      ) {
        needsStorageReset = true;
      }

      if (
        Number.isFinite(top) &&
        (top < -20 || top > shellRect.height + 20)
      ) {
        needsStorageReset = true;
      }
    });

    if (needsStorageReset) {
      localStorage.removeItem(PANEL_STORAGE_KEY);
      if (typeof window.resetPanels === "function") {
        window.resetPanels();
      }
    }
  }

  function preventUiSelection() {
    document.addEventListener("selectstart", (event) => {
      const target = event.target;
      if (!target) return;
      const isTypingField = target.closest("input, textarea, select");
      if (isTypingField) return;
      if (target.closest(".cah-draw-app")) event.preventDefault();
    });

    document.addEventListener("dragstart", (event) => {
      if (event.target && event.target.closest(".cah-draw-app")) {
        event.preventDefault();
      }
    });
  }

  function wireSubmitModalSafety() {
    const modal = document.getElementById("submitModal");
    const backdrop = modal ? modal.querySelector(".cah-submit-modal-backdrop") : null;

    if (backdrop && typeof window.closeSubmitModal === "function") {
      backdrop.addEventListener("click", window.closeSubmitModal);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!document.body.classList.contains("cah-submit-modal-open")) return;
      if (typeof window.closeSubmitModal === "function") window.closeSubmitModal();
    });
  }

  function updateBuildNumber() {
    const buildNumber = document.getElementById("buildNumber");
    if (buildNumber) buildNumber.textContent = APP_BUILD;
  }

  function boot() {
    injectUiLockStyles();
    updateBuildNumber();
    preventUiSelection();
    wireSubmitModalSafety();

    window.requestAnimationFrame(() => {
      hardRepairBadStoredPanels();
      repairPanels();
    });

    window.setTimeout(repairPanels, 350);
    window.addEventListener("resize", () => window.requestAnimationFrame(repairPanels));
    window.addEventListener("orientationchange", () => window.setTimeout(repairPanels, 250));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
