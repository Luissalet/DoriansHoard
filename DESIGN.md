---
name: Self Hoard
description: Reflejo conversacional con recuerdos revisados, procedencia y una interfaz de lectura bilingüe.
colors:
  ink: "#24372f"
  muted: "#627168"
  accent: "#34634a"
  accent-hover: "#244e38"
  paper: "#f7f8f5"
  surface: "#fff"
  sidebar: "#eef1e9"
  line: "#dde3da"
  heading-soft: "#72906d"
  navigation-active: "#dce8d6"
  navigation-ink: "#2c523b"
  row-selected: "#edf3e9"
  row-hover: "#f0f4eb"
  control-border: "#ccd6c7"
  secondary-border: "#cfd8cb"
  secondary-hover: "#f1f5ee"
  status-neutral: "#e8eae4"
  status-neutral-ink: "#566353"
  status-confirmed: "#e3efdf"
  status-confirmed-ink: "#315c3c"
  status-proposed: "#f0ebd9"
  status-proposed-ink: "#786326"
  status-disputed: "#f6e4d6"
  status-disputed-ink: "#80512e"
  status-rejected: "#f3dfdc"
  status-rejected-ink: "#8c3832"
  danger: "#a33632"
  danger-hover: "#7c2523"
  error: "#fae7e3"
  error-ink: "#8a3930"
  success: "#e4eedc"
  success-ink: "#3c602e"
  focus: "#629056"
  arena: "#e9efdf"
  diagram: "#edf2e6"
  soft: "#e6eee4"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "clamp(32px, 3.25vw, 46px)"
    fontWeight: 620
    lineHeight: 1.19
    letterSpacing: "-0.037em"
  headline:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "19px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 650
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 450
  paragraph:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.7
  claim:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 570
    lineHeight: 1.65
  label:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 570
  button:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 650
  status:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.6
rounded:
  tag: "4px"
  field: "6px"
  button: "7px"
  navigation: "8px"
  surface: "12px"
spacing:
  action-gap: "9px"
  form-gap: "20px"
  surface-inset: "23px"
  archive-gap: "28px"
  section-gap: "30px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
  button-text:
    textColor: "{colors.accent}"
    rounded: "{rounded.tag}"
    padding: "8px 3px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "11px 17px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.navigation-ink}"
    rounded: "{rounded.navigation}"
    padding: "13px 14px"
  status-confirmed:
    backgroundColor: "{colors.status-confirmed}"
    textColor: "{colors.status-confirmed-ink}"
    typography: "{typography.status}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  evidence-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "23px"
---

# Design System: Self Hoard

## Overview

**Creative North Star: "Escritorio de lectura editorial"**

Una superficie clara para conversar con una representación, leer sus fuentes y revisar recuerdos con calma. El verde apagado organiza acciones, selección y navegación; los márgenes amplios y las líneas finas separan información sin convertir cada fila en una tarjeta. La identidad se expresa con Manrope, una marca tipográfica compacta y pequeños iconos de trazo. La conversación extiende esta lectura editorial con respuestas de ancho contenido, evidencia desplegable y revisión del envío.

Este documento registra la interfaz construida, no una propuesta futura. La dirección procede de `docs/first-surface.md` y sus extensiones Operate en `docs/ai-surface.md` y `docs/reflection-surface.md`; los valores se extrajeron de `frontend/src/style.css` y `reflection.css`, y los comportamientos de `App.tsx`, `Lab.tsx`, `Neuro.tsx`, `Agents.tsx`, `Reflection.tsx`, `ModelSettings.tsx` y `shared.tsx`. Se contrastó la composición con las capturas de archivo, laboratorio, neurociencia, conexiones IA y las capturas `reflection-expression-mobile-en.png` y `reflection-dialogue-desktop-es.png` en `.impeccable/review/`. El marco permanece estable entre los siete destinos implementados; El reflejo es el destino inicial. El idioma de la interfaz cambia entre español e inglés sin traducir las fuentes, aportaciones, recuerdos ni metadatos originales.

**Key Characteristics:**

