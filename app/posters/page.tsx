import { redirect } from "next/navigation";

export default function PostersPage() {
  redirect("/generator?mode=team&workspace=posters");
}
