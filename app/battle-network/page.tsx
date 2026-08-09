import BattleNetworkClient from "./BattleNetworkClient";
import { getBattleNetworkInitialData } from "@/lib/battle-network-data";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BattleNetworkPage() {
  const [initialData, cookieStore] = await Promise.all([getBattleNetworkInitialData(), cookies()]);
  return <BattleNetworkClient initialData={initialData} initialAgencyId={cookieStore.get("battle-network-active-agency")?.value || ""} />;
}
