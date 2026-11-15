export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  idempotencyKey?: string,
  expectedSubject?: string,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(expectedSubject ? { "X-Expected-Subject": expectedSubject } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.code ?? "REQUEST_FAILED");
  if (
    ["/auth/password/login", "/auth/password/recover", "/auth/logout"].includes(
      path,
    ) ||
    (path === "/auth/otp/verify" && result.data?.authenticated)
  ) {
    // A nonsecret marker tells other tabs to resolve their actual cookie identity.
    try {
      localStorage.setItem("shish:identity-change", crypto.randomUUID());
    } catch {}
  }
  return result.data as T;
}

export function scopedApi(expectedSubject?: string) {
  return <T>(
    path: string,
    method = "GET",
    body?: unknown,
    idempotencyKey?: string,
  ) => api<T>(path, method, body, idempotencyKey, expectedSubject);
}
