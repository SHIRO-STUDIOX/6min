import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import { authenticatedSession } from "@/lib/server/sessions";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { checkout } from "@/lib/server/commerce";
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { subject } = await authenticatedSession(request);
    await rateLimit(`checkout:${subject.id}`, 10);
    return checkout(
      subject,
      await readJson(request),
      request.headers.get("idempotency-key"),
      new URL(request.url).origin,
    );
  });
}
export async function GET() {
  return apiResponse(async () => {
    const { paymentGateway, demoProduct } = await import(
      "@/lib/integrations/payment"
    );
    paymentGateway();
    return demoProduct;
  });
}
