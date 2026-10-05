import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Race to the Top October leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "race-to-the-top-october-logo-clean.png"));
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}><img src={logoData} width={1100} height={619} style={{ objectFit: "contain" }} /></div>, size);
}
