export default async function run(ctx) {
  // Find all links
  const links = Array.from(ctx.document.querySelectorAll("a[href]"));

  if (links.length === 0) {
    ctx.ui.notify("No links found on this page");
    return;
  }

  // Extract and normalize URLs
  const urls = new Set();
  links.forEach((link) => {
    try {
      const url = new URL(link.href, ctx.window.location.href);
      // Filter out javascript:, mailto:, tel: etc
      if (url.protocol === "http:" || url.protocol === "https:") {
        urls.add(url.href);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  const uniqueUrls = Array.from(urls);

  if (uniqueUrls.length === 0) {
    ctx.ui.notify("No valid HTTP links found");
    return;
  }

  const text = uniqueUrls.join("\n");
  const doc = ctx.document;
  try {
    await ctx.window.navigator.clipboard.writeText(text);
    ctx.ui.notify(`Copied ${uniqueUrls.length} unique links to clipboard`);
  } catch {
    // A side-panel click does not guarantee page clipboard activation. Never
    // claim success unless the browser confirms it; offer a real page gesture.
    doc.getElementById("miniapp-copy-links")?.remove();
    const panel = doc.createElement("div");
    panel.id = "miniapp-copy-links";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Copy page links");
    panel.style.cssText = "position:fixed;inset:15% 10%;padding:20px;background:white;color:#111;border:2px solid #2563eb;border-radius:12px;z-index:2147483647;font:16px/1.5 system-ui;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 50px #0006;";
    const title = doc.createElement("div");
    title.textContent = `${uniqueUrls.length} unique links. Click Copy, or select the text and press Ctrl+C / Cmd+C.`;
    const textarea = doc.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute("aria-label", "Page links");
    textarea.style.cssText = "flex:1;min-height:100px;width:100%;color:#111;background:white;font:14px/1.5 monospace;";
    const copy = doc.createElement("button");
    copy.type = "button"; copy.textContent = "Copy links";
    const close = doc.createElement("button");
    close.type = "button"; close.textContent = "Close";
    close.addEventListener("click", () => panel.remove());
    copy.addEventListener("click", async () => {
      textarea.focus(); textarea.select();
      try {
        if (!doc.execCommand("copy")) await ctx.window.navigator.clipboard.writeText(text);
        ctx.ui.notify(`Copied ${uniqueUrls.length} unique links to clipboard`);
        panel.remove();
      } catch {
        title.textContent = "Automatic copying was blocked. The links are selected: press Ctrl+C / Cmd+C.";
      }
    });
    panel.append(title, textarea, copy, close);
    (doc.body || doc.documentElement).append(panel);
    textarea.focus(); textarea.select();
    ctx.ui.notify("Links are ready. Use the Copy links button or Ctrl+C / Cmd+C.");
  }
  console.log("Page links:", uniqueUrls);
  return uniqueUrls;
}
