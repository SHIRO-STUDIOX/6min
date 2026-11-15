import { AuthPanel } from "@/components/organisms/auth-panel";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="h-full overflow-auto flex justify-center items-start p-6">
      <AuthPanel
        returnTo={typeof query.returnTo === "string" ? query.returnTo : "/"}
      />
    </main>
  );
}
