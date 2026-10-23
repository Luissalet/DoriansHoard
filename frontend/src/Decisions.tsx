import { useContext, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, Plus, X, Download } from "lucide-react";
import { API, Locale, Status, useText } from "./shared";
import { useEditorContext } from "./copilot-react";
import { onRefresh } from "./copilot-context";
import "./decisions.css";

type Option = { id: string; label: string; features: Record<string, number> };
type Case = { domain: string; situation: string; options: Option[] };
type Episode = Case & {
  id: string;
  card_id: string;
  state: string;
  chosen: string[];
  reason: string;
  considered: string;
  exception: string;
  period: string;
  vetoes: string[];
};
type Model = {
  id: string;
  domain: string;
  weights: Record<string, number>;
  episode_ids: string[];
  comparisons: number;
  created_at: string;
};
type Trial = {
  id: string;
  case: Case & { model_id: string };
  digest: string;
  answered: boolean;
  created_at: string;
  answer?: { chosen: string[]; reason: string };
  agreement?: boolean | null;
  brier?: number | null;
  uniform_brier?: number | null;
  seal?: {
    prediction: {
      prediction: string | null;
      probabilities: Record<string, number>;
    };
    model: Model;
  };
  canonical_payload?: string;
};
type State = { episodes: Episode[]; models: Model[]; trials: Trial[] };
type Draft = {
  domain: string;
  situation: string;
  criteria: string[];
  options: { id: string; label: string; ratings: string[] }[];
};
type Props = {
  api: API;
  busy: boolean;
  act: (work: () => Promise<void>) => Promise<void>;
};
const blank = (): Draft => ({
  domain: "",
  situation: "",
  criteria: [""],
  options: ["a", "b"].map((id) => ({ id, label: "", ratings: ["0"] })),
});
const fromCase = (value: Case): Draft => {
  const criteria = Object.keys(value.options[0]?.features || {});
  return {
    domain: value.domain,
    situation: "",
    criteria,
    options: value.options.map((option) => ({
      id: option.id,
      label: option.label,
      ratings: criteria.map((key) => String(option.features[key])),
    })),
  };
};
const caseValue = (draft: Draft): Case => ({
  domain: draft.domain.trim(),
  situation: draft.situation.trim(),
  options: draft.options.map((option) => ({
    id: option.id,
    label: option.label.trim(),
    features: Object.fromEntries(
      draft.criteria.map((key, i) => [key.trim(), Number(option.ratings[i])]),
    ),
  })),
});
function complete(draft: Draft) {
  return (
    !!draft.domain.trim() &&
    !!draft.situation.trim() &&
    draft.options.every(
      (option) =>
        option.label.trim() &&
        option.ratings.every(
          (value) =>
            value.trim() &&
            Number.isFinite(Number(value)) &&
            Number(value) >= 0 &&
            Number(value) <= 5,
        ),
    ) &&
    draft.criteria.length > 0 &&
    draft.criteria.every((key) => key.trim()) &&
    new Set(draft.criteria.map((key) => key.trim())).size ===
      draft.criteria.length
  );
}

