export default async function run(ctx) {
  if (!/(^|\.)linkedin\.com$/i.test(location.hostname)) {
    throw new Error("LinkedIn Image Paste works on linkedin.com. Open LinkedIn, then run it again.");
  }
  window.LinkedInImagePaste?.disable();

  const EDITOR = '[contenteditable="true"], [contenteditable="plaintext-only"], textarea';
  const CONTROL = 'button,[role="button"],label';
  const originals = [];
  let pending = null, panel = null, panelTimer = null;
  const controller = new AbortController();
  const listen = (target, event, fn) => target.addEventListener(event, fn, {
    capture: true, signal: controller.signal
  });
  const visible = el => el.isConnected && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden';
  const label = el => [el.getAttribute('aria-label'), el.getAttribute('title'),
    el.textContent, ...[...el.querySelectorAll('[aria-label]')].map(n => n.getAttribute('aria-label'))]
    .filter(Boolean).join(' ').trim();
  function imageControl(el) {
    if (!visible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el instanceof HTMLButtonElement && el.form && el.type === 'submit') return false;
    const text = label(el);
    // Never infer a submit/publish action from a generic icon or a '+' button.
    if (/\b(post|publish|send|save|schedule|remove|delete|cover|background|profile)\b/i.test(text)) return false;
    return /^(media|photo|image|add (a )?(photo|image)|upload (an? )?(photo|image)|upload from computer|select files|upload photos?\/videos?)$/i.test(text) ||
      (/\b(add|insert|upload|attach|select)\b.*\b(image|photo|picture|media)\b/i.test(text)) ||
      (!text && !!el.querySelector('svg[id^="image-"],svg[id^="camera-"],use[href*="image-"]'));
  }
  const controls = root => [...root.querySelectorAll(CONTROL)].filter(imageControl);
  function scopeFor(editor) {
    // Find the smallest local container holding this editor and an attachment control.
    // Do not reach out into another comment or the global feed toolbar.
    for (let el = editor.parentElement; el && el !== document.body; el = el.parentElement) {
      if (el.querySelectorAll(EDITOR).length > 1) break;
      if (controls(el).length) return el;
      if (el.matches('[role="dialog"],dialog,form')) return el;
    }
    return editor.parentElement;
  }
  function notify(message, cancellable = false) {
    clearTimeout(panelTimer);
    panel?.remove();
    panel = document.createElement('div');
    panel.dataset.linkedinImagePaste = 'status';
    panel.setAttribute('role', 'status');
    panel.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;max-width:370px;padding:16px;border:1px solid #53718a;border-radius:12px;background:#162638;color:white;font:14px/1.5 system-ui;box-shadow:0 8px 30px #0005;';
    const text = document.createElement('div');
    text.textContent = message;
    panel.append(text);
    if (cancellable) {
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'Cancel pasted image';
      cancel.style.cssText = 'margin-top:10px;padding:5px 10px;cursor:pointer;color:#162638;background:white;border:0;border-radius:4px;';
      cancel.addEventListener('click', () => clear('Pasted image cancelled.'));
      panel.append(cancel);
    } else panelTimer = setTimeout(() => { panel?.remove(); panel = null; }, 6500);
    (document.body || document.documentElement).append(panel);
  }
  function clear(message) {
    if (pending) clearTimeout(pending.timer);
    pending = null;
    if (message) notify(message);
  }
  function current() {
    if (!pending) return null;
    if (pending.url !== location.href || Date.now() > pending.expires) {
      clear('Pasted image expired. Paste again in the intended editor.');
      return null;
    }
    return pending;
  }
  function accepts(input, file) {
    const accept = input.accept.toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    return !accept.length || accept.some(a => a === '*/*' || a === file.type.toLowerCase() ||
      (a.endsWith('/*') && file.type.toLowerCase().startsWith(a.slice(0, -1))) ||
      (a.startsWith('.') && file.name.toLowerCase().endsWith(a)));
  }
  function eligible(input, p) {
    return input instanceof HTMLInputElement && input.type === 'file' && !input.disabled &&
      (!input.files?.length) && p.files.every(file => accepts(input, file)) &&
      (p.scope.contains(input) || p.armedUntil > Date.now());
  }
  function deliver(input) {
    const p = current();
    if (!p || !eligible(input, p)) return false;
    if (p.files.length > 1 && !input.multiple) {
      clear('This uploader accepts one image. Copy and paste one image at a time.');
      return false;
    }
    try {
      // Copy into a fresh DataTransfer: clipboard-backed FileLists expire after paste.
      const transfer = new DataTransfer();
      for (const file of p.files) transfer.items.add(file);
      input.files = transfer.files;
      clear(); // Prevent reentrant handlers or double-clicks from uploading twice.
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      notify('Image handed to LinkedIn’s uploader. Check the preview, then finish the post or comment yourself.');
      return true;
    } catch (error) {
      console.warn('[LinkedIn Image Paste]', error);
      clear('This uploader could not accept the pasted image. Use LinkedIn’s normal file upload.');
      return false;
    }
  }
  // Intercept the site's real file-input activation, including detached inputs.
  // MAIN world is essential: an isolated extension/userscript world cannot patch it.
  function patch(proto, name) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor?.value) return;
    const original = descriptor.value;
    function wrapped(...args) {
      if (deliver(this)) return;
      return Reflect.apply(original, this, args);
    }
    Object.defineProperty(proto, name, { ...descriptor, value: wrapped });
    originals.push(() => {
      if (proto[name] === wrapped) Object.defineProperty(proto, name, descriptor);
    });
  }
  patch(HTMLElement.prototype, 'click');
  patch(HTMLInputElement.prototype, 'showPicker');

  listen(document, 'click', event => {
    const p = current();
    if (!p) return;
    const el = event.target instanceof Element ? event.target : null;
    if (!el || panel?.contains(el)) return;
    if (el.matches('input[type="file"]') && deliver(el)) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    const control = el.closest(CONTROL);
    if (control && imageControl(control)) {
      const dialog = control.closest('[role="dialog"],dialog');
      if (p.scope.contains(control) || (p.opened && dialog && !p.oldDialogs.has(dialog))) {
        p.armedUntil = Date.now() + 5000;
        p.opened = true;
      } else clear('Image cancelled because a different upload form was selected. Paste again there.');
      return;
    }
    // Navigating or choosing unrelated actions cancels the cached file.
    if (el.closest('a[href]') || (control && !p.scope.contains(control) &&
        !control.closest('[role="dialog"],dialog'))) clear('Pasted image cancelled.');
  });
  listen(document, 'focusin', event => {
    const p = current();
    const editor = event.target instanceof Element && event.target.closest(EDITOR);
    if (p && editor && editor !== p.editor) clear('Pasted image cancelled: another editor was focused.');
  });
  listen(document, 'keydown', event => { if (event.key === 'Escape' && pending) clear('Pasted image cancelled.'); });
  listen(window, 'pagehide', () => clear());
  listen(document, 'paste', event => {
    const editor = event.target instanceof Element && event.target.closest(EDITOR);
    if (!editor || !visible(editor)) return;
    if (/title|headline|subject/i.test(editor.getAttribute('aria-label') || '') || editor.closest('h1')) return;
    // Search fields, titles, and unrelated text inputs are deliberately excluded.
    if (editor.matches('textarea') && !/comment|article|post/i.test([
      editor.getAttribute('aria-label'), editor.placeholder, editor.className].join(' '))) return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    let files = [...clipboard.files].filter(file => file.type.startsWith('image/'));
    if (!files.length) files = [...clipboard.items].filter(item => item.kind === 'file' &&
      item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (!files.length) return; // Ordinary text paste is untouched.
    const scope = scopeFor(editor);
    // Do not hijack messaging, search, or other unsupported editors.
    const article = /\/article\//.test(location.pathname) || /publishing/.test(location.pathname);
    if (!scope || (!controls(scope).length && !article &&
        !/share|comment|post/i.test(editor.outerHTML.slice(0,600)))) return;
    event.preventDefault(); event.stopImmediatePropagation();
    clear();
    const stamp = Date.now();
    files = files.map((file, i) => {
      const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type] || 'img';
      return new File([file], /\.[a-z0-9]{2,5}$/i.test(file.name) ? file.name : `clipboard-${stamp}-${i+1}.${ext}`, {type:file.type});
    });
    const p = pending = { files, editor, scope, url: location.href,
      expires: stamp + 60000, armedUntil: 0, opened: false,
      oldDialogs: new Set(document.querySelectorAll('[role="dialog"],dialog')) };
    p.timer = setTimeout(() => { if (pending === p) clear('Pasted image expired. Paste again to retry.'); }, 60000);
    notify('Image ready. If no preview appears, click this editor’s image / Media button, then Upload from computer. The pasted image replaces the file picker. Cancel or press Esc to discard it.', true);
    const inputs = [...scope.querySelectorAll('input[type="file"]')].filter(input => eligible(input, p));
    if (inputs.length === 1 && deliver(inputs[0])) return;
    if (pending !== p) return;
    const buttons = controls(scope);
    // With one unambiguous local attachment button, open its native upload flow.
    // Article toolbars may have a separate cover picker: leave ambiguous choices to user.
    if (buttons.length === 1) {
      p.opened = true; p.armedUntil = Date.now() + 5000;
      try { buttons[0].click(); } catch (error) { console.warn('[LinkedIn Image Paste]', error); }
    }
  });
  window.LinkedInImagePaste = Object.freeze({
    version: '1.0.0',
    cancel: () => clear('Pasted image cancelled.'),
    disable() {
      clear(); controller.abort(); originals.reverse().forEach(restore => restore());
      clearTimeout(panelTimer); panel?.remove(); panel = null;
      delete window.LinkedInImagePaste;
    }
  });
  ctx.ui.notify("LinkedIn Image Paste active. Copy an image and paste it into any LinkedIn editor.");
}
