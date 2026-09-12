import { createContext, useContext } from "react";
export type Language = "es" | "en";
export const Locale = createContext<Language>("es");
export function useText() {
  const lang = useContext(Locale);
  return (es: string, en: string) => (lang === "es" ? es : en);
}
export type Source = {
  id: string;
  title: string;
  text: string;
  kind: string;
  author: string;
  created_at: string;
  digest: string;
};
export type Claim = {
  id: string;
  source_id: string;
  text: string;
  quote: string;
  kind: string;
  subject: string;
  state: string;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  dependencies: string[];
};
export type Archive = {
  sources: Source[];
  claims: Claim[];
  events: {
    id: string;
    claim_id: string;
    action: string;
    reason: string;
    created_at: string;
  }[];
};
export type API = <T = any>(
  path: string,
  data?: unknown,
  method?: string,
) => Promise<T>;
export const kindLabels: Record<string, [string, string]> = {
  owner_statement: ["Declaración propia", "Own statement"],
  attributed: ["Texto atribuido", "Attributed text"],
  inference: ["Interpretación", "Interpretation"],
  fiction: ["Ficción", "Fiction"],
  assistant: ["Texto de un asistente", "Assistant text"],
};
export const stateLabels: Record<string, [string, string]> = {
  proposed: ["Por revisar", "To review"],
  confirmed: ["Confirmada", "Confirmed"],
  disputed: ["En discusión", "Disputed"],
  rejected: ["Rechazada", "Rejected"],
  superseded: ["Sustituida", "Superseded"],
};
export function Status({ state }: { state: string }) {
  const t = useText();
  const label = stateLabels[state] ?? [state, state];
  return <span className={"status " + state}>{t(...label)}</span>;
}
export const errors: Record<string, [string, string]> = {
  terminal_update: [
    "Esta aportación ya se rechazó. La IA deberá enviar una nueva para revisarla.",
    "This report was rejected. The AI must submit a new one for review.",
  ],
  not_found: [
    "Este elemento ya no está disponible. Actualiza la vista.",
    "This item is no longer available. Refresh the view.",
  ],
  inbox_full: [
    "La bandeja está llena. Exporta y elimina aportaciones para liberar espacio.",
    "The inbox is full. Export and delete reports to free space.",
  ],
  quote_not_in_source: [
    "La cita debe aparecer exactamente en la fuente.",
    "The quote must appear exactly in the source.",
  ],
  direct_statement_requires_verbatim_owner_source: [
    "Una declaración propia necesita una cita literal de tus palabras.",
    "An own statement needs a verbatim quote of your words.",
  ],
  unconfirmed_dependency: [
    "Revisa primero las afirmaciones de las que depende.",
    "Review the supporting claims first.",
  ],
  terminal_claim_create_new: [
    "Esta afirmación ya fue rechazada. Crea una nueva con su fuente.",
    "This claim was rejected. Create a new one with its source.",
  ],
  restore_requires_empty_archive: [
    "La restauración necesita un archivo vacío. Conserva una exportación antes de vaciarlo.",
    "Restore needs an empty archive. Keep an export before clearing it.",
  ],
  quote_required: [
    "Selecciona un fragmento de la fuente.",
    "Select a passage from the source.",
  ],
  source_integrity: [
    "La copia contiene una fuente alterada.",
    "The backup contains an altered source.",
  ],
  dependency_cycle: [
    "La copia contiene dependencias circulares.",
    "The backup contains circular dependencies.",
  ],
  missing_reference: [
    "La copia tiene referencias incompletas.",
    "The backup has missing references.",
  ],
  invalid_archive: [
    "El archivo no tiene el formato de Self Hoard.",
    "This is not a valid Self Hoard archive.",
  ],
  file_too_large: [
    "El archivo supera el límite permitido.",
    "The file exceeds the size limit.",
  ],
  already_answered: [
    "Esta decisión ya está registrada.",
    "This decision has already been recorded.",
  ],
  network: [
    "No se ha podido conectar. Comprueba que Self Hoard está abierto y vuelve a intentarlo.",
    "Could not connect. Check that Self Hoard is running and try again.",
  ],
};
