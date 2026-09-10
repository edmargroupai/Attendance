import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { error, mode } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            EdMar Attendance Register
          </h1>
          <p className="text-sm text-slate-600">
            {isSignUp ? "Create your workspace" : "Sign in to your workspace"}
          </p>
        </div>

        {error ? (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={isSignUp ? signUp : signIn} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="teacher@school.edu"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <a href="/login" className="font-medium text-slate-900 underline">
                Sign in
              </a>
            </>
          ) : (
            <>
              Need a workspace?{" "}
              <a href="/login?mode=signup" className="font-medium text-slate-900 underline">
                Create one
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
