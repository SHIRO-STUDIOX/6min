import { optionalIdentity } from "@/lib/server/identity";
import { lessonPublic } from "@/lib/server/content";
import { apiResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () =>
    lessonPublic(
      (await context.params).id,
      await optionalIdentity(request),
    ),
  );
}
