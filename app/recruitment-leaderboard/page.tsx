import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "See your manager's monthly recruits and recruitment diamonds on the First Class Recruitment Leaderboard.",
  openGraph: {
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    siteName: "First Class Recruitment",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
  },
};

export default function RecruitmentLeaderboardPage() { return <LeaderboardClient />; }