function CaseEditor({
  value,
  change,
  fixed,
  disabled,
}: {
  value: Draft;
  change: (value: Draft) => void;
  fixed?: boolean;
  disabled: boolean;
}) {
  const t = useText();
  const updateOption = (id: string, patch: Partial<Draft["options"][number]>) =>
    change({
      ...value,
      options: value.options.map((option) =>
        option.id === id ? { ...option, ...patch } : option,
      ),
    });
  return (
    <fieldset disabled={disabled} className="decision-case">
      <div className="form-two">
        <label>
          {t("Ámbito", "Domain")}
          <input
            value={value.domain}
            readOnly={fixed}
            maxLength={100}
            required
            placeholder={t(
              "Por ejemplo: tiempo libre",
              "For example: free time",
            )}
            onChange={(event) =>
              change({ ...value, domain: event.target.value })
            }
          />
        </label>
        <p className="small-note">
          {t(
            "Compara ejemplos del mismo ámbito con los mismos criterios. Tus valoraciones describen cada alternativa; no son rasgos psicológicos medidos.",
            "Compare examples in one domain using the same criteria. Your ratings describe each alternative; they are not measured psychological traits.",
          )}
        </p>
      </div>
      <label>
        {t("Situación", "Situation")}
        <textarea
          value={value.situation}
          maxLength={4000}
          required
          placeholder={t(
            "¿Qué estabas decidiendo y en qué contexto?",
            "What were you deciding, and in what context?",
          )}
          onChange={(event) =>
            change({ ...value, situation: event.target.value })
          }
        />
      </label>
      <div className="decision-section-line">
        <h3>{t("Criterios", "Criteria")}</h3>
        {!fixed && (
          <button
            type="button"
            className="text-button"
            disabled={value.criteria.length >= 12}
            onClick={() =>
              change({
                ...value,
                criteria: [...value.criteria, ""],
                options: value.options.map((option) => ({
                  ...option,
                  ratings: [...option.ratings, "0"],
                })),
              })
            }
          >
            <Plus size={15} />
            {t("Añadir criterio", "Add criterion")}
          </button>
        )}
      </div>
      <div className="decision-criteria">
        {value.criteria.map((key, index) => (
          <div key={index}>
            <label>
              {t("Criterio", "Criterion")} {index + 1}
              <input
                value={key}
                readOnly={fixed}
                maxLength={80}
                required
                onChange={(event) =>
                  change({
                    ...value,
                    criteria: value.criteria.map((current, i) =>
                      i === index ? event.target.value : current,
                    ),
                  })
                }
              />
            </label>
            {!fixed && value.criteria.length > 1 && (
              <button
                type="button"
                className="decision-icon"
                aria-label={
                  t("Quitar criterio", "Remove criterion") + " " + (index + 1)
                }
                onClick={() =>
                  change({
                    ...value,
                    criteria: value.criteria.filter((_, i) => i !== index),
                    options: value.options.map((option) => ({
                      ...option,
                      ratings: option.ratings.filter((_, i) => i !== index),
                    })),
                  })
                }
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="decision-section-line">
        <h3>{t("Alternativas", "Alternatives")}</h3>
        <button
          type="button"
          className="text-button"
          disabled={value.options.length >= 8}
          onClick={() =>
            change({
              ...value,
              options: [
                ...value.options,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  ratings: value.criteria.map(() => "0"),
                },
              ],
            })
          }
        >
          <Plus size={15} />
          {t("Añadir alternativa", "Add alternative")}
        </button>
      </div>
      <p className="small-note">
        {t(
          "Valora de 0 a 5 cuánto ofrece cada alternativa de cada criterio. Cero significa nada y cinco, mucho.",
          "Rate how much each alternative offers of each criterion, from 0 to 5. Zero means none and five means a lot.",
        )}
      </p>
      {value.options.map((option, index) => (
        <div className="decision-option" key={option.id}>
          <div className="decision-option-heading">
            <label>
              {t("Alternativa", "Alternative")} {index + 1}
              <input
                value={option.label}
                maxLength={300}
                required
                onChange={(event) =>
                  updateOption(option.id, { label: event.target.value })
                }
              />
            </label>
            {value.options.length > 2 && (
              <button
                type="button"
                className="decision-icon"
                aria-label={
                  t("Quitar alternativa", "Remove alternative") +
                  " " +
                  (index + 1)
                }
                onClick={() =>
                  change({
                    ...value,
                    options: value.options.filter(
                      (current) => current.id !== option.id,
                    ),
                  })
                }
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="decision-ratings">
            {value.criteria.map((key, i) => (
              <label key={i}>
                {key || `${t("Criterio", "Criterion")} ${i + 1}`}
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="any"
                  required
                  value={option.ratings[i]}
                  aria-label={`${option.label || `${t("Alternativa", "Alternative")} ${index + 1}`} · ${key || `${t("Criterio", "Criterion")} ${i + 1}`}`}
                  onChange={(event) =>
                    updateOption(option.id, {
                      ratings: option.ratings.map((rating, j) =>
                        i === j ? event.target.value : rating,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function Choice({
  options,
  chosen,
  change,
  none,
  setNone,
  disabled,
}: {
  options: Option[];
  chosen: string[];
  change: (value: string[]) => void;
  none: boolean;
  setNone: (value: boolean) => void;
  disabled: boolean;
}) {
  const t = useText();
  return (
    <fieldset disabled={disabled} className="decision-choices">
      <legend>{t("Tu elección", "Your choice")}</legend>
      {options.map((option, index) => (
        <label key={option.id}>
          <input
            type="checkbox"
            checked={chosen.includes(option.id)}
            onChange={(event) => {
              setNone(false);
              change(
                event.target.checked
                  ? [...chosen, option.id]
                  : chosen.filter((id) => id !== option.id),
              );
            }}
          />
          {option.label || `${t("Alternativa", "Alternative")} ${index + 1}`}
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          checked={none}
          onChange={(event) => {
            setNone(event.target.checked);
            change([]);
          }}
        />
        {t("Ninguna preferencia", "No preference")}
      </label>
      <p className="small-note">
        {t(
          "Puedes elegir varias si hubo un empate.",
          "You can select more than one for a tie.",
        )}
      </p>
    </fieldset>
  );
}

function CaseSummary({ value }: { value: Case }) {
  const t = useText();
  return (
    <>
      <h3>{value.situation}</h3>
      <ul className="decision-case-summary">
        {value.options.map((option) => (
          <li key={option.id}>
            <strong>{option.label}</strong>
            <span>
              {Object.entries(option.features)
                .map(([key, rating]) => `${key}: ${rating}/5`)
                .join(" · ") || t("Sin criterios", "No criteria")}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Decisions({ api, busy, act }: Props) {
  const t = useText(),
    language = useContext(Locale);
  const [data, setData] = useState<State | null>(null);
  const [section, setSection] = useState<"examples" | "trials">("examples");
  const [draft, setDraft] = useState<Draft>(blank);
  const [chosen, setChosen] = useState<string[]>([]),
    [none, setNone] = useState(false);
  const [reason, setReason] = useState(""),
    [considered, setConsidered] = useState(""),
    [exception, setException] = useState(""),
    [period, setPeriod] = useState("");
  const [notice, setNotice] = useState(""),
    [opened, setOpened] = useState<string | null>(null);
  const [modelId, setModelId] = useState(""),
    [trialDraft, setTrialDraft] = useState<Draft | null>(null);
  const [trialId, setTrialId] = useState<string | null>(null),
    [answer, setAnswer] = useState<string[]>([]),
    [answerNone, setAnswerNone] = useState(false),
    [answerReason, setAnswerReason] = useState("");
  const workspace = useRef<HTMLDivElement>(null);
  const trialPanel = useRef<HTMLElement>(null);
  const load = async () => {
    const next = await api<State>("/decisions");
    setData(next);
    return next;
  };
  useEffect(() => {
    void act(async () => {
      await load();
    });
    return onRefresh(() =>
      act(async () => {
        await load();
      }),
    );
  }, []);
  useEffect(() => {
    if (opened)
      document
        .getElementById(`decision-example-${opened}`)
        ?.scrollIntoView({ block: "start" });
  }, [opened]);
  useEffect(() => {
    if (trialId) trialPanel.current?.scrollIntoView({ block: "start" });
  }, [
    trialId,
    data?.trials.find((current) => current.id === trialId)?.answered,
  ]);
  useEditorContext(() =>
    section === "examples"
      ? {
          kind: "decision-episode-draft",
          object_id: null,
          dirty: !!draft.situation || !!draft.domain || !!reason,
          fields: {
            ...draft,
            chosen,
            no_preference: none,
            reason,
            considered,
            exception,
            period,
          },
        }
      : trialDraft && !trialId
        ? {
            kind: "decision-case-draft",
            object_id: null,
            dirty: !!trialDraft.situation,
            fields: { ...trialDraft, model_id: modelId },
          }
        : null,
  );

  const model = data?.models.find((current) => current.id === modelId);
  const trial = data?.trials.find((current) => current.id === trialId);
  const domains = [...new Set(data?.episodes.map((episode) => episode.domain))];
  const options = caseValue(draft).options;
  const liveChosen = chosen.filter((id) =>
    draft.options.some((option) => option.id === id),
  );
  const selectTrial = (value: Trial) => {
    setTrialId(value.id);
    setModelId(value.case.model_id);
    setTrialDraft(fromCase(value.case));
    setAnswer([]);
    setAnswerNone(false);
    setAnswerReason("");
    setNotice("");
  };
  const useModel = (value: Model) => {
    const keys = Object.keys(value.weights);
    setModelId(value.id);
    setTrialId(null);
    setAnswer([]);
    setAnswerNone(false);
    setAnswerReason("");
    setTrialDraft({
      domain: value.domain,
      situation: "",
      criteria: keys,
      options: ["a", "b"].map((id) => ({
        id,
        label: "",
        ratings: keys.map(() => "0"),
      })),
    });
    setSection("trials");
    setNotice("");
    workspace.current?.scrollIntoView({ block: "start" });
  };
  const saveEpisode = () =>
    act(async () => {
      const saved = await api<Episode>("/decisions/episodes", {
        ...caseValue(draft),
        chosen: liveChosen,
        reason,
        considered,
        exception,
        period,
        vetoes: [],
      });
      await load();
      setDraft({ ...draft, situation: "" });
      setChosen([]);
      setNone(false);
      setReason("");
      setConsidered("");
      setException("");
      setPeriod("");
      setOpened(saved.id);
      setNotice(
        t(
          "Ejemplo guardado para revisar. Conservamos la estructura para tu siguiente decisión.",
          "Example saved for review. The structure is ready for your next decision.",
        ),
      );
    });
  const review = (episode: Episode, state: string) =>
    act(async () => {
      await api(`/reflection/cards/${episode.card_id}/review`, { state });
      await load();
      setNotice(
        state === "confirmed"
          ? t(
              "Ejemplo confirmado para el ajuste.",
              "Example confirmed for fitting.",
            )
          : t(
              "Ejemplo retirado del ajuste. Sus modelos y pruebas derivadas dejan de estar disponibles.",
              "Example withdrawn from fitting. Its derived models and trials are no longer available.",
            ),
      );
    });
  const fit = (domain: string) =>
    act(async () => {
      const result = await api<Model>("/decisions/fit", { domain });
      await load();
      useModel(result);
      setNotice(
        t(
          "Modelo local preparado. Prueba una situación nueva.",
          "Local model ready. Try a new situation.",
        ),
      );
    });
  const seal = () =>
    act(async () => {
      const result = await api<Trial>("/decisions/trials", {
        ...caseValue(trialDraft!),
        model_id: modelId,
      });
      await load();
      selectTrial(result);
    });
  const reveal = () =>
    act(async () => {
      await api(`/decisions/trials/${trial!.id}/answer`, {
        chosen: answer,
        reason: answerReason,
        reason_match: "unrated",
      });
      await load();
    });

  if (!data)
    return (
      <p className="small-note" role="status">
        {t("Cargando decisiones…", "Loading decisions…")}
      </p>
    );
  const number = (value: number | null | undefined, digits = 4) =>
    value == null
      ? "—"
      : value.toLocaleString(language, { maximumFractionDigits: digits });
  return (
    <div className="decisions-workspace" ref={workspace}>
      <div className="page-heading">
        <h1>{t("Tus decisiones", "Your decisions")}</h1>
        <p>
          {t(
            "Conserva ejemplos de lo que elegiste, ajusta un modelo local y ponlo a prueba con una situación nueva.",
            "Keep examples of your choices, fit a local model, and test it with a new situation.",
          )}
        </p>
      </div>
      <nav
        className="tabs decision-sections"
        aria-label={t("Trabajo con decisiones", "Decision workspace")}
      >
        <button
          className={section === "examples" ? "selected" : ""}
          aria-pressed={section === "examples"}
          disabled={busy}
          onClick={() => setSection("examples")}
        >
          {t("Ejemplos y modelo", "Examples and model")} ·{" "}
          {data.episodes.length}
        </button>
        <button
          className={section === "trials" ? "selected" : ""}
          aria-pressed={section === "trials"}
          disabled={busy}
          onClick={() => setSection("trials")}
        >
          {t("Pruebas ciegas", "Blind trials")} · {data.trials.length}
        </button>
      </nav>
      {notice && (
        <p role="status" className="decision-notice">
          {notice}
        </p>
      )}
      {section === "examples" ? (
        <>
          <div className="decision-layout">
            <section
              className="decision-editor"
              aria-label={t("Nuevo ejemplo", "New example")}
            >
              <h2>
                {t("Una decisión que recuerdas", "A decision you remember")}
              </h2>
              <p className="small-note">
                {t(
                  "Describe una elección propia. Se guardará como criterio pendiente de tu revisión.",
                  "Describe a choice of your own. It will be saved as a criterion awaiting your review.",
                )}
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEpisode();
                }}
              >
                <CaseEditor
                  value={draft}
                  change={(value) => {
                    setDraft(value);
                    setNotice("");
                  }}
                  disabled={busy}
                />
                <Choice
                  options={options}
                  chosen={liveChosen}
                  change={setChosen}
                  none={none}
                  setNone={setNone}
                  disabled={busy}
                />
                <label>
                  {t("Por qué lo elegiste", "Why you chose it")}
                  <textarea
                    value={reason}
                    maxLength={4000}
                    disabled={busy}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <details className="decision-more">
                  <summary>
                    {t("Matices y contexto", "Nuance and context")}
                  </summary>
                  <label>
                    {t("Qué más consideraste", "What else you considered")}
                    <textarea
                      value={considered}
                      maxLength={4000}
                      disabled={busy}
                      onChange={(event) => setConsidered(event.target.value)}
                    />
                  </label>
                  <label>
                    {t(
                      "Cuándo elegirías otra cosa",
                      "When you would choose differently",
                    )}
                    <textarea
                      value={exception}
                      maxLength={2000}
                      disabled={busy}
                      onChange={(event) => setException(event.target.value)}
                    />
                  </label>
                  <label>
                    {t("Época o fecha", "Period or date")}
                    <input
                      value={period}
                      maxLength={120}
                      disabled={busy}
                      onChange={(event) => setPeriod(event.target.value)}
                    />
                  </label>
                </details>
                <button
                  className="primary"
                  disabled={
                    busy || !complete(draft) || (!liveChosen.length && !none)
                  }
                >
                  <Plus size={16} />
                  {t("Guardar ejemplo para revisar", "Save example for review")}
                </button>
              </form>
            </section>
            <aside className="decision-training">
              <h2>{t("Del ejemplo al modelo", "From examples to a model")}</h2>
              <p className="small-note">
                {t(
                  "Necesitas al menos tres ejemplos confirmados con elección, del mismo ámbito y con criterios comparables. Sin preferencia se conserva como contexto, pero no entrena.",
                  "You need at least three confirmed examples with a choice, in one domain with comparable criteria. No-preference examples remain as context but do not train the model.",
                )}
              </p>
              {!domains.length && (
                <p>
                  {t(
                    "Tu primer ejemplo abrirá aquí su ámbito de comparación.",
                    "Your first example will open its comparison domain here.",
                  )}
                </p>
              )}
              {domains.map((domain) => {
                const count = data.episodes.filter(
                  (episode) =>
                    episode.domain === domain &&
                    episode.state === "confirmed" &&
                    episode.chosen.length,
                ).length;
                const latest = data.models.find(
                  (current) => current.domain === domain,
                );
                return (
                  <div key={domain} className="decision-domain">
                    <h3>{domain}</h3>
                    <p>
                      {count}{" "}
                      {t(
                        "ejemplos confirmados con elección",
                        "confirmed examples with a choice",
                      )}
                    </p>
                    <button
                      className="secondary"
                      disabled={busy || count < 3}
                      onClick={() => void fit(domain)}
                    >
                      {t("Ajustar modelo local", "Fit local model")}
                    </button>
                    {latest && (
                      <>
                        <p className="small-note">
                          {latest.comparisons}{" "}
                          {t("comparaciones por pares", "pairwise comparisons")}
                        </p>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => useModel(latest)}
                        >
                          {t("Probar este modelo", "Test this model")}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              <p className="small-note">
                {t(
                  "El ajuste usa tus valoraciones y ejemplos revisados. No carga un LLM ni mide fidelidad psicológica.",
                  "Fitting uses your ratings and reviewed examples. It does not load an LLM or measure psychological fidelity.",
                )}
              </p>
            </aside>
          </div>
          <section className="decision-history">
            <h2>{t("Ejemplos guardados", "Saved examples")}</h2>
            {!data.episodes.length && (
              <p className="small-note">
                {t(
                  "Aquí podrás revisar tus ejemplos antes de usarlos en el ajuste.",
                  "Review your examples here before using them for fitting.",
                )}
              </p>
            )}
            {data.episodes.map((episode) => (
              <article
                key={episode.id}
                id={`decision-example-${episode.id}`}
                className="decision-saved"
              >
                <div className="decision-section-line">
                  <button
                    className="decision-disclosure"
                    aria-expanded={opened === episode.id}
                    onClick={() =>
                      setOpened(opened === episode.id ? null : episode.id)
                    }
                  >
                    <strong>{episode.situation}</strong>
                    <span>{episode.domain}</span>
                  </button>
                  <Status state={episode.state} />
                </div>
                {opened === episode.id && (
                  <>
                    <CaseSummary value={episode} />
                    <p>
                      <strong>{t("Elección", "Choice")}: </strong>
                      {episode.chosen
                        .map(
                          (id) =>
                            episode.options.find((option) => option.id === id)
                              ?.label,
                        )
                        .join(", ") ||
                        t("Ninguna preferencia", "No preference")}
                    </p>
                    {episode.reason && <p>{episode.reason}</p>}
                    {episode.considered && (
                      <p>
                        {t("También consideraste", "Also considered")}:{" "}
                        {episode.considered}
                      </p>
                    )}
                    {episode.exception && (
                      <p>
                        {t("Excepción", "Exception")}: {episode.exception}
                      </p>
                    )}
                    {episode.period && <p>{episode.period}</p>}
                    <div className="decision-actions">
                      {episode.state !== "confirmed" ? (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void review(episode, "confirmed")}
                        >
                          <Check size={15} />
                          {t("Confirmar ejemplo", "Confirm example")}
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => void review(episode, "proposed")}
                        >
                          {t("Retirar del ajuste", "Withdraw from fitting")}
                        </button>
                      )}
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          setDraft(fromCase(episode));
                          setChosen([]);
                          setNone(false);
                          setReason("");
                          setConsidered("");
                          setException("");
                          setPeriod("");
                          workspace.current?.scrollIntoView({ block: "start" });
                          setNotice(
                            t(
                              "Estructura reutilizada. Describe una situación distinta y tu elección.",
                              "Structure reused. Describe a different situation and your choice.",
                            ),
                          );
                        }}
                      >
                        {t("Usar como base", "Use as a starting point")}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="decision-trial-tools">
            <h2>{t("Una situación nueva", "A new situation")}</h2>
            <p className="small-note">
              {t(
                "El modelo sella su predicción antes de recibir tu respuesta. Los resultados se conservan aparte de la memoria conversacional.",
                "The model seals its prediction before receiving your answer. Results remain separate from conversational memory.",
              )}
            </p>
            {!data.models.length ? (
              <p>
                {t(
                  "Confirma tres ejemplos y ajusta un modelo en Ejemplos y modelo para empezar.",
                  "Confirm three examples and fit a model in Examples and model to begin.",
                )}
              </p>
            ) : (
              <label>
                {t("Versión del modelo", "Model version")}
                <select
                  value={modelId}
                  disabled={busy}
                  onChange={(event) => {
                    const found = data.models.find(
                      (current) => current.id === event.target.value,
                    );
                    if (found) useModel(found);
                  }}
                >
                  <option value="">
                    {t("Elige un modelo", "Choose a model")}
                  </option>
                  {data.models.map((current) => (
                    <option value={current.id} key={current.id}>
                      {current.domain} · {current.created_at} ·{" "}
                      {current.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {model && !trialId && trialDraft && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void seal();
                }}
              >
                <CaseEditor
                  value={trialDraft}
                  change={setTrialDraft}
                  fixed
                  disabled={busy}
                />
                <button
                  className="primary"
                  disabled={busy || !complete(trialDraft)}
                >
                  <LockKeyhole size={16} />
                  {t(
                    "Sellar predicción y responder",
                    "Seal prediction and answer",
                  )}
                </button>
              </form>
            )}
            {modelId && !model && (
              <p role="status">
                {t(
                  "Este modelo fue retirado. Elige otro o ajusta uno con ejemplos vigentes.",
                  "This model was withdrawn. Choose another or fit one from current examples.",
                )}
              </p>
            )}
          </section>
          {trialId && !trial && (
            <p role="status">
              {t(
                "La prueba ya no está disponible: se retiró su modelo o se borraron sus datos.",
                "This trial is no longer available: its model was withdrawn or its data was deleted.",
              )}
            </p>
          )}
          {trial && (
            <section
              ref={trialPanel}
              className="decision-trial"
              aria-label={t("Prueba seleccionada", "Selected trial")}
            >
              <div className="decision-section-line">
                <h2>
                  {trial.answered
                    ? t("Comparación del resultado", "Result comparison")
                    : t("Predicción sellada", "Prediction sealed")}
                </h2>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setTrialId(null);
                    setNotice("");
                  }}
                >
                  {t("Cerrar prueba", "Close trial")}
                </button>
              </div>
              <CaseSummary value={trial.case} />
              {!trial.answered ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void reveal();
                  }}
                >
                  <p className="decision-notice">
                    <LockKeyhole size={16} />
                    {t(
                      "La predicción sigue oculta. Elige lo que harías antes de revelarla.",
                      "The prediction is hidden. Choose what you would do before revealing it.",
                    )}
                  </p>
                  <Choice
                    options={trial.case.options}
                    chosen={answer}
                    change={setAnswer}
                    none={answerNone}
                    setNone={setAnswerNone}
                    disabled={busy}
                  />
                  <label>
                    {t(
                      "Tu motivo para esta prueba",
                      "Your reason for this trial",
                    )}
                    <textarea
                      value={answerReason}
                      maxLength={4000}
                      disabled={busy}
                      onChange={(event) => setAnswerReason(event.target.value)}
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={busy || (!answer.length && !answerNone)}
                  >
                    {t("Guardar respuesta y revelar", "Save answer and reveal")}
                  </button>
                </form>
              ) : (
                <>
                  <p className="decision-verdict">
                    {!trial.answer!.chosen.length
                      ? t(
                          "No has indicado una preferencia para comparar el acierto.",
                          "You did not indicate a preference for comparing agreement.",
                        )
                      : trial.agreement === null
                        ? t(
                            "El modelo se abstuvo de elegir una alternativa.",
                            "The model abstained from choosing an alternative.",
                          )
                        : trial.agreement
                          ? t(
                              "La predicción coincide con tu elección.",
                              "The prediction matches your choice.",
                            )
                          : t(
                              "La predicción no coincide con tu elección.",
                              "The prediction does not match your choice.",
                            )}
                  </p>
                  <p>
                    <strong>
                      {t("Predicción del modelo", "Model prediction")}:{" "}
                    </strong>
                    {trial.case.options.find(
                      (option) =>
                        option.id === trial.seal!.prediction.prediction,
                    )?.label ||
                      t("Sin preferencia única", "No unique preference")}
                  </p>
                  <p>
                    <strong>{t("Tu elección", "Your choice")}: </strong>
                    {trial
                      .answer!.chosen.map(
                        (id) =>
                          trial.case.options.find((option) => option.id === id)
                            ?.label,
                      )
                      .join(", ") || t("Ninguna preferencia", "No preference")}
                  </p>
                  {trial.answer!.reason && <p>{trial.answer!.reason}</p>}
                  <div className="decision-probabilities">
                    {trial.case.options.map((option) => (
                      <div key={option.id}>
                        <span>{option.label}</span>
                        <strong>
                          {number(
                            (trial.seal!.prediction.probabilities[option.id] ||
                              0) * 100,
                            1,
                          )}
                          %
                        </strong>
                        <meter
                          aria-label={
                            t("Estimación para", "Estimate for") +
                            " " +
                            option.label
                          }
                          min={0}
                          max={1}
                          value={
                            trial.seal!.prediction.probabilities[option.id] || 0
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="small-note">
                    {t(
                      "Estimaciones del modelo sin calibrar, condicionadas a tus valoraciones. No son una medida de fidelidad de la persona.",
                      "Uncalibrated model estimates, conditional on your ratings. They do not measure fidelity to the person.",
                    )}
                  </p>
                  <dl className="decision-scores">
                    <div>
                      <dt>{t("Brier del modelo", "Model Brier")}</dt>
                      <dd>{number(trial.brier)}</dd>
                    </div>
                    <div>
                      <dt>{t("Brier uniforme", "Uniform Brier")}</dt>
                      <dd>{number(trial.uniform_brier)}</dd>
                    </div>
                  </dl>
                  <p className="small-note">
                    {trial.brier == null
                      ? t(
                          "Sin una preferencia no hay puntuación Brier para comparar.",
                          "Without a preference there is no Brier score to compare.",
                        )
                      : t(
                          "Menor puntuación es mejor en este caso. Un solo caso no valida el modelo ni demuestra calibración.",
                          "A lower score is better for this case. One case does not validate the model or demonstrate calibration.",
                        )}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(trial, null, 2)], {
                          type: "application/json",
                        }),
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `selfhoard-trial-${trial.id}.json`;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={16} />
                    {t("Descargar esta prueba", "Download this trial")}
                  </button>
                </>
              )}
              <details className="decision-seal">
                <summary>{t("Registro sellado", "Sealed record")}</summary>
                <p>{trial.created_at}</p>
                <p>
                  {t("Modelo", "Model")}: {trial.case.model_id}
                </p>
                <code>{trial.digest}</code>
              </details>
            </section>
          )}
          <section className="decision-history">
            <h2>{t("Pruebas guardadas", "Saved trials")}</h2>
            {!data.trials.length && (
              <p className="small-note">
                {t(
                  "Tus situaciones nuevas aparecerán aquí, también si todavía no has respondido.",
                  "Your new situations appear here, including those you have not answered yet.",
                )}
              </p>
            )}
            {data.trials.map((current) => (
              <button
                key={current.id}
                className="decision-trial-row"
                aria-pressed={trialId === current.id}
                disabled={busy}
                onClick={() => selectTrial(current)}
              >
                <span>
                  <strong>{current.case.situation}</strong>
                  <small>
                    {current.case.domain} · {current.created_at}
                  </small>
                </span>
                <span>
                  {current.answered
                    ? t("Comparar", "Compare")
                    : t("Por responder", "Awaiting answer")}
                </span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
