import type { Metadata } from "next";
import {managementShareImages} from '@/lib/management-share-image';
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  metadataBase: new URL("https://firstclassagency.space"),
  title: "Recruitment Leaderboard | First Class Recruitment",
  description: "See your manager's monthly recruits and recruitment diamonds on the First Class Recruitment Leaderboard.",
  openGraph: {
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    siteName: "First Class Recruitment",
    images: [{ url: "/recruitment-leaderboard/opengraph-image.png?v=20260927", width: 2048, height: 2048, alt: "First Class Recruitment" }],
    ...managementShareImages,
  },
  twitter: {
    card: "summary_large_image",
    title: "Recruitment Leaderboard | First Class Recruitment",
    description: "View your manager's monthly recruits and recruitment diamonds.",
    images: ["/recruitment-leaderboard/opengraph-image.png?v=20260927"],
    ...managementShareImages,
  },
};

export default function RecruitmentLeaderboardPage() { return <LeaderboardClient />; }
