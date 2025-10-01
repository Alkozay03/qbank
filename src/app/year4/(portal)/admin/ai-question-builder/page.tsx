"use client";

import Link from "next/link";

const AI_EXTRACTOR_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AI_EXTRACTOR === "true" ||
  process.env.ENABLE_AI_EXTRACTOR === "true";

export default function AIQuestionBuilderPage() {
  if (!AI_EXTRACTOR_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-8">
          <div className="flex flex-col space-y-6 text-gray-700">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Question Builder Disabled</h1>
              <p className="text-gray-600">
                The AI Question Builder and extractor pipeline have been archived to keep the development server fast. None of the
                python tooling or large client bundles load while this mode is off.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">How to re-enable it</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Set <code className="px-2 py-1 bg-white rounded">ENABLE_AI_EXTRACTOR=true</code> in your <code>.env.local</code>.
                </li>
                <li>Restart the dev server so Next.js can rebuild the AI bundles.</li>
                <li>
                  (Optional) Edit the archived implementation in <code className="px-2 py-1 bg-white rounded">src/archive/ai-question-builder/page.tsx</code>
                  when you&apos;re ready to ship.
                </li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">Why it&apos;s disabled</h2>
              <p>
                The extractor depends on large Python workflows and heavy client-side modules. Leaving it enabled forces Next.js to
                load hundreds of modules on every rebuild, slowing everything else down.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Need to manage questions manually?</p>
                <p className="text-sm text-gray-500">Jump into the standard create-test flow instead.</p>
              </div>
              <Link
                href="/year4/create-test"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white hover:from-[#56A2CD] hover:to-[#A5CDE4] transition"
              >
                Go to Question Tools
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-8 text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">AI Question Builder Enabled</h1>
          <p className="text-gray-600">
            To run the full tool, restore the archived implementation from <code className="px-2 py-1 bg-blue-50 rounded">src/archive/ai-question-builder/page.tsx</code>
            and restart the dev server.
          </p>
          <Link
            href="/year4/create-test"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#2F6F8F] to-[#56A2CD] text-white hover:from-[#56A2CD] hover:to-[#A5CDE4] transition"
          >
            Go to Question Tools
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
