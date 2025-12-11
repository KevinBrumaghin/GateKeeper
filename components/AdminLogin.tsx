import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Delete, ShieldAlert } from 'lucide-react';
import { auth } from '../services/auth';

interface AdminLoginProps {
  onLogin: () => void;
  onCancel: () => void;
  title?: string;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onCancel, title }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin]);

  const handleVerify = async () => {
    setIsLoading(true);
    const isValid = await auth.verifyPin(pin);
    
    if (isValid) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
        setIsLoading(false);
      }, 500);
    }
  };

  const handlePress = (num: string) => {
    if (pin.length < 4 && !isLoading) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (!isLoading) {
      setPin(prev => prev.slice(0, -1));
      setError(false);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col items-center justify-center w-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
            <Lock className="text-white w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{title || "Admin Access"}</h2>
          <p className="text-slate-400 text-xs mt-1">Enter 4-Digit Security PIN</p>
        </div>

        {/* PIN Display */}
        <div className="py-8 bg-gray-50 flex flex-col items-center justify-center border-b border-gray-100">
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pin.length 
                    ? error ? 'bg-red-500 scale-110' : 'bg-slate-800 scale-110' 
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          {error && (
            <p className="text-red-500 text-xs font-semibold mt-4 animate-bounce flex items-center gap-1">
               <ShieldAlert size={12} /> Incorrect PIN
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 mb-6">
            {keys.map(key => (
              <button
                key={key}
                onClick={() => handlePress(key)}
                disabled={isLoading}
                className="h-16 w-full rounded-2xl bg-white border border-gray-200 shadow-sm text-2xl font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all duration-150 focus:outline-none"
              >
                {key}
              </button>
            ))}
            
            <div className="flex items-center justify-center">
               <button
                onClick={onCancel}
                className="w-full h-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <ArrowLeft size={24} />
               </button>
            </div>
            
            <button
              onClick={() => handlePress('0')}
              disabled={isLoading}
              className="h-16 w-full rounded-2xl bg-white border border-gray-200 shadow-sm text-2xl font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all duration-150 focus:outline-none"
            >
              0
            </button>

            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="h-16 w-full rounded-2xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 active:scale-95 transition-all duration-150 flex items-center justify-center focus:outline-none"
            >
              <Delete size={24} />
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-[10px] text-gray-300">Default PIN: 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;