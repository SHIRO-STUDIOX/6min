import { expect, it } from "vitest";
import { readJson } from "../../lib/server/request-security";

it("bounds actual streamed bytes and distinguishes unsupported type/malformed input", async () => {
  const request = (body: string, type = "application/json") => new Request("http://localhost/", { method: "POST", headers: { "Content-Type": type }, body });
  await expect(readJson(request('{"a":1}'))).resolves.toEqual({ a: 1 });
  await expect(readJson(request("{broken"))).rejects.toMatchObject({ status: 422 });
  await expect(readJson(request("hello", "text/plain"))).rejects.toMatchObject({ status: 415 });
  await expect(readJson(request('"سلام"'), 5)).rejects.toMatchObject({ status: 413 });
});
