import { authenticatedSession } from "@/lib/server/sessions";
import { avatar } from "@/lib/server/profile";
import { apiResponse } from "@/lib/server/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let result: Response | undefined;
  const error = await apiResponse(async () => {
    const { subject } = await authenticatedSession(request);
    const bytes = await avatar(subject.id, (await params).id);
    result = new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
    return {};
  });
  return result ?? error;
}
