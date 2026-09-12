import { useContext, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { API, Locale, useText, Status, kindLabels } from "./shared";
import { ModelSettings, Provider } from "./ModelSettings";

type Persona = {
  name: string;
  introduction: string;
  voice: string;
  thinking_style: string;
  values: string;
  boundaries: string;
  greeting: string;
  life_status: "living" | "legacy";
  consent: boolean;
};
type Expression = {
  feature: string;
  exact_examples: string[];
  use_when: string;
  avoid_when: string;
  relationship: string;
  frequency: string;
  language: string;
};
type Card = {
  id: string;
  kind: string;
  title: string;
  text: string;
  state: string;
  attribution: string;
  author: string;
  period: string;
  domain: string;
  expression?: Expression | null;
  source_id: string;
};
type Turn = {
  id: string;
  question: string;
  answer: { text: string; kind: string; uncertainty: string };
  evidence: Card[];
};
type Conversation = { id: string; title: string; turns: Turn[] };
type State = { profile: Persona; cards: Card[]; conversations: Conversation[] };
type Packet = {
  id: string;
  digest: string;
  conversation_id: string;
  payload: { evidence: Card[]; question: string };
  system: string;
  provider: Provider;
  estimated_max_cost: number;
  token_upper_bound: number;
};
const kinds: Record<string, [string, string]> = {
  memory: ["Recuerdo", "Memory"],
  voice: ["Forma de expresarse", "Expression"],
  criterion: ["Criterio y decisiones", "Criteria and decisions"],
  chapter: ["Etapa de vida", "Life chapter"],
  person: ["Persona importante", "Important person"],
  word: ["Palabra propia", "Personal vocabulary"],
  wish: ["Deseo para el futuro", "Wish for the future"],
};
const answerKinds: Record<string, [string, string]> = {
  reflection: ["Reflejo conversacional", "Conversational reflection"],
  documented_memory: ["Recuerdo documentado", "Documented memory"],
  simulated_advice: ["Consejo reconstruido", "Reconstructed advice"],
  prediction: ["Predicción, no certeza", "Prediction, not certainty"],
  simulated_analysis: ["Análisis reconstruido", "Reconstructed analysis"],
  unknown: ["Falta información", "Information missing"],
};
type Props = {
  api: API;
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
  refreshArchive: () => Promise<void>;
};

export function Reflection({ api, busy, act, refreshArchive }: Props) {
  const t = useText(),
    lang = useContext(Locale);
  const [data, setData] = useState<State | null>(null),
    [providers, setProviders] = useState<Provider[]>([]);
  const [section, setSection] = useState("conversation"),
    [providerId, setProviderId] = useState("");
  const [question, setQuestion] = useState(""),
    [mode, setMode] = useState("conversation"),
    [conversationId, setConversationId] = useState<string>();
  const [packet, setPacket] = useState<Packet | null>(null);
  const reload = async () => {
    const state = await api<State>("/reflection");
    setData(state);
    const p = await api<{ providers: Provider[] }>("/providers");
    setProviders(p.providers);
    setProviderId((old) =>
      p.providers.some((x) => x.id === old) ? old : (p.providers[0]?.id ?? ""),
    );
  };
  useEffect(() => {
    void act(reload);
  }, []);
  const changeSection = (value: string) => {
    setSection(value);
    setPacket(null);
  };
  const selected = data?.conversations.find((c) => c.id === conversationId);
  const suggestions: [string, string, string, string][] = [
    [
      "conversation",
      "Ante esta situación, ¿qué diría?",
      "In this situation, what would they say?",
      "",
    ],
    ["prediction", "¿Le gustaría esto?", "Would they like this?", ""],
    [
      "prediction",
      "¿Qué elegiría y por qué?",
      "What would they choose, and why?",
      "",
    ],
    ["anecdote", "Cuéntame una anécdota", "Tell me a story", ""],
  ];
  return (
    <div className="reflection-surface">
      <div className="page-heading">
        <h1>
          {t("Un reflejo.", "A reflection.")}
          <br />
          <span>{t("Su manera de ser.", "Their way of being.")}</span>
        </h1>
        <p>
          {t(
            "Recuerdos, gustos y palabras propias para conversar con la representación de una persona.",
            "Memories, tastes and familiar words for talking with a representation of one person.",
          )}
        </p>
      </div>
      <nav
        className="reflection-tabs"
        aria-label={t("Secciones del reflejo", "Reflection sections")}
      >
        {(
          [
            ["conversation", "Conversar", "Talk"],
            ["portrait", "Retrato", "Portrait"],
            ["memories", "Recuerdos y expresión", "Memories and expression"],
            ["model", "Modelo", "Model"],
          ] as const
        ).map(([id, es, en]) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            disabled={busy}
            onClick={() => changeSection(id)}
          >
            {t(es, en)}
          </button>
        ))}
      </nav>
      {!data ? (
        <p role="status">
          {t("Abriendo el reflejo…", "Opening the reflection…")}
        </p>
      ) : (
        <>
          {section === "conversation" && (
            <div className="reflection-workspace">
              <section
                className="reflection-dialogue"
                aria-label={t("Conversación", "Conversation")}
              >
                <div className="reflection-title">
                  <div>
                    <h2>
                      {data.profile.name || t("Tu reflejo", "Your reflection")}
                    </h2>
                    <p>
                      {t(
                        "Representación conversacional · respuestas generadas",
                        "Conversational representation · generated answers",
                      )}
                    </p>
                  </div>
                  <MessageCircle size={24} />
                </div>
                {!data.profile.consent ? (
                  <div className="reflection-start">
                    <h3>
                      {t("Empieza por la persona.", "Start with the person.")}
                    </h3>
                    <p>
                      {t(
                        "Define a quién representa este espacio y conserva ejemplos de sus palabras. Después podrás conversar con un modelo elegido por ti.",
                        "Define who this space represents and preserve examples of their words. Then talk with a model you choose.",
                      )}
                    </p>
                    <button
                      className="primary"
                      onClick={() => changeSection("portrait")}
                    >
                      {t("Preparar el retrato", "Prepare the portrait")}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {!selected && (
                      <div className="reflection-start">
                        <p>
                          {data.profile.greeting ||
                            t(
                              "Puedes traer una situación, comparar opciones o recuperar una historia. El reflejo señalará cuándo le faltan antecedentes.",
                              "Bring a situation, compare options or revisit a story. The reflection will say when it lacks evidence.",
                            )}
                        </p>
                        <div className="reflection-prompts">
                          {suggestions.map(([m, es, en]) => (
                            <button
                              key={es}
                              disabled={busy}
                              onClick={() => {
                                setQuestion(t(es, en) + " ");
                                setMode(m);
                                setPacket(null);
                                document
                                  .getElementById("reflection-question")
                                  ?.focus();
                              }}
                            >
                              {t(es, en)}
                              <ArrowRight size={15} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="reflection-turns" aria-live="polite">
                      {selected?.turns.map((turn) => (
                        <article className="reflection-turn" key={turn.id}>
                          <h3>{turn.question}</h3>
                          <span className="status">
                            {t(
                              ...(answerKinds[turn.answer.kind] ??
                                answerKinds.reflection),
                            )}
                          </span>
                          <p className="reflection-answer">
                            {turn.answer.text}
                          </p>
                          {turn.answer.uncertainty && (
                            <p className="reflection-uncertainty">
                              {turn.answer.uncertainty}
                            </p>
                          )}
                          {turn.evidence.length > 0 && (
                            <details>
                              <summary>
                                {t(
                                  "Ver los recuerdos que la sostienen",
                                  "See the supporting memories",
                                )}
                              </summary>
                              {turn.evidence.map((e) => (
                                <blockquote key={e.id}>
                                  <strong>{e.title}</strong>
                                  <p>{e.text}</p>
                                  <small>
                                    {t(
                                      ...(kindLabels[e.attribution] ?? [
                                        "Evidencia",
                                        "Evidence",
                                      ]),
                                    )}
                                  </small>
                                </blockquote>
                              ))}
                            </details>
                          )}
                        </article>
                      ))}
                    </div>
                    <form
                      className="reflection-compose"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act(async () =>
                          setPacket(
                            await api<Packet>("/reflection/preview", {
                              question,
                              mode,
                              provider_id: providerId,
                              conversation_id: conversationId,
                              language: lang,
                            }),
                          ),
                        );
                      }}
                    >
                      <label htmlFor="reflection-question">
                        {t(
                          "Tu situación o pregunta",
                          "Your situation or question",
                        )}
                      </label>
                      <textarea
                        id="reflection-question"
                        value={question}
                        maxLength={4000}
                        rows={4}
                        required
                        disabled={busy}
                        onChange={(e) => {
                          setQuestion(e.target.value);
                          setPacket(null);
                        }}
                        placeholder={t(
                          "Describe el contexto y las opciones que tiene…",
                          "Describe the context and available choices…",
                        )}
                      />
                      <div className="reflection-form-grid">
                        <label>
                          {t("Tipo de conversación", "Conversation type")}
                          <select
                            value={mode}
                            disabled={busy}
                            onChange={(e) => {
                              setMode(e.target.value);
                              setPacket(null);
                            }}
                          >
                            {[
                              [
                                "conversation",
                                "Qué diría",
                                "What they might say",
                              ],
                              [
                                "prediction",
                                "Gustos y elecciones",
                                "Tastes and choices",
                              ],
                              [
                                "analysis",
                                "Cómo lo analizaría",
                                "How they might analyze it",
                              ],
                              ["anecdote", "Anécdotas", "Anecdotes"],
                              ["advice", "Consejo", "Advice"],
                              [
                                "archive",
                                "Consultar recuerdos",
                                "Look up memories",
                              ],
                            ].map(([id, es, en]) => (
                              <option key={id} value={id}>
                                {t(es, en)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t("Modelo elegido", "Selected model")}
                          <select
                            required
                            value={providerId}
                            disabled={busy}
                            onChange={(e) => {
                              setProviderId(e.target.value);
                              setPacket(null);
                            }}
                          >
                            <option value="">
                              {t("Selecciona un modelo", "Choose a model")}
                            </option>
                            {providers.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={!p.enabled}
                              >
                                {p.name} ·{" "}
                                {p.local
                                  ? t("Local", "Local")
                                  : t("Externo", "External")}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {!providers.length && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => changeSection("model")}
                        >
                          {t("Conectar un modelo", "Connect a model")}
                        </button>
                      )}
                      <button
                        className="primary"
                        disabled={busy || !question.trim() || !providerId}
                      >
                        {t("Revisar antes de enviar", "Review before sending")}
                        <ArrowRight size={16} />
                      </button>
                    </form>
                    {packet && (
                      <section
                        className="reflection-preview"
                        aria-label={t(
                          "Revisión del envío",
                          "Review the message",
                        )}
                      >
                        <h3>
                          {t(
                            "Esto recibirá el modelo",
                            "What the model will receive",
                          )}
                        </h3>
                        <p>
                          <strong>{packet.provider.name}</strong> ·{" "}
                          {packet.provider.model} ·{" "}
                          {packet.provider.local
                            ? t("En este equipo", "On this device")
                            : t("Servicio externo", "External service")}
                        </p>
                        <p>
                          {t(
                            `${packet.payload.evidence.length} recuerdos o evidencias seleccionados.`,
                            `${packet.payload.evidence.length} selected memories or evidence items.`,
                          )}{" "}
                          {t(
                            "Límite estimado de coste:",
                            "Estimated cost ceiling:",
                          )}{" "}
                          ${packet.estimated_max_cost.toFixed(4)}
                        </p>
                        <details>
                          <summary>
                            {t(
                              "Ver el contenido exacto y las instrucciones",
                              "See the exact content and instructions",
                            )}
                          </summary>
                          <pre>{JSON.stringify(packet.payload, null, 2)}</pre>
                          <pre>{packet.system}</pre>
                        </details>
                        <div className="reflection-actions">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              void act(async () => {
                                const r = await api<{
                                  conversation_id: string;
                                }>("/reflection/send", {
                                  packet_id: packet.id,
                                  digest: packet.digest,
                                });
                                setConversationId(r.conversation_id);
                                setPacket(null);
                                setQuestion("");
                                await reload();
                              })
                            }
                          >
                            {busy
                              ? t("Generando respuesta…", "Generating answer…")
                              : t("Enviar y conversar", "Send and talk")}
                          </button>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => setPacket(null)}
                          >
                            {t("Cancelar envío", "Cancel message")}
                          </button>
                        </div>
                      </section>
                    )}
                  </>
                )}
              </section>
              <aside className="reflection-history">
                <h2>{t("Conversaciones", "Conversations")}</h2>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setConversationId(undefined);
                    setPacket(null);
                    setQuestion("");
                  }}
                >
                  <Plus size={15} />
                  {t("Nueva conversación", "New conversation")}
                </button>
                {!data.conversations.length && (
                  <p>
                    {t(
                      "Aquí se conservarán las conversaciones. No se convierten en recuerdos de la persona.",
                      "Conversations will be saved here. They do not become the person’s memories.",
                    )}
                  </p>
                )}
                {data.conversations.map((c) => (
                  <div className="reflection-history-row" key={c.id}>
                    <button
                      aria-current={
                        conversationId === c.id ? "true" : undefined
                      }
                      disabled={busy}
                      onClick={() => {
                        setConversationId(c.id);
                        setPacket(null);
                      }}
                    >
                      {c.title}
                    </button>
                    <button
                      disabled={busy}
                      aria-label={
                        t("Eliminar conversación: ", "Delete conversation: ") +
                        c.title
                      }
                      onClick={() =>
                        void act(async () => {
                          await api(
                            "/reflection/conversations/" + c.id,
                            undefined,
                            "DELETE",
                          );
                          if (conversationId === c.id)
                            setConversationId(undefined);
                          setPacket(null);
                          await reload();
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </aside>
            </div>
          )}
          {section === "portrait" && (
            <Portrait
              key={JSON.stringify(data.profile)}
              profile={data.profile}
              busy={busy}
              save={(profile) =>
                act(async () => {
                  await api("/reflection/persona", profile);
                  setConversationId(undefined);
                  setPacket(null);
                  await reload();
                })
              }
            />
          )}
          {section === "memories" && (
            <Memories
              cards={data.cards}
              api={api}
              busy={busy}
              act={act}
              reload={async () => {
                await reload();
                await refreshArchive();
              }}
            />
          )}
          {section === "model" && (
            <ModelSettings api={api} busy={busy} act={act} changed={reload} />
          )}
        </>
      )}
    </div>
  );
}

function Portrait({
  profile,
  busy,
  save,
}: {
  profile: Persona;
  busy: boolean;
  save: (p: Persona) => Promise<void>;
}) {
  const t = useText(),
    [value, setValue] = useState(profile);
  const fields: [keyof Persona, string, string, number][] = [
    ["name", "Nombre de la persona", "Person’s name", 100],
    [
      "introduction",
      "Quién es y qué quieres conservar",
      "Who they are and what you want to preserve",
      1200,
    ],
    [
      "voice",
      "Manera de expresarse: ritmo, humor, muletillas",
      "Expression: rhythm, humor, catchphrases",
      2000,
    ],
    [
      "thinking_style",
      "Cómo analiza, elige y cambia de opinión",
      "How they analyze, choose and change their mind",
      2000,
    ],
    ["values", "Lo que le importa", "What matters to them", 2000],
    [
      "boundaries",
      "Temas y límites que quiere respetar",
      "Topics and boundaries to respect",
      2000,
    ],
    [
      "greeting",
      "Presentación del espacio (opcional)",
      "Space introduction (optional)",
      500,
    ],
  ];
  return (
    <form
      className="reflection-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value);
      }}
    >
      <h2>{t("El retrato de una persona", "A portrait of one person")}</h2>
      <p>
        {t(
          "Describe lo que sabes. Los recuerdos y ejemplos literales se guardan por separado, con su autor y revisión.",
          "Describe what you know. Memories and verbatim examples are saved separately with authorship and review.",
        )}
      </p>
      <fieldset disabled={busy}>
        {fields.map(([key, es, en, max]) => (
          <label key={key}>
            {t(es, en)}
            {key === "name" ? (
              <input
                value={String(value[key])}
                maxLength={max}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            ) : (
              <textarea
                value={String(value[key])}
                rows={key === "voice" ? 4 : 3}
                maxLength={max}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label>
          {t("Etapa del reflejo", "Reflection stage")}
          <select
            value={value.life_status}
            onChange={(e) =>
              setValue({
                ...value,
                life_status: e.target.value as Persona["life_status"],
              })
            }
          >
            <option value="living">
              {t("Preparación en vida", "Prepared during life")}
            </option>
            <option value="legacy">{t("Legado", "Legacy")}</option>
          </select>
        </label>
        <label className="reflection-check">
          <input
            type="checkbox"
            checked={value.consent}
            onChange={(e) => setValue({ ...value, consent: e.target.checked })}
          />
          <span>
            {t(
              "Tengo autorización para preparar esta representación y habilitar conversaciones con los datos revisados.",
              "I have authorization to prepare this representation and enable conversations using reviewed data.",
            )}
          </span>
        </label>
        <p className="reflection-note">
          {t(
            "Guardar cambios retira las conversaciones anteriores para que un retrato antiguo no siga aportando información. El modo legado todavía no concede acceso a familiares.",
            "Saving changes removes previous conversations so an old portrait cannot keep supplying information. Legacy mode does not yet grant relatives access.",
          )}
        </p>
        <button className="primary">
          {t("Guardar retrato", "Save portrait")}
        </button>
      </fieldset>
    </form>
  );
}

function Memories({
  cards,
  api,
  busy,
  act,
  reload,
}: {
  cards: Card[];
  api: API;
  busy: boolean;
  act: Props["act"];
  reload: () => Promise<void>;
}) {
  const t = useText(),
    lang = useContext(Locale),
    [adding, setAdding] = useState(false),
    [kind, setKind] = useState("memory"),
    [title, setTitle] = useState(""),
    [text, setText] = useState("");
  const [author, setAuthor] = useState(""),
    [attribution, setAttribution] = useState("owner_statement"),
    [period, setPeriod] = useState(""),
    [domain, setDomain] = useState("");
  const [feature, setFeature] = useState("catchphrase"),
    [examples, setExamples] = useState(""),
    [useWhen, setUseWhen] = useState(""),
    [avoidWhen, setAvoidWhen] = useState(""),
    [relationship, setRelationship] = useState(""),
    [frequency, setFrequency] = useState("unknown"),
    [expressionLanguage, setExpressionLanguage] = useState("");
  const [prompt, setPrompt] = useState<{
      kind: string;
      title: string;
      question: string;
    } | null>(null),
    [filter, setFilter] = useState("all");
  const open = () => {
    setAdding(true);
    setPrompt(null);
  };
  return (
    <div className="reflection-memories">
      <div className="reflection-title">
        <div>
          <h2>
            {t(
              "Lo que hace reconocible a alguien",
              "What makes someone recognizable",
            )}
          </h2>
          <p>
            {t(
              "Una historia concreta. Una frase suya. El motivo de una elección.",
              "A particular story. A familiar phrase. The reason behind a choice.",
            )}
          </p>
        </div>
        <div className="reflection-actions">
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const p = await api<{
                  kind: string;
                  title: string;
                  question: string;
                }>("/reflection/interview?language=" + lang);
                setPrompt(p);
                setKind(p.kind);
                setTitle(p.title);
                setAdding(true);
              })
            }
          >
            <BookOpen size={16} />
            {t("Guiarme con una pregunta", "Guide me with a question")}
          </button>
          <button className="primary" disabled={busy} onClick={open}>
            <Plus size={16} />
            {t("Añadir recuerdo o expresión", "Add memory or expression")}
          </button>
        </div>
      </div>
      {adding && (
        <form
          className="reflection-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await api("/reflection/cards", {
                kind,
                title,
                text,
                attribution,
                author:
                  author.trim() ||
                  (attribution === "owner_statement"
                    ? "owner"
                    : "attributed author"),
                period,
                domain,
                ...(kind === "voice"
                  ? {
                      expression: {
                        feature,
                        exact_examples: examples
                          .split("\n")
                          .filter((x) => x.trim()),
                        use_when: useWhen,
                        avoid_when: avoidWhen,
                        relationship,
                        frequency,
                        language: expressionLanguage,
                      },
                    }
                  : {}),
              });
              if (prompt)
                await api("/reflection/interview", {
                  kind: prompt.kind,
                  action: "answered",
                });
              setAdding(false);
              setPrompt(null);
              setTitle("");
              setText("");
              setExamples("");
              await reload();
            });
          }}
        >
          {prompt && (
            <div className="reflection-interview">
              <h3>{prompt.title}</h3>
              <p>{prompt.question}</p>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api("/reflection/interview", {
                      kind: prompt.kind,
                      action: "skipped",
                    });
                    const p = await api<{
                      kind: string;
                      title: string;
                      question: string;
                    }>("/reflection/interview?language=" + lang);
                    setPrompt(p);
                    setTitle(p.title);
                    setKind(p.kind);
                  })
                }
              >
                {t("Otra pregunta", "Another question")}
              </button>
            </div>
          )}
          <fieldset disabled={busy}>
            <div className="reflection-form-grid">
              <label>
                {t("Tipo de recuerdo", "Memory type")}
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {Object.entries(kinds).map(([id, label]) => (
                    <option key={id} value={id}>
                      {t(...label)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Título", "Title")}
                <input
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>
            <label>
              {t(
                "Texto original o relato atribuido",
                "Original text or attributed account",
              )}
              <textarea
                required
                rows={5}
                maxLength={12000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="reflection-form-grid">
              <label>
                {t("De dónde procede", "Where it comes from")}
                <select
                  value={attribution}
                  onChange={(e) => setAttribution(e.target.value)}
                >
                  {Object.entries(kindLabels)
                    .filter(([id]) => id !== "fiction")
                    .map(([id, label]) => (
                      <option key={id} value={id}>
                        {t(...label)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t("Autor", "Author")}
                <input
                  value={author}
                  required={attribution !== "owner_statement"}
                  maxLength={100}
                  placeholder={
                    attribution === "owner_statement"
                      ? t("La propia persona", "The person themselves")
                      : t("Quién lo cuenta", "Who is telling it")
                  }
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label>
                {t("Época o fecha aproximada", "Period or approximate date")}
                <input
                  maxLength={120}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </label>
              <label>
                {t("Contexto o tema", "Context or topic")}
                <input
                  maxLength={100}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </label>
            </div>
            {kind === "voice" && (
              <div className="reflection-expression">
                <h3>{t("Su forma de decirlo", "Their way of saying it")}</h3>
                <p>
                  {t(
                    "Guarda el ejemplo y sus matices. Una muletilla no tiene que aparecer en cada respuesta. Los gestos se documentan; el reflejo de texto no los ejecuta.",
                    "Preserve the example and its nuances. A catchphrase need not appear in every reply. Gestures are documented; the text reflection does not perform them.",
                  )}
                </p>
                <div className="reflection-form-grid">
                  <label>
                    {t("Rasgo de expresión", "Expression feature")}
                    <select
                      value={feature}
                      onChange={(e) => setFeature(e.target.value)}
                    >
                      {[
                        [
                          "catchphrase",
                          "Muletilla o frase habitual",
                          "Catchphrase",
                        ],
                        ["vocabulary", "Vocabulario", "Vocabulary"],
                        [
                          "rhythm",
                          "Ritmo y estructura",
                          "Rhythm and structure",
                        ],
                        ["humor", "Humor", "Humor"],
                        [
                          "address",
                          "Forma de dirigirse a alguien",
                          "Forms of address",
                        ],
                        [
                          "storytelling",
                          "Forma de contar historias",
                          "Storytelling",
                        ],
                        [
                          "gesture",
                          "Gesto o manierismo descrito",
                          "Described gesture or mannerism",
                        ],
                      ].map(([id, es, en]) => (
                        <option key={id} value={id}>
                          {t(es, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("Frecuencia observada", "Observed frequency")}
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                    >
                      {[
                        ["unknown", "No lo sé", "Unknown"],
                        ["rare", "Rara vez", "Rarely"],
                        ["sometimes", "A veces", "Sometimes"],
                        ["often", "A menudo", "Often"],
                      ].map(([id, es, en]) => (
                        <option key={id} value={id}>
                          {t(es, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  {t(
                    "Fragmentos literales, uno por línea (hasta 8)",
                    "Verbatim excerpts, one per line (up to 8)",
                  )}
                  <textarea
                    rows={3}
                    maxLength={8000}
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                  />
                  <small>
                    {t(
                      "Cada fragmento debe aparecer exactamente en el texto original de arriba.",
                      "Each excerpt must appear exactly in the original text above.",
                    )}
                  </small>
                </label>
                <div className="reflection-form-grid">
                  <label>
                    {t("Cuándo lo usa", "When they use it")}
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={useWhen}
                      onChange={(e) => setUseWhen(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Cuándo no encaja", "When it would not fit")}
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={avoidWhen}
                      onChange={(e) => setAvoidWhen(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Con quién habla así", "Who they speak this way with")}
                    <input
                      maxLength={200}
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("Idioma del ejemplo", "Example language")}
                    <input
                      maxLength={80}
                      value={expressionLanguage}
                      onChange={(e) => setExpressionLanguage(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="reflection-actions">
              <button className="primary">
                {t("Guardar para revisar", "Save for review")}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setAdding(false)}
              >
                {t("Cerrar formulario", "Close form")}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <label className="reflection-filter">
        {t("Mostrar", "Show")}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">
            {t("Todos los recuerdos", "All memories")}
          </option>
          {Object.entries(kinds).map(([id, label]) => (
            <option key={id} value={id}>
              {t(...label)}
            </option>
          ))}
        </select>
      </label>
      {!cards.length && (
        <div className="reflection-empty">
          <h3>
            {t("Todavía no hay recuerdos guardados.", "No memories saved yet.")}
          </h3>
          <p>
            {t(
              "Empieza por una escena que quieras conservar o una expresión que sus seres queridos reconocerían.",
              "Start with a scene you want to preserve or an expression their loved ones would recognize.",
            )}
          </p>
        </div>
      )}
      {cards
        .filter((c) => filter === "all" || c.kind === filter)
        .map((c) => (
          <article className="reflection-memory" key={c.id}>
            <div className="reflection-title">
              <div>
                <span>
                  {t(...(kinds[c.kind] ?? kinds.memory))} ·{" "}
                  {t(...(kindLabels[c.attribution] ?? kindLabels.attributed))}
                </span>
                <h3>{c.title}</h3>
              </div>
              <Status state={c.state} />
            </div>
            <p className="reflection-answer">{c.text}</p>
            {c.expression && (
              <dl className="reflection-expression-meta">
                <div>
                  <dt>{t("Con quién", "With whom")}</dt>
                  <dd>
                    {c.expression.relationship ||
                      t("Sin especificar", "Unspecified")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Cuándo", "When")}</dt>
                  <dd>
                    {c.expression.use_when ||
                      t("Sin especificar", "Unspecified")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Evitar en", "Avoid when")}</dt>
                  <dd>
                    {c.expression.avoid_when ||
                      t("Sin especificar", "Unspecified")}
                  </dd>
                </div>
              </dl>
            )}
            <details className="reflection-review-details">
              <summary>
                {t(
                  "Revisar autor y detalles guardados",
                  "Review author and saved details",
                )}
              </summary>
              <dl className="reflection-expression-meta">
                <div>
                  <dt>{t("Autor", "Author")}</dt>
                  <dd>
                    {c.author === "owner"
                      ? t("La propia persona", "The person themselves")
                      : c.author}
                  </dd>
                </div>
                <div>
                  <dt>
                    {t(
                      "Época o fecha aproximada",
                      "Period or approximate date",
                    )}
                  </dt>
                  <dd>{c.period || t("Sin especificar", "Unspecified")}</dd>
                </div>
                <div>
                  <dt>{t("Contexto o tema", "Context or topic")}</dt>
                  <dd>{c.domain || t("Sin especificar", "Unspecified")}</dd>
                </div>
                {c.expression && (
                  <>
                    <div>
                      <dt>{t("Rasgo de expresión", "Expression feature")}</dt>
                      <dd>
                        {t(
                          ...(
                            {
                              catchphrase: [
                                "Muletilla o frase habitual",
                                "Catchphrase",
                              ],
                              vocabulary: ["Vocabulario", "Vocabulary"],
                              rhythm: [
                                "Ritmo y estructura",
                                "Rhythm and structure",
                              ],
                              humor: ["Humor", "Humor"],
                              address: [
                                "Forma de dirigirse a alguien",
                                "Forms of address",
                              ],
                              storytelling: [
                                "Forma de contar historias",
                                "Storytelling",
                              ],
                              gesture: [
                                "Gesto o manierismo descrito",
                                "Described gesture or mannerism",
                              ],
                            } as Record<string, [string, string]>
                          )[c.expression.feature],
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Frecuencia observada", "Observed frequency")}</dt>
                      <dd>
                        {t(
                          ...(
                            {
                              unknown: ["No lo sé", "Unknown"],
                              rare: ["Rara vez", "Rarely"],
                              sometimes: ["A veces", "Sometimes"],
                              often: ["A menudo", "Often"],
                            } as Record<string, [string, string]>
                          )[c.expression.frequency],
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("Idioma del ejemplo", "Example language")}</dt>
                      <dd>
                        {c.expression.language ||
                          t("Sin especificar", "Unspecified")}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {c.expression && (
                <div>
                  <strong>
                    {t("Fragmentos literales", "Verbatim excerpts")}
                  </strong>
                  {c.expression.exact_examples.length ? (
                    c.expression.exact_examples.map((example, i) => (
                      <blockquote key={i}>{example}</blockquote>
                    ))
                  ) : (
                    <p className="reflection-note">
                      {t(
                        "No se guardaron fragmentos literales.",
                        "No verbatim excerpts were saved.",
                      )}
                    </p>
                  )}
                </div>
              )}
            </details>
            <div className="reflection-actions">
              {c.state === "proposed" && (
                <>
                  <button
                    className="primary small"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await api("/reflection/cards/" + c.id + "/review", {
                          state: "confirmed",
                        });
                        await reload();
                      })
                    }
                  >
                    {t(
                      "Confirmar para el reflejo",
                      "Confirm for the reflection",
                    )}
                  </button>
                  <button
                    className="secondary small"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await api("/reflection/cards/" + c.id + "/review", {
                          state: "rejected",
                        });
                        await reload();
                      })
                    }
                  >
                    {t("Rechazar", "Reject")}
                  </button>
                </>
              )}
              {c.state === "confirmed" && (
                <button
                  className="secondary small"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api("/reflection/cards/" + c.id + "/review", {
                        state: "proposed",
                      });
                      await reload();
                    })
                  }
                >
                  {t("Retirar del reflejo", "Withdraw from reflection")}
                </button>
              )}
              <button
                className="secondary small"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api("/reflection/cards/" + c.id, undefined, "DELETE");
                    await reload();
                  })
                }
              >
                <Trash2 size={15} />
                {t("Eliminar ficha", "Delete entry")}
              </button>
            </div>
            <small>
              {t(
                "La fuente original se conserva en Fuentes. Retirar esta ficha elimina las conversaciones que dependan de ella.",
                "The original source remains in Sources. Withdrawing this entry deletes conversations that depend on it.",
              )}
            </small>
          </article>
        ))}
    </div>
  );
}
