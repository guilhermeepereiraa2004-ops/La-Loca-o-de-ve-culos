import React from 'react';
import { X, Printer, CheckCircle, FileText, User, Car, Calendar, Gavel, Scale, Signature } from 'lucide-react';

const TerminationTermModal = ({ inspection, rental, closureData, onClose }) => {
  if (!inspection || !rental || !closureData) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-500">
        {/* Actions Header */}
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <FileText className="text-[#C5A059]" size={20} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Visualização do Termo de Rescisão</h4>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#C5A059] transition-all"
            >
              <Printer size={14} /> Imprimir / Salvar PDF
            </button>
            <button onClick={onClose} className="w-10 h-10 bg-neutral-50 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Print Area */}
        <div id="print-term" className="flex-1 p-12 md:p-20 bg-white print:p-10">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-10 mb-12">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-neutral-900 leading-none">LA Locação</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A059] mt-2">Soluções em Mobilidade Premium</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">Termo de Rescisão Contratual</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase mt-1">Instrumento Particular de Distrato</p>
            </div>
          </div>

          <div className="space-y-10 text-neutral-800">
            {/* Parties */}
            <section className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Dados do Locatário</h3>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase text-neutral-900">{rental.user}</p>
                  <p className="text-xs font-medium text-neutral-600">CPF: {rental.cpf || '---'}</p>
                  <p className="text-xs font-medium text-neutral-600">CNH: {rental.cnh || '---'}</p>
                  <p className="text-xs font-medium text-neutral-600">Endereço: {rental.address || 'Aracaju, SE'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Dados do Veículo</h3>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase text-neutral-900">{rental.vehicle || 'Veículo em Contrato'}</p>
                  <p className="text-xs font-black text-[#C5A059]">PLACA: {rental.plate}</p>
                  <p className="text-xs font-medium text-neutral-600">KM de Devolução: {inspection.km} KM</p>
                  <p className="text-xs font-medium text-neutral-600">Status de Combustível: {inspection.fuelLevel}</p>
                </div>
              </div>
            </section>

            {/* Dates */}
            <section className="bg-neutral-50 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Início do Contrato</p>
                <p className="text-sm font-black text-neutral-900">{rental.startDate || '---'}</p>
              </div>
              <ArrowRight size={20} className="text-neutral-200" />
              <div className="text-right">
                <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Rescisão em</p>
                <p className="text-sm font-black text-neutral-900">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </section>

            {/* Inspection Items */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Avarias e Itens Auferidos na Vistoria</h3>
              {inspection.deductions && inspection.deductions.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="py-2 text-[9px] font-black uppercase text-neutral-400">Item / Categoria</th>
                      <th className="py-2 text-[9px] font-black uppercase text-neutral-400 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {inspection.deductions.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3">
                          <p className="text-[10px] font-black text-neutral-900 uppercase">{item.category}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-tight">{item.description}</p>
                        </td>
                        <td className="py-3 text-[10px] font-black text-neutral-900 text-right">
                          R$ {parseFloat(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-50">
                      <td className="p-3 text-[10px] font-black text-neutral-900 uppercase">Subtotal Vistoria</td>
                      <td className="p-3 text-[10px] font-black text-neutral-900 text-right">
                        R$ {closureData.inspectionDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-xs font-medium text-emerald-600">Veículo devolvido em perfeito estado. Nenhuma avaria registrada.</p>
              )}
            </section>

            {/* Legal Clause */}
            <section className="p-8 border-2 border-neutral-100 rounded-[2rem] space-y-4 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <Gavel size={16} className="text-[#C5A059]" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Cláusula de Responsabilidade Futura</h3>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed text-justify font-serif">
                O Locatário declara plena ciência de que poderão ser incluídos e cobrados débitos adicionais retroativos referentes a: 
                <strong> (a) multas de trânsito</strong> não liquidadas ou notificadas após a devolução, cuja infração tenha ocorrido durante o período de locação; 
                <strong> (b) danos ocultos</strong> não identificados na vistoria visual mas decorrentes do uso indevido; 
                <strong> (c) eventuais encargos financeiros</strong> pendentes. O Locatário autoriza, desde já, a cobrança destes valores via cartão de crédito ou boleto bancário.
              </p>
            </section>

            {/* Financial Summary */}
            <section className="bg-neutral-950 p-10 rounded-[2.5rem] flex justify-between items-end text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-[#C5A059]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Resumo da Liquidação</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Total de Débitos Consolidados: <span className="text-white">R$ {closureData.totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Caução Líquida Utilizada: <span className="text-white">R$ {closureData.caucaoAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] mb-2">
                  {closureData.type === 'return' ? 'Saldo a Devolver' : 'Saldo Devedor'}
                </p>
                <h4 className="text-5xl font-black tracking-tighter">
                  R$ {closureData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h4>
              </div>
            </section>

            {/* Signatures */}
            <section className="pt-20 grid grid-cols-2 gap-20">
              <div className="text-center space-y-4">
                <div className="border-b-2 border-neutral-900 pb-1" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-900">{rental.user}</p>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Locatário</p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <div className="border-b-2 border-neutral-900 pb-1" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-900">LA Locação de Veículos</p>
                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Representante Legal</p>
                </div>
              </div>
            </section>

            <footer className="pt-12 text-center">
              <p className="text-[8px] text-neutral-300 font-bold uppercase tracking-widest italic">Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}</p>
            </footer>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #print-term, #print-term * { visibility: visible; }
          #print-term { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  );
};

export default TerminationTermModal;
