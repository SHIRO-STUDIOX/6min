import { apiResponse } from "@/lib/server/http";
import { authenticatedSession } from "@/lib/server/sessions";
import { requireSameOrigin } from "@/lib/server/identity";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { settleMock } from "@/lib/server/commerce";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { subject } = await authenticatedSession(request);
    await rateLimit(`mock-settle:${subject.id}`, 20);
    return settleMock(subject, (await params).id, await readJson(request));
  });
}
