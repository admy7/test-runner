import assert from "node:assert";

assert.strictEqual("hello".toUpperCase(), "HELLO");
assert.strictEqual("  trim  ".trim(), "trim");
assert.strictEqual("abc".repeat(3), "abcabcabc");

console.log("All string tests passed");
