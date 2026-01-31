import { MiniAppContext } from "../shared/types";

export default async function run(ctx: MiniAppContext): Promise<void> {
  const STYLE_ID = "miniapp-reader-margins";

  // Check if already applied
  const existingStyle = ctx.document.getElementById(STYLE_ID);
  if (existingStyle) {
    // Toggle off
    existingStyle.remove();
    ctx.ui.notify("Reader mode disabled");
    await ctx.storage.set("readerModeActive", false);
    return;
  }

  // Apply reader-friendly styles
  const css = `
    body {
      max-width: 720px !important;
      margin: 0 auto !important;
      padding: 40px 20px !important;
      line-height: 1.8 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      font-size: 18px !important;
      color: #333 !important;
    }

    @media (prefers-color-scheme: dark) {
      body {
        background: #1a1a1a !important;
        color: #e5e5e5 !important;
      }
    }

    body * {
      max-width: 100% !important;
    }

    p, li, blockquote {
      line-height: 1.8 !important;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em !important;
      margin-bottom: 0.5em !important;
    }

    img {
      height: auto !important;
      border-radius: 8px !important;
    }
  `;

  const style = ctx.helpers.injectStyle(css);
  style.id = STYLE_ID;

  await ctx.storage.set("readerModeActive", true);
  ctx.ui.notify("Reader mode enabled. Run again to disable.");
}
