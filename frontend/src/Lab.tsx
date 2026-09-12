import { useContext, useEffect, useState } from "react";
import {
  Leaf,
  Palette,
  Coffee,
  LockKeyhole,
  Play,
  ArrowRight,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";
import { API, Locale, useText } from "./shared";
type Option = {
  id: string;
  label: { es: string; en: string };
  minutes: number;
  traits: Record<string, number>;
};
type Scenario = {
  id: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  options: Option[];
};
type Trial = {
  id: string;
  scenario: Scenario;
  minutes: number;
  weights: Record<string, number>;
  digest: string;
  created_at: string;
  answered: boolean;
  payload?: {
    prediction: string;
    scores: Record<string, number>;
    weights: Record<string, number>;
  };
  choice?: string;
  match?: boolean;
  canonical_payload?: string;
};
export function Lab({
  api,
  busy,
  act,
}: {
  api: API;
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
}) {
  const t = useText(),
    lang = useContext(Locale),
    [scenarios, setScenarios] = useState<Scenario[]>([]),
    [scenarioId, setScenarioId] = useState("afternoon"),
    [minutes, setMinutes] = useState(60),
    [weights, setWeights] = useState<Record<string, number>>({
      calm: 3,
      autonomy: 3,
      curiosity: 3,
      connection: 2,
    }),
    [trial, setTrial] = useState<Trial | null>(null),
    [history, setHistory] = useState<Trial[]>([]),
    [clearing, setClearing] = useState(false);
  useEffect(() => {
    act(async () => {
      setScenarios(await api("/lab/scenarios"));
      setHistory(await api("/lab/trials"));
    });
  }, []);
  const scenario =
    trial?.scenario ?? scenarios.find((s) => s.id === scenarioId);
  const options = scenario?.options ?? [];
  const labels: Record<string, string> = {
    calm: t("Calma", "Calm"),
    autonomy: t("Autonomía", "Autonomy"),
    curiosity: t("Curiosidad", "Curiosity"),
    connection: t("Compañía", "Connection"),
  };
  const prediction = trial?.payload?.prediction;
  const selectAnswer = (choice: string) =>
    act(async () => {
      setTrial(await api("/lab/trials/" + trial!.id + "/answer", { choice }));
      setHistory(await api("/lab/trials"));
    });
  const name = (id?: string) =>
    options.find((o) => o.id === id)?.label[lang] ??
    (id === "abstain"
      ? t("Sin predicción única", "No unique prediction")
      : id === "skip"
        ? t("Pregunta saltada", "Question skipped")
        : t("Ninguna opción", "None of these"));
  return (
    <>
      <div className="page-heading">
        <h1>
          {t("Pon las decisiones", "Put decisions")}
          <br />
          <span>{t("en movimiento.", "in motion.")}</span>
        </h1>
        <p>
          {t(
            "Un pequeño mundo para observar, elegir y comparar.",
            "A small world to observe, choose, and compare.",
          )}
        </p>
      </div>
      <div className="lab-disclosure">
        <FlaskIcon />
        <div>
          <strong>{t("Agente de demostración", "Demonstration agent")}</strong>
          <p>
            {t(
              "Usa prioridades que ajustas a mano. Todavía no aprende de tu archivo ni representa tu personalidad.",
              "Uses priorities you adjust by hand. It does not yet learn from your archive or represent your personality.",
            )}
          </p>
        </div>
      </div>
      <div className="lab-grid">
        <section className="arena-section">
          <div className="section-line">
            <h2>
              {scenario?.title[lang] ??
                t("Preparando escenario", "Preparing scene")}
            </h2>
            <span className="muted">{trial?.minutes ?? minutes} min</span>
          </div>
          <p>{scenario?.description[lang]}</p>
          <div
            className="arena"
            aria-label={t(
              "Escenario de tres actividades",
              "Three-activity scene",
            )}
          >
            <svg
              className="arena-paths"
              viewBox="0 0 600 340"
              role="img"
              aria-label={t(
                "Tres caminos conectan al agente con sus opciones.",
                "Three paths connect the agent to its options.",
              )}
            >
              <path
                d="M300 280 C 300 150 105 240 105 90 M300 280 L300 90 M300 280 C300 160 495 230 495 90"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 7"
              />
              {prediction && prediction !== "abstain" && (
                <path
                  className="chosen-path"
                  d={
                    prediction === "garden"
                      ? "M300 280 C300 150 105 240 105 90"
                      : prediction === "studio"
                        ? "M300 280 L300 90"
                        : "M300 280 C300 160 495 230 495 90"
                  }
                  fill="none"
                  strokeWidth="4"
                />
              )}
            </svg>
            <div className="places">
              {options.map((o, i) => {
                const Icon = [Leaf, Palette, Coffee][i];
                return (
                  <div
                    key={o.id}
                    className={
                      "place " +
                      (prediction === o.id ? "chosen" : "") +
                      ((trial?.minutes ?? minutes) < o.minutes
                        ? " unavailable"
                        : "")
                    }
                  >
                    <div className="place-icon">
                      <Icon size={32} strokeWidth={1.4} />
                    </div>
                    <strong>{o.label[lang]}</strong>
                    <small>{o.minutes} min</small>
                    {trial?.choice === o.id && (
                      <span className="your-choice">
                        {t("Tu elección", "Your choice")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className={
                "agent " +
                (prediction && prediction !== "abstain"
                  ? "agent-" + prediction
                  : "")
              }
            >
              <span className="agent-core" />
              <span>{t("Agente demo", "Demo agent")}</span>
            </div>
          </div>
          {!trial ? (
            <div className="arena-bottom">
              <p>
                {t(
                  "La predicción se guardará antes de mostrarte las opciones de respuesta.",
                  "The prediction is saved before response controls appear.",
                )}
              </p>
              <button
                className="primary"
                disabled={busy || !scenario}
                onClick={() =>
                  act(async () => {
                    setTrial(
                      await api("/lab/trials", {
                        scenario: scenarioId,
                        minutes,
                        weights,
                      }),
                    );
                    setHistory(await api("/lab/trials"));
                  })
                }
              >
                <Play size={17} />
                {t("Preparar duelo ciego", "Start blind comparison")}
              </button>
            </div>
          ) : !trial.answered ? (
            <div className="blind-choice">
              <div className="sealed">
                <LockKeyhole size={18} />
                <strong>
                  {t(
                    "Predicción guardada y oculta",
                    "Prediction saved and hidden",
                  )}
                </strong>
              </div>
              <p>{t("¿Qué elegirías tú?", "What would you choose?")}</p>
              <div className="choice-buttons">
                {options.map((o) => (
                  <button
                    className="secondary"
                    disabled={busy || o.minutes > trial.minutes}
                    key={o.id}
                    onClick={() => selectAnswer(o.id)}
                  >
                    {o.label[lang]}
                    {o.minutes > trial.minutes &&
                      " · " + t("Sin tiempo", "Not enough time")}
                  </button>
                ))}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => selectAnswer("none")}
                >
                  {t("Ninguna", "None")}
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => selectAnswer("skip")}
                >
                  {t("Saltar", "Skip")}
                </button>
              </div>
            </div>
          ) : (
            <div className="trial-result" role="status">
              <h3>
                {trial.payload?.prediction === "abstain"
                  ? t("El agente se ha abstenido.", "The agent abstained.")
                  : trial.choice === "skip"
                    ? t("Decisión saltada.", "Decision skipped.")
                    : trial.match
                      ? t(
                          "Habéis elegido lo mismo.",
                          "You chose the same activity.",
                        )
                      : t(
                          "Habéis elegido distinto.",
                          "You chose different activities.",
                        )}
              </h3>
              <p>
                {t("El agente eligió", "The agent chose")}:{" "}
                <strong>{name(prediction)}</strong>
              </p>
              <p>
                {t("Tú elegiste", "You chose")}:{" "}
                <strong>{name(trial.choice)}</strong>
              </p>
              <p className="small-note">
                {t(
                  "Es el resultado de una regla de puntuación, no una medida de fidelidad personal.",
                  "This is the result of a scoring rule, not a measure of personal fidelity.",
                )}
              </p>
              <button className="primary" onClick={() => setTrial(null)}>
                <RotateCcw size={16} />
                {t("Probar otro contexto", "Try another context")}
              </button>
            </div>
          )}
        </section>
        <aside className="lab-controls">
          <h2>{t("El criterio del agente", "The agent’s criteria")}</h2>
          <p className="small-note">
            {t(
              "Estas prioridades configuran la demostración. No son rasgos psicológicos medidos.",
              "These priorities configure the demo. They are not measured psychological traits.",
            )}
          </p>
          <fieldset disabled={!!trial || busy}>
            <label>
              {t("Escenario", "Scenario")}
              <select
                value={trial?.scenario.id ?? scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Tiempo disponible", "Available time")}
              <select
                value={trial?.minutes ?? minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                {[10, 20, 30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
            {Object.entries(trial?.weights ?? weights).map(([key, value]) => (
              <label className="range-label" key={key}>
                <span>
                  {labels[key]}
                  <strong>{value}</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={value}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </fieldset>
          {trial && (
            <details className="seal-detail">
              <summary>
                {t("Registro de la predicción", "Prediction record")}
              </summary>
              <p>{trial.created_at}</p>
              <code>{trial.digest}</code>
              <p>
                {t(
                  "Sello SHA-256 con un valor aleatorio privado hasta responder. Verificable en la exportación.",
                  "SHA-256 seal with a random value kept private until you answer. Verifiable in the export.",
                )}
              </p>
            </details>
          )}
          {trial?.answered && (
            <div className="score-detail">
              <h3>{t("Cómo decidió", "How it decided")}</h3>
              <p className="small-note">
                {t(
                  "Suma de prioridad × atributo para cada actividad que cabe en el tiempo. Los empates producen abstención.",
                  "Sum of priority × attribute for each activity that fits the time budget. Ties produce abstention.",
                )}
              </p>
              {Object.entries(trial.payload!.scores).map(([id, value]) => (
                <div className="score-line" key={id}>
                  <span>{name(id)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      <section className="trial-history">
        <div className="section-line">
          <h2>
            {t("Tus pruebas", "Your trials")} <span>{history.length}</span>
          </h2>
          <button
            className="text-button"
            disabled={!history.length}
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(
                  [
                    JSON.stringify(
                      {
                        format: "selfhoard.lab.demo",
                        version: 1,
                        trials: history,
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                ),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "SelfHoard-lab.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={16} />
            {t("Exportar registro", "Export record")}
          </button>
        </div>
        <p className="small-note">
          {t(
            "Se guardan aparte de la memoria personal. Las respuestas no se convierten en biografía.",
            "Stored separately from personal memory. Answers do not become biography.",
          )}
        </p>
        {history.slice(0, 8).map((h) => (
          <button className="trial-row" key={h.id} onClick={() => setTrial(h)}>
            <span>
              {h.scenario.title[lang]}
              <small>
                {new Date(h.created_at).toLocaleString(lang)} · {h.minutes} min
              </small>
            </span>
            <span>
              {h.answered
                ? t("Ver resultado", "View result")
                : t("Continuar", "Continue")}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
        {history.length > 0 && (
          <div className="history-delete">
            {clearing ? (
              <>
                <span>
                  {t(
                    "¿Eliminar todos los registros de este laboratorio?",
                    "Delete all records in this laboratory?",
                  )}
                </span>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await api("/lab/trials", undefined, "DELETE");
                      setHistory([]);
                      setTrial(null);
                      setClearing(false);
                    })
                  }
                >
                  {t("Eliminar", "Delete")}
                </button>
                <button
                  className="text-button"
                  onClick={() => setClearing(false)}
                >
                  {t("Cancelar", "Cancel")}
                </button>
              </>
            ) : (
              <button
                className="text-button danger"
                onClick={() => setClearing(true)}
              >
                <Trash2 size={15} />
                {t("Borrar registros", "Delete records")}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
function FlaskIcon() {
  return (
    <span className="demo-symbol">
      <LockKeyhole size={22} />
    </span>
  );
}