- Fondo de lectura claro, superficies blancas y divisores suaves.
- Jerarquía tipográfica sin una segunda familia decorativa.
- Afirmación, tipo, estado y procedencia visibles como información distinta.
- Escenas esquemáticas con etiquetas explícitas de demostración o ilustración.
- Navegación estable en escritorio y desplazable horizontalmente en móvil.
- Bandeja de aportaciones IA como superficie principal, con permisos y conexiones en segundo plano.
- Conversación de lectura sostenida, con contexto revisable antes de enviar y procedencia después de responder.

## Colors

La paleta combina verdes poco saturados con blancos cálidos; ámbar y rojo tienen funciones de revisión y error.

### Primary

- **Verde de acción** (`accent`): acciones principales, enlaces, filtros seleccionados y controles de rango. Su variante oscura responde al paso del puntero.
- **Salvia del titular** (`heading-soft`): segunda frase del encabezado principal. No se usa como color de párrafo general.
- **Verde de selección** (`navigation-active`, `navigation-ink`, `row-selected`): destino actual y fila seleccionada; navegación y filas tienen fondos distintos.

### Secondary

- **Estados de revisión**: pares de fondo y texto `status-confirmed`, `status-proposed`, `status-disputed` y `status-rejected`. El estado sustituido conserva el par neutro. Cada color se acompaña del nombre del estado.
- **Rojo de operación destructiva** (`danger`): acción de borrado final y acceso a revisar el borrado. Error y éxito usan sus propios pares de aviso.

### Neutral

- **Tinta verde oscura** (`ink`): texto principal. **Tinta secundaria** (`muted`): explicaciones, metadatos y notas.
- **Papel claro** (`paper`), **blanco de superficie** (`surface`) y **papel lateral** (`sidebar`): página, paneles y navegación respectivamente.
- **Línea de archivo** (`line`): límites de filas, secciones y paneles. Los campos usan un borde algo más definido.
- **Fondos de esquema** (`arena`, `diagram`): delimitan la escena del laboratorio y la ilustración de conexiones.

**The Explicit State Rule.** El color acompaña una etiqueta textual de estado; no reemplaza tipo, atribución ni explicación del resultado.

Los tokens reutilizados están en el frontmatter. Los matices exclusivos de los dibujos permanecen en su CSS. El verde suave (`soft`) se usa en filtros activos de aportaciones IA, aviso de configuración preparada, secciones e historial activos del reflejo, previsualización de contexto y citas de evidencia. Las rampas del sidecar son muestras generadas para el panel, no una escala aplicada a la interfaz.

## Typography

**Display Font:** Manrope Variable, con fallback sans-serif.
**Body Font:** la misma familia, empaquetada mediante `@fontsource-variable/manrope` en `main.tsx`.
**Label/Mono Font:** las etiquetas mantienen Manrope; el sello de laboratorio usa el estilo de código del navegador. El texto original de una fuente se fuerza a la familia de lectura.

El carácter es preciso y ligero, con titulares de espaciado estrecho y texto de lectura más abierto. No existe una escala modular única: los tamaños responden a roles concretos.

### Hierarchy

- **Display:** el rol `display` gobierna los h1 del reflejo, archivo, fuentes, laboratorio, neurociencia y datos, con salto de línea explícito y segunda frase en salvia. En móvil se fija a (33px). Conexiones IA usa un título de una sola tinta y tamaño más compacto (`clamp(26px, 3vw, 38px)`), con espaciado de (-0.03em), sin salto forzado; este tamaño propio se mantiene en móvil.
- **Headline:** el rol `headline` es el h2 general; el panel de evidencia usa (16px), el explicador científico (24px) y su texto de enlace final (26px; 24px en móvil).
- **Title:** el h3 general sigue `title`; las afirmaciones de la lista usan `claim`, con ancho máximo de (75ch), y pasan a (15px) en móvil.
- **Body:** la raíz usa `body`; la introducción de página y el texto largo usan normalmente `paragraph`. La introducción se limita a (66ch); las notas, filas de investigación y metadatos reducen el tamaño según su rol.
- **Label:** campos a partir de `label`; navegación, estados y acciones tienen sus propios pesos. Metadatos y notas oscilan entre (9px) y (12px), por lo que este registro no afirma cumplimiento universal de legibilidad.
- **Numbers:** recuentos y valores de prioridades usan cifras tabulares para mantener alineación.

## Layout

