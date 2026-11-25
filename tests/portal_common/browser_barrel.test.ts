import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "../../src/portal/common");
const read = (f: string) => readFileSync(join(dir, f), "utf8");

describe("portal/common/browser stays bundle-light", () => {
  const modules = read("browser.ts")
    .split("\n")
    .map((l) => /from "\.\/([\w/]+)"/.exec(l)?.[1])
    .filter((m): m is string => !!m);

  it("re-exports at least the formatting and locale modules", () => {
    expect(modules).toEqual(expect.arrayContaining(["format", "money", "locale", "pagination"]));
  });

  for (const m of modules) {
    it(`${m} imports neither zod nor the SDK models`, () => {
      const imports = [...read(`${m}.ts`).matchAll(/^import[^;]*from "([^"]+)"/gm)]
        .filter((x) => !x[0].startsWith("import type"))
        .map((x) => x[1]);
      for (const spec of imports) {
        expect(spec, m).not.toMatch(/^zod$|^\.\.\/\.\.\/|^\.\.\/validation\/(?!hf_options)/);
      }
    });
  }
});
