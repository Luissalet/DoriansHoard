"""An inspectable utility-policy demo, not a learned personal twin."""
from hashlib import sha256
import json
import secrets
from pydantic import Field
from .models import StrictModel
from .store import Store, DomainError, now, uid

SCENARIOS = [
 {'id':'afternoon','title':{'es':'Una tarde para ti','en':'An afternoon for yourself'},
  'description':{'es':'Tienes un rato libre. ¿Dónde te gustaría pasarlo?','en':'You have some free time. Where would you like to spend it?'},
  'options':[
   {'id':'garden','label':{'es':'Pasear por el jardín','en':'Walk in the garden'},'minutes':20,'traits':{'calm':5,'autonomy':4,'curiosity':2,'connection':1}},
   {'id':'studio','label':{'es':'Crear algo en el taller','en':'Make something in the studio'},'minutes':45,'traits':{'calm':2,'autonomy':5,'curiosity':5,'connection':1}},
   {'id':'cafe','label':{'es':'Tomar un café con alguien','en':'Have coffee with someone'},'minutes':30,'traits':{'calm':2,'autonomy':2,'curiosity':2,'connection':5}}]},
 {'id':'learning','title':{'es':'Algo nuevo que aprender','en':'Something new to learn'},
  'description':{'es':'Quieres aprender algo esta semana. ¿Cómo empezarías?','en':'You want to learn something this week. How would you start?'},
  'options':[
   {'id':'garden','label':{'es':'Leer a tu ritmo','en':'Read at your own pace'},'minutes':20,'traits':{'calm':5,'autonomy':5,'curiosity':3,'connection':0}},
   {'id':'studio','label':{'es':'Probar con un proyecto','en':'Try a hands-on project'},'minutes':45,'traits':{'calm':1,'autonomy':5,'curiosity':5,'connection':1}},
   {'id':'cafe','label':{'es':'Unirte a un pequeño grupo','en':'Join a small group'},'minutes':30,'traits':{'calm':2,'autonomy':1,'curiosity':4,'connection':5}}]}
]


class TrialInput(StrictModel):
    scenario: str
    minutes: int = Field(ge=10, le=90)
    weights: dict[str,int]


class AnswerInput(StrictModel):
    choice: str


class Lab:
    def __init__(self, path):
        self.db = Store(path)
        with self.db.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS trials (id TEXT PRIMARY KEY,payload TEXT NOT NULL,digest TEXT NOT NULL,created_at TEXT NOT NULL,choice TEXT,answered_at TEXT)')

    def create(self, data: TrialInput):
        scenario = next((s for s in SCENARIOS if s['id']==data.scenario),None)
        if not scenario:
            raise DomainError('invalid_scenario')
        if set(data.weights)!= {'calm','autonomy','curiosity','connection'} or any(type(v)!=int or v<0 or v>5 for v in data.weights.values()):
            raise DomainError('invalid_weights')
        scores = {o['id']:sum(data.weights[k]*v for k,v in o['traits'].items()) for o in scenario['options'] if o['minutes']<=data.minutes}
        winners = [key for key,value in scores.items() if value==max(scores.values())] if scores else []
        prediction = winners[0] if len(winners)==1 else 'abstain'
        payload = {'scenario':scenario,'minutes':data.minutes,'weights':data.weights,'scores':scores,
                   'prediction':prediction,'method':'manual-utility-v1','nonce':secrets.token_hex(32)}
        packed = json.dumps(payload,sort_keys=True,ensure_ascii=False,separators=(',',':'))
        item_id, created_at = uid(), now()
        with self.db.connect() as db:
            db.execute('INSERT INTO trials VALUES (?,?,?,?,NULL,NULL)',(item_id,packed,sha256(packed.encode()).hexdigest(),created_at))
        return self.get(item_id)

    @staticmethod
    def present(row):
        payload = json.loads(row['payload'])
        public = {'id':row['id'],'scenario':payload['scenario'],'minutes':payload['minutes'],
                  'weights':payload['weights'],
                  'method':payload['method'],'digest':row['digest'],'created_at':row['created_at'],
                  'answered':row['choice'] is not None}
        if row['choice'] is not None:
            public.update(payload=payload,choice=row['choice'],answered_at=row['answered_at'],
                          match=payload['prediction']==row['choice'],canonical_payload=row['payload'])
        return public

    def get(self,item_id):
        with self.db.connect() as db:
            row = db.execute('SELECT * FROM trials WHERE id=?',(item_id,)).fetchone()
            if not row:
                raise DomainError('not_found',404)
            return self.present(row)

    def answer(self,item_id,choice):
        with self.db.connect() as db:
            row = db.execute('SELECT * FROM trials WHERE id=?',(item_id,)).fetchone()
            if not row:
                raise DomainError('not_found',404)
            if row['choice'] is not None:
                raise DomainError('already_answered',409)
            p = json.loads(row['payload'])
            if choice not in ['none','skip']+[o['id'] for o in p['scenario']['options'] if o['minutes']<=p['minutes']]:
                raise DomainError('invalid_choice')
            db.execute('UPDATE trials SET choice=?,answered_at=? WHERE id=?',(choice,now(),item_id))
        return self.get(item_id)

    def history(self):
        with self.db.connect() as db:
            return [self.present(row) for row in db.execute('SELECT * FROM trials ORDER BY created_at DESC')]

    def clear(self):
        with self.db.connect() as db:
            db.execute('DELETE FROM trials')
