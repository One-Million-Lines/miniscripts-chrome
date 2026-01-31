import { MiniAppContext } from "../shared/types";

export default async function run(ctx: MiniAppContext): Promise<void> {
  // Find all links
  const links = Array.from(ctx.document.querySelectorAll("a[href]")) as HTMLAnchorElement[];

  if (links.length === 0) {
    ctx.ui.notify("No links found on this page");
    return;
  }

  // Extract and normalize URLs
  const urls = new Set<string>();
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

  // Copy to clipboard
  const text = uniqueUrls.join("\n");

  try {
    // Try modern clipboard API
    await ctx.window.navigator.clipboard.writeText(text);
    ctx.ui.notify(`Copied ${uniqueUrls.length} unique links to clipboard`);
  } catch {
    // Fallback: create temporary textarea
    const textarea = ctx.document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    `;
    ctx.document.body.appendChild(textarea);
    textarea.select();

    try {
      ctx.document.execCommand("copy");
      ctx.ui.notify(`Copied ${uniqueUrls.length} unique links to clipboard`);
    } catch (error) {
      ctx.ui.notify(`Failed to copy: ${error}`);
    } finally {
      textarea.remove();
    }
  }

  // Show preview
  console.log("Copied links:", uniqueUrls);
}
