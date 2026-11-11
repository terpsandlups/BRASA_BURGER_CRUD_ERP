"""Empacota artefatos acadêmicos e apresentação portátil, sem credenciais."""
from pathlib import Path
import hashlib,json,zipfile

ROOT=Path(__file__).resolve().parents[1]
NAME='PI-2026-2-CONVIVIUM-MANAGEMENT-SYSTEM-ENTREGA-2-REVISAO-1.zip'
files={
 'trabalho-escrito.pdf':'output/pdf/trabalho-escrito.pdf',
 'apresentacao.pdf':'output/pdf/apresentacao.pdf',
 'anexos/anexos.pdf':'output/pdf/anexos.pdf',
 'anexos/fundamentos-tecnicos.pdf':'output/pdf/fundamentos-tecnicos.pdf',
 'anexos/modelo-de-negocio.pdf':'output/pdf/modelo-de-negocio.pdf',
 'anexos/guia-reproducao.md':'GUIA_PASSO_A_PASSO.md',
}
for filename in ['Convivium-Entrega-2.pptx','Fundamentos-Tecnicos-Convivium.pptx','Convivium-Modelo-de-Negocio.pptx']:
 files['anexos/slides/'+filename]='Slides/Entrega-2/'+filename
for filename in ['README.md','TRABALHO_ESCRITO.md','MODELO_DE_NEGOCIO.md','ROTEIRO_APRESENTACAO.md','SLIDES_CONTEUDO.json','SUBMISSAO.md','REVISAO_AULA.md']:
 files['anexos/fontes/'+filename]='docs/entrega-02/'+filename
for filename in ['ARQUITETURA_E_FLUXO.md','MATRIZ_DISCIPLINAR.md','MEMORIA_CALCULO.md','CASOS_E_RESULTADOS.md','resultado-postgres.json','resultado-api-local.json']:
 files['anexos/'+filename]='docs/entrega-02/anexos/'+filename
for filename in ['portal-publico.png','carrinho-sem-envio.png','portal-cpf-publicado.jpg','carrinho-cpf-publicado.jpg']:
 files['anexos/evidencias/'+filename]='docs/entrega-02/anexos/evidencias/'+filename
for caminho in sorted((ROOT/'frontend/public/apresentacao').rglob('*')):
 if caminho.is_file():files['anexos/apresentacao-interativa/'+caminho.relative_to(ROOT/'frontend/public/apresentacao').as_posix()]=caminho.relative_to(ROOT).as_posix()
files['anexos/creditos-imagens.md']='Slides/Entrega-2/assets/CREDITOS.md'
files['anexos/LEIA-ME.md']='docs/entrega-02/LEIA-ME_PACOTE.md'

payload={}
for dest,source in files.items():
 p=(ROOT/source).resolve()
 if not p.is_relative_to(ROOT) or not p.is_file():raise ValueError('Fonte ausente/inválida: '+source)
 payload[dest]=p.read_bytes()
manifest={'projeto':'Convívium Management System','caso':'Brasa Burger','entrega':'2','periodo':'2026/2','git_ref':'entrega-2-2026-2-revisao-1','repositorio':'https://github.com/terpsandlups/BRASA_BURGER_CRUD_ERP','data':'2026-11-11','arquivos':[{'caminho':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(payload.items())]}
payload['anexos/manifesto.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
target=ROOT/'output'/NAME;target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,b in sorted(payload.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,11,11,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b,compresslevel=9)
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 assert {n for n in z.namelist() if '/' not in n}=={'trabalho-escrito.pdf','apresentacao.pdf'}
 assert not any(n.startswith(('/', '../')) or '\\' in n or n.endswith('.env') or 'node_modules' in n for n in z.namelist())
 for entry in manifest['arquivos']:assert hashlib.sha256(z.read(entry['caminho'])).hexdigest()==entry['sha256']
assert target.stat().st_size<100_000_000,'Pacote excede 100 MB.'
digest=hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(digest+'  '+NAME+'\n',encoding='utf-8')
print(json.dumps({'arquivo':str(target),'bytes':target.stat().st_size,'arquivos':len(payload),'sha256':digest},ensure_ascii=False,indent=2))
