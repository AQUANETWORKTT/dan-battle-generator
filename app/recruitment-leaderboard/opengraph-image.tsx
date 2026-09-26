import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const alt = "First Class Recruitment Leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const image = await readFile(join(process.cwd(), "public/branding/first-class-recruitment-logo.png"), "base64");
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", background: "radial-gradient(circle at 50% 0%, #46310d, #050507 56%)" }}><img src={`data:image/png;base64,${image}`} style={{ width: "720px", height: "240px", objectFit: "contain" }} /><div style={{ width: 820, height: 1, marginTop: 26, background: "#d6a941" }} /><div style={{ marginTop: 32, fontSize: 66, fontWeight: 900, letterSpacing: 2 }}>RECRUITMENT LEADERBOARD</div><div style={{ marginTop: 18, fontSize: 22, color: "#f5ca62", letterSpacing: 6 }}>CURRENT MONTH · LIVE DATA</div></div>, size);
}
