# Validación de la primera versión

## Ampliación de conexiones IA y MCP

Ejecutada el 12 de septiembre de 2026:

- **44 pruebas Python** pasan: las 32 originales más 12 casos de permisos, pausa por defecto, caducidad, revocación persistente, rechazo de rutas de propietario con credencial IA, denegación de herramientas administrativas, aislamiento de archivos, procedencia, privacidad de pendientes, aceptación y retirada, reintentos, borrado, paginación y conservación del sello ciego. Se mantienen los dos avisos de deprecación descritos abajo.
- **4 recorridos de Edge** pasan en una ejecución conjunta: tres originales y uno nuevo de extremo a extremo. El nuevo usa un cliente oficial MCP y un servidor stdio en procesos separados, conectados a la aplicación real de prueba. Crea conexiones desde la UI, descubre nueve herramientas, prueba llamadas válidas a las nueve, comprueba permisos insuficientes, envía/reintenta una inferencia, la acepta desde la UI y la recupera desde otra credencial con atribución intacta. Prepara una actividad por MCP, el propietario responde desde la UI y el cliente verifica su sello SHA-256. Después retira la aportación, detecta el cambio, pausa, revoca y verifica el bloqueo y el borrado. Se volvió a ejecutar ese recorrido tras fijar UTF-8 en el cliente de diagnóstico y recapturar el escritorio desde el inicio: también pasa.
- TypeScript y compilación de producción pasan. El detector Impeccable de la ampliación devuelve `[]`. Capturas ES de escritorio (1440 px) y EN de móvil (390 px), sin desbordamiento; los textos originales siguen en su idioma.
- Revisión independiente Impeccable de la ampliación: `ship`, sin correcciones materiales pendientes en las capturas y archivos revisados.
- La prueba final usa `.impeccable/review/mcp-e2e-3/`, distinta de `data/`. Las pruebas no invocan proveedores de modelos ni fabrican métricas de aprendizaje personal.
- **Uso real desde esta tarea:** conexión `selfhoard` registrada y consultada en Codex. Esta tarea llamó a `connection_status`, `read_context` y `submit_update` mediante una sesión real MCP stdio. Se dejó una aportación sobre un requisito explícito de este proyecto, pendiente de revisión. La UI se abrió y verificó también con el MCP de navegador (CUA), incluida la conservación correcta de caracteres españoles. No se confirmó automáticamente como biografía.
- La credencial real permite únicamente `context.read` y `updates.write`, caduca a los 30 días y se puede revocar en **Conexiones IA**. El catálogo de herramientas de una conversación ya abierta requiere que su cliente recargue la conexión; la prueba del protocolo no se presenta como evidencia de recarga automática de esa conversación.

Los controles MCP no son una barrera contra un proceso con shell y acceso arbitrario a la misma cuenta de Windows. No hay prueba con un modelo neuronal personal, proveedor externo, aprendizaje continuo, notificaciones push ni ejecución de las simulaciones de mosca citadas.

Fecha: 12 de septiembre de 2026. Las pruebas usan exclusivamente datos sintéticos y carpetas distintas del archivo personal.

## Resultados ejecutados

- 32 pruebas del núcleo y API: todas pasan. Incluyen procedencia, revisión, correcciones transitivas, temporalidad, preservación de texto literal, borrado de derivados y páginas SQLite con marcador sintético, exportación/restauración, rechazo atómico de copias corruptas, frontera de origen y pruebas ciegas.
- 3 recorridos de navegador en Microsoft Edge: pasan. Dos se ejecutaron juntos tras los cambios y el tercero se verificó después de ajustar sus localizadores. Cubren creación, revisión, consulta, corrección, exportación, borrado, persistencia del idioma, separación de demo, predicción oculta, comparación de actividades, historial con configuraciones diferentes, foco, selección accesible y ausencia de solicitudes externas durante esos recorridos.
- TypeScript y compilación de producción: pasan.
- Inicio, parada y nuevo inicio con los accesos de Windows: verificados. El servidor responde en 8741 y el archivo personal inicial contiene cero fuentes y cero afirmaciones.
- Capturas de Archivo, Laboratorio y Neurociencia en escritorio 1440 px y móvil 390 px, español e inglés. No hay desbordamiento horizontal en los anchos comprobados.
- Detector mecánico Impeccable: una ejecución, sin hallazgos.
- Revisión visual independiente Impeccable: señaló configuración histórica, retorno/foco en evidencia, contraste y estados accesibles. Una tanda de cambios resolvió los cuatro; el revisor emitió `ship` para esa lista de correcciones.

## Límites de la evidencia

Los resultados verifican este prototipo de software, no fidelidad de identidad, utilidad predictiva del perfil ni equivalencia neuronal. No se ejecutaron benchmarks de personalización, estudios con participantes, proveedores externos, simulaciones de mosca ni las aplicaciones de terceros citadas.

Las dependencias de prueba emiten dos avisos de deprecación de Starlette/AnyIO. Las pruebas pasan; no se han ocultado los avisos ni migrado el cliente de pruebas durante esta entrega.

Las capturas, bases sintéticas de prueba y trazas quedan en rutas excluidas de Git. El servidor normal usa `data/`; los tests de navegador usan `.impeccable/review/test-data/`.
