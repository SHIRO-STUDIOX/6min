import { optionalIdentity } from "@/lib/server/identity";
import { catalog } from "@/lib/server/content";
import { apiResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return apiResponse(async () => ({
    lessons: await catalog(await optionalIdentity(request)),
  }));
}
