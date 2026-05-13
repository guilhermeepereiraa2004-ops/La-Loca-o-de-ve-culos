import React from 'react';
import { X, Download } from 'lucide-react';

const ImageViewer = ({ image, onClose }) => {
  if (!image) return null;

  const isPDF = typeof image === 'string' && (image.toLowerCase().includes('.pdf') || (image.startsWith('blob:') && image.includes('pdf')));
  const isDoc = typeof image === 'string' && (image.toLowerCase().includes('.doc') || image.toLowerCase().includes('.docx'));

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 md:p-10" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {isPDF ? (
          <iframe src={image} className="w-full h-full rounded-2xl bg-white" title="PDF Viewer" />
        ) : isDoc ? (
          <div className="bg-white p-10 rounded-[2.5rem] text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
              <Download size={40} />
            </div>
            <h3 className="text-xl font-black text-neutral-900">Documento Word</h3>
            <p className="text-neutral-500 max-w-xs">Arquivos .doc/.docx não podem ser pré-visualizados no navegador. Clique abaixo para baixar.</p>
            <a href={image} download className="inline-block px-10 py-4 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl">Baixar Arquivo</a>
          </div>
        ) : (
          <img src={image} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Visualização" />
        )}
        
        <button className="absolute -top-12 right-0 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
