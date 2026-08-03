import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SubAgencies.Space", description: "The home of First Class sub-agencies." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
