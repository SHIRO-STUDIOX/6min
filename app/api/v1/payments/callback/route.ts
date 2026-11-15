import { apiResponse } from "@/lib/server/http";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { verifyPayment } from "@/lib/server/commerce";
export async function POST(request: Request) {
  return apiResponse(async () => {
    await rateLimit("payment-callback", 120);
    return verifyPayment(
      await readJson(request),
      request.headers.get("x-payment-signature") ?? "",
    );
  });
}
