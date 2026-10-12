// What the shared copilot launcher asks this app for: the real objects open in the current view and the unsaved form fields,
// plus a way to refresh the open view when the assistant finishes a turn. Nothing here renders anything.
// This app holds personal data, so the context carries ids, titles and short previews only (never whole texts, never the
// quote behind a claim, never provider keys or connection tokens).

export type Editor = { kind: string; object_id: string | null; dirty: boolean; fields: Record<string, unknown>; [extra: string]: unknown };
export type ViewState = {
  space: string;
  page: string;
  claimId: string | null;
  sourceId: string | null;
  section: string | null;
  conversationId: string | null;
};
type Row = Record<string, any>;
export type Fetchers = { getArchive: () => Promise<Row>; getReflection: () => Promise<Row> };

const MAX_TITLE = 80;
const MAX_FIELD = 500;

// The React app publishes which page, claim, source and reflection section are open (the app has no URL routes).
export const view: ViewState = { space: "personal", page: "reflection", claimId: null, sourceId: null, section: null, conversationId: null };
export function setView(patch: Partial<ViewState>) {
  Object.assign(view, patch);
}

export function clip(value: unknown, max = MAX_TITLE): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Fields of `draft` whose value differs from `initial` (compared as JSON, so a cleared field counts).
export function changedFields(initial: Row | null | undefined, draft: Row | null | undefined): Row {
  const base = initial || {};
  return Object.fromEntries(Object.entries(draft || {}).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(base[key])));
}

// A refreshed baseline arrives while the user is editing: fields the user did not touch follow the new baseline, touched ones stay.
export function rebaseForm<T extends Row>(previousBase: T | null | undefined, nextBase: T, form: T): T {
  const out: Row = { ...nextBase };
  for (const key of Object.keys(form)) {
    if (JSON.stringify(form[key]) !== JSON.stringify(previousBase?.[key])) out[key] = form[key];
  }
  return out as T;
}

// The snapshot a form hands to the launcher: only what differs from what was loaded.
export function editorSnapshot(kind: string, objectId: string | null, initial: Row, draft: Row, extra: Row = {}): Editor {
  const fields = changedFields(initial, draft);
  return { kind, object_id: objectId, dirty: Object.keys(fields).length > 0, fields, ...extra };
}

// Long typed texts are cut to a preview; the names of the cut fields travel along.
export function previewEditor(editor: Editor): Editor {
  const fields: Row = {};
  const clipped: string[] = [];
  for (const [key, value] of Object.entries(editor.fields || {})) {
    if (typeof value === "string" && value.length > MAX_FIELD) {
      fields[key] = value.slice(0, MAX_FIELD - 1) + "…";
      clipped.push(key);
    } else fields[key] = value;
  }
  return { ...editor, fields, ...(clipped.length ? { clipped_fields: clipped } : {}) };
}

// Every open form answers this event with a snapshot of what the user has typed.
export function collectEditors(target: any = globalThis.window): Editor[] {
  const found: Editor[] = [];
  if (!target?.dispatchEvent) return found;
  const detail = { provide: (snapshot: Editor | null | undefined) => { if (snapshot) found.push(previewEditor(snapshot)); } };
  target.dispatchEvent(new CustomEvent("dorian:context-request", { detail }));
  return found;
}

// Listen for the request while a form is mounted. `read` runs at answer time, so it always sees the latest typed values.
export function answerContextRequests(read: () => Editor | null, target: any = globalThis.window): () => void {
  if (!target?.addEventListener) return () => {};
  const listener = (event: Event) => {
    try {
      (event as CustomEvent).detail?.provide(read());
    } catch { /* a form that cannot answer is simply left out */ }
  };
  target.addEventListener("dorian:context-request", listener);
  return () => target.removeEventListener("dorian:context-request", listener);
}

