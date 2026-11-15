import { authenticatedSession } from "@/lib/server/sessions";
import { requireSameOrigin } from "@/lib/server/identity";
import { apiResponse } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/request-security";
import { ContentError } from "@/lib/server/content";
import { replaceAvatar, clearAvatar } from "@/lib/server/profile";
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { subject } = await authenticatedSession(request);
    await rateLimit(`avatar:${subject.id}`, 10);
    const reader = request.body?.getReader();
    if (!reader) throw new ContentError("INVALID_AVATAR", 422);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 2097152) {
          await reader.cancel();
          throw new ContentError("AVATAR_TOO_LARGE", 413);
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    return replaceAvatar(subject.id, Buffer.concat(chunks));
  });
}
export async function DELETE(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    return clearAvatar((await authenticatedSession(request)).subject.id);
  });
}
