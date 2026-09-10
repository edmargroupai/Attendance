import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        EdMar Attendance Register
      </h1>
      <p className="max-w-md text-sm text-slate-600">
        Stage 1 scaffold. Authentication and the register are not wired up
        yet.
      </p>
      <Link
        href="/login"
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Go to login
      </Link>
    </main>
  );
}
