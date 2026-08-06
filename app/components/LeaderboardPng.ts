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

export async function createLeaderboardPng({ title, subtitle: _subtitle, rows, solidTitle = false }: { title: string; subtitle: string; rows: LeaderboardPngRow[]; solidTitle?: boolean }) {
  const width = 1080;
  const rowHeight = 92;
  const height = Math.max(1350, 490 + rows.length * rowHeight + 110);
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

  const logo = await loadImage("/world-cup-2026/agencies/first-class.png");
  const logoWidth = 330;
  const logoHeight = logo ? logoWidth * (logo.naturalHeight / logo.naturalWidth) : 0;
  if (logo) context.drawImage(logo, width / 2 - logoWidth / 2, 64, logoWidth, logoHeight);
  context.textAlign = "center";
  const titleY = logo ? 64 + logoHeight + 70 : 180;
  context.fillStyle = solidTitle ? "#f6c515" : metallic; drawFittedText(context, title, width / 2, titleY, width - 150, 64);
  const firstRowY = titleY + 88;
  context.strokeStyle = "#e5b635"; context.lineWidth = 2; context.beginPath(); context.moveTo(76, firstRowY - 42); context.lineTo(width - 76, firstRowY - 42); context.stroke();
  context.textAlign = "left";
  rows.forEach((row, index) => {
    const y = firstRowY + index * rowHeight;
    const medal = index === 0 ? ["#fff1a6", "#d89b14", "#7a4300"] : index === 1 ? ["#ffffff", "#b8c1cb", "#66717d"] : index === 2 ? ["#ffd1a3", "#bd6833", "#6b2d14"] : null;
    const rowMetal = medal ? context.createLinearGradient(76, y, width - 76, y) : metallic;
    if (medal && "addColorStop" in rowMetal) { rowMetal.addColorStop(0, medal[2]); rowMetal.addColorStop(.22, medal[0]); rowMetal.addColorStop(.52, medal[1]); rowMetal.addColorStop(.8, medal[0]); rowMetal.addColorStop(1, medal[2]); }
    context.fillStyle = medal ? "rgba(32,22,12,.96)" : "rgba(0,0,0,.72)"; context.strokeStyle = rowMetal; context.lineWidth = medal ? 4 : 2;
    context.beginPath(); context.roundRect(76, y, width - 152, 70, 14); context.fill(); context.stroke();
    if (medal) { const badge = context.createRadialGradient(122, y + 35, 4, 122, y + 35, 30); badge.addColorStop(0, medal[0]); badge.addColorStop(.55, medal[1]); badge.addColorStop(1, medal[2]); context.fillStyle = badge; context.beginPath(); context.arc(122, y + 35, 28, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#fff6d5"; context.lineWidth = 2; context.stroke(); }
    context.fillStyle = medal ? "#160b05" : metallic; context.font = "900 30px Arial Black, Arial, sans-serif"; context.textAlign = medal ? "center" : "left"; context.fillText(String(index + 1), medal ? 122 : 100, y + 46);
    context.textAlign = "left"; context.fillStyle = "#ffffff"; drawFittedText(context, row.name.replace(/^team\s+/i, "").toUpperCase(), 180, y + 45, 540, medal ? 33 : 30);
    context.textAlign = "right"; context.fillStyle = medal ? medal[0] : paleRose; drawFittedText(context, row.value.toUpperCase(), width - 102, y + 45, 230, medal ? 31 : 28); context.textAlign = "left";
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create PNG.");
  return blob;
}

export async function downloadLeaderboardPng({ title, subtitle, rows, filename, solidTitle = false }: { title: string; subtitle: string; rows: LeaderboardPngRow[]; filename: string; solidTitle?: boolean }) {
  const blob = await createLeaderboardPng({ title, subtitle, rows, solidTitle });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.download = filename; link.href = url; link.click(); URL.revokeObjectURL(url);
}
