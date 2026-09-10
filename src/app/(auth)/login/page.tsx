export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            EdMar Attendance Register
          </h1>
          <p className="text-sm text-slate-600">Sign in to your workspace</p>
        </div>

        {/*
          Stage 1 shell only. Not wired to a live Supabase project yet —
          no NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          is configured. Stage 2 wires this form to Supabase email/password
          auth via src/lib/supabase/client.ts.
        */}
        <form className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              placeholder="teacher@school.edu"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Sign in (not yet connected)
          </button>
        </form>
      </div>
    </main>
  );
}
