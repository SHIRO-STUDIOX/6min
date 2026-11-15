import { Checkout } from "@/components/templates/checkout";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const query = await searchParams;
  return (
    <Checkout
      lessonId={typeof query.lesson === "string" ? query.lesson : undefined}
    />
  );
}
