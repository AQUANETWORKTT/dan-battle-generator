export type LeaderboardPngRow = { name: string; value: string };

const roseGold = "#d9a72b";
const paleRose = "#fff0a6";

function drawFittedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size: number) {
  let fontSize = size;
  do { context.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`; fontSize -= 1; } while (context.measureText(text).width > maxWidth && fontSize > 22);
  context.fillText(text, x, y);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawPersonIcon(context: CanvasRenderingContext2D, x: number, y: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y + 20, 11, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.roundRect(x - 22, y + 34, 44, 23, 15);
  context.fill();
}

function drawDiamondIcon(context: CanvasRenderingContext2D, x: number, y: number) {
  const top = y + 8, mid = y + 30, bottom = y + 58;
  context.save();
  context.shadowColor = "rgba(102, 214, 255, .55)"; context.shadowBlur = 10;
  context.fillStyle = "#8eeaff";
  context.beginPath(); context.moveTo(x - 22, top); context.lineTo(x + 22, top); context.lineTo(x + 30, mid); context.lineTo(x, bottom); context.lineTo(x - 30, mid); context.closePath(); context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#ffffff"; context.lineWidth = 2; context.stroke();
  context.fillStyle = "#d9f8ff"; context.beginPath(); context.moveTo(x - 22, top); context.lineTo(x, mid); context.lineTo(x + 22, top); context.closePath(); context.fill();
  context.fillStyle = "#54bde9"; context.beginPath(); context.moveTo(x - 30, mid); context.lineTo(x, mid); context.lineTo(x, bottom); context.closePath(); context.fill();
  context.fillStyle = "#2398d0"; context.beginPath(); context.moveTo(x, mid); context.lineTo(x + 30, mid); context.lineTo(x, bottom); context.closePath(); context.fill();
  context.strokeStyle = "rgba(255,255,255,.78)"; context.lineWidth = 1; context.beginPath(); context.moveTo(x, mid); context.lineTo(x, top); context.moveTo(x - 30, mid); context.lineTo(x, mid); context.lineTo(x + 30, mid); context.lineTo(x, mid); context.stroke();
  context.restore();
}

export async function createLeaderboardPng({ title, subtitle: _subtitle, rows, solidTitle = false, titleImage, titleImageWidth = 720 }: { title: string; subtitle: string; rows: LeaderboardPngRow[]; solidTitle?: boolean; titleImage?: string; titleImageWidth?: number }) {
  const width = 1080;
  const rowHeight = 92;
  // The tight brand asset has no empty border, so the First Class mark can
  // read clearly at leaderboard size instead of appearing tiny.
  const logo = await loadImage("/branding/first-class-logo-tight.png");
  const logoWidth = 600;
  const logoHeight = logo ? logoWidth * (logo.naturalHeight / logo.naturalWidth) : 0;
  const titleArtwork = titleImage ? await loadImage(titleImage) : null;
  const diamondIcon = title === "MANAGER DIAMONDS" ? await loadImage("/leaderboards/diamond-icon.png") : null;
  const titleY = logo ? 64 + logoHeight + 70 : 180;
  const titleArtworkWidth = titleArtwork ? titleImageWidth : 0;
  const titleArtworkHeight = titleArtwork ? titleArtworkWidth * (titleArtwork.naturalHeight / titleArtwork.naturalWidth) : 0;
  const titleArtworkY = logo ? 64 + logoHeight + 28 : 120;
  const firstRowY = (titleArtwork ? titleArtworkY + titleArtworkHeight : titleY) + 88;
  const height = Math.max(620, firstRowY + rows.length * rowHeight + 72);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#17100e"); background.addColorStop(0.45, "#080708"); background.addColorStop(1, "#1b1010");
  context.fillStyle = background; context.fillRect(0, 0, width, height);
  const metallic = context.createLinearGradient(0, 0, width, 0);
  metallic.addColorStop(0, "#765005"); metallic.addColorStop(.18, "#fff4b6"); metallic.addColorStop(.42, "#c99314"); metallic.addColorStop(.68, "#ffe977"); metallic.addColorStop(1, "#8a5907");
  context.strokeStyle = metallic; context.lineWidth = 5; context.strokeRect(22, 22, width - 44, height - 44);
  context.strokeStyle = "rgba(246,209,188,.45)"; context.lineWidth = 1; context.strokeRect(38, 38, width - 76, height - 76);

  if (logo) context.drawImage(logo, width / 2 - logoWidth / 2, 64, logoWidth, logoHeight);
  context.textAlign = "center";
  if (titleArtwork) {
    context.drawImage(titleArtwork, width / 2 - titleArtworkWidth / 2, titleArtworkY, titleArtworkWidth, titleArtworkHeight);
  } else if (solidTitle) { const softGold = context.createLinearGradient(0, titleY - 64, 0, titleY); softGold.addColorStop(0, "#ffe9a0"); softGold.addColorStop(.42, "#e7bd54"); softGold.addColorStop(.72, "#c9982d"); softGold.addColorStop(1, "#f4d174"); context.fillStyle = softGold; context.shadowColor = "rgba(227,181,76,.35)"; context.shadowBlur = 6; drawFittedText(context, title, width / 2, titleY, width - 150, 64); context.shadowBlur = 0; } else { context.fillStyle = metallic; drawFittedText(context, title, width / 2, titleY, width - 150, 64); }
  context.strokeStyle = "#e5b635"; context.lineWidth = 2; context.beginPath(); context.moveTo(76, firstRowY - 42); context.lineTo(width - 76, firstRowY - 42); context.stroke();
  context.textAlign = "left";
  rows.forEach((row, index) => {
    const y = firstRowY + index * rowHeight;
    context.fillStyle = "rgba(0,0,0,.72)"; context.strokeStyle = metallic; context.lineWidth = 2;
    context.beginPath(); context.roundRect(76, y, width - 152, 70, 14); context.fill(); context.stroke();
    if (title === "MANAGER DIAMONDS") {
      if (diamondIcon) context.drawImage(diamondIcon, 94, y + 14, 56, 42); else drawDiamondIcon(context, 122, y);
    } else drawPersonIcon(context, 122, y, "#ffffff");
    context.textAlign = "left"; context.fillStyle = "#ffffff"; drawFittedText(context, row.name.replace(/^team\s+/i, "").toUpperCase(), 180, y + 45, 540, 30);
    context.textAlign = "right"; context.fillStyle = paleRose; drawFittedText(context, row.value.toUpperCase(), width - 102, y + 45, 230, 28); context.textAlign = "left";
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create PNG.");
  return blob;
}

export async function downloadLeaderboardPng({ title, subtitle, rows, filename, solidTitle = false, titleImage, titleImageWidth }: { title: string; subtitle: string; rows: LeaderboardPngRow[]; filename: string; solidTitle?: boolean; titleImage?: string; titleImageWidth?: number }) {
  const blob = await createLeaderboardPng({ title, subtitle, rows, solidTitle, titleImage, titleImageWidth });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.download = filename; link.href = url; link.click(); URL.revokeObjectURL(url);
}
