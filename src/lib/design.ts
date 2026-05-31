import QRCode from "qrcode";
import sharp from "sharp";
import { venmoInitials, venmoUrl } from "./venmo";

const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 3200;
const QR_SIZE = 1500;

export async function generateShirtDesign(venmoUsername: string): Promise<Buffer> {
  const url = venmoUrl(venmoUsername);
  const initials = venmoInitials(venmoUsername);

  const qrRaw = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: QR_SIZE,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const circleSize = Math.round(QR_SIZE * 0.22);
  const circleSvg = `
    <svg width="${circleSize}" height="${circleSize}">
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
      >${initials}</text>
    </svg>
  `;

  const qrWithLogo = await sharp(qrRaw)
    .composite([
      {
        input: Buffer.from(circleSvg),
        top: Math.round((QR_SIZE - circleSize) / 2),
        left: Math.round((QR_SIZE - circleSize) / 2),
      },
    ])
    .png()
    .toBuffer();

  const textBlockHeight = 700;
  const textSvg = `
    <svg width="${CANVAS_WIDTH}" height="${textBlockHeight}">
      <style>
        .line { font: 400 118px Arial, Helvetica, sans-serif; fill: #000000; }
      </style>
      <text x="50%" y="160" text-anchor="middle" class="line">need money</text>
      <text x="50%" y="310" text-anchor="middle" class="line">for</text>
      <text x="50%" y="460" text-anchor="middle" class="line">claude code</text>
    </svg>
  `;

  const textPng = await sharp(Buffer.from(textSvg)).png().toBuffer();

  const qrTop = textBlockHeight + 80;
  const totalContentHeight = qrTop + QR_SIZE + 80;

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: Math.max(CANVAS_HEIGHT, totalContentHeight),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      { input: textPng, top: 40, left: 0 },
      {
        input: qrWithLogo,
        top: qrTop,
        left: Math.round((CANVAS_WIDTH - QR_SIZE) / 2),
      },
    ])
    .png()
    .toBuffer();
}
