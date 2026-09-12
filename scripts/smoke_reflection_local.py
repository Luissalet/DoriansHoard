"""Opt-in real Ollama integration check using synthetic QA data, never the personal server."""
import argparse
import json
from pathlib import Path
import httpx


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    with httpx.Client(base_url='http://127.0.0.1:8742',trust_env=False,timeout=240,
                      headers={'X-Hoard-Request':'1','X-Hoard-Space':'demo'}) as client:
        def call(path,data=None):
            r=client.get('/api'+path) if data is None else client.post('/api'+path,json=data)
            r.raise_for_status()
            return r.json()
        call('/session')
        call('/reflection/persona',{'name':'Alba (personaje sintético de prueba)','introduction':'Personaje ficticio, no representa a una persona real.','voice':'Frases claras y humor suave. No repite sus muletillas constantemente.','consent':True})
        entries=[
            {'kind':'voice','title':'Frase al ordenar una decisión (sintético)','text':'Cuando mis amigos se agobian comparando planes, suelo decir: «Bueno, vamos por partes». No lo digo cuando alguien está contando una pérdida.',
             'expression':{'feature':'catchphrase','exact_examples':['Bueno, vamos por partes'],'use_when':'Comparar opciones con calma','avoid_when':'Duelo','relationship':'Amigos','frequency':'sometimes','language':'Español'}},
            {'kind':'criterion','title':'Plan de descanso (sintético)','text':'Después de una semana ruidosa elijo pasear por el bosque en vez de ir a una fiesta. El silencio me ayuda a descansar. Si fuera el cumpleaños de mi mejor amiga iría a su fiesta.'},
        ]
        cards=[]
        for data in entries:
            c=call('/reflection/cards',data);cards.append(c['id'])
            call('/reflection/cards/'+c['id']+'/review',{'state':'confirmed'})
        provider=call('/providers',{'name':'Ollama · prueba sintética','kind':'ollama','model':args.model,'max_output_tokens':1000,'calls_per_day':10})
        packet=call('/reflection/preview',{'question':'Después de una semana ruidosa, ¿qué elegiría Alba: bosque o fiesta, y por qué?','mode':'prediction','provider_id':provider['id'],'language':'es'})
        result=call('/reflection/send',{'packet_id':packet['id'],'digest':packet['digest']})
        assert result['answer']['kind']=='prediction',result
        assert result['answer']['citations'] and result['answer']['uncertainty'],result
        assert set(result['answer']['citations'])<=set(cards),result
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps({'synthetic':True,'packet_digest':packet['digest'],'result':result},ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'ok':True,'model':args.model,'kind':result['answer']['kind'],'citations':len(result['answer']['citations']),'output':str(args.output)},ensure_ascii=False))


if __name__=='__main__': main()
