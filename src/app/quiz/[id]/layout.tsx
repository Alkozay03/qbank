export default function TestOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No shell here on purpose (prevents leaving the test)
  return <>{children}</>;
}
