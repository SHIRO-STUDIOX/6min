import { apiResponse } from "@/lib/server/http";
import {
  optionalGuestIdentity,
  requireSameOrigin,
} from "@/lib/server/identity";
import { readJson } from "@/lib/server/request-security";
import { verifyOtp } from "@/lib/server/auth";
import { sessionCookie } from "@/lib/server/sessions";

export async function POST(request: Request) {
  let token: string | null = null;
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    const guest = await optionalGuestIdentity(request);
    const result = await verifyOtp(await readJson(request), guest?.id ?? null);
    token = result.token;
    return {
      authenticated: Boolean(result.token),
      newAccount: result.newAccount,
      recoveryGrant: result.recoveryGrant,
    };
  });
  if (token) response.headers.set("Set-Cookie", sessionCookie(request, token));
  return response;
}
