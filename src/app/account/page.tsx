/* eslint-disable @typescript-eslint/no-explicit-any */

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true, firstName: true, lastName: true, gradYear: true },
  });

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login?callbackUrl=/account");

    const firstName = (formData.get("firstName") || "").toString().trim() || null;
    const lastName  = (formData.get("lastName")  || "").toString().trim() || null;
    const gradYearV = Number(formData.get("gradYear") || "");
    const gradYear  = Number.isFinite(gradYearV) ? gradYearV : null;

    await db.user.update({
      where: { id: (s.user as any).id },
      data: { firstName, lastName, gradYear },
    });

    revalidatePath("/account");
  }

  return (
    <div className="max-w-2xl grid gap-6">
      <h1 className="text-2xl font-semibold">My Account</h1>

      <form action={save} className="grid gap-4 rounded-xl border p-4">
        <div className="grid gap-1">
          <label className="text-sm">University Email</label>
          <input className="border rounded p-2 bg-gray-50" value={user?.email ?? ""} disabled />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-1">
            <label className="text-sm">First Name</label>
            <input name="firstName" defaultValue={user?.firstName ?? ""} className="border rounded p-2" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Last Name</label>
            <input name="lastName" defaultValue={user?.lastName ?? ""} className="border rounded p-2" />
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Expected Graduation Year</label>
          <input name="gradYear" type="number" min={2025} max={2100}
                 defaultValue={user?.gradYear ?? ""} className="border rounded p-2" />
        </div>

        <button className="justify-self-start rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">
          Save
        </button>
      </form>
    </div>
  );
}
