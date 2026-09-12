import { useEffect, useState } from "react";
import { API, useText } from "./shared";
import { Trash2 } from "lucide-react";
export type Provider = {
  id: string;
  name: string;
  model: string;
  kind: string;
  local: boolean;
  enabled: boolean;
  max_output_tokens: number;
  base_url: string;
  calls_per_day: number;
  budget_per_day: number;
  price_per_million: number;
};
export function ModelSettings({
  api,
  busy,
  act,
  changed,
}: {
  api: API;
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
  changed: () => Promise<void>;
}) {
  const t = useText(),
    [providers, setProviders] = useState<Provider[]>([]),
    [localOnly, setLocalOnly] = useState(true),
    [models, setModels] = useState<string[]>([]),
    [discovered, setDiscovered] = useState(false);
  const [kind, setKind] = useState("ollama"),
    [name, setName] = useState(""),
    [model, setModel] = useState(""),
    [url, setUrl] = useState("http://127.0.0.1:11434"),
    [key, setKey] = useState(""),
    [calls, setCalls] = useState(30),
    [tokens, setTokens] = useState(1200),
    [budget, setBudget] = useState(1),
    [price, setPrice] = useState(0),
    [priceDate, setPriceDate] = useState("");
  const remote = kind === "openai" || kind === "anthropic";
  const reload = async () => {
    const result = await api<{ providers: Provider[]; local_only: boolean }>(
      "/providers",
    );
    setProviders(result.providers);
    setLocalOnly(result.local_only);
  };
  useEffect(() => {
    void act(reload);
  }, []);
  return (
    <section className="reflection-models">
      <h2>
        {t(
          "Elige dónde conversa tu reflejo",
          "Choose where your reflection talks",
        )}
      </h2>
      <p>
        {t(
          "Las llamadas usan únicamente el destino que revisas. El servicio local debe ser de confianza: Self Hoard no controla si otra aplicación reenvía datos.",
          "Calls use only the destination you review. Your local service must be trusted: Self Hoard cannot control whether another application forwards data.",
        )}
      </p>
      <label className="reflection-check">
        <input
          type="checkbox"
          checked={localOnly}
          disabled={busy}
          onChange={(e) => {
            const checked = e.target.checked;
            void act(async () => {
              await api("/providers/policy", { local_only: checked });
              await reload();
            });
          }}
        />
        <span>
          {t("Permitir solo modelos locales", "Allow local models only")}
        </span>
      </label>
      <p className="reflection-note">
        {t(
          "Esta política y los modelos se comparten entre el archivo personal y la demo. Los recuerdos de ambos espacios siguen separados.",
          "This policy and the models are shared by the personal archive and demo. Memories remain separate.",
        )}
      </p>
      {providers.map((p) => (
        <div className="reflection-provider" key={p.id}>
          <div>
            <h3>{p.name}</h3>
            <p>
              {p.model} ·{" "}
              {p.local ? t("Local", "Local") : t("Externo", "External")}
            </p>
            <small>
              {p.base_url} · {p.calls_per_day} {t("llamadas/día", "calls/day")}
            </small>
          </div>
          <button
            className="secondary"
            disabled={busy}
            aria-label={t("Eliminar modelo: ", "Delete model: ") + p.name}
            onClick={() =>
              void act(async () => {
                await api("/providers/" + p.id, undefined, "DELETE");
                await reload();
                await changed();
              })
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <form
        className="reflection-editor"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            await api("/providers", {
              name,
              kind,
              model,
              base_url: url,
              api_key: key,
              max_output_tokens: tokens,
              calls_per_day: calls,
              budget_per_day: budget,
              price_per_million: remote ? price : 0,
              price_verified_on: remote ? priceDate : "",
            });
            setKey("");
            setName("");
            await reload();
            await changed();
          });
        }}
      >
        <h3>{t("Conectar un modelo", "Connect a model")}</h3>
        <fieldset disabled={busy}>
          <div className="reflection-form-grid">
            <label>
              {t("Servicio", "Service")}
              <select
                value={kind}
                onChange={(e) => {
                  const k = e.target.value;
                  setKind(k);
                  setKey("");
                  setUrl(
                    k === "openai"
                      ? "https://api.openai.com"
                      : k === "anthropic"
                        ? "https://api.anthropic.com"
                        : k === "ollama"
                          ? "http://127.0.0.1:11434"
                          : "http://127.0.0.1:1234",
                  );
                }}
              >
                <option value="ollama">Ollama</option>
                <option value="openai_local">
                  {t("Servidor local compatible", "Compatible local server")}
                </option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label>
              {t("Nombre de esta conexión", "Connection name")}
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t("Dirección del servicio", "Service address")}
              <input
                required
                type="url"
                readOnly={remote}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <label>
              {t("Identificador del modelo", "Model identifier")}
              <input
                required
                list="local-model-list"
                maxLength={200}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <datalist id="local-model-list">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
          </div>
          {kind === "ollama" && (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  void act(async () => {
                    const result = await api<{ models: string[] }>(
                      "/providers/local-models",
                    );
                    setModels(result.models);
                    setDiscovered(true);
                    if (!model && result.models.length)
                      setModel(result.models[0]);
                  })
                }
              >
                {t("Buscar modelos en Ollama", "Find models in Ollama")}
              </button>
              {discovered && (
                <p role="status">
                  {models.length
                    ? t(
                        `${models.length} modelos disponibles en la lista.`,
                        `${models.length} models available in the list.`,
                      )
                    : t(
                        "No se encontraron modelos. Abre Ollama y comprueba que tenga un modelo instalado.",
                        "No models found. Open Ollama and check that a model is installed.",
                      )}
                </p>
              )}
            </>
          )}
          {remote && (
            <>
              <p>
                {t(
                  "Este proveedor recibirá el contexto personal que apruebes. Su clave se guarda protegida con tu cuenta de Windows.",
                  "This provider will receive the personal context you approve. Its key is stored protected by your Windows account.",
                )}
              </p>
              {localOnly && (
                <p className="reflection-note">
                  {t(
                    "Puedes guardar la conexión, pero las llamadas externas están bloqueadas por el modo local.",
                    "You can save the connection, but local-only mode blocks external calls.",
                  )}
                </p>
              )}
              <label>
                {t("Clave del servicio", "Service key")}
                <input
                  type="password"
                  autoComplete="off"
                  required
                  maxLength={500}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </label>
              <div className="reflection-form-grid">
                <label>
                  {t(
                    "Precio máximo por millón de tokens (USD)",
                    "Maximum price per million tokens (USD)",
                  )}
                  <input
                    type="number"
                    required
                    min={0.000001}
                    max={1000}
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <small>
                    {t(
                      "Usa el mayor precio aplicable, incluida la salida. Consulta la tarifa de tu modelo.",
                      "Use the highest applicable rate, including output. Check your model’s pricing.",
                    )}
                  </small>
                </label>
                <label>
                  {t(
                    "Fecha de verificación de la tarifa",
                    "Date you verified the rate",
                  )}
                  <input
                    type="date"
                    required
                    value={priceDate}
                    onChange={(e) => setPriceDate(e.target.value)}
                  />
                </label>
                <label>
                  {t(
                    "Presupuesto diario máximo (USD)",
                    "Maximum daily budget (USD)",
                  )}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    required
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </label>
              </div>
            </>
          )}
          <div className="reflection-form-grid">
            <label>
              {t("Máximo de llamadas por día", "Maximum calls per day")}
              <input
                type="number"
                min={1}
                max={500}
                required
                value={calls}
                onChange={(e) => setCalls(Number(e.target.value))}
              />
            </label>
            <label>
              {t(
                "Extensión máxima de respuesta (tokens)",
                "Maximum answer length (tokens)",
              )}
              <input
                type="number"
                min={128}
                max={4000}
                required
                value={tokens}
                onChange={(e) => setTokens(Number(e.target.value))}
              />
            </label>
          </div>
          <button className="primary">
            {t("Guardar conexión", "Save connection")}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
