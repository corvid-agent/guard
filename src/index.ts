// guard — Type-safe schema validation with inference, parsing, and coercion.
// Zero deps. TypeScript-first.

// ─── Error Types ────────────────────────────────────────────────────────────

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
}

export class ValidationError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const msg = issues
      .map((i) => {
        const path = i.path.length ? i.path.join(".") + ": " : "";
        return path + i.message;
      })
      .join("; ");
    super(msg);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

// ─── Result Type ────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

// ─── Schema Base ────────────────────────────────────────────────────────────

export type Infer<S extends Schema<any>> = S extends Schema<infer T>
  ? T
  : never;

export abstract class Schema<T> {
  abstract _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T>;

  /** Parse and return the value, or throw ValidationError. */
  parse(value: unknown): T {
    const result = this._parse(value, [], false);
    if (!result.ok) throw new ValidationError(result.issues);
    return result.value;
  }

  /** Parse and return a result object (never throws). */
  safeParse(value: unknown): ParseResult<T> {
    return this._parse(value, [], false);
  }

  /** Parse with coercion enabled (e.g. "123" → 123 for number). */
  coerce(value: unknown): T {
    const result = this._parse(value, [], true);
    if (!result.ok) throw new ValidationError(result.issues);
    return result.value;
  }

  /** Parse with coercion, returning a result (never throws). */
  safeCoerce(value: unknown): ParseResult<T> {
    return this._parse(value, [], true);
  }

  /** Make this schema optional (value | undefined). */
  optional(): OptionalSchema<T> {
    return new OptionalSchema(this);
  }

  /** Make this schema nullable (value | null). */
  nullable(): NullableSchema<T> {
    return new NullableSchema(this);
  }

  /** Provide a default value when input is undefined. */
  default(defaultValue: T): DefaultSchema<T> {
    return new DefaultSchema(this, defaultValue);
  }

  /** Transform the parsed value. */
  transform<U>(fn: (value: T) => U): TransformSchema<T, U> {
    return new TransformSchema(this, fn);
  }

  /** Add a custom refinement check. */
  refine(check: (value: T) => boolean, message?: string): RefineSchema<T> {
    return new RefineSchema(this, check, message ?? "Refinement check failed");
  }

  /** Pipe into another schema (parse with this, then validate with next). */
  pipe<U>(next: Schema<U>): PipeSchema<T, U> {
    return new PipeSchema(this, next);
  }

  /** Check if a value is valid (returns boolean). */
  is(value: unknown): value is T {
    return this._parse(value, [], false).ok;
  }
}

// ─── Primitive Schemas ──────────────────────────────────────────────────────

export class StringSchema extends Schema<string> {
  private _checks: Array<{
    check: (v: string) => boolean;
    message: string;
    expected?: string;
  }> = [];

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<string> {
    let v = value;
    if (coerce && typeof v !== "string") {
      if (v === null || v === undefined) v = "";
      else v = String(v);
    }
    if (typeof v !== "string") {
      return {
        ok: false,
        issues: [
          { path, message: "Expected string", expected: "string", received: typeof v },
        ],
      };
    }
    for (const c of this._checks) {
      if (!c.check(v)) {
        return {
          ok: false,
          issues: [{ path, message: c.message, expected: c.expected }],
        };
      }
    }
    return { ok: true, value: v };
  }

  private _add(
    check: (v: string) => boolean,
    message: string,
    expected?: string
  ): StringSchema {
    const s = new StringSchema();
    s._checks = [...this._checks, { check, message, expected }];
    return s;
  }

  min(n: number): StringSchema {
    return this._add(
      (v) => v.length >= n,
      `String must be at least ${n} characters`,
      `min(${n})`
    );
  }

  max(n: number): StringSchema {
    return this._add(
      (v) => v.length <= n,
      `String must be at most ${n} characters`,
      `max(${n})`
    );
  }

  length(n: number): StringSchema {
    return this._add(
      (v) => v.length === n,
      `String must be exactly ${n} characters`,
      `length(${n})`
    );
  }

