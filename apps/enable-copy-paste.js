export default async function unlockSelection() {
  // 1. Force-enable text selection via CSS override
  document.querySelectorAll('*').forEach(el => {
    el.style.userSelect = 'text';
    el.style.webkitUserSelect = 'text';
    el.style.msUserSelect = 'text';
    el.style.MozUserSelect = 'text';
    el.style.pointerEvents = el.style.pointerEvents === 'none' ? 'none' : 'auto';
  });

  // 2. Remove blocking event handlers on document/body
  ['copy','cut','paste','contextmenu','selectstart','mousedown','mouseup','mousemove','keydown','keypress'].forEach(evt => {
    document.addEventListener(evt, e => e.stopPropagation(), true);
  });

  document.onselectstart = null;
  document.onmousedown = null;
  document.oncontextmenu = null;
  document.body.onselectstart = null;
  document.body.onmousedown = null;
  document.body.oncontextmenu = null;

  // 3. Remove inline "on*" event attributes from all elements
  document.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // 4. Try to remove overlays blocking selection
  document.querySelectorAll('div,span').forEach(el => {
    const style = getComputedStyle(el);
    if (['fixed', 'absolute'].includes(style.position) && style.zIndex > 1000) {
      el.style.pointerEvents = 'none';
    }
  });

  console.log("✓ Text selection unlocked (as much as possible).");
};
