import { PaymentMock } from "@/components/templates/checkout";
import { demoContentAllowed } from "@/lib/contracts/content";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!demoContentAllowed()) notFound();
  return <PaymentMock id={(await params).id} />;
}
