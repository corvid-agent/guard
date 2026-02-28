import { describe, test, expect } from "bun:test";
import * as g from "../src/index";

// ─── String ─────────────────────────────────────────────────────────────────

describe("string", () => {
  const s = g.string();

  test("accepts strings", () => {
    expect(s.parse("hello")).toBe("hello");
    expect(s.parse("")).toBe("");
  });

  test("rejects non-strings", () => {
    expect(() => s.parse(42)).toThrow(g.ValidationError);
    expect(() => s.parse(null)).toThrow(g.ValidationError);
    expect(() => s.parse(undefined)).toThrow(g.ValidationError);
    expect(() => s.parse(true)).toThrow(g.ValidationError);
  });

  test("coerces to string", () => {
    expect(s.coerce(42)).toBe("42");
    expect(s.coerce(true)).toBe("true");
    expect(s.coerce(null)).toBe("");
    expect(s.coerce(undefined)).toBe("");
  });

  test("min/max/length", () => {
    expect(g.string().min(3).parse("abc")).toBe("abc");
    expect(() => g.string().min(3).parse("ab")).toThrow();
    expect(g.string().max(3).parse("abc")).toBe("abc");
    expect(() => g.string().max(3).parse("abcd")).toThrow();
    expect(g.string().length(3).parse("abc")).toBe("abc");
    expect(() => g.string().length(3).parse("ab")).toThrow();
  });

  test("pattern", () => {
    const hex = g.string().pattern(/^[0-9a-f]+$/);
    expect(hex.parse("deadbeef")).toBe("deadbeef");
    expect(() => hex.parse("xyz")).toThrow();
  });

  test("email", () => {
    const email = g.string().email();
    expect(email.parse("a@b.com")).toBe("a@b.com");
    expect(() => email.parse("not-email")).toThrow();
    expect(() => email.parse("@no-local.com")).toThrow();
  });

  test("url", () => {
    const url = g.string().url();
    expect(url.parse("https://example.com")).toBe("https://example.com");
    expect(() => url.parse("not a url")).toThrow();
  });

  test("startsWith/endsWith/includes", () => {
    expect(g.string().startsWith("he").parse("hello")).toBe("hello");
    expect(() => g.string().startsWith("he").parse("world")).toThrow();
    expect(g.string().endsWith("lo").parse("hello")).toBe("hello");
    expect(g.string().includes("ell").parse("hello")).toBe("hello");
  });

  test("nonempty", () => {
    expect(g.string().nonempty().parse("a")).toBe("a");
    expect(() => g.string().nonempty().parse("")).toThrow();
  });

  test("trim", () => {
    expect(g.string().trim().parse("  hello  ")).toBe("hello");
  });

  test("toLowerCase/toUpperCase", () => {
    expect(g.string().toLowerCase().parse("HELLO")).toBe("hello");
    expect(g.string().toUpperCase().parse("hello")).toBe("HELLO");
  });

  test("chaining constraints", () => {
    const s = g.string().min(2).max(10).startsWith("h");
    expect(s.parse("hello")).toBe("hello");
    expect(() => s.parse("h")).toThrow(); // too short
    expect(() => s.parse("world")).toThrow(); // wrong prefix
  });
});

// ─── Number ─────────────────────────────────────────────────────────────────