  pattern(re: RegExp): StringSchema {
    return this._add(
      (v) => re.test(v),
      `String must match pattern ${re}`,
      `pattern(${re})`
    );
  }

  email(): StringSchema {
    return this._add(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email address",
      "email"
    );
  }

  url(): StringSchema {
    return this._add(
      (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      "Invalid URL",
      "url"
    );
  }

  startsWith(prefix: string): StringSchema {
    return this._add(
      (v) => v.startsWith(prefix),
      `String must start with "${prefix}"`,
      `startsWith("${prefix}")`
    );
  }

  endsWith(suffix: string): StringSchema {
    return this._add(
      (v) => v.endsWith(suffix),
      `String must end with "${suffix}"`,
      `endsWith("${suffix}")`
    );
  }

  includes(substr: string): StringSchema {
    return this._add(
      (v) => v.includes(substr),
      `String must include "${substr}"`,
      `includes("${substr}")`
    );
  }

  nonempty(): StringSchema {
    return this.min(1);
  }

  trim(): TransformSchema<string, string> {
    return this.transform((v) => v.trim());
  }

  toLowerCase(): TransformSchema<string, string> {
    return this.transform((v) => v.toLowerCase());
  }

  toUpperCase(): TransformSchema<string, string> {
    return this.transform((v) => v.toUpperCase());
  }
}

export class NumberSchema extends Schema<number> {
  private _checks: Array<{
    check: (v: number) => boolean;
    message: string;
    expected?: string;
  }> = [];

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<number> {
    let v = value;
    if (coerce && typeof v !== "number") {
      if (typeof v === "string") {
        const n = Number(v);
        if (!Number.isNaN(n)) v = n;
      } else if (typeof v === "boolean") {
        v = v ? 1 : 0;
      }
    }
    if (typeof v !== "number" || Number.isNaN(v)) {
      return {
        ok: false,
        issues: [
          { path, message: "Expected number", expected: "number", received: typeof v },
        ],
      };
    }
    for (const c of this._checks) {
      if (!c.check(v)) {
        return {
          ok: false,
          issues: [{ path, message: c.message, expected: c.expected }],
        };
      }
    }
    return { ok: true, value: v };
  }

  private _add(
    check: (v: number) => boolean,
    message: string,
    expected?: string
  ): NumberSchema {
    const s = new NumberSchema();
    s._checks = [...this._checks, { check, message, expected }];
    return s;
  }

  min(n: number): NumberSchema {
    return this._add((v) => v >= n, `Number must be >= ${n}`, `min(${n})`);
  }

  max(n: number): NumberSchema {
    return this._add((v) => v <= n, `Number must be <= ${n}`, `max(${n})`);
  }

  int(): NumberSchema {
    return this._add((v) => Number.isInteger(v), "Expected integer", "int");
  }

  positive(): NumberSchema {
    return this._add((v) => v > 0, "Expected positive number", "positive");
  }

  negative(): NumberSchema {
    return this._add((v) => v < 0, "Expected negative number", "negative");
  }

  nonnegative(): NumberSchema {
    return this._add(
      (v) => v >= 0,
      "Expected non-negative number",
      "nonnegative"
    );
  }

  finite(): NumberSchema {
    return this._add((v) => Number.isFinite(v), "Expected finite number", "finite");
  }

