import React, { useState } from 'react';
import { X, Printer, CheckCircle, FileText, Upload, Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { compressImage } from '../../../utils/imageCompression';

/* VERSION V04 - CLEANED AND VERIFIED */

const TerminationTermModal = ({ inspection, rental, clients = [], closureData, onClose, onFinalize }) => {
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);

  if (!inspection || !rental || !closureData) return null;

  const rentalUser = rental.userName || rental.user || '';
  const client = (clients || []).find(c => 
    c.id === rental.clientId || 
    (c.nome && rentalUser && c.nome.toLowerCase() === rentalUser.toLowerCase()) || 
    (c.name && rentalUser && c.name.toLowerCase() === rentalUser.toLowerCase())
  );
  const clientCpf = client?.cpf || '---';
  const clientAddress = client?.address || '---';
  const clientCnh = rental.cnhNumber || rental.cnh || client?.cnh || '---';

  const rawDate = rental.startDate || rental.date;
  const startFormatted = rawDate 
    ? new Date(rawDate + 'T12:00:00').toLocaleDateString('pt-BR') 
    : '---';
  const endFormatted = new Date().toLocaleDateString('pt-BR');

  const deductions = inspection.deductions || [];
  const deductionsTotal = deductions.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);
  const amountChargedFromDeposit = Math.min(closureData.totalDebts, closureData.caucaoAvailable);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsUploading(true);
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          setAttachment({ file: compressed, preview: URL.createObjectURL(compressed) });
        } else {
          setAttachment({ file, preview: URL.createObjectURL(file), isPdf: true });
        }
        setStep(3);
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-0 md:p-8 bg-neutral-950/98 backdrop-blur-2xl">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-neutral-900 p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#C5A059] rounded-2xl flex items-center justify-center text-neutral-900 shadow-lg shadow-[#C5A059]/20">
              <FileText size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black uppercase tracking-tighter text-white">Distrato de Contrato</h4>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Encerramento Formal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 1 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">01</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Imprimir</span>
            </div>
            <div className="w-4 h-px bg-white/10" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 2 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">02</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Anexar</span>
            </div>
            <div className="w-4 h-px bg-white/10" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 3 ? 'bg-[#C5A059] text-neutral-900' : 'text-neutral-500'}`}>
              <span className="text-[10px] font-black">03</span>
              <span className="hidden md:block text-[9px] font-black uppercase tracking-widest">Encerrar</span>
            </div>
          </div>

          <button onClick={onClose} className="absolute top-6 right-6 md:static w-10 h-10 bg-white/5 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Action Sidebar */}
          <div className="w-full md:w-80 bg-neutral-50 p-6 md:p-8 border-r border-neutral-100 flex flex-col gap-6 overflow-y-auto font-sans">
            <div className="p-5 bg-white rounded-3xl border border-neutral-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-neutral-900">
                <AlertCircle size={16} className="text-[#C5A059]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Obrigatório</p>
              </div>
              <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">
                Gere o PDF, colha a assinatura e anexe a foto para encerrar.
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handlePrint}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${step === 1 ? 'bg-neutral-900 text-white shadow-xl' : 'bg-white text-neutral-400'}`}
              >
                <div className="flex items-center gap-3">
                  <Printer size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">1. Gerar PDF</span>
                </div>
                {step > 1 && <CheckCircle size={16} className="text-emerald-500" />}
              </button>

              <div className={`p-5 rounded-3xl border transition-all ${step === 2 ? 'bg-white border-[#C5A059] shadow-lg' : 'bg-neutral-100/50'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step >= 2 ? 'bg-[#C5A059] text-neutral-900' : 'bg-neutral-200 text-neutral-400'}`}>
                    {attachment ? <Check size={16} /> : <Upload size={16} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">2. Anexar</span>
                </div>

                {!attachment ? (
                  <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${step >= 1 ? 'border-neutral-200 hover:border-[#C5A059] hover:bg-[#C5A059]/5' : 'border-neutral-100 opacity-50'}`}>
                    <Upload size={24} className="text-neutral-300 mb-2" />
                    <span className="text-[8px] font-black uppercase text-neutral-400">Selecionar</span>
                    <input type="file" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" disabled={step < 1} />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden relative">
                      {attachment.isPdf ? (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                          <FileText size={24} className="text-[#C5A059]" />
                        </div>
                      ) : (
                        <img src={attachment.preview} className="w-full h-full object-cover opacity-60" alt="Preview" />
                      )}
                    </div>
                    <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <Check size={10} /> Pronto
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => onFinalize(attachment.file)}
                disabled={!attachment}
                className={`w-full flex items-center justify-center gap-3 p-5 rounded-3xl transition-all shadow-2xl ${attachment ? 'bg-neutral-900 text-[#C5A059] hover:bg-neutral-800' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">3. Encerrar</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-neutral-200/30 p-4 md:p-12 overflow-y-auto">
            <div id="print-term" className="bg-white shadow-2xl mx-auto w-full max-w-[800px] p-8 md:p-16 min-h-[1000px] print:p-0 print:shadow-none font-serif text-neutral-900">
              <div className="border-b-2 border-neutral-900 pb-6 mb-8 flex justify-between items-end">
                <div className="flex items-center gap-6">
                  <img src="/logo-new.png" alt="L.A Locação" className="h-16 w-auto object-contain" />
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">L.A Administração e Locação de Veículos</h1>
                    <p className="text-[9px] uppercase text-neutral-500 font-bold mt-1 leading-relaxed">
                      Rua Joaquim Soares Bezerra, nº 84 – Farolândia, Aracaju – SE<br/>
                      CEP 49032-460<br/>
                      CNPJ: 57.626.158/0001-99
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">Termo de Rescisão e Distrato</h2>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Contrato de Locação</p>
                </div>
              </div>

              <div className="space-y-8 text-neutral-800 text-[11px] leading-relaxed">
                
                {/* 1. DADOS DO LOCATÁRIO E VEÍCULO */}
                <section className="space-y-3">
                  <p className="font-black uppercase tracking-widest text-[9px] text-[#C5A059] border-b border-neutral-100 pb-1 font-sans">I. QUALIFICAÇÃO DAS PARTES E VEÍCULO</p>
                  <div className="grid grid-cols-2 gap-8 text-[11px]">
                    <div className="space-y-1">
                      <p><strong>Locatário:</strong> {rental.userName || rental.user || '---'}</p>
                      <p><strong>CPF:</strong> {clientCpf}</p>
                      <p><strong>CNH:</strong> {clientCnh}</p>
                      <p><strong>Endereço:</strong> {clientAddress}</p>
                    </div>
                    <div className="space-y-1">
                      <p><strong>Veículo:</strong> {rental.vehicle || rental.vehicleModel} ({rental.plate || rental.vehiclePlate})</p>
                      <p><strong>KM de Devolução:</strong> {inspection.km} KM</p>
                      <p><strong>Data de Início:</strong> {startFormatted}</p>
                      <p><strong>Data de Término:</strong> {endFormatted}</p>
                    </div>
                  </div>
                </section>

                {/* 2. ITENS DE VISTORIA */}
                <section className="space-y-3">
                  <p className="font-black uppercase tracking-widest text-[9px] text-[#C5A059] border-b border-neutral-100 pb-1 font-sans">II. ITENS AFERIDOS NA VISTORIA DE DEVOLUÇÃO</p>
                  {deductions.length > 0 ? (
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="py-2 text-[9px] uppercase tracking-widest text-neutral-400 font-black font-sans">Item/Categoria</th>
                          <th className="py-2 text-[9px] uppercase tracking-widest text-neutral-400 font-black font-sans">Descrição</th>
                          <th className="py-2 text-[9px] uppercase tracking-widest text-neutral-400 font-black font-sans text-center">Proporcional</th>
                          <th className="py-2 text-[9px] uppercase tracking-widest text-neutral-400 font-black font-sans text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {deductions.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 text-[10px] font-black text-neutral-900 uppercase font-sans">{item.category}</td>
                            <td className="py-2 text-[10px] text-neutral-600 font-sans">{item.description || '-'}</td>
                            <td className="py-2 text-center text-[10px] font-sans">{item.isProportional ? 'Sim' : 'Não'}</td>
                            <td className="py-2 text-[10px] font-mono text-neutral-900 text-right">
                              R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-neutral-50">
                          <td colSpan={3} className="py-2 pl-2 text-[9px] uppercase tracking-widest text-neutral-900 font-sans">Total Descontos Vistoria</td>
                          <td className="py-2 pr-2 text-[10px] font-mono text-neutral-900 text-right">R$ {deductionsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[10px] text-neutral-500 italic">Nenhuma avaria ou desconto lançado na vistoria de devolução.</p>
                  )}
                </section>

                {/* 3. CONSOLIDAÇÃO FINANCEIRA */}
                <section className="space-y-3">
                  <p className="font-black uppercase tracking-widest text-[9px] text-[#C5A059] border-b border-neutral-100 pb-1 font-sans">III. CONSOLIDAÇÃO FINANCEIRA E LIQUIDAÇÃO</p>
                  <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 space-y-2 text-[11px]">
                    <div className="flex justify-between text-neutral-600">
                      <span>Total de Débitos Consolidados (Vistoria, Multas, Aluguéis, Rescisão):</span>
                      <span className="font-mono text-neutral-950 font-bold">R$ {closureData.totalDebts?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Caução Total Pago/Disponível:</span>
                      <span className="font-mono text-emerald-600 font-bold">R$ {closureData.caucaoAvailable?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600 border-t border-neutral-200/60 pt-2">
                      <span>Valor total descontado da caução:</span>
                      <span className="font-mono text-red-500 font-bold">R$ {amountChargedFromDeposit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    {closureData.type === 'return' ? (
                      <div className="flex justify-between font-black text-neutral-900 border-t border-neutral-900/10 pt-2 text-[11px] font-sans">
                        <span>VALOR A DEVOLVER AO MOTORISTA:</span>
                        <span className="font-mono text-emerald-600">R$ {closureData.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between font-black text-neutral-900 border-t border-neutral-900/10 pt-2 text-[11px] font-sans">
                        <span>VALOR TOTAL AINDA DEVIDO (Boleto Avulso):</span>
                        <span className="font-mono text-red-600">R$ {closureData.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* 4. CLÁUSULA DE RESPONSABILIDADE FUTURA */}
                <section className="space-y-3">
                  <p className="font-black uppercase tracking-widest text-[9px] text-[#C5A059] border-b border-neutral-100 pb-1 font-sans">IV. CLÁUSULA DE RESPONSABILIDADE FUTURA</p>
                  <p className="text-[10px] text-neutral-600 leading-relaxed text-justify">
                    O motorista declara ciência e concordância de que a assinatura deste distrato não quita nem extingue a responsabilidade por débitos, danos, avarias ou obrigações de natureza superveniente relacionados ao veículo e ao período de vigência desta locação. Assim, poderão ser incluídos e cobrados débitos adicionais referentes a: (a) multas de trânsito não liquidadas ou notificadas após a devolução, cuja infração tenha ocorrido comprovadamente durante o período de vigência desta locação; (b) aluguéis, diárias, juros ou encargos vencidos e não pagos até a presente data de encerramento; (c) avarias ocultas, danos ou irregularidades não identificados ou não aferidos na vistoria de devolução, inclusive aqueles que somente se tornem perceptíveis posteriormente; (d) acessórios quebrados, danificados ou faltantes, bem como itens e equipamentos que deveriam acompanhar o veículo; e (e) defeitos mecânicos e/ou elétricos ocasionados por mau uso, negligência, imprudência, imperícia, condução inadequada ou utilização em desacordo com as orientações de uso do veículo, ainda que não tenham sido aferidos ou identificados na vistoria de devolução, desde que comprovadamente relacionados ao período da locação ou à conduta do locatário. A eventual cobrança deverá ser acompanhada, sempre que possível, de laudo, registro fotográfico, orçamento, nota fiscal ou outro documento comprobatório.
                  </p>
                </section>

                {/* 5. ASSINATURAS */}
                <section className="pt-24 grid grid-cols-2 gap-16 text-center text-[10px] font-sans">
                  <div className="space-y-2">
                    <div className="border-t border-neutral-400 pt-2">
                      <p className="font-bold">{rental.userName || rental.user || '---'}</p>
                      <p className="text-[8px] text-neutral-400 uppercase tracking-tight">CPF: {clientCpf}</p>
                    </div>
                    <p className="text-neutral-400 uppercase tracking-widest text-[8px] font-black">Locatário (Motorista)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="border-t border-neutral-400 pt-2">
                      <p className="font-bold">L.A. LOCAÇÃO E ADMINISTRAÇÃO LTDA</p>
                      <p className="text-[8px] text-neutral-400 uppercase tracking-tight">Representante Legal</p>
                    </div>
                    <p className="text-neutral-400 uppercase tracking-widest text-[8px] font-black">Administradora (Locador)</p>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important; 
          }
          
          /* Oculta completamente tudo que NÃO faz parte da árvore do #print-term */
          body *:not(:has(#print-term)):not(#print-term):not(#print-term *) {
            display: none !important;
          }

          /* Reseta os contêineres pais para não interferirem no layout */
          html:has(#print-term),
          body:has(#print-term),
          div:has(#print-term) {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            transform: none !important;
          }

          #print-term {
            width: 100% !important;
            max-width: none !important;
          }

          /* Evita cortes no meio de tabelas e assinaturas */
          section, table, tr, img {
            page-break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
};

export default TerminationTermModal;
