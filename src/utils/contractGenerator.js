import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun } from 'docx';

const numeroParaExtenso = (num) => {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas_10_19 = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num === 0) return 'zero';
  if (num === 100) return 'cem';

  const extrair_centenas = (n) => {
    if (n === 100) return 'cem';
    let partes = [];
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) partes.push(centenas[c]);
    if (d === 1) {
      partes.push(dezenas_10_19[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(' e ');
  };

  const partesGerais = [];
  const milhoes = Math.floor(num / 1000000);
  const milhares = Math.floor((num % 1000000) / 1000);
  const resto = Math.floor(num % 1000);

  if (milhoes > 0) {
    partesGerais.push(milhoes === 1 ? 'um milhão' : `${extrair_centenas(milhoes)} milhões`);
  }
  if (milhares > 0) {
    partesGerais.push(milhares === 1 ? 'mil' : `${extrair_centenas(milhares)} mil`);
  }
  if (resto > 0) {
    partesGerais.push(extrair_centenas(resto));
  }

  return partesGerais.join(' e ');
};

const formatarValorBRL = (valorStr) => {
  if (!valorStr) return { formatado: 'R$ 0,00', extenso: 'zero reais' };
  const valor = parseFloat(String(valorStr).replace(/\./g, '').replace(',', '.')) || 0;
  const formatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const inteira = Math.floor(valor);
  const centavos = Math.round((valor - inteira) * 100);

  let extenso = '';
  if (inteira > 0) {
    extenso += numeroParaExtenso(inteira) + (inteira === 1 ? ' real' : ' reais');
  }
  if (centavos > 0) {
    if (inteira > 0) extenso += ' e ';
    extenso += numeroParaExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }
  if (inteira === 0 && centavos === 0) {
    extenso = 'zero reais';
  }
  return { formatado, extenso };
};

const getDayOfWeekName = (dateStr) => {
  if (!dateStr) return 'terça-feira';
  try {
    const date = new Date(dateStr + 'T12:00:00');
    const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return days[date.getDay()];
  } catch (e) {
    return 'terça-feira';
  }
};

export const generateRentalContract = async (rental) => {
  try {
    const clientName = rental.user || "---";
    const clientNacionalidade = rental.nacionalidade || "brasileiro(a)";
    const clientEstadoCivil = rental.estadoCivil || "solteiro(a)";
    const clientRg = rental.rg || "---";
    const clientCpf = rental.cpf || "---";
    const clientAddress = rental.address || "---";
    const clientCep = rental.cep || "---";
    const clientCidadeUf = rental.cidadeUf || "Aracaju/SE";

    const vehicleModel = rental.vehicle || "---";
    const vehicleYear = rental.vehicleYear || "---";
    const vehicleRenavam = rental.vehicleRenavam || "---";
    const vehiclePlate = rental.plate || "---";

    const baseVal = parseFloat(String(rental.value || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const duration = parseInt(rental.durationWeeks || 0) || 1;
    const totalContractVal = baseVal * duration;

    const totalContractBrl = formatarValorBRL(totalContractVal);
    const weeklyBrl = formatarValorBRL(baseVal);
    
    const depositTotalVal = parseFloat(String(rental.depositTotal || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const depositPaidVal = parseFloat(String(rental.depositPaid || 0).replace(/\./g, '').replace(',', '.')) || 0;
    const depositBalance = depositTotalVal - depositPaidVal;
    const depositInstallments = parseInt(rental.depositInstallments || 1) || 1;
    const depositInstallmentVal = depositBalance > 0 ? depositBalance / depositInstallments : 0;

    const depositTotalBrl = formatarValorBRL(depositTotalVal);
    const depositPaidBrl = formatarValorBRL(depositPaidVal);
    const depositBalanceBrl = formatarValorBRL(depositBalance);
    const depositInstallmentBrl = formatarValorBRL(depositInstallmentVal);

    const tireTaxVal = parseFloat(String(rental.tireTax || 0).replace(/\./g, '').replace(',', '.')) || 25;
    const tireTaxBrl = formatarValorBRL(tireTaxVal);

    const lateFineVal = rental.lateFine || "10";
    const dailyInterestVal = rental.dailyInterest || "1";

    let formaPagamentoCaucao = "";
    if (depositPaidVal === depositTotalVal) {
      formaPagamentoCaucao = `${depositPaidBrl.formatado} (${depositPaidBrl.extenso}) pago à vista no ato da assinatura.`;
    } else {
      formaPagamentoCaucao = `${depositPaidBrl.formatado} (${depositPaidBrl.extenso}) à vista no ato da assinatura e o saldo de ${depositBalanceBrl.formatado} (${depositBalanceBrl.extenso}) parcelado em ${depositInstallments} parcelas semanais de ${depositInstallmentBrl.formatado} (${depositInstallmentBrl.extenso}), a serem pagas juntamente com a parcela semanal da locação.`;
    }

    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const today = new Date();
    const dateStr = `Aracaju/SE, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

    let logoImageRun = null;
    try {
      const response = await fetch('/logo-contrato.png');
      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        logoImageRun = new ImageRun({
          data: imageBuffer,
          transformation: {
            width: 200,
            height: 50.25,
          },
          type: 'png',
        });
      }
    } catch (e) {
      console.warn("Could not fetch logo image:", e);
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            ...(logoImageRun ? [
              new Paragraph({
                children: [logoImageRun],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              })
            ] : []),
            new Paragraph({
              children: [
                new TextRun({ text: "CONTRATO DE LOCAÇÃO DE VEÍCULO", bold: true, size: 28 }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "LOCADORA: ", bold: true }),
                new TextRun("L.A ADMINISTRAÇÃO E LOCAÇÃO DE VEÍCULOS, pessoa jurídica de direito privado, inscrita no CNPJ nº 57.626.158/0001-99, representada neste ato por ELAN SANTOS ARIMATEIA, inscrito no CPF nº 017.512.505-80, com endereço na Rua Joaquim Soares Bezerra, nº 84, bairro Farolândia, CEP: 49032-460, na cidade de Aracaju/SE, endereço eletrônico: la.locacaodeveiculos@gmail.com")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "LOCATÁRIO(A): ", bold: true }),
                new TextRun(`${clientName}, ${clientNacionalidade}, motorista de aplicativo, maior e capaz, portador(a) do RG sob o nº ${clientRg}, inscrito(a) no CPF nº ${clientCpf}, residente e domiciliado(a) na ${clientAddress}, CEP: ${clientCep}, na cidade de ${clientCidadeUf}.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun("As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Locação de Veículo que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),
            
            // CLÁUSULA PRIMEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA PRIMEIRA – DO OBJETO E USO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`1.1 Por meio deste contrato que firmam entre si a LOCADORA e o LOCATÁRIO, regula-se a locação temporária, do veículo, `),
                new TextRun({ text: `${vehicleModel}, ANO/MODELO ${vehicleYear}, RENAVAM ${vehicleRenavam}, COM PLACA ${vehiclePlate}.`, bold: true })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`1.2 O bem locado somente será destinado a uso exclusivo no Estado de Sergipe, não havendo restrições de quilometragem. A locação é considerada como "quilometragem livre". O LOCATÁRIO deverá utilizar o veículo alugado sempre de acordo com os regulamentos estabelecidos pelo Conselho Nacional de Trânsito (CONTRAN) e pelo Departamento Estadual de Trânsito (DETRAN).`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`1.3 O descumprimento de uma ou mais cláusulas do presente contrato, por parte do LOCATÁRIO, enseja à LOCADORA a rescindir o presente contrato independente de qualquer notificação e sem maiores formalidades, podendo também proceder com o bloqueio e recolhimento do veículo sem direito a qualquer pretensão para ação indenizatória, reparatória ou compensatória.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`1.4 Qualquer modificação no veículo só poderá ser feita com a autorização expressa da LOCADORA.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`1.5 O LOCATÁRIO não poderá pedir a substituição do veículo objeto deste contrato em nenhuma hipótese, salvo em casos de defeitos ou falhas mecânicas do veículo que não sejam causados pelo LOCATÁRIO, onde a substituição poderá ser realizada a critério exclusivo da locadora.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SEGUNDA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SEGUNDA – DAS DECLARAÇÕES", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.1 O LOCATÁRIO declara que recebeu o veículo em perfeitas condições de asseio, funcionamento, uso e segurança, obrigando-se a devolvê-lo no mesmo estado e condições em que o recebeu.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.1.1 O presente contrato é acompanhado de um laudo de vistoria, que descreve o veículo e o seu estado de conservação no momento em que o mesmo foi entregue ao LOCATÁRIO.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.2 O LOCATÁRIO declara que não está pessoalmente proibido ou impedido, ainda que temporariamente, de conduzir o veículo indicado acima, sendo verdade que o mesmo está plena e devidamente habilitado nos termos do Regulamento do DETRAN.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.3 Declara o LOCATÁRIO que conhece as normas e regras aplicáveis a modalidade de transporte remunerado de passageiros, responsabilizando-se por respeitar e fazer respeitar as mesmas e a zelar pelo bom e correto uso do veículo, devendo manter atualizada sua documentação pessoal e de habilitação.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.4 O LOCATÁRIO declara-se como único e principal responsável pelo que decorrer do mau uso ou uso indevido do veículo pelo tempo em que o mesmo estiver sob sua responsabilidade.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`2.5 O veículo estará sob a responsabilidade do LOCATÁRIO a partir da data de assinatura deste contrato, momento em que passa a ter a posse do VEÍCULO, e até a sua válida devolução, independentemente do prazo de validade deste contrato.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA TERCEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA TERCEIRA – DAS CONDIÇÕES", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`3.1 O VEÍCULO não poderá ser objeto de uso inadequado, assim considerado:`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            ...[
              "a) Transporte de pessoas e/ou bens além da capacidade informada pelo fabricante do veículo;",
              "b) Guincho e/ou reboque de outro veículo;",
              "c) Participação em corridas, testes, competições, \"rally\", reconhecimento de trecho para \"rally\" e outras modalidades de competições, gincanas, \"rachas\" ou \"pegas\";",
              "d) Instrução de pessoas não habilitadas e/ou treinamento de motoristas para qualquer situação;",
              "e) Transporte de explosivos, combustíveis e/ou materiais químicos ou inflamáveis;",
              "f) Tráfego em dunas e praias;",
              "g) Transporte de criança menor de 7 (sete) anos e meio de idade sem a utilização dos dispositivos de retenção apropriados;",
              "h) Quaisquer finalidades que violem a legislação vigente;",
              "i) Quaisquer situações inadequadas, ou de risco que coloquem o veículo em desconformidade à cobertura da Proteção/Seguro vigente;",
              "j) O uso de motoristas terceirizados ou quaisquer outros, que não seja a LOCADORA, indiferente de sua finalidade."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 }
            })),
            new Paragraph({
              children: [
                new TextRun(`3.2 O LOCATÁRIO declara que vai seguir os procedimentos para cada ocasião abaixo especificada:`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 120, after: 120 },
            }),
            ...[
              "a) PT, ROUBO, FURTO OU COLISÕES: Imediata comunicação a LOCADORA e realização de Boletim de Ocorrência logo após o ocorrido, com o envio via WhatsApp, em PDF, após a emissão.",
              "b) PROBLEMA NO VEÍCULO: Imediata comunicação a LOCADORA, com a realização de fotos e vídeos informando o problem detalhadamente, e enviar via WhatsApp logo após o ocorrido. Quando acontecer aos finais de semana, seguir o procedimento acima, levar o carro para um local seguro e no primeiro dia útil seguinte, acionar o guincho da Proteção/Seguro para levar o carro até a Oficina Mecânica ou Auto elétrica informada pela LOCADORA.",
              "b.1) Caso o LOCATÁRIO escute ou note qualquer barulho anormal, temperatura alta, fumaça ou qualquer anomalia vinda do motor, câmbio, embreagem, capô ou de qualquer parte do veículo, deverá PARAR IMEDIATAMENTE O VEÍCULO, em seguida tirar fotos e/ou fazer vídeos, para em seguida enviar à LOCADORA. O LOCATÁRIO NÃO DEVERÁ LIGAR O VEÍCULO até a autorização da LOCADORA.",
              "b.2) Caso seja constatado que o problem foi agravado pelo uso do LOCATÁRIO, todos os custos serão cobrados do mesmo."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 }
            })),

            // CLÁUSULA QUARTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA QUARTA – DO VALOR DA LOCAÇÃO E VENCIMENTOS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`4.1 O valor total do presente contrato é de `),
                new TextRun({ text: `${totalContractBrl.formatado} (${totalContractBrl.extenso})`, bold: true }),
                new TextRun(`, correspondente ao período de `),
                new TextRun({ text: `${duration} (${numeroParaExtenso(duration)}) semanas`, bold: true }),
                new TextRun(`. O LOCATÁRIO pagará à LOCADORA, a título de locação, o valor semanal de `),
                new TextRun({ text: `${weeklyBrl.formatado} (${weeklyBrl.extenso}).`, bold: true })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`4.1.1 O LOCATÁRIO deverá efetuar o pagamento do valor acordado via boleto, PIX ou transferência bancária, em nome do LOCADOR ou terceiro autorizado por este.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`4.2 Os pagamentos semanais deverão ser efetuados no mesmo dia da semana em que o LOCATÁRIO retirou o veículo (ex: se retirou na ${getDayOfWeekName(rental.startDate)}, os vencimentos serão todas as ${getDayOfWeekName(rental.startDate)}s).`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`4.3 O LOCATÁRIO só terá abatimento de diárias do veículo nos casos em que o veículo estiver parado para manutenção preventiva ou corretiva decorrente de desgaste natural do bem. O desconto se dará EXCLUSIVAMENTE a cada ciclo completo de 24 (vinte e quatro) horas, não havendo, em hipótese alguma, desconto proporcional por horas fracionadas. (Exemplo: se o veículo ficar parado por 36 horas, será descontada apenas 1 diária; se ficar 50 horas, serão descontadas 2 diárias). Não haverá qualquer abatimento ou desconto caso a manutenção seja motivada por sinistro, colisão, negligência ou mau uso por parte do LOCATÁRIO.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA QUINTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA QUINTA – DA CAUÇÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`5.1 Em garantia do cumprimento de suas obrigações contratuais, o LOCATÁRIO pagará à LOCADORA, uma caução no valor de `),
                new TextRun({ text: `${depositTotalBrl.formatado} (${depositTotalBrl.extenso}).`, bold: true })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `5.1.1 A caução deverá ser paga da seguinte forma: `, bold: true }),
                new TextRun(formaPagamentoCaucao)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`5.1.2 Nos casos de inadimplência da caução (seja do valor à vista ou das parcelas subsequentes), o veículo será retido imediatamente com todas as eventuais multas e encargos por conta do LOCATÁRIO.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`5.2 O saldo da caução será devolvido ao LOCATÁRIO no prazo de até 30 (trinta) dias após a vistoria de devolução válida do veículo, período necessário para a checagem de infrações de trânsito nos sistemas dos órgãos competentes e avarias ocultas, deduzidos eventuais débitos pendentes.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SEXTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SEXTA – DA INADIMPLÊNCIA E NEGATIVAÇÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`6.1 O atraso no pagamento da locação enseja multa moratória de `),
                new TextRun({ text: `${lateFineVal}%`, bold: true }),
                new TextRun(` e juros de `),
                new TextRun({ text: `${dailyInterestVal}%`, bold: true }),
                new TextRun(` ao mês, além da correção pelo IGP-M até o dia do efetivo pagamento.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`6.2 O LOCATÁRIO, não vindo a efetuar o pagamento da locação no seu vencimento semanal ou quaisquer outros encargos (parcela da caução, multas, reparos por mau uso, etc.) de sua responsabilidade, fica facultado à parte contrária o imediato bloqueio do veículo e/ou rescisão do contrato, além da posse do veículo configurada como Apropriação Indébita, implicando também a possibilidade de adoção de medidas judiciais, inclusive Busca e Apreensão do veículo e/ou lavratura de Boletim de Ocorrência. Caberá ao LOCATÁRIO ressarcir o LOCADOR das despesas oriundas da retenção indevida do bem, arcando ainda com as despesas judiciais e/ou extrajudiciais.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`6.3 Se necessária a contratação de advogado, ficam desde já fixados os honorários advocatícios em 20% (vinte por cento).`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`6.4 Qualquer recebimento feito pela LOCADORA fora dos prazos e condições convencionais neste contrato será tido como mera tolerância e liberalidade.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`6.5 Em caso de inadimplência superior a 15 (quinze) dias, a LOCADORA fica expressamente autorizada a incluir o nome do LOCATÁRIO nos órgãos de proteção ao crédito (SPC, SERASA, SCPC, entre outros), bem como a realizar o protesto do título, arcando o LOCATÁRIO com as despesas de inclusão e posterior exclusão.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SÉTIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SÉTIMA – DO PRAZO E RESCISÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.1 O prazo da locação é de `),
                new TextRun({ text: `${duration} (${numeroParaExtenso(duration)}) semanas`, bold: true }),
                new TextRun(`, iniciando-se na data de assinatura deste contrato e efetiva posse do veículo ao LOCATÁRIO.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.2 Ao final do prazo estipulado, caso as partes permaneçam inertes, a locação prorrogar-se-á automaticamente por igual período.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.3 O locatário deve formalizar sua intenção de encerrar o contrato com aviso prévio de 7 (sete) dias.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.4 Em caso de rescisão, caso o LOCATÁRIO opte por entregar o veículo antes do prazo contratado ou, ainda, seja forçado a entregar o veículo por motivos de inadimplência, falta de comparecimento às vistorias ou má conduta, o mesmo deverá pagar a título de multa o valor referente a uma semana de aluguel, bem como perderá a caução prestada.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.5 Caso o LOCATÁRIO não entregue o veículo na data combinada, seja pela rescisão antecipada ou pelo término de vigência do contrato, incidirá multa de R$ 100,00 (cem reais) por dia de atraso.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`7.5.1 A não devolução do veículo após a rescisão/término do contrato permitirá à LOCADORA valer-se de todos os recursos legais para reavê-lo, inclusive com a formulação de Boletim de Ocorrência à autoridade policial competente, por apropriação indébita.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA OITAVA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA OITAVA – DAS OBRIGAÇÕES E RESPONSABILIDADES DO LOCATÁRIO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.1 Sem prejuízo de outras disposições deste contrato, constituem obrigações do LOCATÁRIO:`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            ...[
              "a) Responsabilizar-se pela condução do veículo com cautela, evitando colisões e preservando a integridade física de passageiros e pedestres.",
              "b) Pagar o aluguel e os encargos da locação, legal ou contratualmente exigíveis, no prazo estipulado.",
              "c) Não permitir que qualquer outra pessoa conduza o veículo.",
              "d) Preservar e fazer preservar, com seus maiores esforços, a integridade material do veículo, assim como os equipamentos e os acessórios que o integram, usando-o com zelo e cuidado.",
              "e) Não efetuar qualquer reparo ou autorizar qualquer serviço no veículo alugado sem a expressa e prévia anuência da LOCADORA. A LOCADORA não reembolsará ao LOCATÁRIO eventuais despesas por reparos ou serviços no carro sem sua prévia e formal autorização.",
              "f) Arcar com a manutenção, caso seja caracterizada por mau uso.",
              "g) Ser o único e exclusivo responsável por eventual auto de infração de trânsito ocorrido durante o período de locação do Veículo, comprometendo-se, desde já, a assumir a pontuação na CNH e demais penalidades administrativas.",
              "g.1) As infrações de trânsito poderão ser parceladas da seguinte forma no boleto seguinte a ciência da infração pela locadora: Multas de até R$ 130,16 serão cobradas em 1x (uma vez); Multas de R$ 195,23 até R$ 293,47 poderão ser parceladas em até 2x (duas vezes). Caso opte em quitar a multa com desconto, o LOCATÁRIO deverá pagar o boleto até o vencimento do aluguel da semana em que constará a parcela da infração.",
              "g.2) Fica estipulado que, caso o somatório de multas pendentes de pagamento do LOCATÁRIO ultrapasse o teto de R$ 586,94 (quinhentos e oitenta e seis reais e noventa e quatro centavos), a LOCADORA poderá rescindir o contrato imediatamente. Para evitar a rescisão, o LOCATÁRIO deverá quitar integralmente uma ou mais multas de forma a reduzir o saldo devedor para valor inferior ao teto estabelecido.",
              "h) Arcar com os custos de combustível.",
              "i) Comunicar imediatamente a LOCADORA sobre qualquer alteração no funcionamento do veículo ou mecanismos que afetem a segurança do veículo, ficando responsável em caso de negligência a arcar com as despesas decorrentes do agravamento e consequências dessas situações. CASO O VEÍCULO APRESENTE QUALQUER BARULHO ESTRANHO, DEVE SER IMEDIATAMENTE DESLIGADO COM PRONTO AVISO À LOCADORA.",
              "j) Arcar com os custos das trocas de óleo do motor, filtros e demais fluidos do veículo (como fluido de freio, líquido de arrefecimento, água do limpador de para-brisa, etc.). A troca de óleo deverá ser realizada a cada 8.000 km (oito mil quilômetros) rodados, devendo o LOCATÁRIO realizar o serviço SOMENTE em local previamente indicado pela LOCADORA, sendo registrado com nota fiscal e/ou recibo para garantir a transparência.",
              "k) Arcar com os custos de acessórios do veículo, como buzina, limpadores, lâmpadas, problemas nos vidros, alarme, travas, etc.",
              `l) O LOCATÁRIO pagará à LOCADORA o valor de ${tireTaxBrl.formatado} (${tireTaxBrl.extenso}) semanais a título de taxa de pneus, alinhamento, balanceamento e cambagem.`,
              "m) Junto com o comprovante de pagamento, o LOCATÁRIO deverá informar por WhatsApp, através de uma foto nítida, a quilometragem do hodômetro.",
              "n) Agendar as manutenções periódicas com antecedência de pelo menos uma semana em data acordada entre as partes.",
              "o) Levar o veículo para vistoria periódica uma vez por semana.",
              "p) Preservar e não retirar o adesivo colado no porta malas do veículo. SE OCORRER A RETIRADA DO ADESIVO O LOCATÁRIO SERÁ MULTADO EM R$ 50,00 (CINQUENTA REAIS)."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 }
            })),
            new Paragraph({
              children: [
                new TextRun(`8.2 O LOCATÁRIO reconhece e assume, com a locação e o efetivo recebimento do veículo, a posse legítima e autônoma do veículo, para todos os fins de direito, inexistindo solidariedade legal ou contratual da LOCADORA pelas responsabilidades indenizatórias decorrentes do uso e/ou circulação do veículo e de acidentes e/ou delitos de trânsito, em consonância com o artigo 265 do Código Civil Brasileiro.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 120, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.3 O LOCATÁRIO se responsabiliza pelos ônus de todos os eventos que decorram do uso do veículo alugado por terceiros.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.4 Nos casos de acidentes, colisão ou danos em que o LOCATÁRIO seja o causador (culpado), este arcará com 100% do valor do conserto ou da franquia do seguro, além de outros prejuízos ocasionados. Na hipótese de o LOCATÁRIO ser a parte inocente no acidente, este cooperará com a LOCADORA para a cobrança do terceiro causador, ficando responsável pelo pagamento dos prejuízos caso o terceiro não seja identificado ou se recuse a pagar.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.4.1 O pagamento referente a colisões/sinistros de responsabilidade do LOCATÁRIO poderá ser parcelado em até 6x (seis vezes), respeitando-se o valor mínimo de R$ 100,00 (cem reais) por parcela. Caso o valor total do conserto/franquia ultrapasse R$ 1.200,00 (um mil e duzentos reais), o LOCATÁRIO deverá pagar o valor excedente à vista, podendo parcelar apenas o limite de R$ 1.200,00 nas condições supracitadas.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.5 O LOCATÁRIO fica responsável por qualquer dano que a Proteção/Seguro não cubra.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`8.6 Devolução do veículo alugado:`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            ...[
              "a. Na hipótese de acidente ou incêndio envolvendo o veículo alugado: Somente se reconhecerá a devolução do mesmo e o encerramento da locação quando se estiver com a efetiva posse del bem.",
              "b. Ocorrendo furto ou roubo do veículo alugado: Somente reconhecerá o encerramento da locação na data e hora do Boletim de Ocorrência, independentemente da data e hora da ocorrência do fato. Nessa hipótese, o valor do aluguel contratado até a data e hora do registro da ocorrência será cobrado sem prejuízo da responsabilidade do LOCATÁRIO pelos danos a que der causa.",
              "c. O atraso na devolução do veículo configurar-se-á, automaticamente, em apropriação indébita, passível de multa e medidas judiciais.",
              "d. Caracterizada a apropriação indébita, o LOCATÁRIO ficará sujeito às sanções penais e civis que dela decorrerem, arcando ainda com todas as despesas judiciais e/ou extrajudiciais que a LOCADORA realizar na busca, apreensão e efetiva reintegração da posse do veículo alugado."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 }
            })),
            
            new Paragraph({
              children: [new TextRun({ text: "8.7 TABELA DE AVARIAS E ITENS FALTANTES", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("No momento da devolução do veículo, seja pelo término do contrato ou rescisão antecipada, caso o veículo não seja entregue nas mesmas condições em que foi retirado (conforme laudo de vistoria inicial), serão descontados da caução ou cobrados à parte os seguintes valores pré-definidos:")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            ...[
              "- Lavagem simples: R$ 60,00",
              "- Higienização completa (bancos manchados, odor forte, etc.): R$ 350,00",
              "- Troca de óleo + filtros (se pendente ou fora do prazo): R$ 350,00",
              "- Luzes/Lâmpadas (queimadas ou quebradas): R$ 50,00 (cada)",
              "- Buzina (queimada ou danificada): R$ 150,00",
              "- Macaco (faltante ou danificado): R$ 100,00",
              "- Chave de roda (faltante ou danificada): R$ 80,00",
              "- Triângulo de sinalização (faltante ou danificado): R$ 60,00",
              "- Calota (riscada, quebrada ou faltante): R$ 50,00 (cada)",
              "- Estepe (faltante ou danificado): R$ 400,00",
              "- Retrovisor (vidro quebrado): R$ 80,00",
              "- Retrovisor (conjunto completo quebrado): R$ 350,00",
              "- Farol/Lanterna (quebrado ou trincado): R$ 500,00 (cada)",
              "- Para-choque (riscado/necessita pintura): R$ 350,00",
              "- Para-choque (quebrado/necessita troca): R$ 800,00",
              "- Chave do veículo (perda ou dano): R$ 450,00"
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              spacing: { after: 60 }
            })),
            new Paragraph({
              children: [
                new TextRun({ text: "* Valores sujeitos a alteração de acordo com o preço de mercado das peças originais/compatíveis à época da devolução.", italic: true })
              ],
              spacing: { after: 180 },
            }),

            // CLÁUSULA NONA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA NONA – DAS OBRIGAÇÕES E RESPONSABILIDADES DA LOCADORA", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`9.1 Sem prejuízo de outras disposições deste contrato, constituem obrigações da LOCADORA:`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            ...[
              "a) Contratar Proteção/Seguro automotivo contemplando atividades comerciais como uso de aplicativos do tipo UBER, 99, INDRIVER, IFOOD, etc.",
              "b) Entregar ao LOCATÁRIO o veículo alugado em estado de servir ao uso a que se destina.",
              "c) Arcar com os custos das manutenções preventivas e corretivas, além de peças oriundas do desgaste natural de sua utilização, desde que não seja caracterizada por mau uso.",
              "d) Os impostos e encargos incidentes sobre o veículo, IPVA, seguro DPVAT e Licenciamento anual."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              indent: { left: 720 },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 }
            })),
            new Paragraph({
              children: [
                new TextRun(`9.2 Fica expressamente acordado que a LOCADORA NÃO fornece veículo reserva (carro reserva) ao LOCATÁRIO em nenhuma hipótese (manutenção, sinistro, furto, roubo, etc.). Qualquer fornecimento de veículo substituto ou reserva por parte da LOCADORA constituirá mera liberalidade, não gerando qualquer direito adquirido ou obrigação futura.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 120, after: 180 },
            }),

            // CLÁUSULA DÉCIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA – DA VEDAÇÃO À SUBLOCAÇÃO E EMPRÉSTIMO DO VEÍCULO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`10.1 Será permitido o uso do veículo objeto do presente contrato apenas ao LOCATÁRIO, sendo vedada, no todo ou em parte, a sublocação, transferência, empréstimo, comodato ou cessão da locação, seja a qualquer título, sem expressa anuência das partes, sob pena de imediata rescisão e de demais penalidades contratuais e legais cabíveis.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`10.2 A condução do veículo por qualquer pessoa não identificada neste contrato caracteriza infração contratual gravíssima, ensejando a rescisão imediata de pleno direito, bloqueio do veículo e perda integral da caução, respondendo o LOCATÁRIO civil e criminalmente por qualquer dano material ou pessoal causado por terceiros.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA PRIMEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA PRIMEIRA – ISENÇÃO DE RESPONSABILIDADE", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`11.1 A LOCADORA não é responsável civil, direta ou indiretamente, com expressa anuência do LOCATÁRIO, por quaisquer danos materiais e/ou pessoais causados e/ou sofridos pelo LOCATÁRIO e/ou terceiros ao LOCATÁRIO, exceto em casos de dolo ou culpa grave da locadora.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA SEGUNDA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA SEGUNDA – DAS CONDIÇÕES GERAIS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            ...[
              "12.1 Fica pactuado entre as partes a total inexistência de vínculo trabalhista, excluindo as obrigações previdenciárias e os encargos sociais, não havendo qualquer tipo de relação de subordinação.",
              "12.2 Toda e qualquer solicitação não prevista neste contrato será objeto de Termo Aditivo, o qual deverá ser assinado pelas partes para que tenha validade.",
              "12.3 O presente contrato não é em caráter exclusivo, portanto as partes poderão celebrar contratos similares com terceiros a qualquer tempo.",
              "12.4 Todas as comunicações e notificações entre as partes relativas a este contrato deverão ser realizadas por escrito, via e-mail ou aplicativo de mensagens instantâneas, onde as partes terão o prazo para resposta da comunicação de 48 horas.",
              "12.5 Se qualquer cláusula ou condição deste contrato vier a ser considerada ilegal, inválida ou inexequível nos termos da legislação brasileira, as demais cláusulas e condições continuarão em pleno vigor e eficácia.",
              "12.6 A eventual tolerância de qualquer das cláusulas deste instrumento particular representará mera liberalidade, não representando qualquer novação ou renovação de contrato."
            ].map(item => new Paragraph({
              children: [new TextRun(item)],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 }
            })),

            // CLÁUSULA DÉCIMA TERCEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA TERCEIRA – DA LEI GERAL DE PROTEÇÃO DE DADOS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`13.1 A LOCADORA, por si e por seus colaboradores, obriga-se a atuar no presente Contrato em conformidade com a Legislação vigente sobre Proteção de Dados Pessoais e as determinações de órgãos reguladores/fiscalizadores sobre a matéria, em especial a Lei 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD).`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA QUARTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA QUARTA – DA AUTORIZAÇÃO DE USO DE IMAGEM", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`14.1 O LOCATÁRIO autoriza, desde já, de forma irrevogável e irretratável, a utilização de sua imagem, bem como a de qualquer pessoa que venha a aparecer em registros fotográficos ou audiovisuais realizados pela empresa L.A Administração e Locação de Veículos, durante o uso do veículo locado. Esta autorização abrange o uso das imagens e vídeos para postagens em redes sociais, campanhas de marketing ou materiais institucionais da empresa, sem que isso implique em qualquer ônus para a LOCADORA. A presente autorização poderá ser revogada a qualquer tempo mediante comunicação escrita.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA QUINTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA QUINTA – DO FORO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun(`15.1 Fica eleito o Foro da comarca de Aracaju/Sergipe, como único competente para dirimir qualquer dúvida ou eventual controvérsia oriundas do presente contrato.`)
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),

            // DATA E LOCAL
            new Paragraph({
              children: [
                new TextRun({ text: dateStr, bold: true })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 240, after: 480 },
            }),

            // ASSINATURAS
            new Paragraph({
              children: [
                new TextRun("__________________________________                  __________________________________\n"),
                new TextRun({ text: "            LOCADORA                                                             LOCATÁRIO", bold: true })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 360 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_L.A_Locacao_${(clientName).replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error("Erro ao gerar contrato:", error);
    alert("Ocorreu um erro ao gerar o contrato. Verifique os dados da locação.");
  }
};

export const generateManagementContract = async (vehicle, investor) => {
  try {
    const investorName = investor?.name || "---";
    const investorCpf = investor?.cpf || "---";
    const investorAddress = investor?.address || "---";
    const investorBank = investor?.bank || "---";
    const investorPix = investor?.pix || "---";

    const vehicleModel = vehicle.model || "---";
    const vehicleYear = vehicle.year || "---";
    const vehicleRenavam = vehicle.renavam || "---";
    const vehiclePlate = vehicle.plate || "---";
    const adminTax = vehicle.adminTax || "20";

    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const today = new Date();
    const dateStr = `Aracaju/SE, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}.`;

    let logoImageRun = null;
    try {
      const response = await fetch('/logo-contrato.png');
      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        logoImageRun = new ImageRun({
          data: imageBuffer,
          transformation: {
            width: 200,
            height: 50.25,
          },
          type: 'png',
        });
      }
    } catch (e) {
      console.warn("Could not fetch logo image:", e);
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            ...(logoImageRun ? [
              new Paragraph({
                children: [logoImageRun],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              })
            ] : []),
            new Paragraph({
              children: [
                new TextRun({ text: "CONTRATO DE ADMINISTRAÇÃO DE VEÍCULO", bold: true, size: 28 }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Pelo presente instrumento particular, de um lado:", font: "Arial" })
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "L.A ADMINISTRAÇÃO E LOCAÇÃO DE VEÍCULOS", bold: true }),
                new TextRun(", pessoa jurídica de direito privado, com sede na cidade de Aracaju, Estado de Sergipe, à Rua Joaquim Soares Bezerra, nº 84, bairro Farolândia, CEP: 49032-460, inscrita no CNPJ sob o nº 57.626.158/0001-99, denominada doravante simplesmente "),
                new TextRun({ text: "ADMINISTRADORA", bold: true }),
                new TextRun(".")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "E, de outro lado:" })
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: investorName, bold: true }),
                new TextRun(`, inscrito(a) no CPF sob o nº `),
                new TextRun({ text: investorCpf, bold: true }),
                new TextRun(`, com endereço situado à `),
                new TextRun({ text: investorAddress, bold: true }),
                new TextRun(`, doravante denominado(a) simplesmente `),
                new TextRun({ text: "CONTRATANTE", bold: true }),
                new TextRun(".")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Têm, entre si, justo e contratado o que se segue, que se obrigam a cumprir por si, seus herdeiros e sucessores a qualquer título:" })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "PARÁGRAFO ÚNICO: ", bold: true }),
                new TextRun("Caso o(a) CONTRATANTE não seja o proprietário registral constante no DETRAN, este declara e garante possuir legítima posse e plenos poderes de representação outorgados por Procuração Pública, respondendo civil e criminalmente pela regularidade da entrega do bem.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),
            
            // CLÁUSULA PRIMEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA PRIMEIRA – DO OBJETO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE confere à ADMINISTRADORA, por meio deste contrato, a posse do veículo de sua titularidade e/ou legítima posse, "),
                new TextRun({ text: `${vehicleModel}, ANO/MODELO ${vehicleYear}, RENAVAM ${vehicleRenavam}, COM PLACA ${vehiclePlate}, `, bold: true }),
                new TextRun("para que esta, em nome próprio, mas por conta e ordem do(a) CONTRATANTE, administre sua locação a terceiros, podendo exercer todos os atos inerentes à gestão do negócio, com fiel observância da legislação em vigor.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SEGUNDA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SEGUNDA – DAS RESTRIÇÕES", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE declara que o veículo está livre e desembaraçado de quaisquer ônus, gravames ou restrições que impeçam sua livre circulação e utilização para locação. Em caso de busca e apreensão, restrição de rodagem ou qualquer outra medida judicial ou administrativa que recaia sobre o veículo ou por obrigações do(a) CONTRATANTE não relacionadas à administração objeto deste instrumento, a ADMINISTRADORA fica totalmente isenta de qualquer responsabilidade. O(A) CONTRATANTE será o(a) único(a) responsável por quaisquer perdas e danos, lucros cessantes e demais custos incorridos pela ADMINISTRADORA e/ou pelo locatário em decorrência da indisponibilidade do veículo, comprometendo-se a ressarcir prontamente todos os valores.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA TERCEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA TERCEIRA – DOS PODERES E OBRIGAÇÕES DA ADMINISTRADORA", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE autoriza a ADMINISTRADORA a dar o referido veículo em locação, podendo, para tanto: publicar anúncios; selecionar locatários segundo seus próprios critérios; confeccionar, assinar, renovar e rescindir contratos de locação; realizar vistorias; estipular prazos, condições e valores de locação; fixar e receber aluguéis e cauções; emitir recibos e dar quitação; fazer acordos, transigir e firmar compromissos; e promover as medidas extrajudiciais e judiciais necessárias para a defesa dos interesses relativos ao veículo e à locação. A ADMINISTRADORA se responsabiliza pelos custos operacionais diretos da locação, tais como anúncios, elaboração de contratos e vistorias periódicas. A ADMINISTRADORA sub-rogar-se-á em todos os direitos e ações do(a) CONTRATANTE contra o locatário em caso de inadimplência ou danos, podendo agir em nome próprio para cobranças e reparações. Fica a ADMINISTRADORA expressamente autorizada, na qualidade de mandatária e sub-rogada, a requerer judicialmente medidas de urgência, busca e apreensão, e reintegração de posse dos veículos geridos, sem a necessidade de notificação prévia ou assinatura conjunta do(a) CONTRATANTE.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA QUARTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA QUARTA – DA ASSISTÊNCIA NA AQUISIÇÃO DO VEÍCULO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Caso a ADMINISTRADORA preste qualquer tipo de auxílio ou consultoria na escolha ou processo de compra do veículo objeto deste contrato, tal ato será considerado mera liberalidade e cortesia, não gerando qualquer tipo de responsabilidade sobre o estado, procedência, documentação ou vícios do bem adquirido.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA QUINTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA QUINTA – DO TERMO DE CONSENTIMENTO SOBRE OS RISCOS DO NEGÓCIO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE declara, para todos os fins de direito, ter plena e inequívoca ciência de que a locação de veículos para uso por terceiros constitui um investimento de natureza empresarial, que, como tal, está sujeito a riscos financeiros e operacionais. O(A) CONTRATANTE reconhece e assume os riscos inerentes à atividade, que incluem, mas não se limitam a: inadimplência, roubo, furto, incêndio, estelionato, apropriação indébita, fraudes diversas, acidentes, danos materiais, multas de trânsito, e desgaste acentuado do veículo decorrente do tempo e uso do bem. Fica expressamente pactuado que a ADMINISTRADORA não garante lucros ou resultados financeiros, e sua responsabilidade se limita à gestão diante do bem, não podendo ser responsabilizada pela materialização dos riscos aqui descritos, que são da essência do negócio assumido pelo(a) CONTRATANTE.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SEXTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SEXTA – DA PROTEÇÃO VEICULAR", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("É de responsabilidade exclusiva do(a) CONTRATANTE a contratação e manutenção de proteção veicular (seguro ou associação de proteção). A escolha da seguradora ou associação de proteção veicular é de livre arbítrio do(a) CONTRATANTE. Caso opte por aderir a uma proteção indicada pela ADMINISTRADORA, o(a) CONTRATANTE declara ter recebido o regulamento completo da proteção para ciência prévia das coberturas, exclusões e procedimentos. A ADMINISTRADORA figura como mera intermediária na eventual indicação e adesão à proteção veicular, com o intuito de facilitar o controle e monitoramento da frota. Fica, portanto, totalmente isenta de qualquer responsabilidade decorrente de negativa de cobertura por parte da seguradora ou associação, seja por qual motivo for, ou por qualquer falha na prestação de serviços por parte destas. A ausência de contratação de proteção veicular pelo(a) CONTRATANTE o(a) torna o(a) único(a) responsável por todos os prejuízos e danos que vierem a ocorrer com o veículo, eximindo a ADMINISTRADORA de qualquer responsabilidade solidária ou subsidiária.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA SÉTIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA SÉTIMA – DAS MANUTENÇÕES, REPAROS, AUTONOMIA DA ADMINISTRADORA E OFICINAS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Todas as despesas com manutenções preventivas, corretivas, revisões, reparos mecânicos, elétricos, troca de peças e demais serviços necessários ao bom funcionamento, segurança e preservação do veículo serão de responsabilidade exclusiva do(a) CONTRATANTE. A ADMINISTRADORA fica autorizada a executar, de forma autônoma, serviços de manutenção e reparo até o limite de R$ 500,00 (quinhentos reais) por evento, independentemente de autorização prévia do(a) CONTRATANTE, comprometendo-se apenas a comunicar a execução e os valores correspondentes, os quais poderão ser debitados do repasse mensal. Para serviços cujo valor ultrapasse o limite acima, a ADMINISTRADORA comunicará previamente o(a) CONTRATANTE, concedendo prazo razoável para manifestação. Na ausência de resposta dentro do prazo informado, ou nos casos em que a não execução imediata possa comprometer a segurança, a continuidade da locação ou a preservação do ativo, a ADMINISTRADORA poderá executar o serviço, nos termos deste contrato. Após a realização dos serviços, os comprovantes poderão ser disponibilizados ao(à) CONTRATANTE, mediante solicitação. A ADMINISTRADORA mantém rede de oficinas e fornecedores parceiros; entretanto, é facultado ao(à) CONTRATANTE indicar, por escrito e com antecedência, oficina de sua preferência, desde que esta atenda aos requisitos operacionais mínimos exigidos. A ADMINISTRADORA não se responsabiliza pela qualidade, garantia ou por eventuais vícios dos serviços prestados pelas oficinas, sejam elas parceiras ou indicadas pelo(a) CONTRATANTE, as quais atuam como prestadoras de serviços independentes.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA OITAVA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA OITAVA – DA REMUNERAÇÃO DA ADMINISTRADORA", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Pela administração do veículo, a ADMINISTRADORA fará jus a uma taxa de administração de "),
                new TextRun({ text: `${adminTax}%`, bold: true }),
                new TextRun(" sobre os valores recebidos a título de aluguel. O valor da taxa de administração será debitado no momento do repasse ao(à) CONTRATANTE.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA NONA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA NONA – DA PRESTAÇÃO DE CONTAS E GARANTIA DE PAGAMENTO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Até o 5º (quinto) dia útil de cada mês, a ADMINISTRADORA prestará contas dos recebimentos e pagamentos referentes ao mês anterior, depositando o saldo eventualmente apurado em favor do(a) CONTRATANTE, já deduzidos a taxa de administração e as despesas realizadas na forma deste contrato. Eventuais coberturas de débitos serão limitadas ao valor da caução prestada pelo locatário, observadas as ordens de prioridade para despesas relacionadas ao veículo. A ADMINISTRADORA garante o pagamento do valor do aluguel contratado durante o período em que o veículo estiver regularmente locado, até a efetiva devolução do bem e/ou rescisão do contrato de locação, exceto nas hipóteses que, por circunstâncias operacionais, a posse física do veículo não tenha sido imediatamente retomada, caso fortuito, força maior, roubo, furto, apropriação indébita ou colisões/sinistros que causem a paralisação ou indisponibilidade do veículo, cuja suspensão do repasse financeiro operará imediatamente a partir da data do evento. Ocorrendo a devolução do veículo e/ou a rescisão do contrato de locação, a ADMINISTRADORA deverá comunicar o(a) CONTRATANTE no prazo de até 72 (setenta e duas) horas, informando a data do encerramento da locação e o status do veículo.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA – DO REPASSE FINANCEIRO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Deduzida a Taxa de Administração e eventuais despesas operacionais, o saldo líquido dos aluguéis será repassado mensalmente pela ADMINISTRADORA. Por orientação e ordem expressa do CONTRATANTE, os repasses financeiros deverão ser efetuados integralmente na conta bancária abaixo qualificado, valendo os comprovantes de transferência bancária (TED, DOC ou PIX) como prova irrevogável de quitação:")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Nome/Razão Social: ", bold: true }),
                new TextRun(investorName),
                new TextRun({ text: "\nCPF/CNPJ: ", bold: true }),
                new TextRun(investorCpf),
                new TextRun({ text: "\nBanco: ", bold: true }),
                new TextRun(investorBank),
                new TextRun({ text: "\nChave PIX: ", bold: true }),
                new TextRun(investorPix)
              ],
              spacing: { after: 180 },
            }),
            new Paragraph({
              children: [
                new TextRun("Em caso de indicação de terceiro recebedor, o CONTRATANTE assume total e exclusiva responsabilidade civil, fiscal e criminal, isentando a ADMINISTRADORA de qualquer contestação futura sobre a titularidade dos créditos, bem como por eventuais fiscalizações ou autuações da Secretaria da Receita Federal do Brasil decorrentes do fluxo financeiro aqui pactuado.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA PRIMEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA PRIMEIRA – DO MODELO DE FATURAMENTO E DA NATUREZA DOS VALORES", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("As partes reconhecem expressamente que a ADMINISTRADORA atua como mera gestora e mandatária do CONTRATANTE, não se configurando os valores recebidos dos locatários finais como receita própria da ADMINISTRADORA, mas sim como valores de terceiros em trânsito. O faturamento da locação perante o cliente final (locatário) será realizado em nome da ADMINISTRADORA, mediante a emissão de Fatura de Locação ou Nota de Débito, em estrita observância à Súmula Vinculante nº 31 do Supremo Tribunal Federal (STF), ficando a ADMINISTRADORA autorizada a reter a sua Taxa de Administração estipulada neste instrumento. A ADMINISTRADORA emitirá Nota Fiscal de Serviços Eletrônica (NFS-e) contra o CONTRATANTE, tendo como objeto exclusivamente o valor de sua Taxa de Administração (comissão), sobre a qual incidirão os tributos de sua competência.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA SEGUNDA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA SEGUNDA – DOS SINISTROS, BATIDAS, COLISÕES E DANOS ACIDENTAIS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Em caso de colisão, sinistro ou qualquer evento que cause danos ao veículo durante o período de locação, a responsabilidade financeira pelos reparos será, prioritariamente, do locatário (motorista), nos termos do contrato de locação firmado entre estes e a ADMINISTRADORA. A ADMINISTRADORA adotará as medidas cabíveis para apuração dos danos, cobrança do valor correspondente e reparação do veículo, não assumindo responsabilidade pelo eventual inadimplemento do locatário (motorista). Na hipótese do locatário (motorista) não efetuar o pagamento integral dos reparos, a ADMINISTRADORA utilizará a caução de acordo com a ordem de prioridade elencada na cláusula décima sétima. Caso o valor seja insuficiente, o(a) CONTRATANTE poderá optar por: a) Autorizar a realização dos reparos, assumindo os custos correspondentes; ou b) Manter o veículo parado até a solução da pendência financeira. A ADMINISTRADORA não se responsabiliza por atrasos na reparação, perda de faturamento ou indisponibilidade do veículo decorrentes do não pagamento dos reparos pelos locatários (motorista). Eventuais valores pagos pelo(a) CONTRATANTE poderão ser objeto de repasse futuro, caso haja recuperação dos valores junto ao locatário (motorista), sem garantia de êxito. O(A) CONTRATANTE reconhece que os riscos de sinistro, batida e colisão são inerentes à atividade de locação de veículos e assume integralmente tais riscos, não podendo responsabilizar a ADMINISTRADORA por qualquer prejuízo decorrente de sinistro.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA TERCEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA TERCEIRA – DAS HIPÓTESES DE AGRAVAMENTO DE RISCO E NEGATIVA DE COBERTURA", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE declara ciência de que determinadas condutas praticadas pelos locatários (motoristas) podem caracterizar agravamento intencional do risco e ensejar negativa de cobertura por parte da seguradora ou associação de proteção veicular, nos termos do respectivo regulamento e da legislação aplicável. Constituem exemplos de agravamento de risco, dentre outros: Condução sob efeito de álcool, drogas ou substâncias psicoativas; Direção sem habilitação válida ou com CNH suspensa/cassada; Uso do veículo para finalidade diversa da contratada; Participação em rachas, competições ou manobras perigosas; Omissão de informações relevantes no momento do sinistro; Descumprimento das normas do regulamento da proteção veicular/seguro. Nessas hipóteses, caso haja negativa total ou parcial de cobertura, a ADMINISTRADORA não poderá ser responsabilizada pelos prejuízos decorrentes, uma vez que não detém controle direto sobre a conduta pessoal do locatário (motorista), limitando-se à gestão administrativa da locação. A ADMINISTRADORA compromete-se a adotar as medidas cabíveis para apuração dos fatos e cobrança dos valores devidos junto ao locatário (motorista), inclusive mediante execução judicial, quando necessário, não havendo, contudo, garantia de êxito na recuperação dos valores. O(A) CONTRATANTE reconhece que tais circunstâncias configuram risco inerente à atividade empresarial de locação de veículos, assumindo integralmente os prejuízos que não forem recuperados do locatário (motorista), desde que não comprovada negligência grave ou dolo por parte da ADMINISTRADORA. Fica expressamente afastada qualquer responsabilidade solidária ou subsidiária da ADMINISTRADORA por atos ilícitos, imprudentes ou criminosos praticados pelo locatário (motorista).")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA QUARTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA QUARTA – DA VIGÊNCIA E RESCISÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O presente contrato terá vigência de 180 (cento e oitenta) dias, renovando-se automaticamente por iguais períodos caso não haja manifestação em contrário por qualquer das partes. A parte que desejar rescindir o contrato deverá notificar a outra, por escrito, com antecedência mínima de 30 (trinta) dias. Se a solicitação de rescisão partir do(a) CONTRATANTE e houver um contrato de locação em vigor, este deverá aguardar o término do referido contrato para reaver o veículo, ou, caso o locatário concorde com a devolução antecipada, arcar com eventuais multas contratuais e com o valor integral da devolução da caução ao motorista locatário, sem qualquer responsabilidade da ADMINISTRADORA por tal reembolso. Caso a rescisão antecipada seja solicitada pelo(a) CONTRATANTE, será devida à ADMINISTRADORA uma multa correspondente ao valor da taxa de administração que seria devida até o término do prazo contratual, como forma de compensação pelos investimentos e custos operacionais incorridos. Fica estabelecido que, caso o veículo permaneça parado (sem locação) por um período contínuo de 30 (trinta) dias, salvo em casos de reparos mecânicos, elétricos ou outros que impeçam a locação, o(a) CONTRATANTE poderá solicitar a devolução do veículo e a rescisão deste contrato sem o pagamento de qualquer multa rescisória.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA QUINTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA QUINTA – DA DEVOLUÇÃO DO VEÍCULO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Por ocasião da rescisão deste contrato ou do término de sua vigência, o veículo será devolvido ao(à) CONTRATANTE no estado de conservação em que se encontrar, considerado o desgaste natural decorrente da utilização para fins de locação. O(A) CONTRATANTE declara estar ciente de que o veículo será devolvido com os níveis de óleo do motor, fluidos, combustível e demais consumíveis existentes no momento da devolução, sem direito a qualquer ressarcimento ou complementação por parte da ADMINISTRADORA. Os pneus e demais itens sujeitos a desgaste natural serão devolvidos no estado em que se encontrarem, independentemente do grau de uso, não cabendo à ADMINISTRADORA obrigação de substituição ou indenização. O disposto nesta cláusula não exime a ADMINISTRADORA de seu dever de fiscalização e zelo, devendo monitorar o uso adequado do veículo e manter os itens essenciais em condições seguras e operacionais durante a vigência da locação. Eventuais acessórios, equipamentos adicionais ou modificações realizadas durante o período de administração permanecerão incorporados ao veículo, constituindo benfeitorias em favor do(a) CONTRATANTE, sem direito de retenção ou indenização pela ADMINISTRADORA. O(A) CONTRATANTE reconhece que as cobranças realizadas aos locatários a título de taxa de limpeza, óleos, fluídos, pneus e demais consumíveis possuem natureza operacional e visam à rentabilidade da operação, não constituindo obrigação da ADMINISTRADORA de devolver o veículo em condições específicas além das previstas neste contrato. A partir da notificação de devolução do veículo, a ADMINISTRADORA poderá utilizar prazo razoável para realizar vistoria técnica detalhada, apurar eventuais danos e providenciar os reparos necessários à regularização do veículo. Em razão desse procedimento, o prazo para entrega definitiva ao(à) CONTRATANTE poderá ser prorrogado até a conclusão dos reparos indispensáveis. A devolução será formalizada mediante Termo de Devolução, a ser assinado por ambas as partes, constituindo quitação recíproca quanto às condições físicas aparentes do bem.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA SEXTA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA SEXTA – DAS INFRAÇÕES/MULTAS DE TRÂNSITO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("As infrações e multas de trânsito cometidas durante o período de locação serão pagas em até 30 (trinta) dias corridos após a finalização do último contrato de locação, até o limite do valor da caução retida. Caso as infrações de trânsito sejam lançadas pelos órgãos competentes após 30 (trinta) dias corridos do encerramento do último contrato de locação, o(a) CONTRATANTE deverá comunicar formalmente a ADMINISTRADORA, que envidará seus melhores esforços para identificar o condutor responsável e realizar as cobranças administrativas e/ou judiciais cabíveis. Fica, contudo, expressamente estabelecido que a ADMINISTRADORA não garante o recebimento dos valores referentes a essas infrações tardias, uma vez que o contrato com o respectivo locatário já terá sido encerrado e a caução já terá sido devolvida ou integralmente utilizada, não havendo garantia disponível para cobertura dessas multas. Caso o mesmo locatário possua várias infrações de trânsito e, após a devolução do veículo e/ou rescisão contratual, o valor total das multas ultrapasse o valor da caução, a responsabilidade pelo pagamento do valor excedente será do(a) CONTRATANTE. Excepcionalmente, caso seja comprovada a negligência da ADMINISTRADORA (como, por exemplo, acumular multas sem realizar a cobrança das anteriores, ou falta de cobrança das multas al locatário), a ADMINISTRADORA será responsável pelo pagamento das referidas infrações.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA SÉTIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA SÉTIMA – DA CAUÇÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("A caução retida do locatário será utilizada para cobrir eventuais débitos e despesas, obedecendo estritamente à seguinte ordem de prioridade: 1 - Aluguéis vencidos e não pagos; 2 - Troca de óleo, limpeza do veículo e reposição de acessórios; 3 - Infrações e multas de trânsito; 4 - Avarias do veículo e pagamento de franquias em caso de colisão ou acionamento de proteção veicular.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA OITAVA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA OITAVA – DO MONITORAMENTO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("A ADMINISTRADORA é responsável por realizar o monitoramento do(s) veículo(s) objeto deste contrato durante o período em que estiverem sob sua gestão, desde que o CONTRATANTE possua, no(s) veículo(s), o equipamento previamente contratado para este fim. Fica expressamente estabelecido que a ADMINISTRADORA não será responsabilizada por eventuais defeitos, falhas técnicas, interrupções de sinal ou problemas na prestação do serviço de monitoramento e rastreamento fornecido por empresas terceirizadas.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA DÉCIMA NONA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA DÉCIMA NONA – DA COMUNICAÇÃO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("A ADMINISTRADORA compromete-se a manter o(a) CONTRATANTE informado(a) sobre todos os serviços, manutenções e reparos realizados no(s) veículo(s). Adicionalmente, a ADMINISTRADORA comunicará o(a) CONTRATANTE sempre que o veículo for alugado (início de um novo ciclo de locação) e sempre que for desalugado (devolução pelo locatário).")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA VIGÉSIMA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA VIGÉSIMA – DA PROTEÇÃO DE DADOS (LGPD)", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("O(A) CONTRATANTE autoriza a ADMINISTRADORA a coletar, armazenar e tratar seus dados pessoais, bem como os dados do veículo, para as finalidades exclusivas de execução deste contrato, incluindo compartilhamento com locatários, seguradoras, associações, órgãos públicos e prestadores de serviço, em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA VIGÉSIMA PRIMEIRA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA VIGÉSIMA PRIMEIRA – DISPOSIÇÕES GERAIS", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("Este contrato não estabelece qualquer vínculo empregatício, societário ou de joint venture entre as partes, que declaram ser independentes em suas atividades. As partes declaram conhecer e se comprometer a cumprir a legislação anticorrupção vigente no Brasil, notadamente a Lei nº 12.846/2013. A tolerância de uma parte com a outra, relativamente ao descumprimento de qualquer das obrigações ora assumidas, não será considerada novação ou renúncia a qualquer direito, constituindo mera liberalidade, que não impedirá a parte tolerante de exigir da outra o fiel cumprimento deste contrato, a qualquer tempo.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
            }),

            // CLÁUSULA VIGÉSIMA SEGUNDA
            new Paragraph({
              children: [new TextRun({ text: "CLÁUSULA VIGÉSIMA SEGUNDA – DO FORO", bold: true })],
              spacing: { before: 180, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun("As partes elegem o foro da Comarca de Aracaju, Estado de Sergipe, para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.")
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),

            // DATA
            new Paragraph({
              children: [
                new TextRun({ text: dateStr, bold: true })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 240, after: 480 },
            }),

            // ASSINATURAS
            new Paragraph({
              children: [
                new TextRun("__________________________________                  __________________________________\n"),
                new TextRun({ text: "         ADMINISTRADORA                                                      CONTRATANTE", bold: true })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 360 },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_Gestao_LA_${vehiclePlate.replace(/-/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error("Erro ao gerar contrato de gestão:", error);
    alert("Ocorreu um erro ao gerar o contrato de gestão. Verifique os dados do veículo e do investidor.");
  }
};
