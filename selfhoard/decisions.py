"""Inspectable, domain-specific preference learning from reviewed human choices.

This small statistical model complements the conversational reflection. It learns
pairwise feature preferences, never claims to reconstruct private mental processes.
"""
from hashlib import sha256
import json
import math
from typing import Literal
from pydantic import Field, model_validator
from .models import StrictModel
from .reflection import Reflection, CardInput, CardReview, pack
from .store import Store, DomainError, now, uid


class DecisionOption(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=300)
    features: dict[str, float] = Field(default_factory=dict, max_length=12)

    @model_validator(mode='after')
    def features_valid(self):
        if any(not k.strip() or len(k)>80 or not math.isfinite(v) or v<0 or v>5 for k,v in self.features.items()):
            raise ValueError('invalid_features')
        return self


class DecisionCase(StrictModel):
    domain: str = Field(min_length=1, max_length=100)
    situation: str = Field(min_length=1, max_length=4000)
    options: list[DecisionOption] = Field(min_length=2, max_length=8)

    @model_validator(mode='after')
    def unique_options(self):
        if len({o.id for o in self.options})!=len(self.options): raise ValueError('duplicate_options')
        keys=set(self.options[0].features)
        if any(set(o.features)!=keys for o in self.options): raise ValueError('inconsistent_features')
        return self


class EpisodeInput(DecisionCase):
    chosen: list[str] = Field(max_length=8)
    reason: str = Field(default='', max_length=4000)
    considered: str = Field(default='', max_length=4000)
    exception: str = Field(default='', max_length=2000)
    vetoes: list[str] = Field(default_factory=list, max_length=8)
    period: str = Field(default='', max_length=120)

    @model_validator(mode='after')
    def choices_valid(self):
        ids={o.id for o in self.options}
        if not set(self.chosen)<=ids or not set(self.vetoes)<=ids or set(self.chosen)&set(self.vetoes):
            raise ValueError('invalid_choices')
        if len(self.chosen)!=len(set(self.chosen)): raise ValueError('duplicate_choices')
        return self


class FitInput(StrictModel):
    domain: str = Field(min_length=1,max_length=100)


class PredictInput(DecisionCase):
    model_id: str


def fit_weights(episodes):
    features=sorted(set.intersection(*[set(e['options'][0]['features']) for e in episodes]))
    if not features: raise DomainError('insufficient_comparable_features',409)
    comparisons=[]
    for episode in episodes:
        selected=[o for o in episode['options'] if o['id'] in episode['chosen']]
        rejected=[o for o in episode['options'] if o['id'] not in episode['chosen']+episode['vetoes']]
        for winner in selected:
            for loser in rejected:
                comparisons.append([(winner['features'][f]-loser['features'][f])/5 for f in features])
    if len(comparisons)<3: raise DomainError('insufficient_decisions',409)
    weights=[0.0]*len(features)
    # Fixed, regularized pairwise logistic fitting; deterministic and replayable.
    for _ in range(300):
        gradient=[.12*w for w in weights]
        for vector in comparisons:
            margin=sum(w*x for w,x in zip(weights,vector))
            factor=1/(1+math.exp(max(-30,min(30,margin))))
            for i,x in enumerate(vector): gradient[i]-=factor*x/len(comparisons)
        weights=[w-.2*g for w,g in zip(weights,gradient)]
    return {'weights':dict(zip(features,weights)),'comparisons':len(comparisons),
            'method':'regularized-pairwise-logistic-v1','iterations':300,'regularization':.12}


def predict_case(model, case):
    if model['domain']!=case['domain']: raise DomainError('domain_mismatch',409)
    weights=model['weights']
    if any(not set(weights)<=set(o['features']) for o in case['options']):
        raise DomainError('missing_decision_features',409)
    scores={o['id']:sum(weights[k]*o['features'][k]/5 for k in weights) for o in case['options']}
    maximum=max(scores.values()); exps={k:math.exp(v-maximum) for k,v in scores.items()};total=sum(exps.values())
    probabilities={k:v/total for k,v in exps.items()}
    ordered=sorted(probabilities,key=probabilities.get,reverse=True)
    abstain=probabilities[ordered[0]]-probabilities[ordered[1]]<.05
    return {'prediction':None if abstain else ordered[0],'probabilities':probabilities,
            'probability_status':'uncalibrated_model_estimates','scores':scores,
            'method':model['method'],'model_id':model['id'],'domain':model['domain'],
            'supporting_episode_ids':model['episode_ids'],
            'contributions':{o['id']:{k:weights[k]*o['features'][k]/5 for k in weights} for o in case['options']},
            'limits':'Conditional on the supplied feature ratings and reviewed examples in this domain. Contributions are model terms, not verified psychological causes.'}


