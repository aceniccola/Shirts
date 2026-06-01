import QRCode from "qrcode";
import sharp from "sharp";
import { DEFAULT_DESIGN_TEXT } from "./design-defaults";
import { renderTextBlockPng } from "./render-text";
import { venmoUrl } from "./venmo";

export { DEFAULT_DESIGN_TEXT };

/** Master print width — all layout ratios are defined relative to this */
export const PRINT_CANVAS_WIDTH = 2400;

/** Website preview width (scaled down from print art, same proportions) */
export const PREVIEW_DISPLAY_WIDTH = 520;

const MAX_LINES = 4;

/** Layout proportions derived from print mockup (Gildan chest print) */
const LAYOUT_RATIOS = {
  qrSize: 1650 / PRINT_CANVAS_WIDTH,
  fontSize: 200 / PRINT_CANVAS_WIDTH,
  lineHeight: 230 / PRINT_CANVAS_WIDTH,
  gapTextToQr: 100 / PRINT_CANVAS_WIDTH,
  textTopPad: 16 / PRINT_CANVAS_WIDTH,
  textBlockPad: 40 / PRINT_CANVAS_WIDTH,
  canvasBottomPad: 40 / PRINT_CANVAS_WIDTH,
} as const;

const LINE_COUNT_FONT_SCALE: Record<number, number> = {
  1: 1.15,
  2: 1.08,
  3: 1,
  4: 0.92,
};

export function parseDesignText(raw: string): string[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);

  if (lines.length === 0) {
    return parseDesignText(DEFAULT_DESIGN_TEXT);
  }
  return lines;
}

export type DesignLayout = {
  canvasWidth: number;
  qrSize: number;
  fontSize: number;
  lineHeight: number;
  gapTextToQr: number;
  textTopPad: number;
  textBlockPad: number;
  canvasBottomPad: number;
};

/** Single source of truth for text/QR size and spacing at any canvas width */
export function computeLayout(
  canvasWidth: number,
  lineCount: number,
): DesignLayout {
  const fontScale = LINE_COUNT_FONT_SCALE[lineCount] ?? 1;

  return {
    canvasWidth,
    qrSize: Math.round(canvasWidth * LAYOUT_RATIOS.qrSize),
    fontSize: Math.round(canvasWidth * LAYOUT_RATIOS.fontSize * fontScale),
    lineHeight: Math.round(canvasWidth * LAYOUT_RATIOS.lineHeight * fontScale),
    gapTextToQr: Math.round(canvasWidth * LAYOUT_RATIOS.gapTextToQr),
    textTopPad: Math.round(canvasWidth * LAYOUT_RATIOS.textTopPad),
    textBlockPad: Math.round(canvasWidth * LAYOUT_RATIOS.textBlockPad),
    canvasBottomPad: Math.round(canvasWidth * LAYOUT_RATIOS.canvasBottomPad),
  };
}

async function renderDesign(
  venmoUsername: string,
  lines: string[],
  canvasWidth: number,
): Promise<Buffer> {
  const opts = computeLayout(canvasWidth, lines.length);
  const url = venmoUrl(venmoUsername);

  const qrPng = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: opts.qrSize,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const textBlockHeight = opts.lineHeight * lines.length + opts.textBlockPad;
  const textPng = renderTextBlockPng(
    lines,
    opts.canvasWidth,
    opts.fontSize,
    opts.lineHeight,
    opts.textBlockPad,
  );

  const canvasHeight =
    opts.textTopPad +
    textBlockHeight +
    opts.gapTextToQr +
    opts.qrSize +
    opts.canvasBottomPad;

  const qrTop = opts.textTopPad + textBlockHeight + opts.gapTextToQr;
  const qrLeft = Math.round((opts.canvasWidth - opts.qrSize) / 2);

  return sharp({
    create: {
      width: opts.canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: textPng, top: opts.textTopPad, left: 0 },
      {
        input: qrPng,
        top: qrTop,
        left: qrLeft,
      },
    ])
    .png()
    .toBuffer();
}

/** Full-resolution art sent to Printify */
export async function generateShirtDesign(
  venmoUsername: string,
  lines: string[],
): Promise<Buffer> {
  return renderDesign(venmoUsername, lines, PRINT_CANVAS_WIDTH);
}

/**
 * Preview is the print artwork scaled uniformly — guarantees identical
 * font, QR size ratio, and centering as the manufactured shirt.
 */
export async function generateShirtDesignPreview(
  venmoUsername: string,
  lines: string[],
): Promise<Buffer> {
  const printArt = await renderDesign(venmoUsername, lines, PRINT_CANVAS_WIDTH);
  return sharp(printArt)
    .resize({ width: PREVIEW_DISPLAY_WIDTH })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}
