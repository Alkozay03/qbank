// src/app/year3/admin/page.tsx
import { redirect } from "next/navigation";

export default function Year3AdminIndex() {
  // Redirect to bulk question manager as the default admin page
  redirect("/year3/admin/bulk-question-manager");
}
