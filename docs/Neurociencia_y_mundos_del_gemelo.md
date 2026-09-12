# Neurociencia y mundos de actividades para Self Hoard

Investigación del 12 de septiembre de 2026. Este documento amplía el plan aportado con conectómica y simulaciones de conducta. La propuesta es construir un entorno donde podamos observar decisiones del gemelo, inspeccionar su evidencia y compararlas con decisiones humanas nuevas. La escena es parte del experimento; su atractivo visual no sustituye la evaluación.

## Qué hay detrás de la mosca digital

FlyWire publicó en 2024 el mapa del cerebro de una mosca adulta hembra: 139.255 neuronas y unos 50 millones de sinapsis químicas. Es una reconstrucción estructural y una base para estudiar circuitos; no incluye por sí misma todos los parámetros necesarios para simular conducta. [Dorkenwald y colaboradores, Nature](https://www.nature.com/articles/s41586-024-07558-y).

MaleCNS amplía la escala anatómica: el trabajo presentado en septiembre de 2026 incluye cerebro y cordón nervioso ventral del macho, con más de 166.000 neuronas y 125 millones de conexiones sinápticas. Las cifras de FlyWire 2024 y MaleCNS no describen exactamente el mismo alcance. [Google Research y HHMI Janelia](https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/).

Shiu y colaboradores construyeron un modelo de neuronas de integración y disparo con fuga para estudiar transformaciones sensoriomotoras de alimentación y aseo. La conectividad y los neurotransmisores predichos restringen el modelo, mientras que las simplificaciones limitan qué procesos puede explicar. [Shiu y colaboradores, Nature, 2024](https://www.nature.com/articles/s41586-024-07763-9).

NeuroMechFly v2 añade el cuerpo, los contactos y un entorno con entradas sensoriales y retroalimentación motora. Es útil para experimentar con controladores y navegación: ofrece la parte corporal y ambiental de un ciclo cerrado. [Wang-Chen y colaboradores, Nature Methods, 2024](https://www.nature.com/articles/s41592-024-02497-y).

La demo de Eon integra componentes existentes y conecta algunas señales neuronales con controladores corporales. Sus autores reconocen ajustes manuales, repertorio limitado y ausencia de muchos procesos de aprendizaje y estado interno. Es una plataforma en desarrollo. [Eon, explicación técnica del 10 de marzo de 2026](https://eon.systems/updates/embodied-brain-emulation).

## Los videojuegos que has visto

DOOMFLY conecta fotogramas de ViZDoom con una simulación basada en MaleCNS y una interfaz neuronal para los controles. El repositorio consultado declara resultados negativos para el candidato v6 en pruebas visuales, de condicionamiento y supervivencia. Moverse y modificar pesos no bastan para demostrar aprendizaje. Lección para Self Hoard: mostrar el escenario junto con controles experimentales y resultados negativos. No se ha ejecutado ni auditado su código en esta sesión. [Repositorio de DOOMFLY](https://github.com/nftechie/doomfly).

Fly64 conecta entradas visuales de Mario con una red de la mosca y reglas que producen controles del juego. Su README indica que no hay entrenamiento ni objetivo de recoger estrellas; también avisa de revisión limitada del código. Es un experimento recreativo, no una prueba de competencia general. No se ha ejecutado. [Repositorio Fly64](https://github.com/ornata/fly).

## Otras ideas de neurociencia que sí aportan

En el sistema visual de la mosca, Lappalainen y colaboradores combinan conectividad medida con optimización para una tarea visual. Comparan predicciones con mediciones y retiran componentes para averiguar qué aporta cada uno. Para Self Hoard esto inspira ablaciones de evidencia, contexto y reglas: la representación personal debe demostrar utilidad adicional. [Lappalainen y colaboradores, Nature, 2024](https://www.nature.com/articles/s41586-024-07939-3).

MICrONS relaciona actividad de unas 75.000 neuronas con conectividad en un volumen de corteza visual de un ratón. Su interés conceptual es contrastar estructura y función en datos relacionados; no representa todo el cerebro. La aplicación a Self Hoard es una analogía metodológica: una red de recuerdos debe contrastarse con elecciones observadas. [MICrONS Consortium, Nature, 2025](https://www.nature.com/articles/s41586-025-08790-w).

## Un mundo para el gemelo

La propuesta es un pequeño entorno navegable de actividades con tres capas visibles. El mundo presenta una situación y restricciones. El modelo recibe únicamente la información autorizada y registra una acción. La vista de observación muestra qué hizo, con qué evidencia y qué consecuencias tuvo dentro de la simulación.

El avatar es un instrumento de lectura: desplazarse a un taller representa escoger una actividad, no una simulación de músculos o neuronas. Las explicaciones del modelo se presentan como criterios declarados por el sistema, no como su razonamiento interno verificado. Al inspeccionar una decisión se abren las fuentes realmente incluidas en aquella ejecución.

| Escenario propuesto | Decisión observable | Variación reservada |
|---|---|---|
| Una tarde libre | Paseo, actividad creativa, compañía o ninguna | Cambiar tiempo disponible y compromisos previos |
| Aprender algo | Leer, experimentar o buscar un grupo | Cambiar dificultad, familiaridad y coste |
| Colaborar en un proyecto | Elegir rol y reparto de autonomía | Cambiar urgencia, competencia del equipo y dependencia |
| Ayudar a alguien | Ofrecer apoyo, intervenir o respetar distancia | Variar consentimiento, urgencia y capacidad real |
| Explorar un lugar | Probar novedad o volver a lo conocido | Cambiar incertidumbre y consecuencias del error |

Todos son escenarios simulados. Las etiquetas y atributos deben poder corregirse: no se presupone que una actividad tenga el mismo significado para todas las personas. Los ejemplos de ayuda no evalúan diagnósticos ni decisiones clínicas.

## Qué está implementado ahora

El laboratorio de esta versión tiene dos situaciones y tres actividades por situación. El usuario ajusta cuatro prioridades de una política manual y un límite de tiempo. La aplicación suma prioridad por atributo entre las opciones viables, se abstiene si hay empate o ninguna opción viable y guarda el resultado antes de recibir la respuesta humana. El registro tiene un sello SHA-256 con un valor aleatorio oculto hasta responder. Se conserva la cadena exacta para verificar el sello al exportar.

La escena muestra la opción del agente y la humana después de contestar. Se admiten ninguna opción y saltar. Los registros están en bases separadas del archivo personal; no se convierten automáticamente en memorias. La política no está entrenada, sus puntuaciones no son probabilidades y sus prioridades no son medidas de personalidad. El sellado hace visible el orden de predicción y respuesta, pero el dueño del equipo conserva control sobre los archivos: no es un sistema de certificación frente a un administrador hostil.

## Siguiente implementación recomendada

1. Definir el contrato del controlador: instantánea del escenario, opciones permitidas, contexto autorizado y salida estructurada con elección, abstención y citas. La escena consume el mismo contrato para cualquier proveedor.
2. Compilar fuentes confirmadas por dominio, fecha y permiso. Las instrucciones dentro de documentos se mantienen como datos citados y no como reglas del agente.
3. Añadir una política personal basada en inferencia local, junto con las políticas de referencia: sin perfil, hechos, historial y criterios condicionados. Registrar proveedor, versión, contexto completo permitido y presupuesto.
4. Conservar respuestas humanas de evaluación fuera del contexto del modelo. Los escenarios utilizados para revisar el perfil dejan de pertenecer a la evaluación final. Las pruebas reservadas no se reutilizan para optimizar preguntas.
5. Añadir un recorrido de varias decisiones, objetos interactivos y reproducción temporal. Una vista de comparación puede mostrar dos ejecuciones sobre el mismo escenario; un cambio de contexto permitirá observar bifurcaciones concretas.
6. Evaluar aciertos, abstenciones, invenciones, motivos aceptados o corregidos, esfuerzo humano y consistencia temporal. Reservar escenarios y fechas futuras antes de declarar mejora.

## Qué puede impresionar de forma defendible

Una buena demostración dura unos minutos: aparece una situación nueva, el gemelo registra una decisión oculta, la persona responde y se revelan ambas rutas. Al seleccionar el punto donde divergen se ven las fuentes usadas. La persona corrige el alcance de una interpretación y una nueva situación reservada permite comprobar si mejoró. El resultado puede ser una coincidencia, una discrepancia informativa o una abstención razonable.

La red visual debería representar dependencias de evidencia reales. Si se retira una fuente, se apagan sus derivados y una decisión futura cambia o se abstiene. Ese vínculo entre animación y estado verificable es una aportación técnica más sólida que añadir un cerebro luminoso sin relación con el funcionamiento.

No se han descargado conectomas, ejecutado simulaciones biológicas, copiado gráficos científicos ni conectado proveedores. La sección Neurociencia de la aplicación incluye enlaces a las fuentes y un esquema explícitamente ilustrativo.
