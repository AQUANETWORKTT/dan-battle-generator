import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "First Class: Ascend",
  description: "The First Class creator tournament leaderboard.",
};

export default function FirstClassLayout({ children }: { children: React.ReactNode }) {
  return children;
}
