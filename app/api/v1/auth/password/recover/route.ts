import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import { readJson } from "@/lib/server/request-security";
import { recoverPassword } from "@/lib/server/auth";
import { sessionCookie } from "@/lib/server/sessions";

export async function POST(request: Request) {
  let token: string | null = null;
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    token = await recoverPassword(await readJson(request));
    return { recovered: true, authenticated: Boolean(token) };
  });
  if (token) response.headers.set("Set-Cookie", sessionCookie(request, token));
  return response;
}
