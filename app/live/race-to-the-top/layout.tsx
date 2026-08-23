import type { Metadata } from "next";

const title = "Race to the Top — Event Finished | First Class";
const description = "Race to the Top has finished. The live leaderboard and creator links are no longer available.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: "/race-to-the-top-logo.png", alt: "Race to the Top" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/race-to-the-top-logo.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
