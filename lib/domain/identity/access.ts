export function lessonAccess(flags: {
  number: number;
  published: boolean;
  pedagogical: boolean;
  entitled: boolean;
}) {
  const commercial =
    flags.number >= 1 &&
    flags.number <= 60 &&
    (flags.number <= 3 || flags.entitled);
  const canStart = flags.published && flags.pedagogical && commercial;
  return {
    pedagogical: flags.pedagogical,
    commercial,
    canStart,
    reason: !flags.published
      ? "CONTENT_UNAVAILABLE"
      : !commercial
        ? "ENTITLEMENT_REQUIRED"
        : !flags.pedagogical
          ? "PREREQUISITE_REQUIRED"
          : null,
  };
}
