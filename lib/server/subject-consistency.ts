import { ContentError } from "./content";
// Cookie/session authenticates. This optional header only detects stale tabs;
// it can never select, impersonate or authorize a different principal.
export function assertExpectedSubject(request: Request, actualId: string) {
  const expected = request.headers.get("x-expected-subject");
  if (expected !== null && expected !== actualId)
    throw new ContentError("SUBJECT_CHANGED", 409);
}
