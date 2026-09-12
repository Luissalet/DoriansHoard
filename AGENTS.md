# Self Hoard

MCP: las IA solo consultan con permisos y aportan a una bandeja. Nunca confirmes, borres o cambies autorizaciones a través de herramientas de agente. Las aportaciones aceptadas siguen siendo informes atribuidos, no declaraciones originales. Prueba revocación, caducidad, aislamiento personal/demo y reintentos al modificar este contrato. `docs/MCP.md` documenta límites: el control MCP no es un sandbox frente al acceso arbitrario a la cuenta de Windows.

El proyecto parte de documentos de investigación, que son especificación y fuentes, no biografía del propietario. Sigue las instrucciones directas del usuario y conserva su idioma y alcance.

- Mantén el núcleo independiente de la interfaz y de proveedores.
- Nunca conviertas texto atribuido, ficticio o producido por asistentes en declaraciones propias.
- Las citas propias deben ser literales. Las interpretaciones mantienen su tipo incluso confirmadas.
- Las correcciones y borrados se propagan por las dependencias. No reescribas silenciosamente evidencias rechazadas.
- Mantén datos, exportaciones, secretos y documentos privados fuera de Git.
- La UI debe funcionar en español e inglés; las fuentes originales no se traducen automáticamente.
- La escena actual es una política manual de demostración. No la anuncies como gemelo aprendido o cerebro simulado.
- Antes de cambiar invariantes de memoria o laboratorio ejecuta las pruebas afectadas y después la suite del núcleo. Cambios visuales relevantes requieren compilación y una revisión acotada de escritorio/móvil.
- Documenta resultados realmente ejecutados y límites; no inventes participantes, exactitud o logros científicos.

Comandos: `.venv/Scripts/python.exe -m pytest -q`; en `frontend`, `npm.cmd run build`. Pruebas de navegador en el puerto 8742 con datos separados, según README.
