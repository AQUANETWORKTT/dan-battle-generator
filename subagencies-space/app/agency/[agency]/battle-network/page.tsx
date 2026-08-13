import BattleNetworkClient from "./BattleNetworkClient";
import { getBattleNetworkInitialData } from "@/lib/battle-network-data";

export const dynamic = "force-dynamic";

export default async function BattleNetworkPage({ params }: { params: Promise<{ agency: string }> }) {
  const { agency } = await params;
  const initialData = await getBattleNetworkInitialData();
  return <BattleNetworkClient initialData={initialData} initialAgencyId="" preferredAgencyId={agency} />;
}
