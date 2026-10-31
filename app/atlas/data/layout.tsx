import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATLAS_COOKIE, atlasSessionValid } from "@/lib/atlas-auth";
import "../portal.css";
export default async function AtlasDataLayout({ children }: { children: React.ReactNode }) {
  if (!atlasSessionValid((await cookies()).get(ATLAS_COOKIE)?.value)) redirect("/atlas/login");
  return <div className="atlas-data">{children}</div>;
}
