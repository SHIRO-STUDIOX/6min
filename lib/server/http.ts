import { randomUUID } from "node:crypto";
import { ContentError } from "./content";

export async function apiResponse(action: () => Promise<unknown>) {
  const requestId = randomUUID();
  try {
    return Response.json(
      { data: await action(), meta: { requestId, version: "v1" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const known = error instanceof ContentError;
    return Response.json(
      {
        error: {
          code: known ? error.code : "SERVICE_UNAVAILABLE",
          message: known ? error.code : "Service temporarily unavailable",
          requestId,
          retryable: !known || error.status >= 500,
        },
      },
      {
        status: known ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
