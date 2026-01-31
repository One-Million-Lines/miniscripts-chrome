export default async function addBlurOverlay() {
  if (document.getElementById('blur-rect-overlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #blur-rect-overlay{position:fixed;left:10vw;top:10vh;width:40vw;height:30vh;z-index:999999;
    background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border:2px solid rgba(255,255,255,0.6);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.25);
    cursor:move;user-select:none}
    #blur-rect-overlay .handle{position:absolute;width:12px;height:12px;background:rgba(255,255,255,0.9);
    border:1px solid rgba(0,0,0,0.25);border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2)}
    .h-nw{left:-6px;top:-6px;cursor:nwse-resize}.h-ne{right:-6px;top:-6px;cursor:nesw-resize}
    .h-sw{left:-6px;bottom:-6px;cursor:nesw-resize}.h-se{right:-6px;bottom:-6px;cursor:nwse-resize}
    .h-n{left:50%;top:-7px;transform:translateX(-50%);cursor:ns-resize}
    .h-s{left:50%;bottom:-7px;transform:translateX(-50%);cursor:ns-resize}
    .h-w{left:-7px;top:50%;transform:translateY(-50%);cursor:ew-resize}
    .h-e{right:-7px;top:50%;transform:translateY(-50%);cursor:ew-resize}
    .titlebar{position:absolute;left:0;right:0;top:0;height:36px;border-top-left-radius:12px;border-top-right-radius:12px;
    background:linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0.1));cursor:move;display:flex;
    align-items:center;justify-content:space-between;padding:0 10px;font:500 13px system-ui;color:#222}
    .titlebar .close{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.95);display:grid;place-items:center;
    border:1px solid rgba(0,0,0,0.2);cursor:pointer}
    .titlebar .close:hover{background:#fff}
  `;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'blur-rect-overlay';

  const titlebar = document.createElement('div');
  titlebar.className = 'titlebar';
  const titleText = document.createElement('span'); titleText.textContent = 'MiniApps Blur Overlay';
  const closeBtn = document.createElement('div'); closeBtn.className = 'close'; closeBtn.textContent = '✕';
  titlebar.appendChild(titleText); titlebar.appendChild(closeBtn); box.appendChild(titlebar);

  ['nw','ne','sw','se','n','s','w','e'].forEach(d => {
    const h = document.createElement('div'); h.className = 'handle h-'+d; h.dataset.dir = d; box.appendChild(h);
  });

  document.body.appendChild(box);

  let dragging=false,resizing=false,dir=null,startX=0,startY=0,startLeft=0,startTop=0,startW=0,startH=0;
  const px = v => Math.max(0, v);

  function onMouseDownDrag(e){
    if (e.target.classList.contains('handle')) return;
    dragging=true; startX=e.clientX; startY=e.clientY;
    const r=box.getBoundingClientRect(); startLeft=r.left; startTop=r.top;
    document.addEventListener('mousemove', onMouseMoveDrag);
    document.addEventListener('mouseup', onMouseUpCommon); e.preventDefault();
  }
  function onMouseMoveDrag(e){
    if(!dragging) return;
    box.style.left = px(startLeft + (e.clientX-startX)) + 'px';
    box.style.top  = px(startTop  + (e.clientY-startY)) + 'px';
  }
  function onMouseDownResize(e){
    const handle = e.target; if(!handle.classList.contains('handle')) return;
    resizing=true; dir=handle.dataset.dir;
    const r=box.getBoundingClientRect(); startX=e.clientX; startY=e.clientY;
    startLeft=r.left; startTop=r.top; startW=r.width; startH=r.height;
    document.addEventListener('mousemove', onMouseMoveResize);
    document.addEventListener('mouseup', onMouseUpCommon); e.preventDefault(); e.stopPropagation();
  }
  function onMouseMoveResize(e){
    if(!resizing||!dir) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    let newLeft=startLeft, newTop=startTop, newW=startW, newH=startH;
    if (dir.indexOf('e')>-1) newW=Math.max(60,startW+dx);
    if (dir.indexOf('s')>-1) newH=Math.max(60,startH+dy);
    if (dir.indexOf('w')>-1){ newW=Math.max(60,startW-dx); newLeft=startLeft+dx; }
    if (dir.indexOf('n')>-1){ newH=Math.max(60,startH-dy); newTop=startTop+dy; }
    box.style.width=newW+'px'; box.style.height=newH+'px';
    box.style.left=newLeft+'px'; box.style.top=newTop+'px';
  }
  function onMouseUpCommon(){
    dragging=false; resizing=false; dir=null;
    document.removeEventListener('mousemove', onMouseMoveDrag);
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpCommon);
  }

  titlebar.addEventListener('mousedown', onMouseDownDrag);
  box.addEventListener('mousedown', onMouseDownResize);

  function onKey(e){ if(e.key==='Escape'){ cleanup(); } }
  function cleanup(){
    box.remove(); style.remove(); document.removeEventListener('keydown', onKey);
  }
  closeBtn.addEventListener('click', cleanup);
  document.addEventListener('keydown', onKey);

  // example async step (optional): await something if you need
  await Promise.resolve();

  // return a tiny API you can use later
  return { element: box, remove: cleanup };
};

