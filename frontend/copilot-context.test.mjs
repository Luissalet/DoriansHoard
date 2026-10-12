import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildContext, changedFields, clip, collectEditors, editorSnapshot, installCopilot, onRefresh, previewEditor, rebaseForm,
  answerContextRequests,
} from "./src/copilot-context.ts";

const long = "x".repeat(900);
const archive = {
  sources: [{ id: "s1", title: "Diary 2024", kind: "owner_statement", author: "owner", text: long }],
  claims: [
    { id: "c1", source_id: "s1", text: "I prefer mornings. " + long, quote: "SECRET QUOTE", kind: "owner_statement", subject: "owner", state: "confirmed" },
    { id: "c2", source_id: "s1", text: "Second", quote: "q", kind: "inference", subject: "owner", state: "proposed" },
  ],
};
const reflection = {
  profile: { name: "Synthetic Alba", introduction: "PRIVATE INTRO", life_status: "living", consent: true },
  conversations: [{ id: "k1", title: "Asking about work", turns: [{}, {}] }],
};
const fetchers = { getArchive: async () => archive, getReflection: async () => reflection };
const state = (patch) => ({ space: "personal", page: "reflection", claimId: null, sourceId: null, section: null, conversationId: null, ...patch });

test("only changed fields are reported, and a cleared field counts", () => {
  assert.deepEqual(changedFields({ a: "1", b: "x" }, { a: "1", b: "" }), { b: "" });
  const snap = editorSnapshot("source-new", null, { title: "", kind: "owner_statement" }, { title: "T", kind: "owner_statement" });
  assert.deepEqual(snap, { kind: "source-new", object_id: null, dirty: true, fields: { title: "T" } });
  assert.equal(editorSnapshot("source-new", null, { title: "" }, { title: "" }).dirty, false);
});

test("a reload keeps what the user typed and updates the rest", () => {
  const before = { name: "Old", voice: "" };
  assert.deepEqual(rebaseForm(before, { name: "Agent", voice: "" }, { name: "Old", voice: "typed" }), { name: "Agent", voice: "typed" });
  assert.deepEqual(changedFields(before, { name: "Old", voice: "typed" }), { voice: "typed" });
});

test("a claim open in the archive gives the claim and its source, as short previews", async () => {
  const ctx = await buildContext({ state: state({ page: "archive", claimId: "c1" }), ...fetchers });
  assert.deepEqual(ctx.active_objects.map((o) => `${o.kind}:${o.object_id}`), ["claim:c1", "source:s1"]);
  assert.ok(ctx.active_objects[0].title.length <= 80);
  const text = JSON.stringify(ctx);
  assert.ok(!text.includes("SECRET QUOTE"));
  assert.ok(text.length < 1500);
  assert.equal(ctx.view.page, "archive");
  assert.equal(ctx.view.object_id, "c1");
});

test("a source open in sources lists its claims", async () => {
  const ctx = await buildContext({ state: state({ page: "sources", sourceId: "s1" }), ...fetchers });
  assert.deepEqual(ctx.active_objects.map((o) => o.object_id), ["s1", "c1", "c2"]);
  assert.ok(!JSON.stringify(ctx).includes("x".repeat(100)));
});

test("the portrait section gives the persona without its texts; a conversation is added when open", async () => {
  const ctx = await buildContext({ state: state({ section: "portrait", conversationId: "k1" }), ...fetchers });
  assert.deepEqual(ctx.active_objects.map((o) => `${o.kind}:${o.object_id}`), ["persona:persona", "conversation:k1"]);
  assert.ok(!JSON.stringify(ctx).includes("PRIVATE INTRO"));
  assert.equal(ctx.view.section, "portrait");
  const memories = await buildContext({ state: state({ section: "memories" }), ...fetchers });
  assert.deepEqual(memories.active_objects, []);
});

test("unknown ids, creation forms and fetch errors give no object and never throw", async () => {
  const broken = { getArchive: async () => { throw new Error("x"); }, getReflection: async () => { throw new Error("y"); } };
  for (const s of [state({ page: "archive", claimId: "nope" }), state({ page: "sources", sourceId: "nope" }), state({ page: "archive", claimId: "c1" }),
    state({ section: "portrait" }), state({ page: "lab" }), state({ page: "agents" })]) {
    const ctx = await buildContext({ state: s, ...broken });
    assert.deepEqual(ctx.active_objects, [], JSON.stringify(s));
  }
  const unknown = await buildContext({ state: state({ page: "archive", claimId: "nope" }), ...fetchers });
  assert.deepEqual(unknown.active_objects, []);
  const creating = await buildContext({ state: state({ page: "sources" }), ...fetchers,
    editors: [editorSnapshot("source-new", null, { title: "" }, { title: "New" })] });
  assert.deepEqual(creating.active_objects, []);
  assert.deepEqual(creating.view.editor.fields, { title: "New" });
});

test("the open correction form adds its claim even before the view state catches up", async () => {
  const editors = [editorSnapshot("claim-correction", "c2", { reason: "" }, { reason: "wrong" })];
  const ctx = await buildContext({ state: state({ page: "archive" }), ...fetchers, editors });
  assert.deepEqual(ctx.active_objects.map((o) => o.object_id), ["c2", "s1"]);
  assert.equal(ctx.view.editor.fields.reason, "wrong");
});

test("first dirty form is the editor, several are listed, long texts are cut", async () => {
  const clean = editorSnapshot("persona-form", "persona", { voice: "a" }, { voice: "a" });
  const dirty = previewEditor(editorSnapshot("card-new", null, { text: "" }, { text: long }));
  assert.equal(dirty.fields.text.length, 500);
  assert.deepEqual(dirty.clipped_fields, ["text"]);
  const ctx = await buildContext({ state: state(), ...fetchers, editors: [clean, dirty] });
  assert.equal(ctx.view.editor.kind, "card-new");
  assert.equal(ctx.view.editors.length, 2);
  assert.equal(clip("a  b\n c", 80), "a b c");
});

test("forms answer the context request", () => {
  const target = new EventTarget();
  const stop = answerContextRequests(() => editorSnapshot("source-new", null, { title: "" }, { title: "T" }), target);
  answerContextRequests(() => null, target);
  assert.deepEqual(collectEditors(target).map((e) => e.kind), ["source-new"]);
  stop();
  assert.deepEqual(collectEditors(target), []);
});

test("turn end (event and callback) refreshes once and the install happens once", async () => {
  const target = new EventTarget();
  installCopilot(target);
  const first = target.hoardCopilot;
  installCopilot(target);
  assert.equal(target.hoardCopilot, first);
  assert.equal(typeof first.context, "function");
  let calls = 0;
  const off = onRefresh(() => { calls += 1; });
  target.dispatchEvent(new Event("hoard:copilot-turn-end"));
  first.onTurnEnd();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(calls, 1);
  off();
});
