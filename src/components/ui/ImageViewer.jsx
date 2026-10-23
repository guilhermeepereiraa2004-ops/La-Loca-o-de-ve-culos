import React from 'react';
import { X, Download } from 'lucide-react';
import { getPublicUrl } from '../../utils/supabaseStorage';
import { useStorageValue } from '../../hooks/useStorageValue';

const ImageViewer = ({ image, onClose }) => {
  const { value: resolvedImage, loading } = useStorageValue(image);
  if (!image) return null;

  // Extract URL if image is an object
  const imageUrl = getPublicUrl(resolvedImage);
  if (!imageUrl) return <div className="fixed inset-0 z-[999] bg-black/95 grid place-items-center p-6 text-white" role="dialog" aria-modal="true" aria-label="Visualização de arquivo"><div className="space-y-5 text-center"><p role="status">{loading ? 'Carregando arquivo…' : 'Não foi possível carregar este arquivo. Feche e tente novamente.'}</p><button onClick={onClose} className="px-6 py-3 rounded-xl bg-white/10">Fechar</button></div></div>;

  const isPDF = typeof imageUrl === 'string' && (imageUrl.toLowerCase().includes('.pdf') || (imageUrl.startsWith('blob:') && imageUrl.includes('pdf')));
  const isDoc = typeof imageUrl === 'string' && (imageUrl.toLowerCase().includes('.doc') || imageUrl.toLowerCase().includes('.docx'));

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 md:p-10" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {isPDF ? (
          <div className="w-full h-full flex flex-col gap-2">
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-white text-sm self-start">Abrir documento em outra aba</a>
            <iframe src={imageUrl} sandbox="allow-same-origin allow-downloads" referrerPolicy="no-referrer" className="w-full flex-1 rounded-2xl bg-white" title="PDF Viewer" />
          </div>
        ) : isDoc ? (
          <div className="bg-white p-10 rounded-[2.5rem] text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
              <Download size={40} />
            </div>
            <h3 className="text-xl font-black text-neutral-900">Documento Word</h3>
            <p className="text-neutral-500 max-w-xs">Arquivos .doc/.docx não podem ser pré-visualizados no navegador. Clique abaixo para baixar.</p>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" download className="inline-block px-10 py-4 bg-neutral-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl">Baixar Arquivo</a>
          </div>
        ) : (
          <img src={imageUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Visualização" />
        )}
        
        <button className="absolute -top-12 right-0 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