El marco de escritorio es una cuadrícula con barra lateral pegada al viewport (232px) y área de trabajo flexible. La barra tiene altura (100dvh); el encabezado tiene altura mínima (82px). El contenido se centra con máximo de (1510px) y relleno habitual (43px 40px 45px). A partir de (1500px), los márgenes horizontales del contenido y del encabezado crecen a (64px).

Sin selección, el archivo usa una columna. Con evidencia abierta, usa columnas (1.3fr / 1fr), un mínimo de (295px) para el detalle y separación `archive-gap`. Las fuentes tienen lista y detalle propios. El laboratorio distribuye escena y controles en columnas flexibles más (255px); neurociencia usa proporción (1.25fr / 1fr) y filas bibliográficas de nombre, explicación y enlace.

- Hasta (1200px): lateral de (205px), márgenes de contenido de (27px), detalle de archivo de (300px), controles de laboratorio de (220px).
- Hasta (1049px): archivo, fuentes, laboratorio y explicador científico se apilan. Los controles del laboratorio pasan a dos columnas; los recuentos pueden envolver. El detalle de evidencia se sitúa después de la lista.
- Hasta (720px): el marco se vuelve de bloque. La marca y el selector de archivo ocupan la primera fila, la navegación se desplaza horizontalmente y el contenido tiene márgenes de (19px). Los paneles usan relleno de (20px). La bibliografía sitúa nombre y enlace sobre el resumen; el pie se apila.

La densidad es mixta: filas de lectura amplias, controles y notas compactos. No se fuerza todo a una cuadrícula de tarjetas. Las cadenas largas de fuentes, citas y sellos pueden partirse; el texto fuente conserva saltos y dispone de desplazamiento interno con altura máxima de (320px).

Conexiones IA mantiene el marco y limita su superficie a (1240px). Tras el título aparece el estado real de acceso, entre dos divisores, con la acción de pausa/habilitación. Debajo, una bandeja flexible ocupa la columna principal y un formulario de (340px) ocupa la secundaria, separados por (48px); esta última lleva divisor izquierdo y relleno de (28px). Hasta (1200px), pasa a (290px), separación de (28px) y relleno de (20px). Hasta (900px), la bandeja precede al formulario en una sola columna, el divisor se coloca arriba y el estado de acceso se apila. El historial reduce sus tres columnas a dos. Los textos de aportación y procedencia conservan saltos, parten cadenas largas y admiten el idioma original.

El reflejo dispone de conversación flexible e historial de (230px), con separación de (36px), divisor izquierdo y relleno lateral de (24px). Hasta (1100px), el historial queda debajo con divisor superior; los encabezados de recuerdos también se apilan. Las preguntas sugeridas y grupos de campos usan dos columnas con separaciones de (24px) y (20px), respectivamente. Los metadatos de expresión usan tres columnas con separación de (18px). Hasta (600px), estos tres grupos pasan a una columna, los editores y previsualizaciones usan relleno de (20px 16px) y las acciones envuelven. La navegación interna permite varias líneas; no introduce desplazamiento horizontal obligatorio.

## Elevation & Depth

La interfaz de archivo es plana: separa superficies por tono, borde y espacio, sin sombras en filas, formularios o paneles. Solo la escena del laboratorio tiene sombras pequeñas, bajo los destinos y el punto del agente; sus valores exactos están en `extensions.shadows` del sidecar.

La evidencia entra mediante opacidad de (0.45) a (1) en (160ms). Botones y enlaces cambian color en (150ms). El laboratorio dibuja el recorrido en (900ms) y mueve el agente en (1100ms). La capa dinámica de neurociencia anima trazos en un ciclo de (1600ms). La preferencia de movimiento reducido elimina animaciones, transiciones y desplazamiento suave, también en el retorno programático a una afirmación.

**The Flat Archive Rule.** Las sombras pertenecen a la escena esquemática; el archivo conserva separación por tono y divisores.

## Shapes

Los paneles, formularios, escena y figura comparten esquinas de `surface`. Las acciones usan `button`; campos y avisos, `field`; navegación y buscador, `navigation`; etiquetas, `tag`. Las filas del archivo y la bibliografía son rectangulares, abiertas al fondo y separadas por una línea inferior.

