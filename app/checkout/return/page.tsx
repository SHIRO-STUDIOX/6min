import { PaymentReturn } from "@/components/templates/checkout";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const query = await searchParams;
  return (
    <PaymentReturn
      id={typeof query.purchase === "string" ? query.purchase : ""}
    />
  );
}
