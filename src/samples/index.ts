import { MiniApp } from "../shared/types";
import blurOverlayCode from "./blur-overlay.ts?raw";
import readerMarginsCode from "./reader-margins.ts?raw";
import copyLinksCode from "./copy-links.ts?raw";
import linkedinImagesCode from "./linkedin-images.ts?raw";

export const sampleApps: MiniApp[] = [
  {
    id: "sample-blur-overlay",
    name: "Blur Overlay",
    description: "Add a draggable, resizable blur rectangle over any content. Press ESC to remove.",
    version: "1.0.0",
    enabled: true,
    autoRun: false,
    matchPatterns: ["<all_urls>"],
    runAt: "document_idle",
    code: blurOverlayCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "sample-reader-margins",
    name: "Reader Margins",
    description: "Toggle reader-friendly margins and typography for better reading experience.",
    version: "1.0.0",
    enabled: true,
    autoRun: false,
    matchPatterns: ["<all_urls>"],
    runAt: "document_idle",
    code: readerMarginsCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "sample-copy-links",
    name: "Copy All Links",
    description: "Copy all unique HTTP(S) links from the page to clipboard.",
    version: "1.0.0",
    enabled: true,
    autoRun: false,
    matchPatterns: ["<all_urls>"],
    runAt: "document_idle",
    code: copyLinksCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "sample-linkedin-images",
    name: "LinkedIn Image Paste",
    description: "Paste clipboard images directly into LinkedIn post/comment editors.",
    version: "1.0.0",
    enabled: true,
    autoRun: false,
    matchPatterns: ["*://*.linkedin.com/*"],
    runAt: "document_idle",
    world: "MAIN",
    code: linkedinImagesCode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
