import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://firstclassagency.management"),
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
