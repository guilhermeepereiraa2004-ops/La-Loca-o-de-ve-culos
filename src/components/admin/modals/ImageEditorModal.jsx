import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, FlipHorizontal, Check, RefreshCw } from 'lucide-react';
import { EditorialLabel } from '../../ui/EditorialLabel';

const ImageEditorModal = ({ isOpen, imageSrc, onClose, onSave }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (imageSrc) {
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setPanX(0);
      setPanY(0);
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
    }
  }, [imageSrc]);

  // Redraw canvas whenever parameters change
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set fixed aspect ratio for output (e.g. 16:9 - 800x450 is a good high-res standard)
    canvas.width = 800;
    canvas.height = 450;

    // Clear background (neutral black/dark gray for premium feel)
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // 1. Move to canvas center + pan offset
    ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);

    // 2. Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Apply mirror flip
    ctx.scale(flipH ? -1 : 1, 1);

    // 4. Calculate best base scale to fit the 16:9 canvas
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    // Cover the canvas viewport
    const baseScale = Math.max(scaleX, scaleY);

    // 5. Apply zoom scale
    ctx.scale(baseScale * zoom, baseScale * zoom);

    // 6. Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
  }, [imageLoaded, zoom, rotation, flipH, panX, panY]);

  if (!isOpen || !imageSrc) return null;

  // Handle Dragging / Panning on canvas
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panX,
      y: e.clientY - panY
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - panX,
      y: e.touches[0].clientY - panY
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanX(e.touches[0].clientX - dragStart.x);
    setPanY(e.touches[0].clientY - dragStart.y);
  };

  // Save/export edited image
  const handleSave = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Export high-quality JPEG
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'edited_vehicle_photo.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onSave(file, dataUrl);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-neutral-900 w-full max-w-4xl rounded-[3rem] p-6 md:p-10 shadow-2xl border border-neutral-800 flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4 shrink-0">
          <div>
            <EditorialLabel className="text-[#C5A059] mb-1">Editor de Imagem</EditorialLabel>
            <h4 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">Ajustar Foto do Veículo</h4>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-neutral-800 flex items-center justify-center rounded-xl hover:bg-neutral-700 transition-all text-neutral-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace: Canvas Container */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 group shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className={`w-full max-w-full aspect-[16/9] object-contain shadow-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          />
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-neutral-400 text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
            Arraste para mover • Slider para zoom
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="mt-6 space-y-6 shrink-0">
          {/* Zoom Slider */}
          <div className="flex items-center gap-6 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 w-12 text-left">Zoom</span>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.05"
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#C5A059] cursor-pointer bg-neutral-800 h-1.5 rounded-lg appearance-none"
            />
            <span className="text-xs font-mono font-black text-[#C5A059] w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Rotate 90 CW */}
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="flex items-center gap-2 bg-neutral-800 text-neutral-300 hover:text-white px-5 py-3.5 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all hover:bg-neutral-700"
                title="Girar 90 graus"
              >
                <RotateCw size={14} className="text-[#C5A059]" /> Girar 90°
              </button>

              {/* Flip Horizontal */}
              <button
                onClick={() => setFlipH(prev => !prev)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all ${flipH ? 'bg-[#C5A059] text-neutral-900' : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'}`}
                title="Espelhar foto"
              >
                <FlipHorizontal size={14} /> Espelhar
              </button>

              {/* Reset to defaults */}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-neutral-800 text-neutral-400 hover:text-white px-5 py-3.5 rounded-xl text-[9px] uppercase tracking-widest font-black transition-all hover:bg-neutral-700"
                title="Resetar ajustes"
              >
                <RefreshCw size={14} /> Resetar
              </button>
            </div>

            {/* Save / Apply */}
            <button
              onClick={handleSave}
              className="flex items-center gap-2.5 bg-[#C5A059] text-neutral-900 px-8 py-3.5 rounded-xl text-[9px] uppercase tracking-widest font-black hover:bg-white hover:text-neutral-900 transition-all shadow-xl shadow-[#C5A059]/10"
            >
              <Check size={16} /> Aplicar Ajustes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;
