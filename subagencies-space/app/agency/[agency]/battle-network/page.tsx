import { redirect } from "next/navigation";

export default function BattleNetworkPage() {
  // Kept only for old bookmarked Subspace URLs. The Battle Network lives in
  // the main First Class app, so this route never renders a separate copy.
  redirect("https://firstclassbattles.space");
}
