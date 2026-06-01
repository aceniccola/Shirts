import QRCode from "qrcode";
import sharp from "sharp";
import { DEFAULT_DESIGN_TEXT } from "./design-defaults";
import { venmoInitials, venmoUrl } from "./venmo";

export { DEFAULT_DESIGN_TEXT };

const MAX_LINES = 4;

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

type RenderOptions = {
  canvasWidth: number;
  qrSize: number;
  fontSize: number;
  lineHeight: number;
  gapTextToQr: number;
};

function layoutForLineCount(lineCount: number, base: RenderOptions): RenderOptions {
  const scale =
    lineCount <= 1 ? 1.15 : lineCount === 2 ? 1.08 : lineCount === 4 ? 0.92 : 1;
  return {
    ...base,
    fontSize: Math.round(base.fontSize * scale),
    lineHeight: Math.round(base.lineHeight * scale),
  };
}

async function renderDesign(
  venmoUsername: string,
  lines: string[],
  base: RenderOptions,
): Promise<Buffer> {
  const opts = layoutForLineCount(lines.length, base);
  const url = venmoUrl(venmoUsername);
  const initials = venmoInitials(venmoUsername);

  const qrRaw = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: opts.qrSize,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const circleSize = Math.round(opts.qrSize * 0.22);
  const circleSvg = `
    <svg width="${circleSize}" height="${circleSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${circleSize / 2}" cy="${circleSize / 2}" r="${circleSize / 2}" fill="#ffffff"/>
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${Math.round(circleSize * 0.32)}"
        font-weight="300"
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

  const textBlockHeight = opts.lineHeight * lines.length + 40;
  const textLinesSvg = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${opts.lineHeight * (i + 1)}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${opts.fontSize}" font-weight="400" fill="#000000">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const textSvg = `
    <svg width="${opts.canvasWidth}" height="${textBlockHeight}" xmlns="http://www.w3.org/2000/svg">
      ${textLinesSvg}
    </svg>
  `;

  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();
  const canvasHeight = textBlockHeight + opts.gapTextToQr + opts.qrSize + 40;

  return sharp({
    create: {
      width: opts.canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: textPng, top: 16, left: 0 },
      {
        input: qrWithLogo,
        top: textBlockHeight + opts.gapTextToQr,
        left: Math.round((opts.canvasWidth - opts.qrSize) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/** Full-resolution art for Printify */
export async function generateShirtDesign(
  venmoUsername: string,
  lines: string[],
): Promise<Buffer> {
  return renderDesign(venmoUsername, lines, {
    canvasWidth: 2400,
    qrSize: 1650,
    fontSize: 200,
    lineHeight: 230,
    gapTextToQr: 100,
  });
}

/** Display-sized art for website preview (built at target size, not downscaled) */
export async function generateShirtDesignPreview(
  venmoUsername: string,
  lines: string[],
): Promise<Buffer> {
  return renderDesign(venmoUsername, lines, {
    canvasWidth: 480,
    qrSize: 300,
    fontSize: 36,
    lineHeight: 44,
    gapTextToQr: 24,
  });
}
