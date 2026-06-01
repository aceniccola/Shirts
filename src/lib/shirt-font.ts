import { existsSync, readFileSync } from "fs";
import { join } from "path";

let cachedFontFace: string | null = null;

export function findFontPath(): string {
  const candidates = [
    join(process.cwd(), "public/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "src/assets/fonts/DejaVuSans.ttf"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    "DejaVuSans.ttf not found. Ensure public/fonts/DejaVuSans.ttf is deployed.",
  );
}

/**
 * Legacy SVG font embed (unused; shirt text uses canvas).
 */
export function getSvgFontFace(): string {
  if (cachedFontFace) return cachedFontFace;

  const base64 = readFileSync(findFontPath()).toString("base64");

  cachedFontFace = `
    @font-face {
      font-family: 'ShirtFont';
      src: url('data:font/ttf;base64,${base64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
  `;

  return cachedFontFace;
}

export const SHIRT_FONT_FAMILY = "ShirtFont";
export const CANVAS_FONT_FAMILY = "DejaVu Sans";
