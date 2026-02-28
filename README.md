# guard

Type-safe schema validation with inference, parsing, and coercion. Zero deps. TypeScript-first.

Part of the [corvid-agent](https://github.com/corvid-agent) zero-dependency TypeScript toolkit.

## Install

```bash
bun add @corvid-agent/guard
# or
npm install @corvid-agent/guard
```

## Quick Start

```typescript
import * as g from "@corvid-agent/guard";

// Define a schema
const User = g.object({
  name: g.string().min(1),
  email: g.string().email(),
  age: g.number().int().min(0).optional(),
  role: g.enum(["user", "admin"] as const).default("user"),
});

// Infer the TypeScript type
type User = g.Infer<typeof User>;
// { name: string; email: string; age?: number; role: "user" | "admin" }

// Parse (throws on failure)
const user = User.parse({ name: "Alice", email: "alice@example.com" });

// Safe parse (never throws)
const result = User.safeParse(input);
if (result.ok) {
  console.log(result.value);
} else {
  console.log(result.issues);
}
```

## Schemas

### Primitives

```typescript
g.string()       // string
g.number()       // number (rejects NaN)
g.boolean()      // boolean
g.date()         // Date (rejects invalid dates)
```

### String Checks

```typescript
g.string().min(3)              // minimum length
g.string().max(100)            // maximum length
g.string().length(5)           // exact length
g.string().email()             // email format
g.string().url()               // URL format
g.string().pattern(/^[a-z]+$/) // regex
g.string().startsWith("http")  // prefix
g.string().endsWith(".ts")     // suffix
g.string().includes("needle")  // substring
g.string().nonempty()          // min(1)

// Transforms
g.string().trim()              // trim whitespace
g.string().toLowerCase()       // to lowercase
g.string().toUpperCase()       // to uppercase
```

### Number Checks

```typescript
g.number().min(0)         // minimum value
g.number().max(100)       // maximum value
g.number().int()          // integer only
g.number().positive()     // > 0
g.number().negative()     // < 0
g.number().nonnegative()  // >= 0
g.number().finite()       // no Infinity
g.number().multipleOf(5)  // divisible by
```

### Objects

```typescript
const schema = g.object({
  name: g.string(),
  age: g.number(),
});

// Unknown keys are stripped by default
schema.strict()                        // reject unknown keys
schema.passthrough()                   // keep unknown keys
schema.catchall(g.string())            // validate unknown keys

// Utilities
schema.extend({ email: g.string() })   // add fields
schema.pick("name")                    // select fields
schema.omit("age")                     // remove fields
schema.partial()                       // all optional
schema.merge(otherSchema)              // combine schemas
schema.keyof()                         // enum of keys
```

### Arrays & Tuples

```typescript
g.array(g.number())                  // number[]
g.array(g.string()).min(1).max(10)   // bounded array
g.array(g.number()).nonempty()       // at least one element

g.tuple(g.string(), g.number())      // [string, number]
```

### Records

```typescript
g.record(g.number())                              // Record<string, number>
g.record(g.enum(["a", "b"] as const), g.number()) // Record<"a"|"b", number>
```

### Enums & Literals

```typescript
g.literal("hello")                             // exact value
g.enum(["red", "green", "blue"] as const)      // string union
g.nativeEnum(MyTSEnum)                         // TypeScript enum
```

### Unions & Intersections

```typescript
g.union(g.string(), g.number())                // string | number
g.intersection(schemaA, schemaB)               // A & B
```

### Special Types

```typescript
g.any()          // any
g.unknown()      // unknown
g.never()        // never (always fails)
g.null()         // null
g.undefined()    // undefined
g.instanceof(Date)  // instanceof check
g.lazy(() => schema) // recursive schemas
```

## Modifiers

```typescript
g.string().optional()       // string | undefined
g.string().nullable()       // string | null
g.string().default("hi")    // defaults to "hi" when undefined
```

## Transform & Refine

```typescript
// Transform the output type
const len = g.string().transform((s) => s.length);
// Schema<number>

// Custom validation
const even = g.number().refine((n) => n % 2 === 0, "Must be even");

// Chain schemas
const parsed = g.string()
  .transform((s) => Number(s))
  .pipe(g.number().int().positive());
```

## Coercion

Parse with automatic type coercion:

```typescript
g.number().coerce("42")     // 42
g.number().coerce(true)     // 1
g.boolean().coerce("true")  // true
g.boolean().coerce(1)       // true
g.string().coerce(42)       // "42"
g.date().coerce("2024-01-15T00:00:00Z") // Date
```

## Type Guard

```typescript
const schema = g.string().min(1);

if (schema.is(value)) {
  // value is narrowed to string
}
```

## Error Handling

```typescript
try {
  schema.parse(badInput);
} catch (err) {
  if (err instanceof g.ValidationError) {
    for (const issue of err.issues) {
      console.log(issue.path);     // ["user", "email"]
      console.log(issue.message);  // "Invalid email address"
      console.log(issue.expected); // "email"
    }
  }
}
```

## Type Inference

```typescript
const schema = g.object({
  name: g.string(),
  tags: g.array(g.string()),
  config: g.object({
    debug: g.boolean().default(false),
  }).optional(),
});

// Automatically inferred:
type MyType = g.Infer<typeof schema>;
// {
//   name: string;
//   tags: string[];
//   config?: { debug: boolean };
// }
```

## License

MIT
