import { redirect } from "next/navigation";

export default function CrewShowdownDownloadPage() {
  redirect("/generator?mode=glory&workspace=crew-showdown");
}
