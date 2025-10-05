// src/app/login/sent/page.tsx
export default function LoginSent() {
  return (
    <main className="min-h-screen pt-14 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow p-6">
        <h1 className="text-2xl font-semibold text-slate-800 text-center">Check your email</h1>
        <p className="mt-2 text-center text-sm text-slate-700">
          A magic link has been sent to your university email.
        </p>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800 text-center font-medium mb-2">
            🎉 Quick Tip: You might already be logged in!
          </p>
          <p className="text-xs text-blue-700 text-center">
            Your email server may have already activated the login link. 
            Try visiting <a href="/years" className="underline font-medium">clerkship.me/years</a> directly - 
            you may already be signed in without clicking the email link!
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800 text-center">
            <strong>⚠️ If that doesn&apos;t work:</strong> Click the login link in your email only once. 
            If your browser shows a security warning, click &quot;Proceed&quot; but do not refresh or go back.
          </p>
        </div>
      </div>
    </main>
  );
}
