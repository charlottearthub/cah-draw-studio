(function () {
  const CAH_DRAW_MEMBER_BUILD = "Build 0.5.9";
  let memberContext = null;
  let authReady = false;

  function clean(value) {
    return String(value || "").trim();
  }

  function getConfig() {
    return window.CAH_SUPABASE_CONFIG || {};
  }

  function canUseSupabase() {
    const cfg = getConfig();
    return Boolean(window.supabase && cfg.url && cfg.anonKey);
  }

  function getDisplayName(user, profile) {
    return clean(
      profile?.display_name ||
      profile?.full_name ||
      profile?.name ||
      profile?.username ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      ""
    );
  }

  function setStatusPill(text, mode) {
    let pill = document.getElementById("cahDrawMemberStatus");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "cahDrawMemberStatus";
      pill.className = "cah-draw-member-status";
      const headerActions = document.querySelector(".cah-header-actions");
      if (headerActions) headerActions.prepend(pill);
      else document.body.appendChild(pill);
    }
    pill.textContent = text;
    pill.dataset.mode = mode || "guest";
  }

  function injectStyle() {
    if (document.getElementById("cahDrawMemberBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "cahDrawMemberBridgeStyle";
    style.textContent = `
      .cah-draw-member-status {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 30px !important;
        height: 30px !important;
        padding: 0 9px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        background: rgba(255,255,255,.055) !important;
        color: rgba(247,244,237,.74) !important;
        font-size: 10px !important;
        line-height: 1 !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }
      .cah-draw-member-status[data-mode="member"] {
        border-color: rgba(74,222,128,.34) !important;
        background: rgba(34,197,94,.14) !important;
        color: #bbf7d0 !important;
      }
      .cah-draw-member-status[data-mode="guest"] {
        border-color: rgba(250,204,21,.26) !important;
        background: rgba(250,204,21,.08) !important;
        color: #fef3c7 !important;
      }
      .cah-submit-member-note {
        grid-column: 1 / -1;
        border: 1px solid rgba(105,151,240,.22);
        background: rgba(105,151,240,.08);
        color: rgba(247,244,237,.78);
        border-radius: 10px;
        padding: 9px 10px;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }

  async function loadProfile(client, user) {
    try {
      const response = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return response?.data || null;
    } catch (error) {
      return null;
    }
  }

  async function loadMemberContext() {
    injectStyle();

    if (!canUseSupabase()) {
      setStatusPill("Guest", "guest");
      memberContext = null;
      authReady = true;
      return null;
    }

    try {
      const cfg = getConfig();
      const client = window.supabase.createClient(cfg.url, cfg.anonKey);
      const sessionResult = await client.auth.getSession();
      const session = sessionResult?.data?.session;

      if (!session?.user) {
        setStatusPill("Guest", "guest");
        memberContext = null;
        authReady = true;
        return null;
      }

      const profile = await loadProfile(client, session.user);
      memberContext = {
        memberId: session.user.id,
        userId: session.user.id,
        memberEmail: clean(session.user.email),
        memberDisplayName: getDisplayName(session.user, profile),
        profile: profile || null
      };

      window.CAH_DRAW_MEMBER = memberContext;
      setStatusPill("Member", "member");
      authReady = true;
      return memberContext;
    } catch (error) {
      console.warn("CAH Draw member bridge auth check failed", error);
      setStatusPill("Guest", "guest");
      memberContext = null;
      authReady = true;
      return null;
    }
  }

  function getMemberContext() {
    return memberContext || window.CAH_DRAW_MEMBER || null;
  }

  function addSubmitNote() {
    const grid = document.querySelector(".cah-submit-grid");
    if (!grid || document.getElementById("cahSubmitMemberNote")) return;
    const note = document.createElement("div");
    note.id = "cahSubmitMemberNote";
    note.className = "cah-submit-member-note";
    note.textContent = "Member connection: guest submission. Log into Charlotte Art Hub first to link this drawing to your member account.";
    grid.prepend(note);
  }

  function autofillSubmitForm() {
    const member = getMemberContext();
    const artistName = document.getElementById("submitArtistName");
    const contact = document.getElementById("submitContact");
    const note = document.getElementById("cahSubmitMemberNote");

    if (!artistName || !contact) return;

    if (member) {
      if (!artistName.value.trim() && member.memberDisplayName) artistName.value = member.memberDisplayName;
      if (!contact.value.trim() && member.memberEmail) contact.value = member.memberEmail;
      if (note) note.textContent = "Member connected. This drawing will be submitted with your Charlotte Art Hub member ID attached.";
      return;
    }

    if (note) note.textContent = "Member connection: guest submission. Log into Charlotte Art Hub first to link this drawing to your member account.";
  }

  function installSubmitAutofill() {
    addSubmitNote();
    const openButton = document.getElementById("openSubmitModalBtn");
    if (openButton && openButton.dataset.memberBridgeReady !== "true") {
      openButton.dataset.memberBridgeReady = "true";
      openButton.addEventListener("click", function () {
        setTimeout(autofillSubmitForm, 80);
      });
    }
  }

  function installFetchBridge() {
    if (window.__cahDrawMemberFetchBridgeInstalled) return;
    window.__cahDrawMemberFetchBridgeInstalled = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        const method = String(init?.method || "GET").toUpperCase();

        if (method === "POST" && url.includes("/api/drawing-submissions") && init?.body) {
          const body = JSON.parse(init.body);
          const member = getMemberContext();
          const mergedBody = {
            ...body,
            sourceApp: "CAH Draw Studio",
            submissionSource: "draw_studio",
            submissionType: "draw_studio_drawing",
            drawStudioBuild: CAH_DRAW_MEMBER_BUILD
          };

          if (member) {
            mergedBody.memberId = member.memberId;
            mergedBody.userId = member.userId;
            mergedBody.memberEmail = member.memberEmail;
            mergedBody.memberDisplayName = member.memberDisplayName;
          }

          return originalFetch(input, {
            ...init,
            body: JSON.stringify(mergedBody)
          });
        }
      } catch (error) {
        console.warn("CAH Draw member bridge fetch merge skipped", error);
      }

      return originalFetch(input, init);
    };
  }

  function boot() {
    injectStyle();
    installFetchBridge();
    installSubmitAutofill();
    loadMemberContext().then(function () {
      autofillSubmitForm();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