Los círculos se reservan al identificador personal/demo, los nodos del esquema y el agente. Los iconos de destinos del laboratorio tienen una curva algo mayor (14px); la marca y el símbolo de demostración usan (10px). Los iconos de interfaz son SVG de Lucide, de trazo sencillo; no hay fotografía ni textura de fondo.

## Components

### Buttons

Acciones compactas, con verbo visible y un icono cuando aclara la función. Primaria, secundaria y destructiva comparten altura mínima (43px), separación interna (9px) y los tokens del frontmatter. La variante pequeña usa (36px), relleno (9px 13px) y texto (11px); la acción del encabezado se reduce más en móvil. La secundaria tiene borde fino, la textual deja visible el fondo. No hay una transformación propia de estado pulsado.

El paso del puntero oscurece primaria y destructiva; secundaria se tiñe suavemente. El foco visible global usa contorno de (3px) y separación de (3px). Los botones deshabilitados reducen su opacidad a (0.5) y cambian el cursor. El borrado de fuentes y aportaciones IA muestra antes su alcance y una acción final junto a cancelar. Las fichas, conversaciones y conexiones de modelo del reflejo se eliminan mediante acciones directas; no tienen una confirmación adicional implementada.

### Chips

Las etiquetas de estado son informativas, no filtros. Mantienen texto, fondo suave y esquinas pequeñas. Los filtros del archivo y las capas de neurociencia son botones con `aria-pressed`, subrayado inferior de (2px) y cambio de tinta; no implementan un widget ARIA de pestañas.

La bandeja IA usa filtros de estado con `aria-pressed`, fondo `soft`, esquinas de (6px) y relleno de (8px 10px), en vez del subrayado del archivo. La etiqueta ámbar de cada aportación identifica su categoría —cita comunicada, inferencia o novedad— incluso cuando está aceptada; el estado de revisión lo determina el filtro activo y las acciones disponibles, no ese color.

### Cards / Containers

El panel de evidencia es blanco, con borde fino, sin sombra y relleno `surface-inset`. Contiene la afirmación, el estado, la cita literal entre divisores, metadatos en lista de definiciones, acciones y un historial desplegable. Formularios y detalle de fuente comparten forma, con rellenos respectivos de (28px) y (26px) antes del ajuste móvil.

Las filas de afirmaciones son botones completos, con relleno (23px 18px), estado y tipo arriba, texto central y fuente abajo. El foco se lleva al panel al seleccionar; `aria-expanded` y `aria-controls` enlazan la fila con su detalle. Cerrar o usar «Volver a la afirmación» devuelve el foco a la fila y la hace visible. El panel es parte del documento, no un modal.

### Inputs / Fields

Campos blancos con borde definido, etiqueta exterior y altura mínima (42px); los textareas crecen verticalmente. El buscador es una superficie compartida entre icono, campo y acción: su campo interior no tiene un segundo borde, margen superior ni fondo opaco. Su foco se dibuja en el contenedor con contorno de (2px) y separación de (2px).

Los campos requeridos y límites usan validación nativa; los fallos de operación aparecen en un aviso global con `role="alert"`. Las confirmaciones usan `role="status"`. No hay un patrón implementado de error por campo ni mensajes de error vinculados mediante `aria-describedby`. El control de archivo conserva un input nativo transparente y muestra foco en su etiqueta. El laboratorio utiliza selects y rangos nativos con valor textual; durante una prueba se deshabilita el conjunto de criterios.

### Navigation

Siete destinos, en este orden: El reflejo, archivo, fuentes, laboratorio, neurociencia, datos y conexiones IA. La aplicación abre El reflejo y la marca vuelve a este destino. Son botones dentro de navegación etiquetada, con `aria-current="page"` para el destino activo. El selector ES/EN actualiza `document.documentElement.lang` y recuerda el idioma localmente. La navegación móvil conserva los siete destinos en una fila desplazable; no añade menú desplegable. Hay enlace de salto al contenido visible al recibir foco. El texto lateral identifica el archivo en este equipo y aclara que el propietario controla el acceso de IA.

El reflejo tiene cuatro secciones internas: Conversar, Retrato, Recuerdos y expresión, y Modelo. Su navegación etiquetada usa botones con `aria-current="page"`, fondo `soft` y tinta `accent` para el actual. No es un widget ARIA de pestañas. Los botones tienen relleno de (12px 17px), curva de (7px), peso (650) y se deshabilitan durante operaciones; hasta (600px), el relleno baja a (10px) y el texto a (12px).

