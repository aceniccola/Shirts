import QRCode from "qrcode";
import sharp from "sharp";
import { DEFAULT_DESIGN_TEXT } from "./design-defaults";
import { getSvgFontFace, SHIRT_FONT_FAMILY } from "./shirt-font";
import { venmoInitials, venmoUrl } from "./venmo";

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
  qrLogoCircle: 0.22,
  qrLogoFontSize: 0.32,
} as const;

const LINE_COUNT_FONT_SCALE: Record<number, number> = {
  1: 1.15,
  2: 1.08,
  3: 1,
  4: 0.92,
};

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
  const initials = venmoInitials(venmoUsername);

  const qrRaw = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: opts.qrSize,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const circleSize = Math.round(opts.qrSize * LAYOUT_RATIOS.qrLogoCircle);
  const fontFace = getSvgFontFace();
  const circleSvg = `
    <svg width="${circleSize}" height="${circleSize}" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${fontFace}</style></defs>
      <circle cx="${circleSize / 2}" cy="${circleSize / 2}" r="${circleSize / 2}" fill="#ffffff"/>
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="${SHIRT_FONT_FAMILY}"
        font-size="${Math.round(circleSize * LAYOUT_RATIOS.qrLogoFontSize)}"
        font-weight="400"
        fill="#b0b0b0"
        letter-spacing="2"
      >${escapeXml(initials)}</text>
    </svg>
  `;

  const qrWithLogo = await sharp(qrRaw)
    .composite([
      {
        input: Buffer.from(circleSvg),
        top: Math.round((opts.qrSize - circleSize) / 2),
        left: Math.round((opts.qrSize - circleSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  const textBlockHeight = opts.lineHeight * lines.length + opts.textBlockPad;
  const textLinesSvg = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${opts.lineHeight * (i + 1)}" text-anchor="middle"
        font-family="${SHIRT_FONT_FAMILY}" font-size="${opts.fontSize}" font-weight="400" fill="#000000">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const textSvg = `
    <svg width="${opts.canvasWidth}" height="${textBlockHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${fontFace}</style></defs>
      ${textLinesSvg}
    </svg>
  `;

  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();
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
        input: qrWithLogo,
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
    .png()
    .toBuffer();
}
