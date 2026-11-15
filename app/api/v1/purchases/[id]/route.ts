import { apiResponse } from "@/lib/server/http";
import { authenticatedSession } from "@/lib/server/sessions";
import { purchaseStatus } from "@/lib/server/commerce";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiResponse(async () =>
    purchaseStatus(
      (await authenticatedSession(request)).subject,
      (await params).id,
    ),
  );
}