### Reflection conversation and context preview

La conversación conserva el fondo de página y separa turnos por una línea superior y relleno de (24px 0), sin burbujas ni avatares humanos. El nombre del retrato se acompaña de «Representación conversacional · respuestas generadas». Cada turno presenta pregunta, etiqueta del tipo de respuesta, texto con saltos conservados, ancho máximo (75ch) e interlineado (1.85), seguido de incertidumbre cuando existe. Los tipos distinguen recuerdo documentado, consejo o análisis reconstruido, predicción incierta, reflejo y falta de información.

Los recuerdos que sostienen una respuesta se abren con `details`; cada cita usa fondo `soft`, relleno de (16px), título, texto y atribución. La región de turnos usa `aria-live="polite"`. El historial ofrece nueva conversación, selección resaltada y borrado con nombre accesible. Las preguntas sugeridas son filas con divisor y flecha, y llevan el foco al compositor al seleccionarse.

El compositor combina textarea etiquetado, tipo de conversación y selector de modelo, seguido de «Revisar antes de enviar». La previsualización es una sección etiquetada con fondo `soft`, curva `surface` y relleno de (24px). Muestra nombre/modelo, destino local o externo, número de evidencias y techo de coste estimado. Un desplegable contiene el paquete exacto y las instrucciones en bloques blancos de código, con altura máxima de (320px), salto de líneas y desplazamiento interno. Enviar y cancelar son acciones distintas; editar pregunta, tipo o modelo descarta la previsualización anterior. Durante el envío, el botón indica generación y se deshabilitan las operaciones pertinentes. No hay nueva animación de conversación.

### Portrait, memories and expression review

El retrato es un formulario blanco, con borde y curva existentes, máximo de (850px), relleno de (26px) y separación de campos de (22px). Conserva nombre, presentación, expresión, criterios, valores y límites, con autorización explícita mediante checkbox de (18px). La nota junto a guardar explica que cambiar el retrato retira conversaciones anteriores. El selector de etapa incluye Legado y declara que aún no concede acceso a familiares.

Recuerdos y expresión usa filas abiertas con borde superior y relleno de (26px 0). Título, tipo, atribución y estado anteceden al texto original. Los formularios ofrecen entrada directa o una pregunta guiada y conservan autor, época y contexto. Una ficha de expresión añade rasgo, frecuencia, idioma, fragmentos literales y condiciones de uso; cada fragmento debe existir en el texto original. La interfaz aclara que los gestos se describen y una muletilla no debe aparecer en cada respuesta.

En la ficha guardada se ven «Con quién», «Cuándo» y «Evitar en». Antes de los controles de revisión, el desplegable «Revisar autor y detalles guardados» expone autor, época, tema, rasgo de expresión, frecuencia e idioma, más los fragmentos literales en citas de fondo `soft`. Los campos vacíos indican «Sin especificar» y la ausencia de fragmentos se declara. Etiquetas y enumeraciones cambian con ES/EN; autor, metadatos libres, texto y citas conservan exactamente su idioma original. Este despliegue permite revisar la ficha guardada, no solo el formulario de creación.

Las fichas propuestas permiten confirmar o rechazar; las confirmadas permiten retirar del reflejo. El borrado de ficha conserva la fuente original en Fuentes y la nota explica que retirar elimina conversaciones dependientes. El estado y la atribución no se confunden: confirmar un relato atribuido no lo convierte en declaración propia.

La previsualización de borrado en Fuentes informa también de fichas del reflejo, respuestas guardadas y modelos de preferencias derivados cuando sus recuentos son mayores que cero. El texto de exportación en Mis datos declara que retrato, metadatos de expresión y conversaciones todavía no se incluyen; no presentar la descarga actual como copia completa del reflejo. Estas ampliaciones reutilizan la composición y controles existentes.

### Model destinations

Modelo reutiliza el editor y los grupos de campos, sin una identidad visual nueva. Una política visible permite solo modelos locales inicialmente y se explica que modelos/política se comparten entre archivo personal y demo, mientras los recuerdos siguen separados. Las conexiones guardadas son filas con nombre, identificador, etiqueta Local/Externo, dirección y límite diario, junto a borrado accesible.

