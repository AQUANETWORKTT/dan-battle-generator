import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

const recruitmentDomain = process.env.SITE_MODE === "events" ? "https://firstclassagency.space" : "https://firstclassagency.management";

export const metadata: Metadata = {
  metadataBase: new URL(recruitmentDomain),
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "See your manager's monthly recruits and recruitment diamonds on the First Class Recruitment Leaderboard.",
  openGraph: {
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    siteName: "First Class Recruitment",
    images: [{ url: "/recruitment-leaderboard/opengraph-image.png?v=20260927", width: 2048, height: 2048, alt: "First Class Recruitment" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    images: ["/recruitment-leaderboard/opengraph-image.png?v=20260927"],
  },
};

export default function RecruitmentLeaderboardPage() { return <LeaderboardClient />; }
