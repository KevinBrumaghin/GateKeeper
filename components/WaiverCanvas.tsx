import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Save } from 'lucide-react';
import { db } from '../services/db';

interface WaiverCanvasProps {
  memberName: string;
  onSave: (signature: string) => void;
  onCancel?: () => void;
  customText?: string;
}

const WaiverCanvas: React.FC<WaiverCanvasProps> = ({ memberName, onSave, onCancel, customText }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [waiverBody, setWaiverBody] = useState('');

  useEffect(() => {
    const settings = db.getSettings();
    setWaiverBody(customText || settings.waiverText);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas resolution for sharpness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [customText]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">Liability Waiver</h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[30vh] border-b border-gray-100 bg-slate-50">
            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {waiverBody}
            </p>
            <p className="mt-4 text-xs text-gray-400 font-mono">
                Signed by: <span className="font-bold text-gray-900">{memberName}</span> on {new Date().toLocaleDateString()}
            </p>
        </div>

        <div className="p-4 bg-white flex-grow relative flex flex-col">
          <label className="text-xs font-bold text-gray-400 uppercase mb-2">Signature</label>
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden shadow-inner h-48 relative touch-none w-full">
             {!hasSignature && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-gray-300 text-3xl font-bold uppercase select-none opacity-50">Sign Here</p>
                 </div>
             )}
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair touch-none block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center gap-4">
          {onCancel && (
            <button
                onClick={onCancel}
                className="px-6 py-3 rounded-lg text-gray-500 font-semibold hover:bg-gray-100 transition-colors"
            >
                Cancel
            </button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Eraser size={18} />
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={!hasSignature}
              className={`px-8 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-all shadow-lg ${
                hasSignature 
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' 
                : 'bg-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Save size={18} />
              Accept & Sign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiverCanvas;