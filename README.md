# Self Hoard

**El reflejo / The reflection** permite preparar un retrato, revisar recuerdos y maneras de expresarse y conversar con un modelo elegido. Incluye muletillas, ritmo, humor, vocabulario y manierismos descritos con ejemplos literales, frecuencia y contexto. Cada envío muestra datos y destino antes de usar el modelo. [Funcionamiento, pruebas y límites](docs/REFLECTION.md).

**El reflejo / The reflection** supports a portrait, reviewed memories and expression examples, and conversation with a selected model. Catchphrases, rhythm, humor and mannerisms retain literal evidence, frequency and context. Preview personal data and destination before sending. The general implementation plan is still in progress; family reader access is not yet enabled.

Archivo personal local con fuentes, afirmaciones revisables y un laboratorio visual de decisiones. Primera implementación del plan aportado el 12 de septiembre de 2026. Interfaz completa en español e inglés; las fuentes conservan su idioma original.

## Abrir en Windows

Haz doble clic en **Iniciar Self Hoard.cmd**. La aplicación se abre en http://127.0.0.1:8741. El servidor se ejecuta oculto en este equipo. **Detener Self Hoard.cmd** lo detiene.

En este equipo las dependencias ya están instaladas y la interfaz compilada. En una copia nueva hacen falta Python 3.11+ y Node.js/npm; el iniciador prepara el entorno y compila la interfaz cuando faltan. Esa instalación inicial usa Internet. La aplicación no tiene telemetría ni un proveedor de modelos propio; una IA a la que autorices puede consultar contexto local y procesarlo con su proveedor.

## Recorrido inicial

1. Entra en **Nueva fuente**, pega tus palabras o importa TXT/Markdown e indica autoría y tipo.
2. Abre la fuente y propone una cita literal. Puedes añadir una interpretación separada y un período de validez.
3. En **Mi archivo**, abre la afirmación y revisa su cita antes de confirmarla.
4. Busca palabras exactas de declaraciones propias confirmadas. La búsqueda es literal, sin un modelo de lenguaje; no responde preguntas semánticas ni traduce entre idiomas.
5. Corrige una afirmación para rechazarla e invalidar interpretaciones dependientes. Una negación no inventa una preferencia alternativa.
6. En **Mis datos**, exporta JSON o Markdown. La restauración JSON requiere un archivo vacío. El borrado se hace desde cada fuente y muestra antes cuántos derivados elimina.

El selector inferior permite abrir un **ejemplo sintético**, guardado aparte de tu archivo. Los documentos de investigación están copiados en `docs/reference/` y excluidos de Git. No se han importado como biografía del propietario.

## Laboratorio y neurociencia

El laboratorio incluye dos escenarios con actividades, restricciones de tiempo y predicciones ocultas. El agente actual usa una regla de utilidad que configuras a mano: **todavía no es un gemelo aprendido de tus datos**. Elige una opción, ninguna o saltar y después observa la comparación. Puedes exportar o borrar sus registros por separado.

La investigación de [neurociencia y mundos del gemelo](docs/Neurociencia_y_mundos_del_gemelo.md) cubre FlyWire, MaleCNS, NeuroMechFly, Eon, MICrONS, DOOMFLY y Fly64. Distingue resultados publicados, declaraciones de desarrolladores y propuestas propias.

## Arquitectura

- `selfhoard/store.py`: núcleo SQLite transaccional con procedencia y dependencias.
- `selfhoard/models.py`: contratos validados y formato de exportación v1.
- `selfhoard/api.py`: API local, límites de origen, cookie de sesión y protección de escrituras.
- `selfhoard/lab.py`: política de demostración y predicciones selladas; almacenamiento separado.
- `frontend/src/`: React/TypeScript, idiomas, escenas y controles.
- `tests/`: invariantes de memoria, privacidad, portabilidad y laboratorio.
- `frontend/e2e/`: recorridos reales en navegador y capturas de escritorio/móvil.

## Datos y límites

Los archivos de datos se guardan en `data/`, excluido de Git. El archivo personal y la demo usan bases distintas; los laboratorios también. No hay sincronización, telemetría, cliente de inferencia ni API remota de modelos. Las fuentes tipográficas se sirven desde este equipo. Los enlaces de investigación solo abren sitios externos al pulsarlos.

La sesión local reduce accesos accidentales desde otros sitios; **no es autenticación entre usuarios del sistema operativo**. El almacenamiento aún no está cifrado por la aplicación. El borrado lógico y de páginas SQLite se prueba con datos sintéticos, pero no garantiza eliminación de copias externas, instantáneas del sistema ni remanencia de hardware. Los documentos originales que aportaste siguen en Downloads.

La conexión MCP y la consulta de contexto por permisos ya están disponibles: [conectar IA y compartir conocimiento](docs/MCP.md). Incluyen nueve herramientas, bandeja de revisión, atribución, detección de cambios, caducidad y revocación. El cliente MCP elige el modelo; Self Hoard no incluye un proveedor de inferencia propio.

El MVP completo del informe sigue pendiente: recuperación semántica, entrevista adaptativa, modelo personal, evaluación longitudinal e integración con Faustus. Las pruebas de software no son validación psicológica ni científica.

## Desarrollo y pruebas

Desde la raíz, en PowerShell:

```powershell
.\.venv\Scripts\python.exe -m selfhoard
.\.venv\Scripts\python.exe -m pytest -q
```

En `frontend`:

```powershell
npm.cmd ci
npm.cmd run build
```

Las pruebas de navegador usan Edge y un servidor de prueba en el puerto 8742. Inícialo con una carpeta de datos de prueba, distinta de `data`, antes de ejecutar `npm.cmd run test:e2e`:

```powershell
.\.venv\Scripts\python.exe -m selfhoard --port 8742 --data-dir .impeccable/review/test-data
```

La API valida que el origen coincida con el servidor. Para comprobar la aplicación completa usa la compilación servida por Python. El servidor Vite está destinado a edición local y necesita un proxy que preserve la política de origen; no es el recorrido de producción probado.

## English quick start

Double-click **Iniciar Self Hoard.cmd**, then choose **English** in the top bar. Add a source, propose a verbatim quote, and confirm it in **My archive**. Text remains in its original language. **My data** exports JSON/Markdown and restores into an empty archive.

The **Laboratory** is an explicit manual-policy demonstration, not a trained personal twin. Predictions stay hidden until you answer. **AI connections** lets local MCP clients read permitted context and submit reports for owner review. Accepted AI reports preserve their attribution. A connected client may process the context with its model provider. Application-level encryption and OS-user authentication are not implemented yet. See [MCP setup and controls](docs/MCP.md).
