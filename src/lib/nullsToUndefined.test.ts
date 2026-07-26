import { describe, expect, it } from "vitest";
import { nullsToUndefined } from "./nullsToUndefined";

describe("nullsToUndefined", () => {
  it("converts every null-valued key to undefined", () => {
    expect(nullsToUndefined({ a: null, b: "kept", c: null })).toEqual({ a: undefined, b: "kept", c: undefined });
  });

  it("leaves non-null values, including falsy ones, untouched", () => {
    expect(nullsToUndefined({ a: 0, b: "", c: false, d: undefined })).toEqual({ a: 0, b: "", c: false, d: undefined });
  });

  it("does not mutate the input object", () => {
    const input = { a: null as string | null };
    const result = nullsToUndefined(input);
    expect(input.a).toBeNull();
    expect(result.a).toBeUndefined();
  });

  it("returns an empty object unchanged", () => {
    expect(nullsToUndefined({})).toEqual({});
  });
});
