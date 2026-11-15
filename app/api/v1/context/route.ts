import { apiResponse } from "@/lib/server/http";
import { requestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { saveContext } from "@/lib/server/navigation";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await requestIdentity(request);
    await rateLimit(`context:${subject.id}`, 120);
    return saveContext(subject, await readJson(request));
  });
}