const claimObject = (c: Row) => ({
  kind: "claim", object_id: c.id, title: clip(c.text), state: c.state, claim_kind: c.kind, subject: c.subject, source_id: c.source_id,
});
const sourceObject = (s: Row) => ({ kind: "source", object_id: s.id, title: clip(s.title), source_kind: s.kind });
const personaObject = (p: Row) => ({
  kind: "persona", object_id: "persona", title: clip(p.name) || "Portrait", life_status: p.life_status, consent: Boolean(p.consent),
});
const conversationObject = (c: Row) => ({ kind: "conversation", object_id: c.id, title: clip(c.title), turns: Array.isArray(c.turns) ? c.turns.length : 0 });

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

// Pure core (dependencies injected so it can be tested): never throws; unknown ids and creation forms yield no object.
export async function buildContext({ state, editors = [], getArchive, getReflection }: { state: ViewState; editors?: Editor[] } & Fetchers) {
  const active: Row[] = [];
  const seen = new Set<string>();
  const add = (object: Row) => {
    const key = `${object.kind}:${object.object_id}`;
    if (!seen.has(key)) { seen.add(key); active.push(object); }
  };
  const page = state.page || "reflection";
  let objectId: string | undefined;
  const wantedClaim = state.claimId || editors.find((e) => e.kind === "claim-correction" && e.object_id)?.object_id || null;
  const wantsArchive = (page === "archive" && wantedClaim) || (page === "sources" && state.sourceId);

  if (wantsArchive) {
    const archive = await safe(getArchive);
    const claims: Row[] = archive?.claims || [];
    const sources: Row[] = archive?.sources || [];
    if (page === "archive" && wantedClaim) {
      const claim = claims.find((c) => c.id === wantedClaim);
      if (claim) {
        objectId = claim.id;
        add(claimObject(claim));
        const source = sources.find((s) => s.id === claim.source_id);
        if (source) add(sourceObject(source));
      }
    } else if (page === "sources" && state.sourceId) {
      const source = sources.find((s) => s.id === state.sourceId);
      if (source) {
        objectId = source.id;
        add(sourceObject(source));
        for (const c of claims.filter((c) => c.source_id === source.id).slice(0, 8)) add(claimObject(c));
      }
    }
  }

  if (page === "reflection") {
    const reflection = await safe(getReflection);
    if (reflection) {
      if (state.section === "portrait" && reflection.profile) { add(personaObject(reflection.profile)); objectId = "persona"; }
      const conversation = (reflection.conversations || []).find((c: Row) => c.id === state.conversationId);
      if (conversation) { add(conversationObject(conversation)); objectId = objectId ?? conversation.id; }
    }
  }

  const out: Row = { page, space: state.space };
  if (state.section && page === "reflection") out.section = state.section;
  if (objectId) out.object_id = objectId;
  const editor = editors.find((e) => e.dirty) || editors[0];
  if (editor) out.editor = editor;
  if (editors.length > 1) out.editors = editors;
  return { active_objects: active, view: out };
}

async function getJson(path: string): Promise<Row> {
  const request = () => fetch("/api" + path, { headers: { "X-Hoard-Space": view.space } });
  let response = await request();
  if (response.status === 401) { await fetch("/api/session"); response = await request(); }
  if (!response.ok) throw new Error("http_" + response.status);
  return response.json();
}

export function context() {
  return buildContext({
    state: { ...view },
    editors: collectEditors(),
    getArchive: () => getJson("/archive"),
    getReflection: () => getJson("/reflection"),
  });
}

// ---- refresh when the assistant finishes a turn -------------------------------------------------------------------------
const handlers = new Set<() => unknown>();
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleRefresh() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const fn of [...handlers]) {
      try { void Promise.resolve(fn()).catch(() => {}); } catch { /* a refresh must never break the page */ }
    }
  }, 250);
}

// Each part of the app registers what "reload what is on screen" means for it (without remounting or clearing forms).
export function onRefresh(fn: () => unknown) {
  handlers.add(fn);
  return () => { handlers.delete(fn); };
}

export const onTurnEnd = () => scheduleRefresh();

// Once at start: the object the launcher looks for, and the window event it dispatches on turn end (the debounce merges the two).
export function installCopilot(target: any = globalThis.window) {
  if (!target || target.hoardCopilot) return;
  target.hoardCopilot = { context, onTurnEnd };
  target.addEventListener("hoard:copilot-turn-end", scheduleRefresh);
}
