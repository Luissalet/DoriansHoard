# Reflejo: recuerdos, decisiones y expresión

El reflejo combina un retrato autorizado, fichas revisadas y un proveedor elegido explícitamente. No afirma reproducir conciencia, identidad humana completa ni pensamientos privados. No hay una métrica de «porcentaje de persona».

## Flujo utilizable

1. **El reflejo → Retrato**: nombre, introducción, forma de expresarse, forma de analizar y elegir, valores y límites. Activar autorización. Cambiar el retrato elimina los paquetes y conversaciones derivados de la versión anterior.
2. **Recuerdos y expresión**: guardar recuerdos, etapas, personas, criterios, palabras, deseos y expresión. Una ficha empieza pendiente. Confirmarla conserva su atribución; un relato familiar o de IA nunca se convierte en declaración propia.
3. Para expresión: fragmentos literales, ritmo, humor, formas de dirigirse a alguien, narración o gestos descritos; cuándo encaja, cuándo no, relación, periodo, idioma y frecuencia observada. Los fragmentos deben existir literalmente en la fuente. Frecuencia desconocida no es una estimación medida.
4. **Modelo**: conexión Ollama, servidor local compatible, OpenAI o Anthropic. Local por defecto. Claves externas protegidas con DPAPI de Windows, sin exponerlas a la interfaz. Los destinos externos son fijos y los locales están restringidos a loopback. Un servidor local ajeno podría reenviar datos: es un límite de confianza, no una garantía de esta aplicación.
5. **Conversar**: situación, gusto, elección, análisis, anécdota o consejo. Revisar contexto exacto, instrucciones, destino y coste máximo antes de enviar. Las respuestas se identifican por tipo y conservan citas. Cada respuesta guardada permite desplegar proveedor, modelo, tokens disponibles y techo estimado de coste; es una estimación, no una factura. Las conversaciones generadas son diálogo previo, no nueva biografía.

## Proveedores y evidencia

No hay acciones autónomas, herramientas del modelo, cambio automático de proveedor ni reintentos automáticos. El destino completo queda ligado al paquete aprobado; modificar configuración invalida ese envío. Reservas de llamadas/coste se aplican antes del envío. Un error puede ser facturable y conserva su reserva.

El presupuesto usa bytes UTF-8 más una reserva de envoltura como estimación conservadora de tokens; no es tokenización exacta ni una garantía sobre la facturación de cualquier servicio compatible. El precio introducido debe cubrir la tarifa más alta aplicable. No incluye conceptos que el proveedor facture fuera de los tokens; configurar solo modelos cuyo coste se pueda acotar así.

Se valida estructura, IDs de citas y vigencia de datos. Anécdotas, consejos y predicciones exigen citas; predicción/análisis exigen expresar incertidumbre. Esta validación no demuestra que cada frase esté semánticamente respaldada: revisión humana y evaluaciones siguen siendo necesarias. La clasificación de estilo depende del modelo y no garantiza fidelidad.

La selección actual ordena coincidencias literales y tipos pertinentes. No hay búsqueda vectorial ni extracción automática de manierismos a partir de audio. Contexto limitado a 24 elementos y cuatro turnos anteriores. No se clona voz ni se ejecutan gestos.

## Borrado y revisión

Fuentes, fichas, paquetes, enlaces y conversaciones usan el mismo SQLite para propagar borrado. Borrar una fuente retira sus fichas y paquetes derivados; retirar/cambiar una ficha invalida diálogo dependiente. Eliminar solo una ficha conserva su fuente original, visible en Fuentes. Los archivos exportados fuera del servicio no se pueden retirar remotamente.

El consentimiento global autoriza conversaciones del propietario; no identifica por sí solo quién está ante el equipo. Aún faltan autenticación de propietario, lectores de legado y cifrado de todo el archivo. DPAPI protege claves, no la base de datos completa.

## Decisiones aprendidas, API de laboratorio

`/api/decisions/episodes` guarda alternativas, características valoradas por el propietario, elección (incluidos empates/sin preferencia), motivo, alternativas consideradas, excepciones y vetos. Empieza como criterio pendiente. Tres episodios revisados del mismo dominio permiten ajustar un modelo regularizado de comparaciones por pares mediante `/api/decisions/fit`.

