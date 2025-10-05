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
            📧 Check your inbox
          </p>
          <p className="text-xs text-blue-700 text-center">
            Click the link in your email to sign in. The link will expire in 24 hours.
          </p>
          <p className="text-xs text-blue-600 text-center mt-2">
            💡 Your link will work even if your email scanner pre-checks it (within 2 minutes).
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800 text-center">
            <strong>⚠️ Important:</strong> Click the login link only once. 
            If it doesn&apos;t work immediately, wait a few seconds and try again.
          </p>
        </div>
      </div>
    </main>
  );
}
