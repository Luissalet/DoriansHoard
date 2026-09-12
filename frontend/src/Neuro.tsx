import { useState } from "react";
import { ArrowUpRight, Network, Activity, Footprints } from "lucide-react";
import { useText } from "./shared";
export function Neuro() {
  const t = useText(),
    [layer, setLayer] = useState(0);
  const nodes = Array.from({ length: 60 }, (_, i) => ({
    x: 65 + (i % 12) * 37 + Math.sin(i * 4) * 12,
    y: 35 + Math.floor(i / 12) * 39 + Math.cos(i * 7) * 13,
  }));
  const steps = [
    {
      name: t("Conexiones", "Connections"),
      Icon: Network,
      text: t(
        "Un mapa identifica neuronas y conexiones. La estructura permite formular hipótesis sobre los circuitos.",
        "A map identifies neurons and connections. Structure helps formulate hypotheses about circuits.",
      ),
    },
    {
      name: t("Dinámica", "Dynamics"),
      Icon: Activity,
      text: t(
        "Un modelo añade reglas sobre cómo cambia la actividad. Esas reglas incluyen supuestos que hay que contrastar.",
        "A model adds rules for how activity changes. Those rules include assumptions that need testing.",
      ),
    },
    {
      name: t("Conducta", "Behavior"),
      Icon: Footprints,
      text: t(
        "Un cuerpo y un entorno cierran el ciclo: percibir, actuar y volver a percibir. La conducta se compara con observaciones.",
        "A body and environment close the loop: perceive, act, and perceive again. Behavior is compared with observations.",
      ),
    },
  ];
  const research = [
    {
      name: "FlyWire",
      year: "2024",
      detail: t("139.255 neuronas", "139,255 neurons"),
      text: t(
        "Mapa del cerebro de una mosca adulta hembra, con alrededor de 50 millones de sinapsis químicas.",
        "An adult female fly brain map with around 50 million chemical synapses.",
      ),
      link: "https://www.nature.com/articles/s41586-024-07558-y",
    },
    {
      name: "MaleCNS",
      year: "2026",
      detail: t("Más de 166.000 neuronas", "Over 166,000 neurons"),
      text: t(
        "Cerebro y cordón nervioso ventral del macho: 125 millones de conexiones sinápticas. Un alcance distinto al de FlyWire 2024.",
        "Male brain and ventral nerve cord: 125 million synaptic connections. A different scope from FlyWire 2024.",
      ),
      link: "https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/",
    },
    {
      name: "NeuroMechFly v2",
      year: "2024",
      detail: t("Un cuerpo en un mundo", "A body in a world"),
      text: t(
        "Simulación neuromecánica con visión, olfato y retroalimentación motora para estudiar control y navegación.",
        "A neuromechanical simulation with vision, smell and motor feedback for studying control and navigation.",
      ),
      link: "https://www.nature.com/articles/s41592-024-02497-y",
    },
    {
      name: "Eon",
      year: "2026",
      detail: t("Cerrar el ciclo", "Closing the loop"),
      text: t(
        "Demo que integra modelos neuronales y corporales existentes. Usa controladores aprendidos y ajustes manuales; no reproduce toda la conducta.",
        "A demo integrating existing neural and body models. It uses learned controllers and manual mappings; it does not reproduce all behavior.",
      ),
      link: "https://eon.systems/updates/embodied-brain-emulation",
    },
    {
      name: "MICrONS",
      year: "2025",
      detail: t("Conexiones y actividad", "Connections and activity"),
      text: t(
        "Relaciona conectividad con actividad de unas 75.000 neuronas en corteza visual de un ratón. Estudia un volumen cortical, no todo el cerebro.",
        "Links connectivity with activity of around 75,000 neurons in mouse visual cortex. It studies a cortical volume, not the whole brain.",
      ),
      link: "https://www.nature.com/articles/s41586-025-08790-w",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <h1>
          {t("De las conexiones", "From connections")}
          <br />
          <span>{t("a las decisiones.", "to decisions.")}</span>
        </h1>
        <p>
          {t(
            "La ciencia que inspira preguntas mejores para Self Hoard.",
            "The science that inspires better questions for Self Hoard.",
          )}
        </p>
      </div>
      <section className="neuro-explainer">
        <div className={"network-figure layer-" + layer}>
          <svg
            viewBox="0 0 560 255"
            role="img"
            aria-label={t(
              "Red esquemática ilustrativa, no un conectoma real",
              "Illustrative schematic network, not a real connectome",
            )}
          >
            <g>
              {nodes.map((n, i) =>
                [1, 12, 13]
                  .filter((k) => i + k < nodes.length)
                  .map((k) => (
                    <line
                      key={i + "-" + k}
                      x1={n.x}
                      y1={n.y}
                      x2={nodes[i + k].x}
                      y2={nodes[i + k].y}
                      className={(i + k) % 4 === 0 ? "signal" : ""}
                    />
                  )),
              )}
            </g>
            {nodes.map((n, i) => (
              <circle
                key={i}
                cx={n.x}
                cy={n.y}
                r={i % 4 === 0 ? 4.5 : 2.5}
                className={i % 4 === 0 ? "signal" : ""}
              />
            ))}
          </svg>
          <span>
            {t(
              "Esquema ilustrativo · No son datos neuronales",
              "Illustrative schematic · Not neuronal data",
            )}
          </span>
        </div>
        <div className="neuro-caption">
          <div className="tabs">
            {steps.map(({ name, Icon }, i) => (
              <button
                className={layer === i ? "selected" : ""}
                aria-pressed={layer === i}
                onClick={() => setLayer(i)}
                key={name}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
          <h2>{steps[layer].name}</h2>
          <p>{steps[layer].text}</p>
        </div>
      </section>
      <div className="section-line research-heading">
        <h2>
          {t("Cinco proyectos para explorar", "Five projects to explore")}
        </h2>
        <span className="muted">
          {t("Fuentes revisadas el 12 sep 2026", "Sources checked 12 Sep 2026")}
        </span>
      </div>
      <div className="research-list">
        {research.map((r) => (
          <article className="research-row" key={r.name}>
            <div className="research-name">
              <h3>{r.name}</h3>
              <span>{r.year}</span>
            </div>
            <div>
              <h4>{r.detail}</h4>
              <p>{r.text}</p>
            </div>
            <a href={r.link} target="_blank" rel="noreferrer">
              {t("Fuente", "Source")}
              <ArrowUpRight size={17} />
            </a>
          </article>
        ))}
      </div>
      <section className="neuro-bridge">
        <h2>
          {t(
            "¿Y si el gemelo tuviera un mundo?",
            "What if the twin had a world?",
          )}
        </h2>
        <p>
          {t(
            "Nuestra propuesta: escenarios de ocio, aprendizaje y colaboración donde un agente elige, explica qué evidencia utilizó y se enfrenta a situaciones nuevas. Cada comparación se registra antes de conocer tu respuesta.",
            "Our proposal: leisure, learning and collaboration scenarios where an agent chooses, explains which evidence it used, and faces new situations. Each comparison is recorded before your answer is known.",
          )}
        </p>
        <p>
          {t(
            "El laboratorio actual prueba esta interacción con una regla de utilidad manual. Conectar memoria revisada e inferencia personal es el siguiente paso. Una animación convincente no mide por sí sola cuánto se parece el agente a ti.",
            "The current laboratory tests this interaction using a manual utility rule. Connecting reviewed memory and personal inference is the next step. A convincing animation does not by itself measure how much the agent resembles you.",
          )}
        </p>
      </section>
    </>
  );
}
