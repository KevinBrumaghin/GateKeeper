import React from 'react';
import { Member, EmployeeAction } from '../types';
import { Clock, Coffee, LogOut, ArrowRight, User } from 'lucide-react';

interface EmployeeControlsProps {
  member: Member;
  onAction: (action: EmployeeAction) => void;
  onCancel: () => void;
}

const EmployeeControls: React.FC<EmployeeControlsProps> = ({ member, onAction, onCancel }) => {
  const lastAction = member.lastAction || 'CLOCK_OUT';

  // Determine button states based on last action
  const isClockedIn = lastAction === 'CLOCK_IN' || lastAction === 'BREAK_END';
  const isOnBreak = lastAction === 'BREAK_START';
  const isClockedOut = lastAction === 'CLOCK_OUT' || lastAction === undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-gray-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4 font-bold text-2xl shadow-inner">
                {member.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Hello, {member.name}</h2>
            <p className="text-slate-500 mt-1">Current Status: 
                <span className={`font-bold ml-2 ${isClockedIn ? 'text-green-600' : isOnBreak ? 'text-orange-500' : 'text-slate-400'}`}>
                    {isClockedIn ? 'WORKING' : isOnBreak ? 'ON BREAK' : 'CLOCKED OUT'}
                </span>
            </p>
        </div>

        {/* Controls Grid */}
        <div className="p-8">
            <div className="grid grid-cols-2 gap-4">
                
                {/* Clock In */}
                <button
                    onClick={() => onAction('CLOCK_IN')}
                    disabled={!isClockedOut}
                    className={`h-40 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                        isClockedOut 
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                >
                    <Clock size={48} />
                    <span className="text-xl font-bold">Clock In</span>
                </button>

                {/* Clock Out */}
                <button
                    onClick={() => onAction('CLOCK_OUT')}
                    disabled={isClockedOut}
                    className={`h-40 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                        !isClockedOut
                        ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-200 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                >
                    <LogOut size={48} />
                    <span className="text-xl font-bold">Clock Out</span>
                </button>

                {/* Start Break */}
                <button
                    onClick={() => onAction('BREAK_START')}
                    disabled={!isClockedIn}
                    className={`h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                        isClockedIn
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                >
                    <Coffee size={32} />
                    <span className="text-lg font-bold">Start Break</span>
                </button>

                 {/* End Break */}
                 <button
                    onClick={() => onAction('BREAK_END')}
                    disabled={!isOnBreak}
                    className={`h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                        isOnBreak
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                >
                    <ArrowRight size={32} />
                    <span className="text-lg font-bold">End Break</span>
                </button>

            </div>
            
            <button 
                onClick={onCancel}
                className="w-full mt-8 py-4 text-slate-400 font-semibold hover:text-slate-600 transition-colors"
            >
                Cancel and Return
            </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeControls;