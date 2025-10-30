// src/app/year2/admin/page.tsx
import { redirect } from "next/navigation";

export default function Year2AdminIndex() {
  // Redirect to bulk question manager as the default admin page
  redirect("/year2/admin/bulk-question-manager");
}
