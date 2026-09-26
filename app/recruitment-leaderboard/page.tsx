import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "First Class Recruitment's live monthly manager leaderboard.",
  openGraph: { title: "Recruitment Leaderboard | First Class Recruitment", description: "Live monthly manager recruitment leaderboard." },
};

export default function RecruitmentLeaderboardPage() { return <LeaderboardClient />; }