describe("number", () => {
  const n = g.number();

  test("accepts numbers", () => {
    expect(n.parse(42)).toBe(42);
    expect(n.parse(0)).toBe(0);
    expect(n.parse(-1.5)).toBe(-1.5);
  });

  test("rejects non-numbers", () => {
    expect(() => n.parse("42")).toThrow();
    expect(() => n.parse(null)).toThrow();
    expect(() => n.parse(NaN)).toThrow();
  });

  test("coerces to number", () => {
    expect(n.coerce("42")).toBe(42);
    expect(n.coerce("3.14")).toBe(3.14);
    expect(n.coerce(true)).toBe(1);
    expect(n.coerce(false)).toBe(0);
  });

  test("coerce rejects non-numeric strings", () => {
    expect(() => n.coerce("abc")).toThrow();
  });

  test("min/max", () => {
    expect(g.number().min(0).parse(0)).toBe(0);
    expect(() => g.number().min(0).parse(-1)).toThrow();
    expect(g.number().max(10).parse(10)).toBe(10);
    expect(() => g.number().max(10).parse(11)).toThrow();
  });

  test("int", () => {
    expect(g.number().int().parse(5)).toBe(5);
    expect(() => g.number().int().parse(5.5)).toThrow();
  });

  test("positive/negative/nonnegative", () => {
    expect(g.number().positive().parse(1)).toBe(1);
    expect(() => g.number().positive().parse(0)).toThrow();
    expect(g.number().negative().parse(-1)).toBe(-1);
    expect(() => g.number().negative().parse(0)).toThrow();
    expect(g.number().nonnegative().parse(0)).toBe(0);
    expect(() => g.number().nonnegative().parse(-1)).toThrow();
  });

  test("finite", () => {
    expect(g.number().finite().parse(42)).toBe(42);
    expect(() => g.number().finite().parse(Infinity)).toThrow();
    expect(() => g.number().finite().parse(-Infinity)).toThrow();
  });

  test("multipleOf", () => {
    expect(g.number().multipleOf(3).parse(9)).toBe(9);
    expect(() => g.number().multipleOf(3).parse(10)).toThrow();
  });
});

// ─── Boolean ────────────────────────────────────────────────────────────────

describe("boolean", () => {
  const b = g.boolean();

  test("accepts booleans", () => {
    expect(b.parse(true)).toBe(true);
    expect(b.parse(false)).toBe(false);
  });

  test("rejects non-booleans", () => {
    expect(() => b.parse(1)).toThrow();
    expect(() => b.parse("true")).toThrow();
    expect(() => b.parse(null)).toThrow();
  });

  test("coerces to boolean", () => {
    expect(b.coerce("true")).toBe(true);
    expect(b.coerce("false")).toBe(false);
    expect(b.coerce(1)).toBe(true);
    expect(b.coerce(0)).toBe(false);
  });
});

// ─── Date ───────────────────────────────────────────────────────────────────

describe("date", () => {
  const d = g.date();

  test("accepts dates", () => {
    const now = new Date();
    expect(d.parse(now)).toEqual(now);
  });

  test("rejects non-dates", () => {
    expect(() => d.parse("2024-01-01")).toThrow();
    expect(() => d.parse(12345)).toThrow();
    expect(() => d.parse(new Date("invalid"))).toThrow();
  });

  test("coerces strings and numbers to dates", () => {
    const result = d.coerce("2024-01-15T00:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");

    const fromNum = d.coerce(0);
    expect(fromNum).toBeInstanceOf(Date);
    expect(fromNum.getTime()).toBe(0);
  });

  test("min/max", () => {
    const min = new Date("2024-01-01");
    const max = new Date("2024-12-31");
    const schema = g.date().min(min).max(max);

    expect(schema.parse(new Date("2024-06-15"))).toBeInstanceOf(Date);
    expect(() => schema.parse(new Date("2023-06-15"))).toThrow();
    expect(() => schema.parse(new Date("2025-06-15"))).toThrow();
  });
});

// ─── Literal ────────────────────────────────────────────────────────────────

describe("literal", () => {
  test("accepts exact value", () => {
    expect(g.literal("hello").parse("hello")).toBe("hello");
    expect(g.literal(42).parse(42)).toBe(42);
    expect(g.literal(true).parse(true)).toBe(true);
  });

  test("rejects other values", () => {
    expect(() => g.literal("hello").parse("world")).toThrow();
    expect(() => g.literal(42).parse(43)).toThrow();
  });
});

// ─── Enum ───────────────────────────────────────────────────────────────────

describe("enum", () => {
  const color = g.enum(["red", "green", "blue"] as const);

  test("accepts valid values", () => {
    expect(color.parse("red")).toBe("red");
    expect(color.parse("green")).toBe("green");
  });

  test("rejects invalid values", () => {
    expect(() => color.parse("yellow")).toThrow();
    expect(() => color.parse(42)).toThrow();
  });

  test("exposes values", () => {
    expect(color.values).toEqual(["red", "green", "blue"]);
  });
});

