import type { Metadata, Viewport } from "next";

// Match the leaderboard's fixed desktop composition on phone browsers.
export const viewport: Viewport = { width: 1200, themeColor: "#070608" };

export const metadata: Metadata = {
  metadataBase: new URL("https://firstclassagency.space"),
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "View your manager's monthly recruits and recruitment diamonds.",
  openGraph: {
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    siteName: "First Class Recruitment",
    images: [{ url: "/recruitment-leaderboard/opengraph-image.png?v=20260927", width: 2048, height: 2048, alt: "First Class Recruitment" }],
  },
  twitter: { card: "summary_large_image", images: ["/recruitment-leaderboard/opengraph-image.png?v=20260927"] },
};

export default function RecruitmentLeaderboardAccessLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
