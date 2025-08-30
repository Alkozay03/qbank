import Link from "next/link";
import { db } from "@/lib/db";

export default async function Bank() {
  const rotations = await db.rotation.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="grid gap-3">
      {rotations.map((r) => (
        <Link
          key={r.id}
          href={`/bank/${r.id}`}
          className="p-3 border rounded hover:bg-gray-50"
        >
          {r.name}
        </Link>
      ))}
    </div>
  );
}
