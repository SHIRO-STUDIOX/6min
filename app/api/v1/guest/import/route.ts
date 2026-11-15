import { apiResponse } from "@/lib/server/http";
import { ContentError } from "@/lib/server/content";
import { authenticatedSession } from "@/lib/server/sessions";
import {
  optionalGuestIdentity,
  requireSameOrigin,
} from "@/lib/server/identity";
import { importGuest, importPreview } from "@/lib/server/guest-import";
import { rateLimit, readJson } from "@/lib/server/request-security";

async function context(request: Request) {
  const session = await authenticatedSession(request);
  const guest = await optionalGuestIdentity(request);
  return {
    session,
    guest,
    canAuto: Boolean(
      guest &&
        session.newAccount &&
        session.recent &&
        session.sourceGuestId === guest.id,
    ),
  };
}
export async function GET(request: Request) {
  return apiResponse(async () => {
    const { session, guest, canAuto } = await context(request);
    return guest
      ? importPreview(session.subject.id, guest.id, canAuto)
      : {
          guestId: null,
          attemptCount: 0,
          watchCount: 0,
          canAutoImport: false,
          requiresConsent: false,
        };
  });
}
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { session, guest, canAuto } = await context(request);
    if (!guest) throw new ContentError("NO_GUEST_SOURCE", 422);
    await rateLimit(`import:${session.subject.id}`, 10);
    return importGuest(
      session.subject.id,
      guest.id,
      await readJson(request),
      canAuto,
    );
  });
}
