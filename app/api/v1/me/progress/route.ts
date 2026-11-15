import { apiResponse } from "@/lib/server/http";
import { requestIdentity } from "@/lib/server/identity";
import { subjectProgress } from "@/lib/server/progress-query";

export async function GET(request: Request) {
  return apiResponse(async () =>
    subjectProgress(await requestIdentity(request)),
  );
}
