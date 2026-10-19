// Exportação em PDF da tabela de leads — carregado sob demanda pela tela 3
// (import dinâmico), para o jsPDF não entrar no bundle do chat.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatarCelular, formatarData, type LeadNumerado } from './lead-formato';

// O PDF não lê CSS: a cor da marca entra em RGB. É o azul #004CAB do logo
// Belago, o mesmo que o globals.css usa como marca do canal.
const AZUL_MARCA: [number, number, number] = [0, 76, 171];

/** Monta o PDF com as linhas NA ORDEM em que estão na tela. */
export function gerarLeadsPdf(leads: LeadNumerado[], agora: Date = new Date()): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const giraram = leads.filter((l) => l.codigoUsadoEm).length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Leads · 17º e-CIO · Belago | Luxor', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `Gerado em ${formatarData(agora.toISOString())} · ${leads.length} leads · ${giraram} já giraram · ${leads.length - giraram} aguardando giro`,
    14, 22,
  );

  autoTable(doc, {
    startY: 27,
    head: [['Nº', 'Nome', 'E-mail', 'Celular', 'Empresa', 'Cargo', 'Código', 'Giro', 'Consentimento LGPD', 'Cadastro', 'Origem']],
    body: leads.map((l) => [
      String(l.numero),
      l.nome,
      l.email,
      formatarCelular(l.celular),
      l.empresa,
      l.cargo,
      l.codigo,
      l.codigoUsadoEm ? `Girou · ${formatarData(l.codigoUsadoEm)}` : 'Aguardando',
      formatarData(l.consentimentoEm),
      formatarData(l.criadoEm),
      l.origem,
    ]),
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: AZUL_MARCA, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    // Nº, celular, código, datas e origem numa linha só; nome, e-mail, empresa e
    // cargo absorvem o resto e quebram se precisar.
    columnStyles: {
      0: { cellWidth: 'wrap' }, 3: { cellWidth: 'wrap' }, 6: { font: 'courier', cellWidth: 'wrap' },
      8: { cellWidth: 'wrap' }, 9: { cellWidth: 'wrap' }, 10: { cellWidth: 'wrap' },
    },
    margin: { left: 14, right: 14 },
  });

  // Rodapé depois da tabela: só aí o total de páginas é conhecido.
  const paginas = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(120);
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.text(
      `Página ${p} de ${paginas}`,
      doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  return doc;
}

/** Gera e baixa: leads-17-e-cio-AAAA-MM-DD.pdf. */
export function exportarLeadsPdf(leads: LeadNumerado[]) {
  const agora = new Date();
  gerarLeadsPdf(leads, agora).save(`leads-17-e-cio-${agora.toISOString().slice(0, 10)}.pdf`);
}
