// src/app/year1/admin/page.tsx
import { redirect } from "next/navigation";

export default function Year1AdminIndex() {
  // Redirect to bulk question manager as the default admin page
  redirect("/year1/admin/bulk-question-manager");
}
