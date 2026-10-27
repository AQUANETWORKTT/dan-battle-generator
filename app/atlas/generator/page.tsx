import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATLAS_COOKIE, atlasSessionValid } from "@/lib/atlas-auth";
import AtlasGenerator from "./AtlasGenerator";
export const metadata = { title: "Atlas Creator Network · Agency Tools" };
export default async function AtlasGeneratorPage() {
  if (!atlasSessionValid((await cookies()).get(ATLAS_COOKIE)?.value)) redirect("/atlas/login");
  return <AtlasGenerator />;
}