`/api/decisions/predict` estima preferencias condicionadas a esas características. Son estimaciones no calibradas. Contribuciones de características explican la fórmula; no prueban causas psicológicas. Los vetos se guardan como contexto del episodio y excluyen comparaciones de entrenamiento; aún no hay reglas de veto generalizadas a casos nuevos.

`/api/decisions/trials` sella predicción y versión antes de recibir la respuesta humana. Las etiquetas reservadas se guardan en otra base y nunca entran en recuperación conversacional. Tras contestar devuelve acuerdo y Brier frente a una referencia uniforme. La API admite puntuación del motivo declarada por la persona; no hay evaluación automática de razones/estilo. Los restantes baselines siguen pendientes.

### Recorrido visible: Tus decisiones

En Laboratorio, **Tus decisiones** permite usar esas capacidades sin JSON:

1. Describir una situación propia, su ámbito, alternativas y criterios compartidos. Valorar de 0 a 5 cuánto ofrece cada alternativa de cada criterio.
2. Marcar la elección (varias si hubo empate, o ninguna preferencia), añadir el motivo y, opcionalmente, contexto, excepciones y época. Guardar conserva la estructura para el siguiente ejemplo, pero borra la situación, elección y motivos del formulario.
3. Abrir cada ejemplo y confirmarlo tras revisar su contenido. **Usar como base** reutiliza alternativas y valoraciones, dejando vacía la situación y la elección nuevas. **Retirar del ajuste** devuelve el ejemplo a pendiente y retira sus modelos derivados según el contrato existente.
4. Ajustar un modelo del mismo ámbito con al menos tres ejemplos confirmados que tengan elección y criterios comparables. El modelo estadístico existente usa CPU; no carga un LLM. La interfaz informa de errores de comparabilidad y modelos retirados.
5. En **Pruebas ciegas**, elegir una versión del modelo, describir una situación nueva y sus alternativas, con los criterios fijados por esa versión. Sellar guarda la predicción antes de pedir la elección humana. El formulario de respuesta no muestra ni envía la predicción al propietario antes de contestar.
6. Guardar la respuesta revela predicción, estimaciones por alternativa, elección, acuerdo y Brier frente a la referencia uniforme. Sin preferencia no se interpreta acierto ni se calcula Brier. Las estimaciones se identifican como no calibradas; menor Brier es mejor en ese caso, sin prometer calibración ni fidelidad psicológica. Ver [documentación primaria sobre calibración y límites del Brier](https://scikit-learn.org/stable/modules/calibration.html).
7. Reabrir pruebas desde el historial y descargar el registro completo de una prueba respondida en JSON. La firma y la versión usadas permanecen inspeccionables en **Registro sellado**. Esta descarga no es un backup completo del reflejo.

Los campos pendientes de ejemplos y casos nuevos participan del contexto existente de la interfaz; las respuestas reservadas no se incorporan a ese contexto ni a MCP. La revisión y la respuesta humana usan las rutas de propietario existentes. No se añaden herramientas ni permisos de agente. Los formularios se reinician al cambiar de archivo personal/demo. El Laboratorio conserva su **Demostración manual** separada y explícitamente identificada; los datos originales mantienen su idioma mientras la interfaz funciona en español e inglés.

Retirar un episodio elimina modelos derivados. Los ensayos reservados se purgan tras modificaciones de memoria y al iniciar; el acceso a un modelo retirado falla cerrado. La purga entre bases no es una transacción atómica y no se debe afirmar lo contrario.

## Integración MCP

`read_reflection` requiere `reflection.read`, permiso separado y no añadido a conexiones existentes. Consulta retrato y fichas revisadas con atribución y revisión global. No devuelve conversaciones ni respuestas de evaluación. Antes de personalizar hay que refrescar la revisión y reemplazar el contexto retirado. No puede hacer cumplir el borrado en un cliente externo que ya haya copiado los datos.

## Servicios verificados

Prueba real local: Ollama con `qwen3-coder:30b`, persona ficticia y dos fichas sintéticas. Respuesta de elección con dos citas e incertidumbre; no mide exactitud para el propietario. Reproducible con `scripts/smoke_reflection_local.py`, limitado al servidor de QA 8742. No se han usado credenciales reales de OpenAI ni Anthropic para validar sus servicios.

Referencias de implementación: [Ollama chat](https://docs.ollama.com/api/chat), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create), [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata).
