import { apiResponse } from "@/lib/server/http";
import { requestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { readDraft, saveDraft } from "@/lib/server/navigation";

export async function GET(request: Request) {
  return apiResponse(async () => {
    const subject = await requestIdentity(request);
    const query = new URL(request.url).searchParams;
    return readDraft(
      subject,
      query.get("lessonId") ?? "",
      query.get("revisionId") ?? "",
      query.get("stageId") ?? "",
    );
  });
}
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await requestIdentity(request);
    await rateLimit(`draft:${subject.id}`, 120);
    return saveDraft(subject, await readJson(request));
  });
}
