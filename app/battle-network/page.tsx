import BattleNetworkClient from "./BattleNetworkClient";
import { getBattleNetworkInitialData } from "@/lib/battle-network-data";

export const dynamic = "force-dynamic";

export default async function BattleNetworkPage({ searchParams }: { searchParams: Promise<{ agency?: string; source?: string }> }) {
  const { agency, source } = await searchParams;
  const initialData = await getBattleNetworkInitialData();
  // Respawn managers enter from the Subspace manager portal without a second
  // password. Every other visit starts at the normal First Class login.
  const managerEntry = source === "subspace-manager" && agency === "respawn";
  return <BattleNetworkClient initialData={initialData} initialAgencyId={managerEntry ? "respawn" : ""} />;
}
