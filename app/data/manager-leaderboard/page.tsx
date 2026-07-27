import { redirect } from "next/navigation";

export default function ManagerLeaderboardPage() {
  redirect("/generator?mode=manager");
}
