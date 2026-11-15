import { expect, it } from "vitest";
import { lessonAccess } from "../../lib/domain/identity/access";

it("AU-01/03 keeps publication, pedagogical and commercial gates independent", () => {
  expect(
    lessonAccess({
      number: 3,
      published: true,
      pedagogical: true,
      entitled: false,
    }).canStart,
  ).toBe(true);
  expect(
    lessonAccess({
      number: 4,
      published: true,
      pedagogical: true,
      entitled: false,
    }).canStart,
  ).toBe(false);
  expect(
    lessonAccess({
      number: 10,
      published: true,
      pedagogical: false,
      entitled: true,
    }).canStart,
  ).toBe(false);
  expect(
    lessonAccess({
      number: 4,
      published: false,
      pedagogical: true,
      entitled: true,
    }).canStart,
  ).toBe(false);
  expect(
    lessonAccess({
      number: 61,
      published: true,
      pedagogical: true,
      entitled: true,
    }).canStart,
  ).toBe(false);
});
