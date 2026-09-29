import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Race to the Top October leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "race-to-the-top-october-logo-clean.png"));
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", background: "radial-gradient(circle at 50% 0%, #612300 0%, #100904 42%, #000000 78%)", border: "12px solid #ef8a16" }}><img src={logoData} width="760" height="427" style={{ objectFit: "contain", marginTop: "-25px" }} /><div style={{ display: "flex", fontSize: 49, fontWeight: 900, letterSpacing: 3, color: "#ff9a2f", marginTop: "-46px" }}>RACE TO THE TOP · OCTOBER</div><div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 5, color: "#fff0dc", marginTop: 18 }}>FIRST CLASS · 1ST - 31ST OCTOBER</div></div>, size);
}