  multipleOf(n: number): NumberSchema {
    return this._add(
      (v) => v % n === 0,
      `Expected multiple of ${n}`,
      `multipleOf(${n})`
    );
  }
}

export class BooleanSchema extends Schema<boolean> {
  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<boolean> {
    let v = value;
    if (coerce && typeof v !== "boolean") {
      if (v === "true" || v === 1) v = true;
      else if (v === "false" || v === 0) v = false;
    }
    if (typeof v !== "boolean") {
      return {
        ok: false,
        issues: [
          {
            path,
            message: "Expected boolean",
            expected: "boolean",
            received: typeof v,
          },
        ],
      };
    }
    return { ok: true, value: v };
  }
}

export class DateSchema extends Schema<Date> {
  private _checks: Array<{
    check: (v: Date) => boolean;
    message: string;
  }> = [];

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<Date> {
    let v = value;
    if (coerce && !(v instanceof Date)) {
      if (typeof v === "string" || typeof v === "number") {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) v = d;
      }
    }
    if (!(v instanceof Date) || Number.isNaN(v.getTime())) {
      return {
        ok: false,
        issues: [{ path, message: "Expected valid Date", expected: "Date" }],
      };
    }
    for (const c of this._checks) {
      if (!c.check(v)) {
        return { ok: false, issues: [{ path, message: c.message }] };
      }
    }
    return { ok: true, value: v };
  }

  private _add(check: (v: Date) => boolean, message: string): DateSchema {
    const s = new DateSchema();
    s._checks = [...this._checks, { check, message }];
    return s;
  }

  min(date: Date): DateSchema {
    return this._add(
      (v) => v.getTime() >= date.getTime(),
      `Date must be on or after ${date.toISOString()}`
    );
  }

  max(date: Date): DateSchema {
    return this._add(
      (v) => v.getTime() <= date.getTime(),
      `Date must be on or before ${date.toISOString()}`
    );
  }
}

// ─── Literal / Enum / Union ─────────────────────────────────────────────────

export class LiteralSchema<T extends string | number | boolean> extends Schema<T> {
  constructor(private readonly _value: T) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<T> {
    if (value !== this._value) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Expected ${JSON.stringify(this._value)}`,
            expected: JSON.stringify(this._value),
            received: JSON.stringify(value),
          },
        ],
      };
    }
    return { ok: true, value: value as T };
  }
}

export class EnumSchema<T extends string> extends Schema<T> {
  private readonly _set: Set<string>;

  constructor(private readonly _values: readonly T[]) {
    super();
    this._set = new Set(_values);
  }

  get values(): readonly T[] {
    return this._values;
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<T> {
    if (typeof value !== "string" || !this._set.has(value)) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Expected one of: ${this._values.map((v) => JSON.stringify(v)).join(", ")}`,
            expected: this._values.join(" | "),
            received: JSON.stringify(value),
          },
        ],
      };
    }
    return { ok: true, value: value as T };
  }
}

export class NativeEnumSchema<T extends Record<string, string | number>> extends Schema<
  T[keyof T]
