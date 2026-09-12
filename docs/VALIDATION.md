# Validación de la primera versión

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