describe("nativeEnum", () => {
  enum Direction {
    Up = "UP",
    Down = "DOWN",
  }

  const schema = g.nativeEnum(Direction);

  test("accepts valid enum values", () => {
    expect(schema.parse("UP")).toBe("UP");
    expect(schema.parse("DOWN")).toBe("DOWN");
  });

  test("rejects invalid values", () => {
    expect(() => schema.parse("LEFT")).toThrow();
    expect(() => schema.parse("Up")).toThrow();
  });
});

// ─── Union ──────────────────────────────────────────────────────────────────

describe("union", () => {
  const strOrNum = g.union(g.string(), g.number());

  test("accepts any matching variant", () => {
    expect(strOrNum.parse("hello")).toBe("hello");
    expect(strOrNum.parse(42)).toBe(42);
  });

  test("rejects non-matching values", () => {
    expect(() => strOrNum.parse(true)).toThrow();
    expect(() => strOrNum.parse(null)).toThrow();
  });
});

// ─── Discriminated Union ─────────────────────────────────────────────────────

describe("discriminatedUnion", () => {
  const Shape = g.discriminatedUnion("type", [
    g.object({ type: g.literal("circle"), radius: g.number() }),
    g.object({
      type: g.literal("rect"),
      width: g.number(),
      height: g.number(),
    }),
    g.object({ type: g.literal("point") }),
  ]);

  test("accepts valid circle", () => {
    const result = Shape.parse({ type: "circle", radius: 5 });
    expect(result).toEqual({ type: "circle", radius: 5 });
  });

  test("accepts valid rect", () => {
    const result = Shape.parse({ type: "rect", width: 10, height: 20 });
    expect(result).toEqual({ type: "rect", width: 10, height: 20 });
  });

  test("accepts variant with only discriminator", () => {
    const result = Shape.parse({ type: "point" });
    expect(result).toEqual({ type: "point" });
  });

  test("rejects invalid discriminator value", () => {
    const result = Shape.safeParse({ type: "triangle", base: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["type"]);
      expect(result.issues[0].message).toContain("Invalid discriminator value");
      expect(result.issues[0].received).toBe('"triangle"');
    }
  });

  test("rejects missing discriminator key", () => {
    const result = Shape.safeParse({ radius: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["type"]);
      expect(result.issues[0].message).toContain("Missing discriminator key");
    }
  });

  test("rejects non-objects", () => {
    expect(() => Shape.parse("circle")).toThrow();
    expect(() => Shape.parse(null)).toThrow();
    expect(() => Shape.parse(42)).toThrow();
    expect(() => Shape.parse([1])).toThrow();
  });

  test("validates variant fields after matching discriminator", () => {
    const result = Shape.safeParse({ type: "circle", radius: "five" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["radius"]);
      expect(result.issues[0].message).toBe("Expected number");
    }
  });

  test("validates variant with missing required fields", () => {
    const result = Shape.safeParse({ type: "rect", width: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["height"]);
    }
  });

  test("strips unknown keys", () => {
    const result = Shape.parse({ type: "circle", radius: 5, extra: true });
    expect(result).toEqual({ type: "circle", radius: 5 });
    expect((result as any).extra).toBeUndefined();
  });

  test("works with numeric literal discriminators", () => {
    const Message = g.discriminatedUnion("code", [
      g.object({ code: g.literal(200), data: g.string() }),
      g.object({ code: g.literal(404), error: g.string() }),
    ]);

    expect(Message.parse({ code: 200, data: "ok" })).toEqual({
      code: 200,
      data: "ok",
    });
    expect(Message.parse({ code: 404, error: "not found" })).toEqual({
      code: 404,
      error: "not found",
    });
    expect(() => Message.parse({ code: 500 })).toThrow();
  });

  test("works with boolean literal discriminators", () => {
    const Toggle = g.discriminatedUnion("enabled", [
      g.object({ enabled: g.literal(true), value: g.string() }),
      g.object({ enabled: g.literal(false), reason: g.string() }),
    ]);

    expect(Toggle.parse({ enabled: true, value: "on" })).toEqual({
      enabled: true,
      value: "on",
    });
    expect(Toggle.parse({ enabled: false, reason: "disabled" })).toEqual({
      enabled: false,
      reason: "disabled",
    });
  });

  test("throws on duplicate discriminator values", () => {
    expect(() =>
      g.discriminatedUnion("type", [
        g.object({ type: g.literal("a"), x: g.number() }),
        g.object({ type: g.literal("a"), y: g.number() }),
      ])
    ).toThrow(/Duplicate discriminator value/);
  });

  test("throws on missing discriminator in variant", () => {
    expect(() =>
      g.discriminatedUnion("type", [
        g.object({ kind: g.literal("a") }),
      ] as any)
    ).toThrow(/missing discriminator key/);
  });

  test("throws when discriminator is not a literal", () => {
    expect(() =>
      g.discriminatedUnion("type", [
        g.object({ type: g.string() }),
      ] as any)
    ).toThrow(/must use g\.literal/);
  });

  test("safeParse returns correct result shape", () => {
    const ok = Shape.safeParse({ type: "circle", radius: 5 });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value).toEqual({ type: "circle", radius: 5 });
    }

    const fail = Shape.safeParse({ type: "unknown" });
    expect(fail.ok).toBe(false);
    if (!fail.ok) {
      expect(fail.issues.length).toBeGreaterThan(0);
    }
  });

  test("type guard with .is()", () => {
    expect(Shape.is({ type: "circle", radius: 5 })).toBe(true);
    expect(Shape.is({ type: "circle", radius: "five" })).toBe(false);
    expect(Shape.is({ type: "triangle" })).toBe(false);
    expect(Shape.is("circle")).toBe(false);
  });

  test("works with optional fields in variants", () => {
    const Event = g.discriminatedUnion("kind", [
      g.object({
        kind: g.literal("click"),
        x: g.number(),
        y: g.number(),
        meta: g.string().optional(),
      }),
      g.object({
        kind: g.literal("keypress"),
        key: g.string(),
      }),
    ]);

    expect(Event.parse({ kind: "click", x: 10, y: 20 })).toEqual({
      kind: "click",
      x: 10,
      y: 20,
    });
    expect(
      Event.parse({ kind: "click", x: 10, y: 20, meta: "shift" })
    ).toEqual({ kind: "click", x: 10, y: 20, meta: "shift" });
  });

  test("error path includes discriminator for nested usage", () => {
    const Schema = g.object({
      shape: Shape,
    });

    const result = Schema.safeParse({ shape: { type: "circle", radius: "x" } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["shape", "radius"]);
    }
  });

  test("error path for invalid discriminator in nested context", () => {
    const Schema = g.object({
      shape: Shape,
    });

    const result = Schema.safeParse({ shape: { type: "hexagon" } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["shape", "type"]);
    }
  });
});

