import type { Metadata } from "next";

const title = "Race to the Top Leaderboard | First Class";
const description = "Follow the live Race to the Top leaderboard and creator progress.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/race-to-the-top-logo-transparent.png", alt: "Race to the Top" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/race-to-the-top-logo-transparent.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
