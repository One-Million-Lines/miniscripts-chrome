export default async function run(ctx) {
  const doc = ctx.document;
  const saved = await ctx.storage.get("overlayState", {});
  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const state = {
    width: Math.min(Math.max(100, finite(saved.width, 300)), Math.max(100, innerWidth)),
    height: Math.min(Math.max(100, finite(saved.height, 200)), Math.max(100, innerHeight)),
    x: Math.max(0, Math.min(finite(saved.x, 100), Math.max(0, innerWidth - 100))),
    y: Math.max(0, Math.min(finite(saved.y, 100), Math.max(0, innerHeight - 100))),
  };
  // Re-running replaces the previous overlay and tears down its listeners.
  doc.getElementById("miniapp-blur-overlay")?.dispatchEvent(new Event("miniscripts-remove"));
  const controller = new AbortController();
  const listen = (target, name, fn) => target.addEventListener(name, fn, { signal: controller.signal });
  const overlay = doc.createElement("div");
  overlay.id = "miniapp-blur-overlay";
  overlay.setAttribute("aria-label", "Draggable blur overlay");
  overlay.style.cssText = `position:fixed;box-sizing:border-box;left:${state.x}px;top:${state.y}px;width:${state.width}px;height:${state.height}px;backdrop-filter:blur(6px);background:#0002;border:2px solid #ffffff80;border-radius:8px;cursor:move;z-index:2147483646;box-shadow:0 4px 12px #0003;touch-action:none;`;
  const handle = doc.createElement("div");
  handle.setAttribute("aria-label", "Resize blur overlay");
  handle.style.cssText = "position:absolute;bottom:0;right:0;width:22px;height:22px;cursor:se-resize;background:linear-gradient(135deg,transparent 50%,#ffffff80 50%);";
  const close = doc.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Remove blur overlay");
  close.style.cssText = "position:absolute;top:2px;right:5px;color:white;background:#0005;border:0;border-radius:4px;font:24px/1 system-ui;cursor:pointer;";
  overlay.append(handle, close);
  let drag = null;
  const remove = () => { controller.abort(); overlay.remove(); };
  listen(overlay, "miniscripts-remove", remove);
  listen(close, "click", remove);
  listen(doc, "keydown", event => { if (event.key === "Escape") remove(); });
  listen(overlay, "pointerdown", event => {
    if (event.button !== 0 || event.target === close) return;
    drag = { x: event.clientX, y: event.clientY, ...state, resize: event.target === handle };
    // Preserve pointer coordinates separately from the overlay's saved coordinates.
    drag.pointerX = event.clientX; drag.pointerY = event.clientY;
    overlay.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  listen(overlay, "pointermove", event => {
    if (!drag) return;
    const dx = event.clientX - drag.pointerX, dy = event.clientY - drag.pointerY;
    if (drag.resize) {
      state.width = Math.max(100, Math.min(drag.width + dx, innerWidth - state.x));
      state.height = Math.max(100, Math.min(drag.height + dy, innerHeight - state.y));
      overlay.style.width = `${state.width}px`; overlay.style.height = `${state.height}px`;
    } else {
      state.x = Math.max(0, Math.min(drag.x + dx, innerWidth - 40));
      state.y = Math.max(0, Math.min(drag.y + dy, innerHeight - 40));
      overlay.style.left = `${state.x}px`; overlay.style.top = `${state.y}px`;
    }
  });
  const finish = () => {
    if (!drag) return;
    drag = null;
    void ctx.storage.set("overlayState", state).catch(error => ctx.ui.notify(`Could not save overlay position: ${error}`));
  };
  listen(overlay, "pointerup", finish);
  listen(overlay, "pointercancel", finish);
  listen(overlay, "lostpointercapture", finish);
  (doc.body || doc.documentElement).append(overlay);
  ctx.ui.notify("Blur overlay added. Drag to move, resize from corner, Esc to remove.");
}
