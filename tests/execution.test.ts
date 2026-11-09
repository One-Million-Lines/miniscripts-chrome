import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { prepareUserCode } from "../src/execution/prepare.ts";
import { buildExecutorSource } from "../src/execution/runtime.ts";
import type { MiniApp } from "../src/shared/types.ts";

const app: MiniApp = { id: "test", name: "Test", code: "", enabled: true, autoRun: false, matchPatterns: ["<all_urls>"], createdAt: 0, updatedAt: 0 };
function environment() {
  const storage = new Map<string, unknown>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const originalLog = () => {};
  const context = vm.createContext({
    console: { log: originalLog, info() {}, warn() {}, error() {} },
    document: {}, location: { href: "https://example.test/" },
    window: { fetch: async () => {}, confirm: () => true },
    Element: class {},
    setTimeout: (fn: () => void, ms: number) => { const timer = setTimeout(fn, ms); timers.add(timer); return timer; },
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => { timers.delete(timer); clearTimeout(timer); },
    chrome: { runtime: { sendMessage: async (message: Record<string, unknown>) => {
      if (message.operation === "set") storage.set(message.key as string, message.value);
      if (message.operation === "remove") storage.delete(message.key as string);
      return { success: true, value: storage.get(message.key as string), tabId: 42 };
    } } },
  });
  return { context, timers, storage, originalLog };
}
async function execute(code: string, env = environment()) {
  const result = await vm.runInContext(buildExecutorSource({ ...app, code }, "token", 42), env.context);
  return { result: JSON.parse(JSON.stringify(result)), env };
}

for (const [name, code] of Object.entries({
  named: "// leading comment\nexport default async function run(ctx) { return ctx.tabId; }",
  anonymous: "export default async function(ctx) { return ctx.tabId; }",
  arrow: "export default async ctx => ctx.tabId",
  run: "async function run(ctx) { return ctx.tabId; }",
  app: "const app = ctx => ctx.tabId;",
  alias: "const task = ctx => ctx.tabId; export { task as default };",
  snippet: "return ctx.tabId;",
})) {
  test(`executes ${name} entry point`, async () => {
    const { result, env } = await execute(code);
    assert.equal(result.success, true);
    assert.equal(result.returnValue, 42);
    assert.equal(env.timers.size, 0, "execution timeout must be cleared");
  });
}

test("preserves object properties, strings, comments, and generic-looking text", async () => {
  const { result } = await execute(`
    export default function run() {
      const text = "export default as string: number";
      const object = { name: text, number: 123, nested: { value: 'as HTMLDivElement' } };
      return object;
    }`);
  assert.deepEqual(result.returnValue, { name: "export default as string: number", number: 123, nested: { value: "as HTMLDivElement" } });
});

test("serializes circular, BigInt, and Error logs without patching global console", async () => {
  const { result, env } = await execute(`const value = {}; value.self = value; console.log(value, 2n, new Error('test')); return value;`);
  assert.equal(result.success, true);
  assert.deepEqual(result.returnValue, { self: "[Circular]" });
  assert.equal(result.consoleLogs[0].args[1], "2");
  assert.equal(result.consoleLogs[0].args[2].message, "test");
  assert.equal(env.context.console.log, env.originalLog);
});

test("namespaced storage API supports defaults, null, set, and remove", async () => {
  const { result } = await execute(`
    await ctx.storage.set('item', null);
    const value = await ctx.storage.get('item', 'default');
    await ctx.storage.remove('item');
    return [value, await ctx.storage.get('item', 'default')];`);
  assert.deepEqual(result.returnValue, [null, "default"]);
});

test("repeated and concurrent executions have independent scopes", async () => {
  const env = environment();
  const code = "const constant = 7; console.log(constant); return constant;";
  const results = await Promise.all([execute(code, env), execute(code, env), execute(code, env)]);
  assert.ok(results.every(({ result }) => result.returnValue === 7 && result.consoleLogs.length === 1));
  assert.equal(env.context.console.log, env.originalLog);
});

test("rejects unsupported imports and invalid JavaScript before injection", () => {
  assert.throws(() => prepareUserCode("import thing from 'remote'; export default thing;"), /Imports are not supported/);
  assert.throws(() => prepareUserCode("export default function ( {"), SyntaxError);
});

test("all bundled samples produce valid injectable JavaScript", async () => {
  for (const name of ["blur-overlay", "copy-links", "reader-margins", "linkedin-images"]) {
    const code = await readFile(new URL(`../src/samples/${name}.ts`, import.meta.url), "utf8");
    assert.doesNotThrow(() => new vm.Script(buildExecutorSource({ ...app, code }, "token", 42)));
  }
});
