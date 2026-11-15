import { Mistakes } from "@/components/templates/mistakes";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  return (
    <Mistakes
      returnTo={typeof query.returnTo === "string" ? query.returnTo : undefined}
    />
  );
}
