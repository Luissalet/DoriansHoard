# Arquitectura y amenazas del primer hito

## Contratos

La fuente conserva título, texto original, tipo epistemológico, autor, fecha de registro e identificador. Su digest SHA-256 incluye texto, tipo y autor para detectar duplicados sin confundir testimonios de autores distintos. El título no participa en la deduplicación.

La afirmación conserva fuente, cita literal, texto, tipo, sujeto, validez temporal, estado, fecha de registro y dependencias. Una declaración propia solo puede citar una fuente de palabras propias y su texto debe ser exactamente la cita. Una interpretación conserva su tipo incluso al confirmarse. El historial registra revisiones; no se utiliza como nueva evidencia.

Las dependencias son un grafo dirigido acíclico. Crear una afirmación solo permite referirse a IDs anteriores. Restaurar valida todas las referencias y comprueba ciclos con un orden topológico. Rechazar o discutir una afirmación invalida transitivamente sus derivados. Borrar una fuente elimina sus afirmaciones, derivados entre fuentes, relaciones y revisiones en una transacción.

La restauración preserva identificadores y estados en un archivo vacío, valida citas, integridad, estados de dependencias y esquema, y falla sin importar parcialmente. Una copia exportada no está firmada por una autoridad: es una representación editable del archivo, no una prueba de que el propietario dijo la verdad.

## Consulta

La búsqueda tokeniza, normaliza acentos y exige todas las palabras relevantes. Filtra tipo, sujeto, confirmación, validez y dependencias. Devuelve citas, no síntesis. Esta estrategia deliberadamente simple permite comprobar el contrato antes de añadir recuperación semántica. Puede abstenerse ante paráfrasis y búsquedas multilingües. No dispone de FTS ni vectores todavía.

## Fronteras

Un servidor FastAPI sirve la interfaz compilada y API en el mismo origen, solo en loopback. Comprueba Host, origen, cliente y cabeceras de escritura; la cookie es HttpOnly y SameSite Strict. La CSP limita scripts, conexiones y fuentes a sí mismo. El API limita cargas a 8 MB y los contratos imponen tamaños de campo. No se usan contenidos importados como comandos o plantillas HTML.

Esta frontera bloquea sitios externos comunes; no protege contra un proceso local comprometido, otra persona con acceso al usuario de Windows o un administrador. No hay cifrado de la base, roles, autenticación de usuario ni autorización entre múltiples propietarios. El ámbito de esta versión es un propietario local.

SQLite usa claves foráneas, transacciones y secure_delete con journal de eliminación. No se guardan copias gestionadas ni índices duplicados. Las exportaciones descargadas quedan fuera de la gestión de borrado de la aplicación. No hay promesa de borrado de SSD, copias del sistema o archivos externos. Fuentes: [SQLite secure_delete](https://www.sqlite.org/pragma.html#pragma_secure_delete) y [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/), consultadas para esta implementación.

## Diez casos críticos

| Amenaza o error | Respuesta implementada | Prueba |
|---|---|---|
| Propuesta presentada como verdad | Excluir hasta revisión | proposals_never_answer_before_review |
| Texto del asistente convertido en biografía | Mantener tipo, excluir de hechos propios | nonowner_content_never_becomes_direct_fact |
| Instrucciones importadas o citas inventadas | Datos literales, validación de fuente/cita | false_quote_and_laundered_instructions_rejected |
| Corrección sustituida por nueva conjetura | Rechazar, invalidar, abstenerse | negative_correction_does_not_invent_favorite_or_dislike |
| Borrado que deja derivados | Cierre transitivo y borrado transaccional | delete_purges_cross_source_derivatives_events_and_bytes |
| Copia corrupta restaurada parcialmente | Validación previa y transacción | invalid_backup_rejected_atomically |
| Preferencia antigua usada como actual | Períodos de validez | time_scopes_preserve_history |
| Decisiones ajenas atribuidas al propietario | Campo sujeto y filtrado | other_subject_not_owner |
| Página externa accediendo al archivo | Control local, origen y escritura | cross_origin_and_dns_rebinding_denied |
| Predicción reescrita tras la respuesta | Sellado, ocultación y respuesta única | blind_trial_never_exposes_prediction_until_answer |

## Laboratorio

El laboratorio usa una base diferente de las fuentes personales y nunca las consulta. Su controlador suma pesos manuales por atributos sintéticos, descarta actividades fuera de tiempo y se abstiene ante empate. Las prioridades son configuración; no se actualizan a partir de respuestas.

La predicción se serializa con escenario, configuración, método y nonce aleatorio de 256 bits. El digest se devuelve antes de conocer la respuesta y la cadena original solo después. El almacén local sigue bajo control del propietario, así que el sello es una comprobación de integridad del flujo, no un mecanismo antifraude frente a manipulación de todos los archivos.

## Evolución

Antes de conectar un modelo: interfaz de proveedor con bloqueo de destino, límites de coste, salida validada, compilador de contexto y registro de fragmentos realmente enviados. Las respuestas reservadas deben seguir fuera de los recuperadores. Antes de varios usuarios: autenticación real, aislamiento, cifrado, permisos por fuente, auditoría y revisión de supresión. Integrar Faustus por adaptador sobre contratos probados, sin copiar su aplicación.
