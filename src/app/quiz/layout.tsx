import QuizShell from "@/components/QuizShell";

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout wraps /quiz/new (and any other /quiz/* pages)
  // We set the titles shown inside the sidebar header.
  return (
    <QuizShell pageTitle="Create a Quiz" sectionTitleTop="Clerkship" sectionTitleBottom="Year 4 QBank">
      {children}
    </QuizShell>
  );
}
