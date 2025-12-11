import React, { useState } from 'react';
import { Delete, ArrowRight } from 'lucide-react';

interface KeypadProps {
  onSubmit: (code: string) => void;
  isLoading: boolean;
  label?: string;
}

const Keypad: React.FC<KeypadProps> = ({ onSubmit, isLoading, label }) => {
  const [input, setInput] = useState('');

  const handlePress = (val: string) => {
    if (input.length < 12) {
      setInput(prev => prev + val);
    }
  };

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.length > 0) {
      onSubmit(input);
      setInput('');
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl">
      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide text-center">
          {label || "Enter ID Number"}
        </label>
        <div className="h-20 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-gray-100 overflow-hidden relative">
            <span className={`text-4xl font-bold tracking-widest ${input ? 'text-gray-800' : 'text-gray-300'}`}>
                {input || "----"}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => handlePress(key)}
            disabled={isLoading}
            className="h-20 w-full rounded-2xl bg-white border border-gray-200 shadow-sm text-3xl font-semibold text-gray-700 hover:bg-slate-50 active:scale-95 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {key}
          </button>
        ))}
        
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="h-20 w-full rounded-2xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 active:scale-95 transition-all duration-150 flex items-center justify-center"
        >
          <Delete size={28} />
        </button>
        
        <button
          onClick={() => handlePress('0')}
          disabled={isLoading}
          className="h-20 w-full rounded-2xl bg-white border border-gray-200 shadow-sm text-3xl font-semibold text-gray-700 hover:bg-slate-50 active:scale-95 transition-all duration-150 flex items-center justify-center focus:outline-none"
        >
          0
        </button>

        <button
          onClick={handleSubmit}
          disabled={isLoading || input.length === 0}
          className={`h-20 w-full rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 shadow-md ${
            input.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight size={32} />
          )}
        </button>
      </div>
    </div>
  );
};

export default Keypad;