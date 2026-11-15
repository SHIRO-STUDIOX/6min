import { catalog } from "@/lib/server/content";
import { apiResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function GET() {
  return apiResponse(async () => ({ lessons: await catalog() }));
}
