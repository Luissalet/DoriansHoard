import { useState, useEffect, useRef } from "react";
import {
  Archive as ArchiveIcon,
  BookOpen,
  Plus,
  Search,
  ShieldCheck,
  FlaskConical,
  ArrowUpRight,
  ArrowRight,
  Files,
  Check,
  ChevronRight,
  X,
  Trash2,
  Download,
  Upload,
  PanelLeftClose,
  BrainCircuit,
  Cable,
} from "lucide-react";
import {
  Locale,
  useText,
  Language,
  Archive,
  Claim,
  Source,
  API,
  Status,
  kindLabels,
  errors,
} from "./shared";
import { Lab } from "./Lab";
import { Neuro } from "./Neuro";
import { Agents } from "./Agents";

type Page = "archive" | "sources" | "lab" | "neuro" | "privacy" | "agents";
export default function App() {
  const [lang, setLang] = useState<Language>(() =>
    localStorage.getItem("hoard_language") === "en" ? "en" : "es",
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("hoard_language", lang);
  }, [lang]);
  return (
    <Locale.Provider value={lang}>
      <Workspace lang={lang} setLang={setLang} />
    </Locale.Provider>
  );
}
function Workspace({
  lang,
  setLang,
}: {
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const t = useText(),
    [page, setPage] = useState<Page>("archive"),
    [space, setSpace] = useState("personal");
  const [archive, setArchive] = useState<Archive>({
      sources: [],
      claims: [],
      events: [],
    }),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null),
    [sourceId, setSourceId] = useState<string | null>(null),
    [adding, setAdding] = useState(false),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [result, setResult] = useState<{ status: string; matches: Claim[] } | null>(
      null,
    );
  const detailRef = useRef<HTMLElement>(null);
  const api: API = async (path, data, method) => {
    let response: Response;
    try {
      response = await fetch("/api" + path, {
        method: method ?? (data === undefined ? "GET" : "POST"),
        headers: {
          "Content-Type": "application/json",
          "X-Hoard-Request": "1",
          "X-Hoard-Space": space,
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      });
    } catch {
      throw Error("network");
    }
    if (response.status === 401) {
      await fetch("/api/session");
      throw Error("network");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw Error(
        body.error ?? (response.status === 422 ? "invalid_archive" : "network"),
      );
    }
    return response.json();
  };
  const refresh = async () => {
    setArchive(await api<Archive>("/archive"));
    setResult(null);
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let live = true;
    setReady(false);
    setSelected(null);
    setSourceId(null);
    setResult(null);
    setQuery("");
    setAdding(false);
    setNotice("");
    setError("");
    (async () => {
      try {
        await fetch("/api/session");
        if (space === "demo") await api("/demo", {});
        const data = await api<Archive>("/archive");
        if (live) {
          setArchive(data);
          setReady(true);
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    })();
    return () => {
      live = false;
    };
  }, [space]);
  const navigate = (p: Page) => {
    setPage(p);
    setAdding(false);
    setSelected(null);
    setSourceId(null);
    setNotice("");
  };
  const claim = archive.claims.find((c) => c.id === selected);
  const source = archive.sources.find(
    (s) => s.id === (sourceId ?? claim?.source_id),
  );
  const confirmed = archive.claims.filter(
    (c) =>
      c.state === "confirmed" &&
      c.kind === "owner_statement" &&
      c.subject === "owner",
  ).length;
  const pending = archive.claims.filter((c) => c.state === "proposed").length;
  const interpretations = archive.claims.filter(
    (c) => c.kind === "inference",
  ).length;
  const list = result
    ? result.matches
    : archive.claims.filter(
        (c) =>
          filter === "all" ||
          (filter === "inference"
            ? c.kind === "inference"
            : c.state === filter),
      );
  const navItems: [Page, typeof ArchiveIcon, string][] = [
    ["archive", ArchiveIcon, t("Mi archivo", "My archive")],
    ["sources", Files, t("Fuentes", "Sources")],
    ["lab", FlaskConical, t("Laboratorio", "Laboratory")],
    ["neuro", BrainCircuit, t("Neurociencia", "Neuroscience")],
    ["privacy", ShieldCheck, t("Mis datos", "My data")],
    ["agents", Cable, t("Conexiones IA", "AI connections")],
  ];
  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  const pick = (id: string) => {
    setSelected(id);
    setSourceId(null);
    setTimeout(() => {
      detailRef.current?.focus({ preventScroll: true });
      if (window.innerWidth < 1050)
        detailRef.current?.scrollIntoView({
          behavior: scrollBehavior(),
          block: "start",
        });
    }, 20);
  };
  const returnToClaim = () => {
    const id = selected;
    setSelected(null);
    requestAnimationFrame(() => {
      const row = document.getElementById("claim-" + id);
      row?.focus({ preventScroll: true });
      row?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
    });
  };
  const download = async (format: string) => {
    const response = await fetch("/api/export?format=" + format, {
      headers: { "X-Hoard-Space": space },
    });
    if (!response.ok) throw Error("network");
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "SelfHoard-" + space + "." + format;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        {t("Ir al contenido", "Skip to content")}
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("archive");
          }}
        >
          <span className="brand-mark">
            <ArchiveIcon size={22} />
          </span>
          <span>
            self<span className="brand-light">hoard</span>
            <small>
              {t("Tu archivo, con sentido.", "Your archive, with meaning.")}
            </small>
          </span>
        </a>
        <nav aria-label={t("Navegación principal", "Main navigation")}>
          {navItems.map(([id, Icon, label]) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "archive" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-info">
            <ShieldCheck size={18} />
            <div>
              <strong>{t("Solo en este equipo", "Only on this device")}</strong>
              <small>
                {t("Tú controlas el acceso de IA", "You control AI access")}
              </small>
            </div>
          </div>
          <button
            className="space-switch"
            disabled={busy}
            onClick={() => setSpace(space === "personal" ? "demo" : "personal")}
          >
            <span className="avatar">{space === "personal" ? "P" : "D"}</span>
            <span>
              {space === "personal"
                ? t("Archivo personal", "Personal archive")
                : t("Ejemplo sintético", "Synthetic example")}
              <small>
                {space === "personal"
                  ? t("Explorar una demo", "Explore a demo")
                  : t("Volver a mis datos", "Back to my data")}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Self Hoard <span>/</span> {navItems.find((n) => n[0] === page)?.[2]}
          </div>
          <div className="top-actions">
            <select
              aria-label="Language / Idioma"
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <button
              className="primary small"
              onClick={() => {
                setPage("sources");
                setAdding(true);
                setSourceId(null);
                setSelected(null);
              }}
            >
              <Plus size={17} />
              {t("Nueva fuente", "New source")}
            </button>
          </div>
        </header>
        <main id="main">
          {space === "demo" && (
            <div className="demo-banner">
              <FlaskConical size={17} />
              {t(
                "Espacio de demostración. Estas memorias son sintéticas y están separadas de tu archivo.",
                "Demo space. These memories are synthetic and separate from your archive.",
              )}
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              <span>
                {t(
                  ...(errors[error] ?? [
                    t(
                      "No se pudo completar la operación",
                      "Could not complete the operation",
                    ) +
                      ": " +
                      error,
                    t(
                      "No se pudo completar la operación",
                      "Could not complete the operation",
                    ) +
                      ": " +
                      error,
                  ]),
                )}
              </span>
              <button
                aria-label={t("Cerrar aviso", "Dismiss message")}
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
            </div>
          )}
          {!ready ? (
            <div className="empty">
              <h1>{t("Abriendo tu archivo", "Opening your archive")}</h1>
              <p>
                {error
                  ? t(
                      "Vuelve a cargar la página para reintentar.",
                      "Reload the page to try again.",
                    )
                  : t(
                      "Preparando tus fuentes locales…",
                      "Preparing your local sources…",
                    )}
              </p>
            </div>
          ) : (
            <>
              {page === "archive" && (
                <>
                  <div className="page-heading">
                    <h1>
                      {t("Una memoria que puedes", "A memory you can")}
                      <br />
                      <span>
                        {t("entender y corregir.", "understand and correct.")}
                      </span>
                    </h1>
                    <p>
                      {t(
                        "Lo que has dicho, lo que está por revisar y las fuentes que lo sostienen.",
                        "What you have said, what needs reviewing, and the sources behind it.",
                      )}
                    </p>
                  </div>
                  <div className="archive-summary">
                    <span>
                      <strong>{confirmed}</strong>
                      {t("declaraciones confirmadas", "confirmed statements")}
                    </span>
                    <span>
                      <strong>{pending}</strong>
                      {t("por revisar", "to review")}
                    </span>
                    <span>
                      <strong>{interpretations}</strong>
                      {t("interpretaciones", "interpretations")}
                    </span>
                  </div>
                  <form
                    className="searchbox"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        setResult(await api("/search", { query }));
                        setSelected(null);
                      });
                    }}
                  >
                    <Search size={20} />
                    <input
                      aria-label={t("Buscar evidencia", "Search evidence")}
                      placeholder={t(
                        "Busca palabras de tus declaraciones…",
                        "Search words in your statements…",
                      )}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (!e.target.value) setResult(null);
                      }}
                    />
                    <button
                      className="text-button"
                      disabled={!query.trim() || busy}
                    >
                      {t("Consultar", "Search")}
                      <ArrowRight size={16} />
                    </button>
                  </form>
                  <p className="search-note">
                    {t(
                      "Búsqueda literal en declaraciones propias confirmadas y vigentes.",
                      "Literal search of current, confirmed own statements.",
                    )}
                  </p>
                  <div
                    className={"archive-grid " + (claim ? "with-detail" : "")}
                  >
                    <section
                      className="memory-index"
                      aria-label={t("Afirmaciones", "Claims")}
                    >
                      <div className="list-toolbar">
                        <div className="tabs">
                          {[
                            ["all", t("Todo", "All")],
                            ["confirmed", t("Confirmado", "Confirmed")],
                            ["proposed", t("Por revisar", "To review")],
                            [
                              "inference",
                              t("Interpretaciones", "Interpretations"),
                            ],
                          ].map(([id, label]) => (
                            <button
                              key={id}
                              className={
                                !result && filter === id ? "selected" : ""
                              }
                              aria-pressed={!result && filter === id}
                              onClick={() => {
                                setFilter(id);
                                setResult(null);
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <span className="muted">{list.length}</span>
                      </div>
                      {list.length === 0 ? (
                        <div className="empty">
                          <BookOpen size={38} strokeWidth={1.25} />
                          <h2>
                            {result
                              ? t(
                                  "No tengo evidencia para esa búsqueda.",
                                  "I have no evidence for that search.",
                                )
                              : t(
                                  "Tu historia empieza con una fuente.",
                                  "Your story starts with a source.",
                                )}
                          </h2>
                          <p>
                            {result
                              ? t(
                                  "Prueba con palabras exactas de una declaración. No se completan los huecos con suposiciones.",
                                  "Try exact words from a statement. Gaps are never filled with assumptions.",
                                )
                              : t(
                                  "Añade un fragmento, revisa lo que dice y conserva su contexto.",
                                  "Add a passage, review what it says, and preserve its context.",
                                )}
                          </p>
                          <button
                            className="primary"
                            onClick={() => {
                              navigate("sources");
                              setAdding(true);
                            }}
                          >
                            <Plus size={17} />
                            {t("Añadir una fuente", "Add a source")}
                          </button>
                          {!result && (
                            <button
                              className="text-button"
                              onClick={() =>
                                setSpace(space === "demo" ? "personal" : "demo")
                              }
                            >
                              {space === "personal"
                                ? t(
                                    "Ver cómo funciona con un ejemplo",
                                    "See how it works with an example",
                                  )
                                : t(
                                    "Volver al archivo personal",
                                    "Back to personal archive",
                                  )}
                              <ArrowUpRight size={15} />
                            </button>
                          )}
                        </div>
                      ) : (
                        list.map((c) => (
                          <button
                            className={
                              "memory-row " +
                              (selected === c.id ? "is-selected" : "")
                            }
                            id={"claim-" + c.id}
                            aria-expanded={selected === c.id}
                            aria-controls={
                              selected === c.id ? "evidence-panel" : undefined
                            }
                            key={c.id}
                            onClick={() => pick(c.id)}
                          >
                            <div className="row-meta">
                              <Status state={c.state} />
                              <span>{t(...kindLabels[c.kind])}</span>
                            </div>
                            <h3>{c.text}</h3>
                            <div className="row-source">
                              <Files size={13} />
                              <span>
                                {
                                  archive.sources.find(
                                    (s) => s.id === c.source_id,
                                  )?.title
                                }
                              </span>
                              <ChevronRight size={15} />
                            </div>
                          </button>
                        ))
                      )}
                    </section>
                    {claim && source && (
                      <aside
                        ref={detailRef}
                        id="evidence-panel"
                        tabIndex={-1}
                        aria-label={t(
                          "Detalle de la memoria",
                          "Memory details",
                        )}
                        className="evidence-panel"
                      >
                        <div className="panel-title">
                          <h2>
                            {t("Detrás de esta memoria", "Behind this memory")}
                          </h2>
                          <button
                            aria-label={t("Cerrar detalle", "Close details")}
                            onClick={returnToClaim}
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <button
                          className="text-button return-to-claim"
                          onClick={returnToClaim}
                        >
                          <PanelLeftClose size={16} />
                          {t("Volver a la afirmación", "Back to the claim")}
                        </button>
                        <ClaimDetail
                          claim={claim}
                          source={source}
                          archive={archive}
                          api={api}
                          busy={busy}
                          act={act}
                          refresh={refresh}
                        />
                      </aside>
                    )}
                  </div>
                </>
              )}
              {page === "sources" && (
                <>
                  <div className="page-heading compact">
                    <h1>
                      {t("Cada recuerdo tiene", "Every memory has")}
                      <br />
                      <span>
                        {t("un punto de partida.", "a starting point.")}
                      </span>
                    </h1>
                    <p>
                      {t(
                        "Conserva las palabras originales y decide qué deben significar.",
                        "Keep the original words and decide what they should mean.",
                      )}
                    </p>
                  </div>
                  {adding ? (
                    <SourceForm
                      api={api}
                      busy={busy}
                      act={act}
                      cancel={() => setAdding(false)}
                      saved={async (id) => {
                        await refresh();
                        setSourceId(id);
                        setAdding(false);
                        setNotice(
                          t(
                            "Fuente guardada. Ahora puedes proponer una cita para revisarla.",
                            "Source saved. You can now propose a quote for review.",
                          ),
                        );
                      }}
                    />
                  ) : (
                    <div className="source-layout">
                      <section>
                        <div className="section-line">
                          <h2>
                            {t("Tus fuentes", "Your sources")}{" "}
                            <span>{archive.sources.length}</span>
                          </h2>
                          <button
                            className="text-button"
                            onClick={() => setAdding(true)}
                          >
                            <Plus size={16} />
                            {t("Añadir", "Add")}
                          </button>
                        </div>
                        {!archive.sources.length ? (
                          <div className="empty">
                            <Files size={36} />
                            <h2>
                              {t(
                                "Todo empieza por tus palabras.",
                                "It all starts with your words.",
                              )}
                            </h2>
                            <p>
                              {t(
                                "Pega una nota o importa un archivo de texto.",
                                "Paste a note or import a text file.",
                              )}
                            </p>
                            <button
                              className="primary"
                              onClick={() => setAdding(true)}
                            >
                              {t("Nueva fuente", "New source")}
                            </button>
                          </div>
                        ) : (
                          archive.sources.map((s) => (
                            <button
                              className={
                                "source-row " +
                                (sourceId === s.id ? "is-selected" : "")
                              }
                              key={s.id}
                              onClick={() => {
                                setSourceId(s.id);
                                setSelected(null);
                              }}
                            >
                              <Files size={21} />
                              <div>
                                <h3>{s.title}</h3>
                                <p>
                                  {t(...kindLabels[s.kind])} · {s.author}
                                </p>
                              </div>
                              <ChevronRight size={17} />
                            </button>
                          ))
                        )}
                      </section>
                      {source && (
                        <SourceDetail
                          key={source.id}
                          source={source}
                          archive={archive}
                          api={api}
                          busy={busy}
                          act={act}
                          refresh={refresh}
                          removed={() => setSourceId(null)}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
              {page === "lab" && <Lab api={api} busy={busy} act={act} />}
              {page === "neuro" && <Neuro />}
              {page === "agents" && (
                <Agents key={space} api={api} busy={busy} act={act} />
              )}
              {page === "privacy" && (
                <>
                  <div className="page-heading">
                    <h1>
                      {t("Tus datos.", "Your data.")}
                      <br />
                      <span>{t("Bajo tu control.", "In your hands.")}</span>
                    </h1>
                    <p>
                      {t(
                        "Un archivo local que puedes llevarte contigo.",
                        "A local archive you can take with you.",
                      )}
                    </p>
                  </div>
                  <div className="privacy-content">
                    <section className="privacy-row">
                      <ShieldCheck size={26} />
                      <div>
                        <h2>
                          {t(
                            "Este equipo es el destino",
                            "This device is the destination",
                          )}
                        </h2>
                        <p>
                          {t(
                            "Las fuentes se guardan localmente y no hay telemetría. Si autorizas una conexión IA, su cliente podrá consultar el contexto permitido y procesarlo con su proveedor.",
                            "Sources are stored locally and there is no telemetry. If you authorize an AI connection, its client can read the permitted context and process it with its provider.",
                          )}
                        </p>
                        <p className="muted">
                          {t(
                            "El almacenamiento todavía no está cifrado por la aplicación. Los enlaces de investigación abren sitios externos.",
                            "Storage is not yet encrypted by the application. Research links open external sites.",
                          )}
                        </p>
                      </div>
                    </section>
                    <section className="privacy-row">
                      <Download size={26} />
                      <div>
                        <h2>
                          {t(
                            "Llévate tu archivo",
                            "Take your archive with you",
                          )}
                        </h2>
                        <p>
                          {t(
                            "JSON conserva las fuentes, estados y dependencias para restaurarlos. Markdown ofrece una copia legible. Las copias descargadas quedan bajo tu gestión.",
                            "JSON preserves sources, states and dependencies for restoration. Markdown provides a readable copy. You manage downloaded copies yourself.",
                          )}
                        </p>
                        <div className="button-row">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() => act(() => download("json"))}
                          >
                            <Download size={16} />
                            {t("Exportar JSON", "Export JSON")}
                          </button>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => act(() => download("md"))}
                          >
                            Markdown
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className="privacy-row">
                      <Upload size={26} />
                      <div>
                        <h2>{t("Restaurar una copia", "Restore a backup")}</h2>
                        <p>
                          {t(
                            "Se restaura en un archivo vacío para evitar sobrescrituras. Las predicciones del laboratorio se exportan desde su propia sección.",
                            "Restore into an empty archive to prevent overwrites. Laboratory predictions are exported from their own section.",
                          )}
                        </p>
                        <label
                          className={
                            "secondary upload-button " +
                            (archive.sources.length ? "disabled" : "")
                          }
                        >
                          {t("Elegir archivo JSON", "Choose JSON file")}
                          <input
                            aria-label={t("Restaurar JSON", "Restore JSON")}
                            type="file"
                            accept=".json,application/json"
                            disabled={busy || archive.sources.length > 0}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file)
                                act(async () => {
                                  if (file.size > 8_000_000)
                                    throw Error("file_too_large");
                                  let data;
                                  try {
                                    data = JSON.parse(await file.text());
                                  } catch {
                                    throw Error("invalid_archive");
                                  }
                                  await api("/restore", data);
                                  await refresh();
                                  setNotice(
                                    t(
                                      "Archivo restaurado.",
                                      "Archive restored.",
                                    ),
                                  );
                                });
                            }}
                          />
                        </label>
                      </div>
                    </section>
                    <section className="privacy-row">
                      <Trash2 size={26} />
                      <div>
                        <h2>
                          {t(
                            "Borrado con sus derivados",
                            "Delete with its derivatives",
                          )}
                        </h2>
                        <p>
                          {t(
                            "Abre una fuente para ver qué afirmaciones y derivados se eliminarían. El borrado también retira sus registros de revisión. Las copias que hayas descargado deben borrarse por separado.",
                            "Open a source to see which claims and derivatives would be removed. Deletion also removes their review records. Downloaded copies must be deleted separately.",
                          )}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("sources")}
                        >
                          {t("Ir a las fuentes", "Go to sources")}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer>
          {t(
            "Una fuente antes que una suposición.",
            "A source before an assumption.",
          )}
          <span>
            Self Hoard · {t("Primera versión local", "First local release")}
          </span>
        </footer>
      </div>
    </div>
  );
}
type Actions = {
  api: API;
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
};
function ClaimDetail({
  claim,
  source,
  archive,
  api,
  busy,
  act,
  refresh,
}: Actions & { claim: Claim; source: Source; archive: Archive }) {
  const t = useText(),
    [correcting, setCorrecting] = useState(false),
    [reason, setReason] = useState("");
  useEffect(() => {
    setCorrecting(false);
    setReason("");
  }, [claim.id]);
  return (
    <>
      <Status state={claim.state} />
      <p className="detail-text">{claim.text}</p>
      <h3>{t("Cita original", "Original quote")}</h3>
      <blockquote>{claim.quote}</blockquote>
      <dl>
        <dt>{t("Fuente", "Source")}</dt>
        <dd>{source.title}</dd>
        <dt>{t("Atribución", "Attribution")}</dt>
        <dd>
          {source.author} · {t(...kindLabels[claim.kind])}
        </dd>
        <dt>{t("Se refiere a", "Subject")}</dt>
        <dd>
          {claim.subject === "owner"
            ? t("Propietario", "Owner")
            : t("Otra persona", "Another person")}
        </dd>
        <dt>{t("Validez", "Validity")}</dt>
        <dd>
          {claim.valid_from ?? t("Inicio sin precisar", "Unspecified start")} /{" "}
          {claim.valid_to ?? t("Sin fecha de fin", "No end date")}
        </dd>
      </dl>
      {claim.kind !== "owner_statement" && (
        <p className="small-note">
          {t(
            "Confirmar esta atribución no la convierte en una declaración propia. No alimentará la búsqueda de hechos personales.",
            "Confirming this attribution does not make it an own statement. It will not feed personal fact searches.",
          )}
        </p>
      )}
      {claim.dependencies.length > 0 && (
        <>
          <h3>{t("Depende de", "Depends on")}</h3>
          {claim.dependencies.map((id) => (
            <p key={id} className="small-note">
              {archive.claims.find((c) => c.id === id)?.text ?? id}
            </p>
          ))}
        </>
      )}
      <div className="review-actions">
        {!["confirmed", "rejected", "superseded"].includes(claim.state) && (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await api("/claims/" + claim.id + "/review", {
                  state: "confirmed",
                });
                await refresh();
              })
            }
          >
            <Check size={16} />
            {t("Confirmar", "Confirm")}
          </button>
        )}
        {claim.state !== "rejected" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setCorrecting(!correcting)}
          >
            {t("Corregir", "Correct")}
          </button>
        )}
      </div>
      {correcting && (
        <form
          className="correction-form"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await api("/claims/" + claim.id + "/correct", { reason });
              await refresh();
              setCorrecting(false);
            });
          }}
        >
          <label>
            {t("¿Qué está mal entendido?", "What was misunderstood?")}
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
            />
          </label>
          <p className="small-note">
            {t(
              "Se rechazará esta afirmación y se pondrán en discusión sus derivados. No se inventará una alternativa.",
              "This claim will be rejected and its derivatives disputed. No alternative will be invented.",
            )}
          </p>
          <button className="primary" disabled={busy}>
            {t("Guardar corrección", "Save correction")}
          </button>
        </form>
      )}
      <details className="history">
        <summary>{t("Historial de revisión", "Review history")}</summary>
        {archive.events
          .filter((e) => e.claim_id === claim.id)
          .map((e) => (
            <p key={e.id}>
              <span>
                {e.created_at.slice(0, 10)} ·{" "}
                {e.action === "dependency_invalidated"
                  ? t("Dependencia invalidada", "Dependency invalidated")
                  : e.action === "proposed"
                    ? t("Propuesta", "Proposed")
                    : e.action === "confirmed"
                      ? t("Confirmada", "Confirmed")
                      : e.action === "rejected"
                        ? t("Rechazada", "Rejected")
                        : e.action}
              </span>
              {e.reason && <span>{e.reason}</span>}
            </p>
          ))}
      </details>
    </>
  );
}
function SourceForm({
  api,
  busy,
  act,
  cancel,
  saved,
}: Omit<Actions, "refresh"> & {
  cancel: () => void;
  saved: (id: string) => Promise<void>;
}) {
  const t = useText(),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [kind, setKind] = useState("owner_statement"),
    [author, setAuthor] = useState("");
  return (
    <form
      className="source-form"
      onSubmit={(e) => {
        e.preventDefault();
        act(async () => {
          const s = await api<Source>("/sources", {
            title,
            text,
            kind,
            author: author || t("Propietario", "Owner"),
          });
          await saved(s.id);
        });
      }}
    >
      <div className="section-line">
        <h2>{t("Añadir una fuente", "Add a source")}</h2>
        <button type="button" className="text-button" onClick={cancel}>
          <X size={16} />
          {t("Cancelar", "Cancel")}
        </button>
      </div>
      <label>
        {t("Título", "Title")}
        <input
          autoFocus
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            "Una decisión, una conversación, una nota…",
            "A decision, a conversation, a note…",
          )}
        />
      </label>
      <div className="form-two">
        <label>
          {t(
            "¿De dónde vienen estas palabras?",
            "Where do these words come from?",
          )}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(kindLabels)
              .filter(([k]) => k !== "inference")
              .map(([k, labels]) => (
                <option key={k} value={k}>
                  {t(...labels)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("Autor", "Author")}
          <input
            value={author}
            maxLength={200}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={t("Propietario", "Owner")}
          />
        </label>
      </div>
      <label>
        {t("Texto original", "Original text")}
        <textarea
          required
          className="large-textarea"
          value={text}
          maxLength={100000}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(
            "Pega aquí el fragmento que quieres conservar.",
            "Paste the passage you want to preserve here.",
          )}
        />
      </label>
      <div className="form-bottom">
        <label className="text-button upload-button">
          <Upload size={16} />
          {t("Importar TXT o Markdown", "Import TXT or Markdown")}
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                act(async () => {
                  if (f.size > 400000) throw Error("file_too_large");
                  setText((await f.text()).slice(0, 100000));
                  if (!title) setTitle(f.name);
                });
            }}
          />
        </label>
        <button className="primary" disabled={busy}>
          {t("Guardar fuente", "Save source")}
          <ArrowRight size={16} />
        </button>
      </div>
      <p className="small-note">
        {t(
          "Guardar no confirma nada sobre ti. Las afirmaciones se proponen y revisan después.",
          "Saving confirms nothing about you. Claims are proposed and reviewed afterwards.",
        )}
      </p>
    </form>
  );
}
function SourceDetail({
  source,
  archive,
  api,
  busy,
  act,
  refresh,
  removed,
}: Actions & { source: Source; archive: Archive; removed: () => void }) {
  const t = useText(),
    [quote, setQuote] = useState(""),
    [interpret, setInterpret] = useState(""),
    [subject, setSubject] = useState("owner"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [parent, setParent] = useState(""),
    [deletion, setDeletion] = useState<{ claims: number } | null>(null),
    [saved, setSaved] = useState(false);
  return (
    <section className="source-detail">
      <h2>{source.title}</h2>
      <p className="muted">
        {source.author} · {t(...kindLabels[source.kind])}
      </p>
      <pre className="source-original">{source.text}</pre>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await api("/claims", {
              source_id: source.id,
              text: interpret.trim() || quote,
              quote,
              kind: interpret.trim() ? "inference" : source.kind,
              subject,
              valid_from: from || null,
              valid_to: to || null,
              dependencies: parent ? [parent] : [],
            });
            await refresh();
            setSaved(true);
            setQuote("");
            setInterpret("");
          });
        }}
      >
        <h3>{t("Proponer una afirmación", "Propose a claim")}</h3>
        <label>
          {t("Cita literal de esta fuente", "Verbatim quote from this source")}
          <textarea
            required
            maxLength={2000}
            value={quote}
            onChange={(e) => {
              setQuote(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label>
          {t("Interpretación opcional", "Optional interpretation")}
          <textarea
            maxLength={2000}
            value={interpret}
            onChange={(e) => setInterpret(e.target.value)}
            placeholder={t(
              "Déjalo vacío para conservar la cita literal.",
              "Leave empty to preserve the verbatim quote.",
            )}
          />
        </label>
        <div className="form-two">
          <label>
            {t("Desde", "From")}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {t("Hasta", "Until")}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <label>
          {t("Se refiere a", "Subject")}
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="owner">{t("Propietario", "Owner")}</option>
            <option value="other">{t("Otra persona", "Another person")}</option>
          </select>
        </label>
        {interpret && (
          <label>
            {t("Depende de una afirmación", "Depends on a claim")}
            <select value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">
                {t("Solo de esta fuente", "Only this source")}
              </option>
              {archive.claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.text.slice(0, 90)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="primary" disabled={busy}>
          {t("Enviar a revisión", "Send for review")}
        </button>
        {saved && (
          <p className="success-text" role="status">
            {t(
              "Propuesta guardada. Revísala en Mi archivo.",
              "Proposal saved. Review it in My archive.",
            )}
          </p>
        )}
      </form>
      <div className="source-danger">
        {!deletion ? (
          <button
            className="danger text-button"
            disabled={busy}
            onClick={() =>
              act(async () =>
                setDeletion(await api("/sources/" + source.id + "/deletion")),
              )
            }
          >
            <Trash2 size={16} />
            {t("Revisar borrado de fuente", "Review source deletion")}
          </button>
        ) : (
          <>
            <p>
              {t("Se eliminarán esta fuente y", "This source and")}{" "}
              <strong>{deletion.claims}</strong>{" "}
              {t(
                "afirmaciones o derivados, junto con sus revisiones.",
                "claims or derivatives, along with their reviews.",
              )}
            </p>
            <div className="button-row">
              <button
                className="danger-button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api("/sources/" + source.id, undefined, "DELETE");
                    await refresh();
                    removed();
                  })
                }
              >
                {t("Eliminar definitivamente", "Delete permanently")}
              </button>
              <button className="secondary" onClick={() => setDeletion(null)}>
                {t("Cancelar", "Cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
