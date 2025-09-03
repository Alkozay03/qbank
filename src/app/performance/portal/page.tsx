import PortalStats from "@/components/PortalStats";

export default function Page({ searchParams }: { searchParams: { portal?: string } }) {
  const portal = searchParams?.portal || "Internal Medicine";
  return (
    <div className="p-6">
      <PortalStats portal={portal} />
    </div>
  );
}
