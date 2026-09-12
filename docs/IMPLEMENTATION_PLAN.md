# Desarrollo completo de Self Hoard

La aclaración directa del usuario del 12 de septiembre de 2026 fija el centro: reflejar personas, incluida la continuidad familiar tras una muerte. Los documentos originales son especificación y referencias, no biografía. El alcance de software se distingue de un estudio longitudinal, que no puede completarse generando resultados.

## Recorridos que deben funcionar

1. El propietario prepara su reflejo: nombre, presentación, manera de hablar, relación con destinatarios, objetivos y límites. Conserva recuerdos y anécdotas, personas relevantes y capítulos de vida. Revisa interpretaciones y estilo.
2. Una entrevista breve solicita recuerdos, detalles de voz y decisiones que faltan, permite saltar y conserva respuestas literales. Pregunta por excepciones y por palabras propias, sin imponer diagnósticos o rasgos.
3. El propietario conversa con su reflejo, pide una anécdota o un consejo. El sistema compila contexto autorizado, lo previsualiza, llama al modelo elegido y valida referencias. Las respuestas simuladas no se reimportan como vida vivida.
4. El legado se prepara en vida: se selecciona qué compartir, con quién y en qué modo. Un destinatario conversa con un reflejo de lectura y no puede modificar el perfil, ver recuerdos privados ni otorgar permisos. Exportación protegida y portátil.
5. El propietario enseña criterios mediante episodios y compara predicciones ciegas sobre decisiones nuevas. El laboratorio registra versiones, baselines y resultados negativos. La escena de actividades ilustra las decisiones sin afirmar emulación neuronal.
6. Modelos y clientes externos consultan por API/MCP con revocación efectiva. Faustus consume el mismo contexto mediante un adaptador, sin duplicar su aplicación.

## Estado al comenzar esta ampliación

Implementado y probado: archivo de fuentes/afirmaciones, correcciones y dependencias, portabilidad del archivo, demo separada, laboratorio de política manual, investigación neuro, MCP con nueve herramientas y bandeja de aportaciones, controles ES/EN. Conexión Codex instalada. La política manual no es aprendizaje personal.

Pendiente de construir/verificar en esta ampliación: perfil del reflejo, biografía y vocabulario; entrevista; conversación y proveedores; paquetes de contexto con destino/presupuesto; recuerdos por destinatario y modo de legado; episodios/hipótesis/versión personal; evaluación con baselines y repetición; importadores de conversaciones; backup completo protegido; autenticación; integración estable con Faustus; cierre de dependencias y borrado de todos los nuevos derivados.

## Criterios de aceptación

Avance comprobado de esta ampliación: retrato, fichas de biografía/vocabulario/expresión, entrevista por cobertura, conversación con previsualización y citas, proveedores controlados, permiso MCP separado para leer el reflejo y núcleo/API de aprendizaje de decisiones. Muletillas y manierismos guardan ejemplos literales, frecuencia, contexto, relación y excepciones. 61 pruebas del núcleo y 5 recorridos de navegador pasan; Ollama real probado con una persona sintética. Ver [REFLECTION.md](REFLECTION.md) para los límites exactos. Aún no se da por terminado el plan completo ni el acceso familiar.

- Los modelos no ven material privado del destinatario equivocado ni respuestas reservadas de evaluación.
- Las anécdotas citan evidencia; sin respaldo se ofrece incertidumbre, no una historia falsa de la vida de alguien.
- Consejos y reconstrucciones se identifican como simulados; el estilo no modifica el contenido factual.
- No se aprende biografía del propietario a partir de salidas del reflejo ni del relato de un familiar sin atribución y revisión.
- Revocar/borrar impide alimentar contextos nuevos. Los cachés, derivados y respaldos gestionados tienen trazabilidad.
- El modo local bloquea proveedores remotos. Una llamada no cambia de proveedor tras un error. Límites de tokens, llamadas y coste se aplican antes de enviar.
- Cada función nueva tiene un recorrido utilizable en español e inglés, pruebas de sus invariantes y verificación real de la integración disponible. Proveedores sin credenciales se identifican como no probados contra el servicio real.
- Nada se publica ni se comparte con destinatarios reales por el mero hecho de construir la función.

Fuera del MVP original: clonación de voz, ajuste individual de pesos, agentes que actúan autónomamente, ingestión pasiva masiva y estudio clínico. El legado conversacional textual puede desarrollarse sin esas dependencias.
