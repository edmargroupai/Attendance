export default async function RegisterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">Register</h1>
      <p className="mt-2 text-sm text-slate-600">
        Class {classId}. Stage 5 implements the monthly register grid here.
      </p>
    </main>
  );
}
