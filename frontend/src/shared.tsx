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
  invalid_fields: [
    "Revisa los campos. Los fragmentos de expresión deben aparecer literalmente en el texto original (máximo ocho).",
    "Check the fields. Expression excerpts must appear verbatim in the original text (up to eight).",
  ],
  reflection_consent_required: [
    "Guarda primero el retrato con autorización para conversar.",
    "Save the portrait with authorization to talk first.",
  ],
  provider_required: [
    "Conecta y selecciona un modelo para conversar.",
    "Connect and select a model to talk.",
  ],
  provider_changed_preview_again: [
    "La conexión ha cambiado. Revisa el envío de nuevo.",
    "The connection changed. Review the message again.",
  ],
  provider_budget_exceeded: [
    "Se alcanzó el límite diario de llamadas o coste. Revisa la configuración del modelo.",
    "The daily call or cost limit was reached. Review the model settings.",
  ],
  provider_invalid_response: [
    "El modelo no devolvió una respuesta válida. Comprueba el servicio y prepara otro envío.",
    "The model did not return a valid answer. Check the service and prepare another message.",
  ],
  provider_call_failed: [
    "El servicio rechazó la llamada. Comprueba el modelo y sus credenciales.",
    "The service rejected the call. Check the model and credentials.",
  ],
  unsupported_model_claim: [
    "La respuesta no tenía referencias válidas. No se ha guardado; puedes preparar otro envío.",
    "The answer lacked valid references. It was not saved; you can prepare another message.",
  ],
  prediction_uncertainty_required: [
    "La predicción omitió sus límites. Prepara otro envío.",
    "The prediction omitted its limitations. Prepare another message.",
  ],
  context_expired: [
    "Los recuerdos o permisos han cambiado. Revisa el envío de nuevo.",
    "Memories or permissions changed. Review the message again.",
  ],
  already_sent: [
    "Este envío ya se utilizó. Revisa uno nuevo antes de continuar.",
    "This message was already used. Review a new one to continue.",
  ],
  context_budget_exceeded: [
    "El contexto supera el límite del modelo. Prueba una conversación nueva o una pregunta más concreta.",
    "The context exceeds the model limit. Try a new conversation or a more specific question.",
  ],
  local_only: [
    "El modo local bloquea esta llamada externa. Revisa la política en Modelo.",
    "Local-only mode blocks this external call. Review the policy in Model.",
  ],
  provider_disabled: [
    "Este modelo está desactivado. Elige otra conexión.",
    "This model is disabled. Choose another connection.",
  ],
  provider_destination_denied: [
    "Usa una dirección local de confianza o la dirección oficial del proveedor elegido.",
    "Use a trusted local address or the selected provider’s official address.",
  ],
  provider_price_required: [
    "Indica la tarifa máxima de tokens y cuándo la comprobaste.",
    "Enter the maximum token rate and when you verified it.",
  ],
  provider_price_stale: [
    "Comprueba la tarifa del proveedor: la fecha debe estar dentro de los últimos 30 días.",
    "Verify the provider rate: its date must be within the last 30 days.",
  ],
  provider_key_required: [
    "Introduce la clave del proveedor para guardar esta conexión.",
    "Enter the provider key to save this connection.",
  ],
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
