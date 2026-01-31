import { MiniAppContext } from "../shared/types";

export default async function run(ctx: MiniAppContext): Promise<void> {
  // Load saved position and size
  const savedState = await ctx.storage.get<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>("overlayState", {
    x: 100,
    y: 100,
    width: 300,
    height: 200,
  });

  // Create overlay
  const overlay = ctx.document.createElement("div");
  overlay.id = "miniapp-blur-overlay";
  overlay.style.cssText = `
    position: fixed;
    left: ${savedState.x}px;
    top: ${savedState.y}px;
    width: ${savedState.width}px;
    height: ${savedState.height}px;
    backdrop-filter: blur(6px);
    background: rgba(0, 0, 0, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    cursor: move;
    z-index: 2147483646;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  `;

  // Add resize handle
  const resizeHandle = ctx.document.createElement("div");
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: se-resize;
    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%);
  `;
  overlay.appendChild(resizeHandle);

  // Add close button
  const closeBtn = ctx.document.createElement("div");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    position: absolute;
    top: 4px;
    right: 8px;
    color: white;
    font-size: 24px;
    cursor: pointer;
    line-height: 1;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  `;
  overlay.appendChild(closeBtn);

  // Dragging
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let overlayStartX = savedState.x;
  let overlayStartY = savedState.y;

  overlay.addEventListener("mousedown", (e) => {
    if (e.target === resizeHandle || e.target === closeBtn) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    overlayStartX = overlay.offsetLeft;
    overlayStartY = overlay.offsetTop;
    e.preventDefault();
  });

  // Resizing
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let startWidth = savedState.width;
  let startHeight = savedState.height;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    startWidth = overlay.offsetWidth;
    startHeight = overlay.offsetHeight;
    e.stopPropagation();
    e.preventDefault();
  });

  ctx.document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      overlay.style.left = `${overlayStartX + dx}px`;
      overlay.style.top = `${overlayStartY + dy}px`;
    } else if (isResizing) {
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      overlay.style.width = `${Math.max(100, startWidth + dx)}px`;
      overlay.style.height = `${Math.max(100, startHeight + dy)}px`;
    }
  });

  ctx.document.addEventListener("mouseup", async () => {
    if (isDragging || isResizing) {
      // Save state
      await ctx.storage.set("overlayState", {
        x: overlay.offsetLeft,
        y: overlay.offsetTop,
        width: overlay.offsetWidth,
        height: overlay.offsetHeight,
      });
    }
    isDragging = false;
    isResizing = false;
  });

  // Close on button click or ESC
  closeBtn.addEventListener("click", () => overlay.remove());

  ctx.document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.remove();
  });

  ctx.document.body.appendChild(overlay);
  ctx.ui.notify("Blur overlay added. Drag to move, resize from corner, ESC to remove.");
}
