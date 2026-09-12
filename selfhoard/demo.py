from .models import ClaimInput, SourceInput


def populate(store):
    if store.snapshot()['sources']:
        return
    examples = [
        ('Una forma de trabajar · Ejemplo sintético', 'Prefiero trabajar con objetivos claros y libertad para decidir cómo alcanzarlos.', 'confirmed'),
        ('Un fin de semana · Ejemplo sintético', 'Cuando necesito descansar, prefiero una ruta tranquila a un lugar muy concurrido.', 'confirmed'),
        ('Una elección pendiente · Ejemplo sintético', 'Me interesa aprender a dibujar, aunque todavía no he encontrado una rutina.', 'proposed'),
    ]
    for title, text, state in examples:
        source = store.add_source(SourceInput(title=title, text=text, author='Participante sintético'))
        c = store.add_claim(ClaimInput(source_id=source['id'], quote=text, text=text))
        if state == 'confirmed':
            store.review(c['id'], state)
    c = store.add_claim(ClaimInput(source_id=source['id'], quote=text,
        text='Quizá el aprendizaje creativo necesite un espacio propio en su semana.', kind='inference'))
