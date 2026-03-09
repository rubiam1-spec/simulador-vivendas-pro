import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export function gerarPdfProposta(dados:any){

const doc = new jsPDF()

const corVerde = "#2F8F69"
const corEscuro = "#163127"

let y = 20

// HEADER
doc.setFillColor(corEscuro)
doc.rect(0,0,210,15,"F")

doc.setTextColor(255,255,255)
doc.setFontSize(10)
doc.text("BOMM Urbanizadora",14,10)

doc.setTextColor(0,0,0)

doc.setFontSize(18)
doc.text("Carta Proposta Comercial",14,25)

doc.setFontSize(10)
doc.text(`Data: ${dados.data}`,14,32)

y = 40

// DADOS CLIENTE

doc.setFontSize(12)
doc.text("Identificação do Proponente",14,y)

y += 6

autoTable(doc,{
startY:y,
theme:"grid",
styles:{fontSize:9},
head:[["Nome","CPF","Telefone"]],
body:[
[
dados.clienteNome,
dados.clienteCpf,
dados.clienteTelefone
]
]
})

y = (doc as any).lastAutoTable.finalY + 10

// CORRETOR

doc.text("Intermediação",14,y)

y += 4

autoTable(doc,{
startY:y,
theme:"grid",
styles:{fontSize:9},
head:[["Corretor","CRECI","Imobiliária"]],
body:[
[
dados.corretor,
dados.creci,
dados.imobiliaria
]
]
})

y = (doc as any).lastAutoTable.finalY + 10

// UNIDADE

doc.text("Unidade",14,y)

y += 4

autoTable(doc,{
startY:y,
theme:"grid",
styles:{fontSize:9},
head:[["Quadra","Lote","Valor"]],
body:[
[
dados.quadra,
dados.lote,
`R$ ${dados.valor}`
]
]
})

y = (doc as any).lastAutoTable.finalY + 10

// PAGAMENTO

doc.text("Estrutura de Pagamento",14,y)

y += 4

autoTable(doc,{
startY:y,
theme:"grid",
styles:{fontSize:9},
head:[["Tipo","Quantidade","Valor"]],
body:[
["Entrada",dados.entradaQtd,`R$ ${dados.entradaValor}`],
["Parcelas",dados.parcelaQtd,`R$ ${dados.parcelaValor}`],
["Balões",dados.balaoQtd,`R$ ${dados.balaoValor}`],
]
})

y = (doc as any).lastAutoTable.finalY + 10

// OBSERVAÇÕES

doc.setFontSize(12)
doc.text("Observações da Negociação",14,y)

doc.setFontSize(9)
doc.text(dados.detalhesNegociacao,14,y+6,{
maxWidth:180
})

// FOOTER

doc.setFontSize(8)
doc.text(
"Parcelas corrigidas por INCC até a entrega e IPCA após a entrega.",
14,
285
)

doc.save("proposta-vivendas.pdf")

}