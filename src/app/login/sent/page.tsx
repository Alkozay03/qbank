// src/app/login/sent/page.tsx
export default function LoginSent() {
  return (
    <main className="min-h-screen pt-14 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow p-6">
        <h1 className="text-2xl font-semibold text-slate-800 text-center">Check your email</h1>
        <p className="mt-2 text-center text-sm text-slate-700">
          Check your university email, you can close this tab for now.
        </p>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800 text-center">
            <strong>⚠️ Important:</strong> Click the login link only once. If your browser shows a security warning, 
            click &quot;Proceed&quot; but do not refresh or click the link again.
          </p>
        </div>
      </div>
    </main>
  );
}