> {
  private readonly _validValues: Set<string | number>;

  constructor(private readonly _enum: T) {
    super();
    this._validValues = new Set(Object.values(_enum));
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<T[keyof T]> {
    if (!this._validValues.has(value as string | number)) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Expected one of enum values: ${[...this._validValues].map((v) => JSON.stringify(v)).join(", ")}`,
            received: JSON.stringify(value),
          },
        ],
      };
    }
    return { ok: true, value: value as T[keyof T] };
  }
}

type SchemaFromTuple<T extends readonly Schema<any>[]> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
};

export class UnionSchema<
  T extends readonly Schema<any>[],
> extends Schema<SchemaFromTuple<T>[number]> {
  constructor(private readonly _schemas: T) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<SchemaFromTuple<T>[number]> {
    const allIssues: ValidationIssue[] = [];
    for (const schema of this._schemas) {
      const result = schema._parse(value, path, coerce);
      if (result.ok) return result;
      allIssues.push(...result.issues);
    }
    return {
      ok: false,
      issues: [
        {
          path,
          message: `Value did not match any variant in union`,
          received: typeof value,
        },
      ],
    };
  }
}

export class IntersectionSchema<A, B> extends Schema<A & B> {
  constructor(
    private readonly _left: Schema<A>,
    private readonly _right: Schema<B>
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<A & B> {
    const leftResult = this._left._parse(value, path, coerce);
    if (!leftResult.ok) return leftResult as ParseResult<A & B>;

    const rightResult = this._right._parse(value, path, coerce);
    if (!rightResult.ok) return rightResult as ParseResult<A & B>;

    // Merge object results
    if (
      typeof leftResult.value === "object" &&
      leftResult.value !== null &&
      typeof rightResult.value === "object" &&
      rightResult.value !== null
    ) {
      return {
        ok: true,
        value: { ...leftResult.value, ...rightResult.value } as A & B,
      };
    }

    return { ok: true, value: leftResult.value as A & B };
  }
}

// ─── Object Schema ──────────────────────────────────────────────────────────

type ObjectShape = Record<string, Schema<any>>;

type InferShape<S extends ObjectShape> = {
  [K in keyof S as S[K] extends OptionalSchema<any> | DefaultSchema<any>
    ? never
    : K]: Infer<S[K]>;
} & {
  [K in keyof S as S[K] extends OptionalSchema<any> | DefaultSchema<any>
    ? K
    : never]?: Infer<S[K]>;
};

type Flatten<T> = { [K in keyof T]: T[K] } & {};

export class ObjectSchema<S extends ObjectShape> extends Schema<
  Flatten<InferShape<S>>
> {
  private _strict = false;
  private _catchall: Schema<any> | null = null;

  constructor(private readonly _shape: S) {
    super();
  }

  get shape(): S {
    return this._shape;
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<Flatten<InferShape<S>>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: "Expected object",
            expected: "object",
            received: Array.isArray(value) ? "array" : typeof value,
          },
        ],
      };
    }

    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];

    // Validate known keys
    for (const [key, schema] of Object.entries(this._shape)) {
      const result = schema._parse(input[key], [...path, key], coerce);
      if (result.ok) {
        if (result.value !== undefined) {
          output[key] = result.value;
        }
      } else {
        issues.push(...result.issues);
      }
    }

    // Handle unknown keys
    for (const key of Object.keys(input)) {
      if (key in this._shape) continue;
      if (this._catchall) {
        const result = this._catchall._parse(input[key], [...path, key], coerce);
        if (result.ok) {
          output[key] = result.value;
        } else {
          issues.push(...result.issues);
        }
      } else if (this._strict) {
        issues.push({
          path: [...path, key],
          message: `Unrecognized key "${key}"`,
        });
      }
      // passthrough by default: unknown keys are dropped (strip mode)
    }

    if (issues.length) return { ok: false, issues };
    return { ok: true, value: output as Flatten<InferShape<S>> };
  }

  /** Reject objects with unknown keys. */
  strict(): ObjectSchema<S> {
    const s = new ObjectSchema(this._shape);
    s._strict = true;
    return s;
  }

  /** Allow unknown keys and pass them through. */
  passthrough(): PassthroughObjectSchema<S> {
    return new PassthroughObjectSchema(this._shape);
  }

  /** Validate unknown keys with a catchall schema. */
  catchall<C>(schema: Schema<C>): ObjectSchema<S> {
    const s = new ObjectSchema(this._shape);
    s._catchall = schema;
    return s;
  }

  /** Create a new schema with additional keys. */
  extend<E extends ObjectShape>(
    extension: E
  ): ObjectSchema<S & E> {
    return new ObjectSchema({ ...this._shape, ...extension });
  }

  /** Create a new schema with only the specified keys. */
  pick<K extends keyof S>(...keys: K[]): ObjectSchema<Pick<S, K>> {
    const shape: any = {};
    for (const key of keys) {
      shape[key] = this._shape[key];
    }
    return new ObjectSchema(shape);
  }

  /** Create a new schema without the specified keys. */
  omit<K extends keyof S>(...keys: K[]): ObjectSchema<Omit<S, K>> {
    const shape: any = { ...this._shape };
    for (const key of keys) {
      delete shape[key];
    }
    return new ObjectSchema(shape);
  }

  /** Make all properties optional. */
  partial(): ObjectSchema<{ [K in keyof S]: OptionalSchema<Infer<S[K]>> }> {
    const shape: any = {};
    for (const [key, schema] of Object.entries(this._shape)) {
      shape[key] = schema.optional();
    }
    return new ObjectSchema(shape);
  }

  /** Merge with another object schema. */
  merge<O extends ObjectShape>(other: ObjectSchema<O>): ObjectSchema<S & O> {
    return new ObjectSchema({ ...this._shape, ...other._shape });
  }

  /** Get the keys of this object schema. */
  keyof(): EnumSchema<Extract<keyof S, string>> {
    return new EnumSchema(
      Object.keys(this._shape) as Extract<keyof S, string>[]
    );
  }
}

class PassthroughObjectSchema<S extends ObjectShape> extends Schema<
  Flatten<InferShape<S>> & Record<string, unknown>
> {
  constructor(private readonly _shape: S) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<Flatten<InferShape<S>> & Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        issues: [
          { path, message: "Expected object", expected: "object" },
        ],
      };
    }

    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];

    for (const [key, schema] of Object.entries(this._shape)) {
      const result = schema._parse(input[key], [...path, key], coerce);
      if (result.ok) {
        if (result.value !== undefined) output[key] = result.value;
      } else {
        issues.push(...result.issues);
      }
    }

    // Pass through unknown keys
    for (const key of Object.keys(input)) {
      if (!(key in this._shape)) {
        output[key] = input[key];
      }
    }

    if (issues.length) return { ok: false, issues };
    return {
      ok: true,
      value: output as Flatten<InferShape<S>> & Record<string, unknown>,
    };
  }
}

// ─── Array / Tuple / Record ─────────────────────────────────────────────────

export class ArraySchema<T> extends Schema<T[]> {
  private _checks: Array<{
    check: (v: T[]) => boolean;
    message: string;
  }> = [];

  constructor(private readonly _element: Schema<T>) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T[]> {
    if (!Array.isArray(value)) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: "Expected array",
            expected: "array",
            received: typeof value,
          },
        ],
      };
    }

    const output: T[] = [];
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < value.length; i++) {
      const result = this._element._parse(value[i], [...path, i], coerce);
      if (result.ok) {
        output.push(result.value);
      } else {
        issues.push(...result.issues);
      }
    }

    if (issues.length) return { ok: false, issues };

    for (const c of this._checks) {
      if (!c.check(output)) {
        return { ok: false, issues: [{ path, message: c.message }] };
      }
    }

    return { ok: true, value: output };
  }

  private _add(check: (v: T[]) => boolean, message: string): ArraySchema<T> {
    const s = new ArraySchema(this._element);
    s._checks = [...this._checks, { check, message }];
    return s;
  }

  min(n: number): ArraySchema<T> {
    return this._add(
      (v) => v.length >= n,
      `Array must have at least ${n} items`
    );
  }

  max(n: number): ArraySchema<T> {
    return this._add(
      (v) => v.length <= n,
      `Array must have at most ${n} items`
    );
  }

  length(n: number): ArraySchema<T> {
    return this._add(
      (v) => v.length === n,
      `Array must have exactly ${n} items`
    );
  }

  nonempty(): ArraySchema<T> {
    return this.min(1);
  }
}

type InferTuple<T extends readonly Schema<any>[]> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
};

export class TupleSchema<T extends readonly Schema<any>[]> extends Schema<
  InferTuple<T>
> {
  constructor(private readonly _schemas: T) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<InferTuple<T>> {
    if (!Array.isArray(value)) {
      return {
        ok: false,
        issues: [{ path, message: "Expected array (tuple)", expected: "array" }],
      };
    }
    if (value.length !== this._schemas.length) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Expected tuple of length ${this._schemas.length}, got ${value.length}`,
          },
        ],
      };
    }

    const output: any[] = [];
    const issues: ValidationIssue[] = [];

    for (let i = 0; i < this._schemas.length; i++) {
      const result = this._schemas[i]._parse(value[i], [...path, i], coerce);
      if (result.ok) {
        output.push(result.value);
      } else {
        issues.push(...result.issues);
      }
    }

    if (issues.length) return { ok: false, issues };
    return { ok: true, value: output as InferTuple<T> };
  }
}

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {
  constructor(
    private readonly _key: Schema<K>,
    private readonly _value: Schema<V>
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<Record<K, V>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {
        ok: false,
        issues: [{ path, message: "Expected object (record)", expected: "object" }],
      };
    }

    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];

    for (const [k, v] of Object.entries(input)) {
      const keyResult = this._key._parse(k, [...path, k], coerce);
      if (!keyResult.ok) {
        issues.push(...keyResult.issues);
        continue;
      }
      const valResult = this._value._parse(v, [...path, k], coerce);
      if (valResult.ok) {
        output[keyResult.value] = valResult.value;
      } else {
        issues.push(...valResult.issues);
      }
    }

    if (issues.length) return { ok: false, issues };
    return { ok: true, value: output as Record<K, V> };
  }
}

