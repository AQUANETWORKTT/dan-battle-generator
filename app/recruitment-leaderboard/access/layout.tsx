import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "View your manager's monthly recruits and recruitment diamonds.",
  openGraph: {
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    siteName: "First Class Recruitment",
  },
  twitter: { card: "summary_large_image" },
};

export default function RecruitmentLeaderboardAccessLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