El formulario ofrece Ollama con búsqueda de modelos, servidor local compatible, OpenAI y Anthropic. Los proveedores externos muestran divulgación del destino, clave en campo de contraseña, precio máximo por millón, fecha de verificación y presupuesto; se permite guardar una conexión externa con modo local activo, pero el texto aclara que las llamadas quedan bloqueadas. Límites de llamadas y salida usan campos numéricos. Las tarifas las aporta el propietario: la interfaz no afirma verificarlas automáticamente. La advertencia sobre confiar en el servicio local evita prometer control sobre reenvíos hechos por otras aplicaciones.

### AI connections and attributed reports

La bandeja conserva la lectura plana del archivo: aportaciones en elementos `article`, separadas por borde inferior y relleno de (24px 0), sin sombra. Nombre de la conexión y fecha aparecen arriba en (12px); el título usa (18px). Categoría, texto original y procedencia desplegable preceden a las acciones. Una aportación pendiente ofrece aceptar, rechazar y eliminar; una aceptada ofrece retirar del contexto y eliminar. Aceptar conserva autor y categoría: nunca reclasifica la aportación como declaración original del propietario. El recuento junto al título indica pendientes, aunque se esté viendo otro filtro.

La eliminación abre confirmación dentro de la propia fila y explica que no retira copias ya recibidas. El historial usa `details`, identifica actor, acción y resultado, muestra hasta las últimas 100 acciones y ofrece exportación. No añade diálogo modal, sombras ni animación nueva.

El formulario secundario reutiliza campos, botones y foco visible existentes. Sus etiquetas usan (13px), con separación vertical de (20px). Un `fieldset` con `legend` agrupa cinco permisos independientes: consultar el reflejo, consultar contexto, aportar novedades, leer fuentes completas y proponer actividades. Consultar el reflejo (`reflection.read`) incluye retrato y recuerdos revisados, expresiones y criterios; su explicación excluye acceso a conversaciones. Las conexiones antiguas conservan sus permisos y no adquieren este nuevo permiso automáticamente. Cada permiso tiene checkbox nativo de (16px), título y explicación; el verde de acción marca la selección. La configuración inicial selecciona consultar contexto y aportar novedades. El nombre es obligatorio, con máximo de (80) caracteres; la caducidad permite (7), (30) o (90) días. Crear queda deshabilitado mientras se procesa una operación, falta nombre o permiso, o permanece visible una configuración recién creada.

La configuración preparada aparece en un contenedor `soft`, con borde, curva `surface`, relleno de (18px) y `role="status"`. Ofrece descargar el archivo y confirmar que se guardó, con botones de ancho completo. Su texto indica que contiene una clave y que solo se presenta en este paso. Las conexiones creadas se muestran como filas con nombre, permisos, fecha o etiqueta de caducidad/revocación; revocar es una acción textual destructiva.

El estado de acceso tiene encabezado explícito y botón para pausar todas las conexiones o habilitarlas. La pausa afecta al acceso y se muestra sin ocultar la bandeja ni el formulario. La divulgación junto al control explica que MCP es acceso local, pero el cliente IA puede procesar el contexto con su proveedor; el pie aclara que revocar bloquea consultas futuras sin retirar copias anteriores. No representar el indicador local como garantía de que un cliente autorizado nunca transmite contexto.

### Demonstration scene and research schematic

Tres actividades con icono, nombre y tiempo se conectan a un agente visible. Los destinos no disponibles se atenúan; sus botones de respuesta se deshabilitan y explican la falta de tiempo. La predicción queda oculta hasta responder. Después, texto de resultado, actividad elegida, etiqueta «Tu elección», recorrido y desglose explican lo ocurrido; abstención y salto tienen mensajes propios. El estado animado no sustituye el resultado textual.

El laboratorio declara que sus prioridades se configuran manualmente y no son rasgos medidos. Neurociencia ofrece tres capas con texto explicativo y una figura SVG etiquetada como esquema ilustrativo. Los enlaces de investigación tienen texto e indicador de apertura externa. No presentar estos dibujos como conectomas reales, simulación cerebral o validación de un gemelo aprendido.

### Loading, empty and notices

