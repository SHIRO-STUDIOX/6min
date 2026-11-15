import { apiResponse } from "@/lib/server/http";
import { requestIdentity } from "@/lib/server/identity";
import { mistakes } from "@/lib/server/mistakes";

export async function GET(request: Request) {
  return apiResponse(async () => {
    const subject = await requestIdentity(request);
    const query = new URL(request.url).searchParams;
    return mistakes(
      subject,
      query.get("cursor") ?? undefined,
      query.get("status") ?? "needsReview",
    );
  });
}