class Decisions(Reflection):
    def __init__(self,path):
        super().__init__(path)
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS episodes(id TEXT PRIMARY KEY,card_id TEXT NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
                  payload TEXT NOT NULL,created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS preference_models(id TEXT PRIMARY KEY,domain TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS model_episodes(model_id TEXT NOT NULL REFERENCES preference_models(id) ON DELETE CASCADE,
                  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,PRIMARY KEY(model_id,episode_id));
                CREATE TRIGGER IF NOT EXISTS forget_preference_model AFTER DELETE ON model_episodes BEGIN
                  DELETE FROM preference_models WHERE id=OLD.model_id;
                END;
                CREATE TRIGGER IF NOT EXISTS revise_episode_model AFTER UPDATE OF state ON cards WHEN NEW.state!='confirmed' BEGIN
                  DELETE FROM preference_models WHERE id IN (SELECT model_id FROM model_episodes WHERE episode_id IN (SELECT id FROM episodes WHERE card_id=NEW.id));
                END;
            ''')

    def add_episode(self,data):
        item=data.model_dump()
        # Stored as a source-backed, initially unreviewed criterion example.
        with self.connect() as db:
            card=self.add_card(CardInput(kind='criterion',title=data.domain+': '+data.situation[:150],text=pack(item),
                                        domain=data.domain,period=data.period),transaction=db)
            episode_id=uid()
            db.execute('INSERT INTO episodes VALUES(?,?,?,?)',(episode_id,card['id'],pack(item),now()))
        return {'id':episode_id,'card_id':card['id'],'state':'proposed',**item}

    def episodes(self):
        with self.connect() as db:
            return [json.loads(r['payload'])|{'id':r['id'],'card_id':r['card_id'],'state':r['state'],'created_at':r['created_at']}
                for r in db.execute('SELECT e.*,c.state FROM episodes e JOIN cards c ON c.id=e.card_id ORDER BY e.created_at DESC')]

    def fit(self,domain):
        episodes=[e for e in self.episodes() if e['domain']==domain and e['state']=='confirmed' and e['chosen']]
        if len(episodes)<3: raise DomainError('insufficient_decisions',409)
        signature=sha256(pack(episodes).encode()).hexdigest()
        fitted=fit_weights(episodes)
        model={'id':uid(),'domain':domain,**fitted,'episode_ids':[e['id'] for e in episodes],
               'training_digest':signature,'created_at':now(),'probabilities_calibrated':False}
        with self.connect() as db:
            # Review or deletion during fitting must not resurrect a withdrawn model.
            current=[json.loads(r['payload'])|{'id':r['id'],'card_id':r['card_id'],'state':r['state'],'created_at':r['created_at']}
                for r in db.execute("SELECT e.*,c.state FROM episodes e JOIN cards c ON c.id=e.card_id WHERE c.state='confirmed' ORDER BY e.created_at DESC")]
            current=[e for e in current if e['domain']==domain and e['chosen']]
            if sha256(pack(current).encode()).hexdigest()!=signature:
                raise DomainError('training_changed_retry',409)
            db.execute('INSERT INTO preference_models VALUES(?,?,?,?)',(model['id'],domain,pack(model),model['created_at']))
            db.executemany('INSERT INTO model_episodes VALUES(?,?)',[(model['id'],e['id']) for e in episodes])
        return model

    def models(self):
        with self.connect() as db:
            return [json.loads(r[0]) for r in db.execute('SELECT payload FROM preference_models ORDER BY created_at DESC')]

    def model(self,model_id):
        with self.connect() as db:
            row=db.execute('SELECT payload FROM preference_models WHERE id=?',(model_id,)).fetchone()
            if not row: raise DomainError('model_missing_or_withdrawn',409)
            return json.loads(row[0])

    def predict(self,data):
        return predict_case(self.model(data.model_id),data.model_dump())


class BlindAnswer(StrictModel):
    chosen: list[str] = Field(max_length=8)
    reason: str = Field(default='',max_length=4000)
    reason_match: Literal['yes','partly','no','unrated'] = 'unrated'


class DecisionVault(Store):
    """Held-out labels live here, outside any reflection/context retrieval store."""
    def __init__(self,path):
        super().__init__(path)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS blind_decisions(id TEXT PRIMARY KEY,model_id TEXT NOT NULL,case_json TEXT NOT NULL,sealed TEXT NOT NULL,digest TEXT NOT NULL,answer TEXT,created_at TEXT NOT NULL)')

    def create(self,models,data):
        import secrets
        prediction=models.predict(data)
        model=models.model(data.model_id)
        sealed={'prediction':prediction,'model':model,'nonce':secrets.token_hex(32)}
        packed=pack(sealed);trial_id=uid()
        with self.connect() as db:
            db.execute('INSERT INTO blind_decisions VALUES(?,?,?,?,?,NULL,?)',(trial_id,data.model_id,pack(data.model_dump()),packed,sha256(packed.encode()).hexdigest(),now()))
        return self.get(models,trial_id)

    def get(self,models,trial_id):
        with self.connect() as db:
            row=db.execute('SELECT * FROM blind_decisions WHERE id=?',(trial_id,)).fetchone()
            if not row: raise DomainError('not_found',404)
            row=dict(row)
        # Fail closed and purge derivatives after deletion/withdrawal of training evidence.
        try: models.model(row['model_id'])
        except DomainError:
            with self.connect() as db: db.execute('DELETE FROM blind_decisions WHERE id=?',(trial_id,))
            raise
        result={'id':row['id'],'case':json.loads(row['case_json']),'digest':row['digest'],
                'answered':row['answer'] is not None,'created_at':row['created_at']}
        if row['answer'] is not None:
            answer=json.loads(row['answer']);sealed=json.loads(row['sealed']);prediction=sealed['prediction']
            choices=answer['chosen']; probs=prediction['probabilities'];n=len(probs)
            target={k:(1/len(choices) if k in choices else 0) for k in probs} if choices else None
            result.update(answer=answer,seal=sealed,canonical_payload=row['sealed'],
                agreement=prediction['prediction'] in choices if prediction['prediction'] else None,
                brier=sum((probs[k]-target[k])**2 for k in probs) if target else None,
                uniform_brier=sum((1/n-target[k])**2 for k in probs) if target else None,
                chance_agreement=len(choices)/n)
        return result

    def answer(self,models,trial_id,data):
        self.get(models,trial_id)
        with self.connect() as db:
            row=db.execute('SELECT * FROM blind_decisions WHERE id=?',(trial_id,)).fetchone()
            if row['answer'] is not None: raise DomainError('already_answered',409)
            ids={o['id'] for o in json.loads(row['case_json'])['options']}
            if not set(data.chosen)<=ids or len(data.chosen)!=len(set(data.chosen)): raise DomainError('invalid_choice')
            db.execute('UPDATE blind_decisions SET answer=? WHERE id=?',(pack(data.model_dump()),trial_id))
        return self.get(models,trial_id)

    def history(self,models):
        with self.connect() as db: ids=[r[0] for r in db.execute('SELECT id FROM blind_decisions ORDER BY created_at DESC')]
        results=[]
        for trial_id in ids:
            try: results.append(self.get(models,trial_id))
            except DomainError as error:
                if error.code!='model_missing_or_withdrawn': raise
        return results

    def purge(self,models):
        valid={m['id'] for m in models.models()}
        with self.connect() as db:
            for row in db.execute('SELECT DISTINCT model_id FROM blind_decisions').fetchall():
                if row[0] not in valid: db.execute('DELETE FROM blind_decisions WHERE model_id=?',(row[0],))

    def clear(self):
        with self.connect() as db: db.execute('DELETE FROM blind_decisions')
        return {'ok':True}