La carga muestra un título y una frase; un fallo de apertura añade indicación de recargar. Un archivo vacío propone añadir una fuente y permite explorar la demo; una búsqueda vacía declara falta de evidencia. La demo usa un aviso persistente sobre su carácter sintético y separado. No hay esqueletos animados, notificaciones flotantes ni diálogo modal de confirmación en la implementación actual.

En conexiones IA, antes de cargar los controles se ofrece «Cargar controles». Un fallo de actualización aparece con `role="alert"` y conserva la bandeja previamente cargada, si existe. La acción Actualizar permite reintentar y la superficie consulta novedades cada (15s). El filtro pendiente vacío muestra «Todo al día»; los otros filtros vacíos declaran que no hay aportaciones allí. Sin conexiones se indica que ninguna IA tiene acceso. El estado pausado y la configuración preparada tienen mensajes propios; no se añade un indicador animado de carga.

El reflejo indica apertura durante la carga. Sin retrato autorizado, Conversar muestra «Preparar el retrato»; con retrato y sin diálogo, presenta preguntas concretas y compositor. La falta de modelo ofrece conectar uno; el historial y los recuerdos tienen mensajes de vacío. Los errores y límites del proveedor usan el aviso de operación existente, sin exponer claves ni contenido privado en sus textos. La representación generada se identifica junto al nombre, sin repetir una advertencia en cada respuesta.

Los patrones de accesibilidad descritos se verificaron en código y en una revisión visual acotada; este documento no certifica WCAG ni una auditoría completa de lector de pantalla. La revisión final comunicada resolvió cuatro correcciones y limitó su disposición de entrega a esas correcciones; la ejecución única del detector devolvió `[]`. Esos resultados no acreditan funciones futuras ni validación científica.

La revisión final posterior de la extensión Conexiones IA comunicó disposición `ship`, sin correcciones materiales. Su alcance fue la extensión editorial Operate, con bandeja principal, aportaciones atribuidas, formulario secundario, apilado móvil y divulgación sobre el proveedor. Las capturas documentan ejemplos sintéticos a (1440px) en español y (390px) en inglés; no acreditan una auditoría universal de accesibilidad ni el comportamiento de clientes IA externos.

La revisión de cierre del reflejo encontró metadatos guardados ausentes en la revisión de fichas; una única tanda incorporó el desplegable descrito y obtuvo `ship` limitado a esa corrección. Se comunicaron (60) pruebas del núcleo y (5) pruebas Edge correctas, comprobación MCP real de permiso/retirada/revocación y una prueba sintética separada con Ollama real. Las capturas de interfaz identifican su transporte simulado y personaje sintético. Estos resultados prueban los recorridos ejecutados, no fidelidad psicológica, identidad humana, conciencia ni acceso familiar implementado.

## Do's and Don'ts

### Do:

- **Do** conservar tipo, estado y procedencia como información separada y legible.
- **Do** mantener la cita literal a la vista en el detalle y devolver el foco a la afirmación al cerrarlo.
- **Do** probar el texto de interfaz en español e inglés, conservando el idioma original de las fuentes.
- **Do** mantener visibles las etiquetas de demo y de esquema ilustrativo junto a sus superficies.
- **Do** aplicar movimiento reducido tanto a CSS como al desplazamiento programático.
- **Do** presentar autor, categoría y procedencia antes de aceptar una aportación IA, y conservarlos después.
- **Do** mantener la divulgación sobre el proveedor junto al estado de acceso y la explicación de cada permiso junto a su checkbox.
- **Do** permitir revisar autor, contexto y fragmentos guardados antes de confirmar una ficha de expresión.
- **Do** presentar el destino y contenido exacto antes del envío, y distinguir respuesta generada de evidencia documentada.

### Don't:

- **Don't** introducir sombras en las filas y paneles del archivo.
- **Don't** añadir un segundo borde al campo interior del buscador.
- **Don't** convertir una etiqueta de revisión en un indicador de exactitud personal o científica.
- **Don't** presentar la escena manual como un agente aprendido del archivo.
- **Don't** usar color o animación como única explicación de selección, revisión o resultado.
- **Don't** presentar una aportación IA aceptada como declaración original del propietario ni prometer que revocar borra copias externas.
- **Don't** tratar Legado como acceso familiar disponible ni mostrar una métrica de fidelidad no validada.
