import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

export const generateRentalContract = async (rental) => {
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: "LOCADORA: ", bold: true }),
                new TextRun("L.A LOCAÇÃO DE VEÍCULOS"),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "LOCATÁRIO: ", bold: true }),
                new TextRun(rental.user || "---"),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "VEÍCULO: ", bold: true }),
                new TextRun(`${rental.vehicle} - PLACA: ${rental.plate}`),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "CLÁUSULA PRIMEIRA - DO OBJETO",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: `O presente contrato tem como objeto a locação do veículo acima descrito, pelo período de ${rental.durationWeeks || rental.period || '---'} semanas, com início em ${rental.startDate || rental.date || '---'}.`,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "CLÁUSULA SEGUNDA - DOS VALORES",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: `O valor do aluguel semanal é de R$ ${rental.value || '0,00'}, acrescido da taxa de pneus de R$ ${rental.tireTax || '25,00'}.`,
            }),
            new Paragraph({
              text: `A caução total acordada é de R$ ${rental.depositTotal || '0,00'}, com valor pago no ato de R$ ${rental.depositPaid || '0,00'}.`,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES",
              alignment: AlignmentType.JUSTIFIED,
            }),
            new Paragraph({
              text: "O locatário compromete-se a zelar pelo veículo, respeitar as leis de trânsito e efetuar os pagamentos nas datas aprazadas conforme cronograma estabelecido.",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "________________________________________________",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "ASSINATURA DO LOCATÁRIO",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `DATA: ${new Date().toLocaleDateString('pt-BR')}`,
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    
    // Método nativo para download (sem file-saver)
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_L.A_Locacao_${(rental.user || 'Cliente').replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error("Erro ao gerar contrato:", error);
    alert("Ocorreu um erro ao gerar o contrato. Verifique os dados da locação.");
  }
};
