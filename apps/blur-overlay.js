export default async function addBlurOverlay() {
  const STYLE_ID = 'blur-rect-overlay-styles';
  const OVERLAY_CLASS = 'blur-rect-overlay';

  // Add shared styles only once
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${OVERLAY_CLASS} {
        position: fixed;
        left: 10vw;
        top: 10vh;
        width: 40vw;
        height: 30vh;
        z-index: 999999;
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 2px solid rgba(255,255,255,0.6);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        user-select: none;
        box-sizing: border-box;
      }

      .${OVERLAY_CLASS} .handle {
        position: absolute;
        width: 12px;
        height: 12px;
        z-index: 2;
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(0,0,0,0.25);
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }

      .${OVERLAY_CLASS} .h-nw {
        left: -6px;
        top: -6px;
        cursor: nwse-resize;
      }

      .${OVERLAY_CLASS} .h-ne {
        right: -6px;
        top: -6px;
        cursor: nesw-resize;
      }

      .${OVERLAY_CLASS} .h-sw {
        left: -6px;
        bottom: -6px;
        cursor: nesw-resize;
      }

      .${OVERLAY_CLASS} .h-se {
        right: -6px;
        bottom: -6px;
        cursor: nwse-resize;
      }

      .${OVERLAY_CLASS} .h-n {
        left: 50%;
        top: -7px;
        transform: translateX(-50%);
        cursor: ns-resize;
      }

      .${OVERLAY_CLASS} .h-s {
        left: 50%;
        bottom: -7px;
        transform: translateX(-50%);
        cursor: ns-resize;
      }

      .${OVERLAY_CLASS} .h-w {
        left: -7px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }

      .${OVERLAY_CLASS} .h-e {
        right: -7px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }

      .${OVERLAY_CLASS} .titlebar {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 36px;
        border-radius: 10px 10px 0 0;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,0.35),
          rgba(255,255,255,0.1)
        );
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        font: 500 13px system-ui;
        color: #222;
        box-sizing: border-box;
      }

      .${OVERLAY_CLASS} .close {
        width: 22px;
        height: 22px;
        padding: 0;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
        display: grid;
        place-items: center;
        border: 1px solid rgba(0,0,0,0.2);
        cursor: pointer;
        font: inherit;
        color: inherit;
      }

      .${OVERLAY_CLASS} .close:hover {
        background: #fff;
      }
    `;

    document.head.appendChild(style);
  }

  const existingCount =
    document.querySelectorAll(`.${OVERLAY_CLASS}`).length;

  const box = document.createElement('div');
  box.className = OVERLAY_CLASS;

  // Slightly offset each new rectangle
  const offset = existingCount * 24;
  box.style.left = `calc(10vw + ${offset}px)`;
  box.style.top = `calc(10vh + ${offset}px)`;

  const titlebar = document.createElement('div');
  titlebar.className = 'titlebar';

  const titleText = document.createElement('span');
  titleText.textContent = `Blur Overlay ${existingCount + 1}`;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Remove overlay';
  closeBtn.setAttribute('aria-label', 'Remove blur overlay');

  titlebar.append(titleText, closeBtn);
  box.appendChild(titlebar);

  ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].forEach((direction) => {
    const handle = document.createElement('div');
    handle.className = `handle h-${direction}`;
    handle.dataset.dir = direction;
    box.appendChild(handle);
  });

  document.body.appendChild(box);

  let dragging = false;
  let resizing = false;
  let direction = null;

  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let startWidth = 0;
  let startHeight = 0;

  const MIN_WIDTH = 60;
  const MIN_HEIGHT = 60;

  function bringToFront() {
    const overlays = [...document.querySelectorAll(`.${OVERLAY_CLASS}`)];
    const highestZIndex = Math.max(
      999999,
      ...overlays.map((overlay) => Number(getComputedStyle(overlay).zIndex) || 0)
    );

    box.style.zIndex = String(highestZIndex + 1);
  }

  function onMouseDownDrag(event) {
    if (
      event.target.closest('.handle') ||
      event.target.closest('.close')
    ) {
      return;
    }

    bringToFront();

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;

    const rect = box.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    document.addEventListener('mousemove', onMouseMoveDrag);
    document.addEventListener('mouseup', onMouseUp);

    event.preventDefault();
  }

  function onMouseMoveDrag(event) {
    if (!dragging) return;

    const nextLeft = startLeft + event.clientX - startX;
    const nextTop = startTop + event.clientY - startY;

    box.style.left = `${Math.max(0, nextLeft)}px`;
    box.style.top = `${Math.max(0, nextTop)}px`;
  }

  function onMouseDownResize(event) {
    const handle = event.target.closest('.handle');
    if (!handle) return;

    bringToFront();

    resizing = true;
    direction = handle.dataset.dir;

    const rect = box.getBoundingClientRect();

    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    startWidth = rect.width;
    startHeight = rect.height;

    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUp);

    event.preventDefault();
    event.stopPropagation();
  }

  function onMouseMoveResize(event) {
    if (!resizing || !direction) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;

    if (direction.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, startWidth + dx);
    }

    if (direction.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, startHeight + dy);
    }

    if (direction.includes('w')) {
      newWidth = Math.max(MIN_WIDTH, startWidth - dx);
      newLeft = startLeft + (startWidth - newWidth);
    }

    if (direction.includes('n')) {
      newHeight = Math.max(MIN_HEIGHT, startHeight - dy);
      newTop = startTop + (startHeight - newHeight);
    }

    box.style.left = `${Math.max(0, newLeft)}px`;
    box.style.top = `${Math.max(0, newTop)}px`;
    box.style.width = `${newWidth}px`;
    box.style.height = `${newHeight}px`;
  }

  function onMouseUp() {
    dragging = false;
    resizing = false;
    direction = null;

    document.removeEventListener('mousemove', onMouseMoveDrag);
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return;

    const overlays = [...document.querySelectorAll(`.${OVERLAY_CLASS}`)];
    const topOverlay = overlays.reduce((current, overlay) => {
      if (!current) return overlay;

      const currentZ = Number(getComputedStyle(current).zIndex) || 0;
      const overlayZ = Number(getComputedStyle(overlay).zIndex) || 0;

      return overlayZ >= currentZ ? overlay : current;
    }, null);

    if (topOverlay === box) cleanup();
  }

  function cleanup() {
    onMouseUp();

    titlebar.removeEventListener('mousedown', onMouseDownDrag);
    box.removeEventListener('mousedown', onMouseDownResize);
    box.removeEventListener('mousedown', bringToFront);
    closeBtn.removeEventListener('click', cleanup);
    document.removeEventListener('keydown', onKeyDown);

    box.remove();

    // Remove shared styles when no overlays remain
    if (!document.querySelector(`.${OVERLAY_CLASS}`)) {
      document.getElementById(STYLE_ID)?.remove();
    }
  }

  titlebar.addEventListener('mousedown', onMouseDownDrag);
  box.addEventListener('mousedown', onMouseDownResize);
  box.addEventListener('mousedown', bringToFront);
  closeBtn.addEventListener('click', cleanup);
  document.addEventListener('keydown', onKeyDown);

  bringToFront();

  await Promise.resolve();

  return {
    element: box,
    remove: cleanup
  };
}