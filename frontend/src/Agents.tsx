import { useEffect, useState } from "react";
import {
  Cable,
  RefreshCw,
  Download,
  KeyRound,
  Pause,
  Play,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { API, useText } from "./shared";

type Grant = {
  id: string;
  name: string;
  scopes: string[];
  expires_at: string;
  revoked: boolean;
  expired: boolean;
};
type Update = {
  id: string;
  title: string;
  text: string;
  kind: string;
  source_reference: string;
  agent_name: string;
  state: string;
  created_at: string;
};
type Hub = {
  enabled: boolean;
  grants: Grant[];
  updates: Update[];
  audit: {
    seq: number;
    action: string;
    outcome: string;
    created_at: string;
    agent_id: string | null;
  }[];
};
const scopeCopy: [string, string, string, string, string][] = [
  [
    "context.read",
    "Consultar contexto",
    "Read context",
    "Declaraciones confirmadas y aportaciones aceptadas.",
    "Confirmed statements and accepted reports.",
  ],
  [
    "updates.write",
    "Aportar novedades",
    "Submit updates",
    "Siempre pasan por tu bandeja de revisión.",
    "Always sent to your review inbox.",
  ],
  [
    "evidence.read",
    "Leer fuentes completas",
    "Read complete sources",
    "Incluye texto original que aún no has revisado.",
    "Includes original text you may not have reviewed.",
  ],
  [
    "lab.run",
    "Proponer actividades",
    "Propose activities",
    "Prepara pruebas; la respuesta sigue siendo tuya.",
    "Sets up trials; you still provide the answer.",
  ],
];

export function Agents({
  api,
  busy,
  act,
}: {
  api: API;
  busy: boolean;
  act: (f: () => Promise<void>) => Promise<void>;
}) {
  const t = useText();
  const [hub, setHub] = useState<Hub | null>(null),
    [name, setName] = useState(""),
    [days, setDays] = useState(30);
  const [scopes, setScopes] = useState(["context.read", "updates.write"]);
  const [config, setConfig] = useState<object | null>(null),
    [filter, setFilter] = useState("pending"),
    [deleting, setDeleting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const refresh = async () => {
    setHub(await api<Hub>("/agents"));
    setLoadError(false);
  };
  useEffect(() => {
    let live = true;
    const load = () =>
      api<Hub>("/agents")
        .then((data) => {
          if (live) {
            setHub(data);
            setLoadError(false);
          }
        })
        .catch(() => {
          if (live) setLoadError(true);
        });
    load();
    const timer = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  const change = (fn: () => Promise<unknown>) =>
    act(async () => {
      await fn();
      await refresh();
    });
  const saveFile = (data: object, filename: string) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stateLabel = (state: string) =>
    ({
      pending: t("Por revisar", "To review"),
      accepted: t("Aceptada", "Accepted"),
      rejected: t("Rechazada", "Rejected"),
    })[state] || state;
  const kindLabel = (kind: string) =>
    ({
      reported_quote: t(
        "Cita comunicada por una IA",
        "Quote reported by an AI",
      ),
      inference: t("Inferencia de una IA", "AI inference"),
      update: t("Novedad de una IA", "AI update"),
    })[kind] || kind;
  return (
    <div className="agents-page">
      <div className="section-heading">
        <div>
          <h1>{t("Tus IA, con contexto", "Your AI, with context")}</h1>
          <p>
            {t(
              "Decide quién puede consultar tu archivo y qué puede aportar. Tú revisas lo que entra.",
              "Choose who can consult your archive and what they can contribute. You review what comes in.",
            )}
          </p>
        </div>
        <Cable size={30} />
      </div>
      {loadError && (
        <p role="alert">
          {t(
            "No se pudo actualizar la bandeja. Pulsa Actualizar para volver a intentarlo.",
            "Could not refresh the inbox. Press Refresh to try again.",
          )}
        </p>
      )}
      {!hub ? (
        <button onClick={() => act(refresh)}>
          {t("Cargar controles", "Load controls")}
        </button>
      ) : (
        <>
          <section className="agent-access" aria-labelledby="access-heading">
            <div>
              <h2 id="access-heading">
                {hub.enabled
                  ? t("Conexiones habilitadas", "Connections enabled")
                  : t("Conexiones en pausa", "Connections paused")}
              </h2>
              <p>
                {t(
                  "Acceso local por MCP. Una IA conectada puede procesar el contexto con su proveedor. Cada permiso se limita a este archivo.",
                  "Local access through MCP. A connected AI may process the context with its provider. Each permission is limited to this archive.",
                )}
              </p>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                change(() => api("/agents/switch", { enabled: !hub.enabled }))
              }
            >
              {hub.enabled ? <Pause size={17} /> : <Play size={17} />}{" "}
              {hub.enabled
                ? t("Pausar todas", "Pause all")
                : t("Habilitar conexiones", "Enable connections")}
            </button>
          </section>
          <div className="agents-layout">
            <div className="agent-inbox">
              <div className="agent-title-row">
                <h2>
                  {t("Bandeja de novedades", "Updates inbox")}{" "}
                  <span className="muted">
                    {hub.updates.filter((u) => u.state === "pending").length}
                  </span>
                </h2>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => act(refresh)}
                >
                  <RefreshCw size={15} />
                  {t("Actualizar", "Refresh")}
                </button>
              </div>
              <p className="muted">
                {t(
                  "Aceptar permite compartir la aportación con otras IA autorizadas. Conserva su autor y categoría; no se convierte en una declaración tuya.",
                  "Accepting makes a report available to other authorized AI. It keeps its author and category; it does not become your own statement.",
                )}
              </p>
              <div
                className="filters"
                aria-label={t("Estado de novedades", "Update status")}
              >
                {["pending", "accepted", "rejected"].map((state) => (
                  <button
                    key={state}
                    aria-pressed={filter === state}
                    className={filter === state ? "active" : ""}
                    onClick={() => setFilter(state)}
                  >
                    {stateLabel(state)}
                  </button>
                ))}
              </div>
              {hub.updates.filter((u) => u.state === filter).length === 0 ? (
                <div className="agent-empty">
                  <Cable size={28} />
                  <h3>
                    {filter === "pending"
                      ? t("Todo al día", "All caught up")
                      : t(
                          "Todavía no hay aportaciones aquí",
                          "No reports here yet",
                        )}
                  </h3>
                  <p>
                    {t(
                      "Cuando una IA conectada aporte algo sobre ti, aparecerá aquí con su procedencia.",
                      "When a connected AI contributes knowledge about you, it will appear here with its origin.",
                    )}
                  </p>
                </div>
              ) : (
                hub.updates
                  .filter((u) => u.state === filter)
                  .map((u) => (
                    <article className="agent-update" key={u.id}>
                      <div className="agent-meta">
                        <span>{u.agent_name}</span>
                        <time dateTime={u.created_at}>
                          {new Date(u.created_at).toLocaleDateString(
                            t("es-ES", "en-GB"),
                          )}
                        </time>
                      </div>
                      <h3>{u.title}</h3>
                      <span className="status proposed">
                        {kindLabel(u.kind)}
                      </span>
                      <p className="agent-original">{u.text}</p>
                      <details>
                        <summary>{t("Ver procedencia", "View origin")}</summary>
                        <p className="agent-original">{u.source_reference}</p>
                      </details>
                      <div className="agent-actions">
                        {u.state === "pending" && (
                          <button
                            className="primary small"
                            disabled={busy}
                            onClick={() =>
                              change(() =>
                                api("/agents/updates/" + u.id + "/review", {
                                  state: "accepted",
                                }),
                              )
                            }
                          >
                            <Check size={16} />
                            {t("Aceptar aportación", "Accept report")}
                          </button>
                        )}
                        {u.state !== "rejected" && (
                          <button
                            className="secondary small"
                            disabled={busy}
                            onClick={() =>
                              change(() =>
                                api("/agents/updates/" + u.id + "/review", {
                                  state: "rejected",
                                }),
                              )
                            }
                          >
                            <X size={16} />
                            {u.state === "accepted"
                              ? t("Retirar del contexto", "Remove from context")
                              : t("Rechazar", "Reject")}
                          </button>
                        )}
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() => setDeleting(u.id)}
                        >
                          <Trash2 size={15} />
                          {t("Eliminar", "Delete")}
                        </button>
                      </div>
                      {deleting === u.id && (
                        <div className="inline-confirm">
                          <p>
                            {t(
                              "Se borrará esta aportación del equipo. Las copias que otra IA ya haya recibido no se pueden retirar desde aquí.",
                              "This report will be deleted from this device. Copies already received by another AI cannot be withdrawn here.",
                            )}
                          </p>
                          <button
                            disabled={busy}
                            className="danger"
                            onClick={() =>
                              change(async () => {
                                await api(
                                  "/agents/updates/" + u.id,
                                  undefined,
                                  "DELETE",
                                );
                                setDeleting(null);
                              })
                            }
                          >
                            {t(
                              "Eliminar definitivamente",
                              "Delete permanently",
                            )}
                          </button>
                          <button onClick={() => setDeleting(null)}>
                            {t("Cancelar", "Cancel")}
                          </button>
                        </div>
                      )}
                    </article>
                  ))
              )}
              <details className="agent-history">
                <summary>{t("Actividad reciente", "Recent activity")}</summary>
                <p className="muted">
                  {t(
                    "Últimas 100 acciones. El registro no guarda el texto consultado ni claves.",
                    "Last 100 actions. The log does not store retrieved text or keys.",
                  )}
                </p>
                {hub.audit.length === 0 ? (
                  <p>{t("Sin actividad aún.", "No activity yet.")}</p>
                ) : (
                  <ul>
                    {hub.audit.map((a) => (
                      <li key={a.seq}>
                        <time>
                          {new Date(a.created_at).toLocaleTimeString(
                            t("es-ES", "en-GB"),
                          )}
                        </time>
                        <span>
                          {a.agent_id
                            ? (hub.grants.find((g) => g.id === a.agent_id)
                                ?.name ?? t("IA", "AI"))
                            : t("Tú", "You")}{" "}
                          · <code>{a.action}</code>
                        </span>
                        <span>
                          {a.outcome === "ok"
                            ? t("Completada", "Completed")
                            : t("Bloqueada", "Blocked")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    act(async () =>
                      saveFile(
                        await api("/agents/export"),
                        "SelfHoard-AI-reports.json",
                      ),
                    )
                  }
                >
                  <Download size={15} />
                  {t(
                    "Exportar aportaciones y registro",
                    "Export reports and activity",
                  )}
                </button>
              </details>
            </div>
            <aside
              className="agent-connections"
              aria-labelledby="connections-heading"
            >
              <h2 id="connections-heading">
                {t("Conectar una IA", "Connect an AI")}
              </h2>
              <p>
                {t(
                  "Dale un nombre reconocible y solo los permisos que necesite.",
                  "Give it a recognizable name and only the permissions it needs.",
                )}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const result = await api<{ mcp_config: object }>(
                      "/agents/grants",
                      { name, scopes, days },
                    );
                    setConfig(result.mcp_config);
                    setName("");
                    await refresh();
                  });
                }}
              >
                <label>
                  {t("Nombre de la IA", "AI name")}
                  <input
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("Ej. Codex personal", "E.g. Personal Codex")}
                  />
                </label>
                <fieldset className="agent-scopes">
                  <legend>{t("Permisos", "Permissions")}</legend>
                  {scopeCopy.map(([id, es, en, descEs, descEn]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={scopes.includes(id)}
                        onChange={(e) =>
                          setScopes(
                            e.target.checked
                              ? [...scopes, id]
                              : scopes.filter((s) => s !== id),
                          )
                        }
                      />
                      <span>
                        <strong>{t(es, en)}</strong>
                        <small>{t(descEs, descEn)}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label>
                  {t("Caduca en", "Expires in")}
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={7}>{t("7 días", "7 days")}</option>
                    <option value={30}>{t("30 días", "30 days")}</option>
                    <option value={90}>{t("90 días", "90 days")}</option>
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !name.trim() ||
                    scopes.length === 0 ||
                    config !== null
                  }
                >
                  <KeyRound size={17} />
                  {t("Crear conexión", "Create connection")}
                </button>
              </form>
              {config && (
                <div className="agent-credential" role="status">
                  <h3>
                    {t(
                      "Tu conexión está preparada",
                      "Your connection is ready",
                    )}
                  </h3>
                  <p>
                    {t(
                      "Descarga la configuración y añádela a un cliente MCP local. Contiene una clave: guárdala como una contraseña. Solo se muestra en este paso.",
                      "Download the configuration and add it to a local MCP client. It contains a key: store it like a password. It is only shown in this step.",
                    )}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => saveFile(config, "SelfHoard-MCP.json")}
                  >
                    <Download size={16} />
                    {t(
                      "Descargar configuración MCP",
                      "Download MCP configuration",
                    )}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfig(null)}
                  >
                    {t("Ya la he guardado", "I have saved it")}
                  </button>
                  {!hub.enabled && (
                    <p>
                      {t(
                        "Habilita las conexiones arriba para permitir el acceso.",
                        "Enable connections above to allow access.",
                      )}
                    </p>
                  )}
                </div>
              )}
              <div className="agent-grants">
                <h3>{t("Conexiones creadas", "Created connections")}</h3>
                {hub.grants.length === 0 ? (
                  <p className="muted">
                    {t(
                      "Ninguna IA tiene acceso todavía.",
                      "No AI has access yet.",
                    )}
                  </p>
                ) : (
                  hub.grants.map((g) => (
                    <div className="agent-grant" key={g.id}>
                      <strong>{g.name}</strong>
                      <small>
                        {g.revoked
                          ? t("Revocada", "Revoked")
                          : g.expired
                            ? t("Caducada", "Expired")
                            : t("Caduca el ", "Expires ") +
                              new Date(g.expires_at).toLocaleDateString(
                                t("es-ES", "en-GB"),
                              )}
                      </small>
                      <p>
                        {g.scopes
                          .map((s) => {
                            const copy = scopeCopy.find((c) => c[0] === s);
                            return copy ? t(copy[1], copy[2]) : s;
                          })
                          .join(" · ")}
                      </p>
                      {!g.revoked && (
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() =>
                            change(() =>
                              api(
                                "/agents/grants/" + g.id,
                                undefined,
                                "DELETE",
                              ),
                            )
                          }
                        >
                          {t("Revocar acceso", "Revoke access")}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <p className="muted agent-footnote">
                {t(
                  "Self Hoard debe estar abierto. Revocar bloquea futuras consultas; no borra las copias recibidas por un proveedor. Las novedades se envían cuando la IA usa la herramienta; no hay envíos automáticos en segundo plano.",
                  "Self Hoard must be running. Revocation blocks future queries; it does not erase copies received by a provider. Updates arrive when the AI calls the tool; there is no automatic background sending.",
                )}
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
