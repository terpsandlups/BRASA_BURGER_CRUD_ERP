"""Cartazes da aula: um A4 e quatro cópias identificadas por grupo."""
import json
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parent.parent
DATA=json.loads((ROOT/'.entrega-02-build/aula/qr-matriz.json').read_text(encoding='utf-8'))
OUT=ROOT/'output/aula'
OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial',r'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:/Windows/Fonts/arialbd.ttf'))
W,H=A4
DARK=HexColor('#17191c');GOLD=HexColor('#c58c3f');CREAM=HexColor('#fff8ed');MUTED=HexColor('#575b63')

def texto(c,x,y,s,size=12,font='Arial',color=DARK):
    c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s)

def pagina(c,grupo=None):
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(DARK);c.rect(0,H-206,W,206,fill=1,stroke=0)
    texto(c,38,H-40,'CONVÍVIUM',15,'Arial-Bold',HexColor('#e4ae65'))
    texto(c,38,H-57,'MANAGEMENT SYSTEM',7,'Arial',HexColor('#cac7c1'))
    if grupo: texto(c,W-120,H-43,f'GRUPO {grupo:02d}',11,'Arial-Bold',HexColor('#e4ae65'))
    texto(c,38,H-103,'Peça pelo celular.',30,'Arial-Bold',white)
    texto(c,38,H-142,'Veja no painel.',30,'Arial-Bold',HexColor('#e4ae65'))
    texto(c,38,H-175,'Brasa Burger  /  atividade ao vivo na aula',11,'Arial',HexColor('#dedbd5'))
    texto(c,38,H-235,'APONTE A CÂMERA PARA O QR CODE',10,'Arial-Bold',GOLD)
    # Quatro módulos brancos em cada borda formam a área livre do código.
    matriz=DATA['matriz'];n=len(matriz);tamanho=254;modulo=tamanho/(n+8);x=(W-tamanho)/2;y=H-510
    c.setFillColor(white);c.roundRect(x-9,y-9,tamanho+18,tamanho+18,12,fill=1,stroke=0)
    c.setFillColor(DARK)
    for r,linha in enumerate(matriz):
        for col,escuro in enumerate(linha):
            if escuro:c.rect(x+(col+4)*modulo,y+(n+3-r)*modulo,modulo+.01,modulo+.01,fill=1,stroke=0)
    c.linkURL(DATA['url'],(x,y,x+tamanho,y+tamanho),relative=0)
    passos=[('Abra o cardápio','Escolha a unidade indicada pelo apresentador.'),('Monte seu pedido','Escolha os itens e confira o carrinho.'),('Entre na sua conta','Crie o cadastro por CPF e senha, se necessário.'),('Envie e acompanhe','Veja o pedido chegar ao ERP da loja na aula.')]
    inicio=H-558
    for i,(titulo,explicacao) in enumerate(passos):
        yy=inicio-i*42
        texto(c,40,yy,str(i+1).zfill(2),14,'Arial-Bold',GOLD)
        texto(c,75,yy+1,titulo,12,'Arial-Bold')
        texto(c,75,yy-14,explicacao,10,'Arial',MUTED)
    texto(c,38,78,'Atividade de apresentação. Não realize pagamentos.',9,'Arial-Bold')
    texto(c,38,58,'Canal próprio da loja. Tecnologia Convívium.',8,'Arial',MUTED)
    c.setStrokeColor(HexColor('#dfd5c5'));c.line(38,45,W-38,45)
    texto(c,38,30,'Portal do consumidor: Brasa Burger',8,'Arial-Bold',GOLD)
    texto(c,38,18,'Se a câmera não abrir, peça o link ao apresentador.',7,'Arial',MUTED)
    c.showPage()

for nome,grupos in [('cartaz-pedidos-aula-A4.pdf',[None]),('cartazes-pedidos-aula-4-grupos.pdf',[1,2,3,4])]:
    c=canvas.Canvas(str(OUT/nome),pagesize=A4)
    c.setTitle('Pedidos na aula - Brasa Burger por Convívium')
    c.setAuthor('Convívium Management System')
    for grupo in grupos:pagina(c,grupo)
    c.save();print(OUT/nome)
