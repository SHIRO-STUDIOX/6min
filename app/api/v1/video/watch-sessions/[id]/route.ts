import { apiResponse } from "@/lib/server/http";
import { requestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { rateLimit, readJson } from "@/lib/server/request-security";
import { updateWatch } from "@/lib/server/watch";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await requestIdentity(request);
    await rateLimit(`watch-update:${subject.id}`, 120);
    return updateWatch(
      subject,
      (await context.params).id,
      await readJson(request),
    );
  });
}