// ─── Intersection ───────────────────────────────────────────────────────────

describe("intersection", () => {
  test("merges two object schemas", () => {
    const a = g.object({ name: g.string() });
    const b = g.object({ age: g.number() });
    const both = g.intersection(a, b);

    const result = both.parse({ name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  test("fails if either side fails", () => {
    const a = g.object({ name: g.string() });
    const b = g.object({ age: g.number() });
    const both = g.intersection(a, b);

    expect(() => both.parse({ name: "Alice" })).toThrow();
    expect(() => both.parse({ age: 30 })).toThrow();
  });
});

// ─── Object ─────────────────────────────────────────────────────────────────

describe("object", () => {
  const user = g.object({
    name: g.string(),
    age: g.number(),
  });

  test("accepts valid objects", () => {
    expect(user.parse({ name: "Alice", age: 30 })).toEqual({
      name: "Alice",
      age: 30,
    });
  });

  test("rejects invalid fields", () => {
    expect(() => user.parse({ name: 42, age: 30 })).toThrow();
    expect(() => user.parse({ name: "Alice" })).toThrow();
  });

  test("rejects non-objects", () => {
    expect(() => user.parse("string")).toThrow();
    expect(() => user.parse(null)).toThrow();
    expect(() => user.parse([1, 2])).toThrow();
  });

  test("strips unknown keys by default", () => {
    const result = user.parse({ name: "Alice", age: 30, extra: true });
    expect(result).toEqual({ name: "Alice", age: 30 });
    expect((result as any).extra).toBeUndefined();
  });

  test("strict mode rejects unknown keys", () => {
    const strict = user.strict();
    expect(() =>
      strict.parse({ name: "Alice", age: 30, extra: true })
    ).toThrow();
  });

  test("passthrough allows unknown keys", () => {
    const pass = user.passthrough();
    const result = pass.parse({ name: "Alice", age: 30, extra: true });
    expect(result).toEqual({ name: "Alice", age: 30, extra: true });
  });

  test("catchall validates unknown keys", () => {
    const withCatchall = user.catchall(g.boolean());
    const result = withCatchall.parse({
      name: "Alice",
      age: 30,
      active: true,
    });
    expect(result).toEqual({ name: "Alice", age: 30, active: true });

    expect(() =>
      withCatchall.parse({ name: "Alice", age: 30, extra: "string" })
    ).toThrow();
  });

  test("extend adds new fields", () => {
    const extended = user.extend({ email: g.string().email() });
    const result = extended.parse({
      name: "Alice",
      age: 30,
      email: "a@b.com",
    });
    expect(result).toEqual({ name: "Alice", age: 30, email: "a@b.com" });
  });

  test("pick selects fields", () => {
    const nameOnly = user.pick("name");
    expect(nameOnly.parse({ name: "Alice" })).toEqual({ name: "Alice" });
  });

  test("omit removes fields", () => {
    const noAge = user.omit("age");
    expect(noAge.parse({ name: "Alice" })).toEqual({ name: "Alice" });
  });

  test("partial makes all fields optional", () => {
    const partial = user.partial();
    expect(partial.parse({})).toEqual({});
    expect(partial.parse({ name: "Alice" })).toEqual({ name: "Alice" });
  });

  test("merge combines schemas", () => {
    const extra = g.object({ email: g.string() });
    const merged = user.merge(extra);
    expect(
      merged.parse({ name: "Alice", age: 30, email: "a@b.com" })
    ).toEqual({ name: "Alice", age: 30, email: "a@b.com" });
  });

  test("keyof returns enum of keys", () => {
    const keys = user.keyof();
    expect(keys.parse("name")).toBe("name");
    expect(keys.parse("age")).toBe("age");
    expect(() => keys.parse("email")).toThrow();
  });

  test("nested objects", () => {
    const schema = g.object({
      user: g.object({
        name: g.string(),
        address: g.object({
          city: g.string(),
        }),
      }),
    });

    const result = schema.parse({
      user: { name: "Alice", address: { city: "NYC" } },
    });
    expect(result.user.address.city).toBe("NYC");
  });

  test("nested error paths", () => {
    const schema = g.object({
      user: g.object({
        name: g.string(),
      }),
    });

    const result = schema.safeParse({ user: { name: 42 } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual(["user", "name"]);
    }
  });
});

// ─── Array ──────────────────────────────────────────────────────────────────

describe("array", () => {
  const nums = g.array(g.number());

  test("accepts valid arrays", () => {
    expect(nums.parse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(nums.parse([])).toEqual([]);
  });

  test("rejects non-arrays", () => {
    expect(() => nums.parse("not array")).toThrow();
    expect(() => nums.parse({ 0: 1 })).toThrow();
  });

  test("validates each element", () => {
    expect(() => nums.parse([1, "two", 3])).toThrow();
  });

  test("element error paths include index", () => {
    const result = nums.safeParse([1, "two", 3]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].path).toEqual([1]);
    }
  });

  test("min/max/length", () => {
    expect(nums.min(2).parse([1, 2])).toEqual([1, 2]);
    expect(() => nums.min(2).parse([1])).toThrow();
    expect(nums.max(2).parse([1, 2])).toEqual([1, 2]);
    expect(() => nums.max(2).parse([1, 2, 3])).toThrow();
    expect(nums.length(2).parse([1, 2])).toEqual([1, 2]);
  });

  test("nonempty", () => {
    expect(nums.nonempty().parse([1])).toEqual([1]);
    expect(() => nums.nonempty().parse([])).toThrow();
  });
});

// ─── Tuple ──────────────────────────────────────────────────────────────────

describe("tuple", () => {
  const pair = g.tuple(g.string(), g.number());

  test("accepts valid tuples", () => {
    expect(pair.parse(["hello", 42])).toEqual(["hello", 42]);
  });

  test("rejects wrong length", () => {
    expect(() => pair.parse(["hello"])).toThrow();
    expect(() => pair.parse(["hello", 42, true])).toThrow();
  });

  test("validates each element", () => {
    expect(() => pair.parse([42, "hello"])).toThrow();
  });
});

// ─── Record ─────────────────────────────────────────────────────────────────

describe("record", () => {
  test("validates values", () => {
    const dict = g.record(g.number());
    expect(dict.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(() => dict.parse({ a: "one" })).toThrow();
  });

  test("validates keys with enum", () => {
    const dict = g.record(g.enum(["a", "b"] as const), g.number());
    expect(dict.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(() => dict.parse({ c: 3 })).toThrow();
  });

  test("rejects non-objects", () => {
    expect(() => g.record(g.string()).parse(42)).toThrow();
    expect(() => g.record(g.string()).parse(null)).toThrow();
    expect(() => g.record(g.string()).parse([1])).toThrow();
  });
});

// ─── Optional / Nullable / Default ─────────────────────────────────────────

describe("optional", () => {
  const s = g.string().optional();

  test("accepts value or undefined", () => {
    expect(s.parse("hello")).toBe("hello");
    expect(s.parse(undefined)).toBeUndefined();
  });

  test("still rejects wrong types", () => {
    expect(() => s.parse(42)).toThrow();
  });
});

describe("nullable", () => {
  const s = g.string().nullable();

  test("accepts value or null", () => {
    expect(s.parse("hello")).toBe("hello");
    expect(s.parse(null)).toBeNull();
  });

  test("still rejects wrong types", () => {
    expect(() => s.parse(undefined)).toThrow();
  });
});

describe("default", () => {
  const s = g.string().default("fallback");

  test("uses default for undefined", () => {
    expect(s.parse(undefined)).toBe("fallback");
  });

  test("uses provided value when present", () => {
    expect(s.parse("hello")).toBe("hello");
  });
});

// ─── Transform / Refine / Pipe ──────────────────────────────────────────────

describe("transform", () => {
  test("transforms the parsed value", () => {
    const len = g.string().transform((s) => s.length);
    expect(len.parse("hello")).toBe(5);
  });

  test("catches transform errors", () => {
    const bad = g.string().transform(() => {
      throw new Error("oops");
    });
    expect(() => bad.parse("hello")).toThrow();
  });
});

describe("refine", () => {
  test("adds custom validation", () => {
    const even = g.number().refine((n) => n % 2 === 0, "Must be even");
    expect(even.parse(4)).toBe(4);
    expect(() => even.parse(3)).toThrow();
  });

  test("uses default message", () => {
    const positive = g.number().refine((n) => n > 0);
    const result = positive.safeParse(-1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].message).toBe("Refinement check failed");
    }
  });
});

describe("pipe", () => {
  test("chains schemas", () => {
    const toNum = g
      .string()
      .transform((s) => Number(s))
      .pipe(g.number().int().positive());
    expect(toNum.parse("42")).toBe(42);
    expect(() => toNum.parse("3.14")).toThrow(); // not int
    expect(() => toNum.parse("-5")).toThrow(); // not positive
  });
});

// ─── Special Schemas ────────────────────────────────────────────────────────

describe("any", () => {
  test("accepts anything", () => {
    expect(g.any().parse("hello")).toBe("hello");
    expect(g.any().parse(42)).toBe(42);
    expect(g.any().parse(null)).toBeNull();
  });
});

describe("unknown", () => {
  test("accepts anything", () => {
    expect(g.unknown().parse("hello")).toBe("hello");
    expect(g.unknown().parse(null)).toBeNull();
  });
});

describe("never", () => {
  test("rejects everything", () => {
    expect(() => g.never().parse("anything")).toThrow();
    expect(() => g.never().parse(undefined)).toThrow();
  });
});

describe("null", () => {
  test("accepts only null", () => {
    expect(g.null().parse(null)).toBeNull();
    expect(() => g.null().parse(undefined)).toThrow();
    expect(() => g.null().parse(0)).toThrow();
  });
});

describe("undefined", () => {
  test("accepts only undefined", () => {
    expect(g.undefined().parse(undefined)).toBeUndefined();
    expect(() => g.undefined().parse(null)).toThrow();
    expect(() => g.undefined().parse(0)).toThrow();
  });
});

describe("instanceof", () => {
  test("validates class instances", () => {
    const dateSchema = g.instanceof(Date);
    const now = new Date();
    expect(dateSchema.parse(now)).toEqual(now);
    expect(() => dateSchema.parse("not a date")).toThrow();
  });
});

describe("lazy", () => {
  test("supports recursive schemas", () => {
    type Tree = {
      value: string;
      children: Tree[];
    };

    const tree: g.Schema<Tree> = g.lazy(() =>
      g.object({
        value: g.string(),
        children: g.array(tree),
      })
    );

    const result = tree.parse({
      value: "root",
      children: [
        { value: "child1", children: [] },
        {
          value: "child2",
          children: [{ value: "grandchild", children: [] }],
        },
      ],
    });

    expect(result.value).toBe("root");
    expect(result.children[1].children[0].value).toBe("grandchild");
  });
});

// ─── safeParse / safeCoerce ─────────────────────────────────────────────────

describe("safeParse", () => {
  test("returns ok result on success", () => {
    const result = g.string().safeParse("hello");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("hello");
  });

  test("returns error result on failure", () => {
    const result = g.string().safeParse(42);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("safeCoerce", () => {
  test("coerces and returns ok result", () => {
    const result = g.number().safeCoerce("42");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });
});

// ─── is (type guard) ────────────────────────────────────────────────────────

describe("is", () => {
  test("returns true for valid values", () => {
    expect(g.string().is("hello")).toBe(true);
    expect(g.number().is(42)).toBe(true);
  });

  test("returns false for invalid values", () => {
    expect(g.string().is(42)).toBe(false);
    expect(g.number().is("42")).toBe(false);
  });
});

// ─── ValidationError ────────────────────────────────────────────────────────

describe("ValidationError", () => {
  test("has issues array", () => {
    try {
      g.string().parse(42);
    } catch (err) {
      expect(err).toBeInstanceOf(g.ValidationError);
      expect((err as g.ValidationError).issues).toBeInstanceOf(Array);
      expect((err as g.ValidationError).issues[0].message).toBe(
        "Expected string"
      );
    }
  });

  test("formats path in message", () => {
    const schema = g.object({ user: g.object({ name: g.string() }) });
    try {
      schema.parse({ user: { name: 42 } });
    } catch (err) {
      expect((err as g.ValidationError).message).toContain("user.name");
    }
  });
});

// ─── Standalone parse / safeParse ───────────────────────────────────────────

describe("standalone parse/safeParse", () => {
  test("parse works", () => {
    expect(g.parse(g.string(), "hello")).toBe("hello");
    expect(() => g.parse(g.string(), 42)).toThrow();
  });

  test("safeParse works", () => {
    expect(g.safeParse(g.string(), "hello")).toEqual({
      ok: true,
      value: "hello",
    });
    expect(g.safeParse(g.string(), 42).ok).toBe(false);
  });
});

// ─── Complex Real-World Schema ──────────────────────────────────────────────

describe("real-world schema", () => {
  const CreateUserRequest = g.object({
    username: g.string().min(3).max(20).pattern(/^[a-z0-9_]+$/),
    email: g.string().email(),
    age: g.number().int().min(13).max(120).optional(),
    role: g.enum(["user", "admin", "moderator"] as const).default("user"),
    tags: g.array(g.string()).max(10).default([]),
    metadata: g.record(g.unknown()).optional(),
  });

  test("accepts valid input", () => {
    const result = CreateUserRequest.parse({
      username: "alice_42",
      email: "alice@example.com",
      age: 25,
      role: "admin",
      tags: ["typescript", "algorand"],
    });

    expect(result.username).toBe("alice_42");
    expect(result.role).toBe("admin");
    expect(result.tags).toEqual(["typescript", "algorand"]);
  });

  test("applies defaults", () => {
    const result = CreateUserRequest.parse({
      username: "bob",
      email: "bob@example.com",
    });

    expect(result.role).toBe("user");
    expect(result.tags).toEqual([]);
  });

  test("rejects invalid input with multiple issues", () => {
    const result = CreateUserRequest.safeParse({
      username: "A",
      email: "not-email",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
