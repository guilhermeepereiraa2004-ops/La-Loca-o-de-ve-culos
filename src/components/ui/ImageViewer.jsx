import React from 'react';
import { X } from 'lucide-react';

const ImageViewer = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
      <img src={image} className="max-w-full max-h-full object-contain rounded-2xl" alt="Visualização" />
      <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all" onClick={onClose}>
        <X size={24} />
      </button>
    </div>
  );
};

export default ImageViewer;
