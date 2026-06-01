import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { CANVAS_FONT_FAMILY, findFontPath } from "./shirt-font";

let fontRegistered = false;

function ensureFontRegistered(): void {
  if (fontRegistered) return;
  const ok = GlobalFonts.registerFromPath(findFontPath(), CANVAS_FONT_FAMILY);
  if (!ok) {
    throw new Error("Failed to register DejaVuSans.ttf for canvas text rendering");
  }
  fontRegistered = true;
}

/** Rasterize shirt copy with canvas (works on Vercel; SVG text often does not). */
export function renderTextBlockPng(
  lines: string[],
  width: number,
  fontSize: number,
  lineHeight: number,
  blockPadding: number,
): Buffer {
  ensureFontRegistered();

  const height = lineHeight * lines.length + blockPadding;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  ctx.font = `${fontSize}px "${CANVAS_FONT_FAMILY}"`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const baselineAdjust = Math.round(fontSize * 0.12);
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, lineHeight * (i + 1) - baselineAdjust);
  });

  return Buffer.from(canvas.toBuffer("image/png"));
}
