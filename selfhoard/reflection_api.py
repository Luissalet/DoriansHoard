"""Owner-session routes for the reflection and its explicit model destination."""
from fastapi import Request
from pydantic import Field
from .models import StrictModel
from .reflection import PersonaInput, CardInput, CardReview, ChatPreviewInput, SendInput
from .providers import ProviderInput
from .decisions import EpisodeInput, FitInput, PredictInput, BlindAnswer


class NetworkPolicy(StrictModel):
    local_only: bool


class InterviewEvent(StrictModel):
    kind: str = Field(max_length=30)
    action: str = Field(max_length=30)


def install(app, store, space_of, providers, vaults):
    def purge(request):
        vaults[space_of(request)].purge(store(request))

    @app.get('/api/reflection')
    def reflection(request: Request):
        memory=store(request)
        return memory.persona() | {'cards':memory.cards(),'conversations':memory.conversations()}

    @app.post('/api/reflection/persona')
    def persona(data: PersonaInput, request: Request):
        return store(request).save_persona(data)

    @app.post('/api/reflection/cards')
    def card(data: CardInput, request: Request):
        return store(request).add_card(data)

    @app.post('/api/reflection/cards/{card_id}/review')
    def review(card_id: str, data: CardReview, request: Request):
        result=store(request).review_card(card_id,data)
        purge(request)
        return result

    @app.delete('/api/reflection/cards/{card_id}')
    def delete_card(card_id: str, request: Request):
        result=store(request).delete_card(card_id)
        purge(request)
        return result

    @app.get('/api/reflection/interview')
    def interview(request: Request, language: str='es'):
        return store(request).interview(language)

    @app.post('/api/reflection/interview')
    def interview_event(data: InterviewEvent, request: Request):
        return store(request).interview_event(data.kind,data.action)

    @app.post('/api/reflection/preview')
    def preview(data: ChatPreviewInput, request: Request):
        return store(request).preview(data,providers.get_provider(data.provider_id))

    @app.post('/api/reflection/send')
    async def send(data: SendInput, request: Request):
        memory=store(request)
        packet=memory.prepared(data.packet_id,data.digest)
        memory.begin_send(packet['id'])
        try:
            answer,usage=await providers.generate(packet['provider_id'],packet['payload'])
            return memory.complete(packet,answer,usage)
        except Exception:
            memory.fail(packet['id'])
            raise

    @app.delete('/api/reflection/conversations/{conversation_id}')
    def delete_conversation(conversation_id: str, request: Request):
        return store(request).delete_conversation(conversation_id)

    @app.get('/api/providers')
    def provider_settings():
        return providers.list()

    @app.get('/api/providers/local-models')
    async def local_models():
        return await providers.available_local_models()

    @app.post('/api/providers/policy')
    def network_policy(data: NetworkPolicy):
        return providers.set_policy(data.local_only)

    @app.post('/api/providers')
    def add_provider(data: ProviderInput):
        return providers.save(data)

    @app.put('/api/providers/{provider_id}')
    def edit_provider(provider_id: str, data: ProviderInput):
        return providers.save(data,provider_id)

    @app.delete('/api/providers/{provider_id}')
    def delete_provider(provider_id: str):
        return providers.delete(provider_id)

    @app.get('/api/decisions')
    def decisions(request: Request):
        memory=store(request)
        return {'episodes':memory.episodes(),'models':memory.models(),
                'trials':vaults[space_of(request)].history(memory)}

    @app.post('/api/decisions/episodes')
    def episode(data: EpisodeInput, request: Request):
        return store(request).add_episode(data)

    @app.post('/api/decisions/fit')
    def fit(data: FitInput, request: Request):
        return store(request).fit(data.domain)

    @app.post('/api/decisions/predict')
    def predict(data: PredictInput, request: Request):
        return store(request).predict(data)

    @app.post('/api/decisions/trials')
    def blind_trial(data: PredictInput, request: Request):
        return vaults[space_of(request)].create(store(request),data)

    @app.post('/api/decisions/trials/{trial_id}/answer')
    def answer_trial(trial_id: str, data: BlindAnswer, request: Request):
        return vaults[space_of(request)].answer(store(request),trial_id,data)

    @app.delete('/api/decisions/trials')
    def clear_trials(request: Request):
        return vaults[space_of(request)].clear()