// ─── Modifier Schemas ───────────────────────────────────────────────────────

export class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private readonly _inner: Schema<T>) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T | undefined> {
    if (value === undefined) return { ok: true, value: undefined };
    return this._inner._parse(value, path, coerce);
  }
}

export class NullableSchema<T> extends Schema<T | null> {
  constructor(private readonly _inner: Schema<T>) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T | null> {
    if (value === null) return { ok: true, value: null };
    return this._inner._parse(value, path, coerce);
  }
}

export class DefaultSchema<T> extends Schema<T> {
  constructor(
    private readonly _inner: Schema<T>,
    private readonly _default: T
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T> {
    if (value === undefined) return { ok: true, value: this._default };
    return this._inner._parse(value, path, coerce);
  }
}

export class TransformSchema<I, O> extends Schema<O> {
  constructor(
    private readonly _inner: Schema<I>,
    private readonly _fn: (value: I) => O
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<O> {
    const result = this._inner._parse(value, path, coerce);
    if (!result.ok) return result as ParseResult<O>;
    try {
      return { ok: true, value: this._fn(result.value) };
    } catch (err: any) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Transform failed: ${err?.message ?? String(err)}`,
          },
        ],
      };
    }
  }
}

export class RefineSchema<T> extends Schema<T> {
  constructor(
    private readonly _inner: Schema<T>,
    private readonly _check: (value: T) => boolean,
    private readonly _message: string
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T> {
    const result = this._inner._parse(value, path, coerce);
    if (!result.ok) return result;
    if (!this._check(result.value)) {
      return { ok: false, issues: [{ path, message: this._message }] };
    }
    return result;
  }
}

export class PipeSchema<I, O> extends Schema<O> {
  constructor(
    private readonly _first: Schema<I>,
    private readonly _second: Schema<O>
  ) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<O> {
    const firstResult = this._first._parse(value, path, coerce);
    if (!firstResult.ok) return firstResult as ParseResult<O>;
    return this._second._parse(firstResult.value, path, coerce);
  }
}

// ─── Special Schemas ────────────────────────────────────────────────────────

class AnySchema extends Schema<any> {
  _parse(
    value: unknown,
    _path: (string | number)[],
    _coerce: boolean
  ): ParseResult<any> {
    return { ok: true, value };
  }
}

class UnknownSchema extends Schema<unknown> {
  _parse(
    value: unknown,
    _path: (string | number)[],
    _coerce: boolean
  ): ParseResult<unknown> {
    return { ok: true, value };
  }
}

class NeverSchema extends Schema<never> {
  _parse(
    _value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<never> {
    return {
      ok: false,
      issues: [{ path, message: "No value is allowed (never)" }],
    };
  }
}

class NullSchema extends Schema<null> {
  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<null> {
    if (value !== null) {
      return {
        ok: false,
        issues: [
          { path, message: "Expected null", expected: "null", received: typeof value },
        ],
      };
    }
    return { ok: true, value: null };
  }
}

class UndefinedSchema extends Schema<undefined> {
  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<undefined> {
    if (value !== undefined) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: "Expected undefined",
            expected: "undefined",
            received: typeof value,
          },
        ],
      };
    }
    return { ok: true, value: undefined };
  }
}

class InstanceOfSchema<T> extends Schema<T> {
  constructor(private readonly _cls: new (...args: any[]) => T) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    _coerce: boolean
  ): ParseResult<T> {
    if (!(value instanceof this._cls)) {
      return {
        ok: false,
        issues: [
          {
            path,
            message: `Expected instance of ${this._cls.name}`,
            expected: this._cls.name,
          },
        ],
      };
    }
    return { ok: true, value: value as T };
  }
}

class LazySchema<T> extends Schema<T> {
  constructor(private readonly _getter: () => Schema<T>) {
    super();
  }

  _parse(
    value: unknown,
    path: (string | number)[],
    coerce: boolean
  ): ParseResult<T> {
    return this._getter()._parse(value, path, coerce);
  }
}

// ─── Builder Functions ──────────────────────────────────────────────────────

export function string(): StringSchema {
  return new StringSchema();
}

export function number(): NumberSchema {
  return new NumberSchema();
}

export function boolean(): BooleanSchema {
  return new BooleanSchema();
}

export function date(): DateSchema {
  return new DateSchema();
}

export function literal<T extends string | number | boolean>(
  value: T
): LiteralSchema<T> {
  return new LiteralSchema(value);
}

export function nativeEnum<T extends Record<string, string | number>>(
  e: T
): NativeEnumSchema<T> {
  return new NativeEnumSchema(e);
}

function enum_<T extends string>(values: readonly T[]): EnumSchema<T> {
  return new EnumSchema(values);
}
export { enum_ as enum };

export function union<T extends readonly Schema<any>[]>(
  ...schemas: T
): UnionSchema<T> {
  return new UnionSchema(schemas);
}

export function intersection<A, B>(
  left: Schema<A>,
  right: Schema<B>
): IntersectionSchema<A, B> {
  return new IntersectionSchema(left, right);
}

export function object<S extends ObjectShape>(shape: S): ObjectSchema<S> {
  return new ObjectSchema(shape);
}

export function array<T>(element: Schema<T>): ArraySchema<T> {
  return new ArraySchema(element);
}

export function tuple<T extends readonly Schema<any>[]>(
  ...schemas: T
): TupleSchema<T> {
  return new TupleSchema(schemas);
}

export function record<V>(value: Schema<V>): RecordSchema<string, V>;
export function record<K extends string, V>(
  key: Schema<K>,
  value: Schema<V>
): RecordSchema<K, V>;
export function record(...args: any[]): any {
  if (args.length === 1) {
    return new RecordSchema(new StringSchema(), args[0]);
  }
  return new RecordSchema(args[0], args[1]);
}

export function any(): AnySchema {
  return new AnySchema();
}

export function unknown(): UnknownSchema {
  return new UnknownSchema();
}

export function never(): NeverSchema {
  return new NeverSchema();
}

export function null_(): NullSchema {
  return new NullSchema();
}
export { null_ as null };

export function undefined_(): UndefinedSchema {
  return new UndefinedSchema();
}
export { undefined_ as undefined };

export function instanceof_<T>(
  cls: new (...args: any[]) => T
): InstanceOfSchema<T> {
  return new InstanceOfSchema(cls);
}
export { instanceof_ as instanceof };

export function lazy<T>(getter: () => Schema<T>): LazySchema<T> {
  return new LazySchema(getter);
}

// ─── Convenience ────────────────────────────────────────────────────────────

/** Validate a value against a schema, throwing on failure. */
export function parse<T>(schema: Schema<T>, value: unknown): T {
  return schema.parse(value);
}

/** Validate a value against a schema, returning a result. */
export function safeParse<T>(
  schema: Schema<T>,
  value: unknown
): ParseResult<T> {
  return schema.safeParse(value);
}
