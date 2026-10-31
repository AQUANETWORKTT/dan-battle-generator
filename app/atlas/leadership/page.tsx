import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATLAS_COOKIE, atlasSessionValid } from "@/lib/atlas-auth";
import AtlasLeadership from "./AtlasLeadership";
export default async function Page(){
  if(!atlasSessionValid((await cookies()).get(ATLAS_COOKIE)?.value)) redirect("/atlas/login");
  return <AtlasLeadership/>;
}
