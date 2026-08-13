import BattleNetworkClient from "./BattleNetworkClient";
import { getBattleNetworkInitialData } from "@/lib/battle-network-data";

export const dynamic = "force-dynamic";

export default async function BattleNetworkPage({ params, searchParams }: { params: Promise<{ agency: string }>; searchParams: Promise<{ access?: string }> }) {
  const { agency } = await params;
  const { access } = await searchParams;
  const initialData = await getBattleNetworkInitialData();
  const managerAccess = agency === "respawn" && access === "managers";
  return <BattleNetworkClient initialData={initialData} initialAgencyId={managerAccess ? "respawn" : ""} preferredAgencyId={agency} />;
}
