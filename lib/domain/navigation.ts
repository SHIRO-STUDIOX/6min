// Navigation intent is data; never pass arbitrary origins or script URLs to routers.
export function safeReturn(
  path: string | null | undefined,
  fallback = "/mistakes",
) {
  if (!path || path.length > 1000 || /[\\\u0000-\u001f]/.test(path))
    return fallback;
  return /^\/(classroom|path|profile|mistakes|checkout|sandbox)(\/|\?|$)/.test(
    path,
  ) && !path.startsWith("//")
    ? path
    : fallback;
}
