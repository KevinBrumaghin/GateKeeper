import React, { useEffect } from 'react';
import { CheckCircle, XCircle, FileWarning, UserX, Clock } from 'lucide-react';
import { CheckInResult, CheckInStatus } from '../types';

interface TrafficLightProps {
  result: CheckInResult | null;
  onReset: () => void;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ result, onReset }) => {
  useEffect(() => {
    // Auto reset after 3 seconds so the next person can check in
    if (result) {
      const timer = setTimeout(() => {
        onReset();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [result, onReset]);

  if (!result) return null;

  const getStatusConfig = (status: CheckInStatus) => {
    switch (status) {
      case CheckInStatus.SUCCESS:
        return {
          bg: 'bg-green-500',
          icon: <CheckCircle className="w-32 h-32 text-white mb-6 drop-shadow-lg" />,
          title: result.title || 'ACCESS GRANTED',
          sub: result.message || 'Welcome back,',
          textColor: 'text-white'
        };
      case CheckInStatus.EXPIRED:
        return {
          bg: 'bg-red-600',
          icon: <XCircle className="w-32 h-32 text-white mb-6 drop-shadow-lg" />,
          title: 'MEMBERSHIP EXPIRED',
          sub: 'Please see the front desk.',
          textColor: 'text-white'
        };
      case CheckInStatus.NO_WAIVER:
        return {
          bg: 'bg-orange-500',
          icon: <FileWarning className="w-32 h-32 text-white mb-6 drop-shadow-lg" />,
          title: 'WAIVER REQUIRED',
          sub: 'Please sign the digital waiver.',
          textColor: 'text-white'
        };
      case CheckInStatus.NOT_FOUND:
        return {
          bg: 'bg-slate-800',
          icon: <UserX className="w-32 h-32 text-white mb-6 drop-shadow-lg" />,
          title: 'NOT FOUND',
          sub: 'Please try again or register.',
          textColor: 'text-white'
        };
      default:
        return {
            bg: 'bg-slate-800',
            icon: <UserX className="w-32 h-32 text-white mb-6 drop-shadow-lg" />,
            title: 'ERROR',
            sub: 'Unknown status',
            textColor: 'text-white'
        };
    }
  };

  const config = getStatusConfig(result.status);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 ${config.bg}`}>
      <div className="text-center animate-in zoom-in duration-300 slide-in-from-bottom-10">
        <div className="flex justify-center animate-bounce">
            {config.icon}
        </div>
        <h1 className={`text-5xl font-black tracking-tighter uppercase mb-4 ${config.textColor} drop-shadow-md`}>
          {config.title}
        </h1>
        <p className={`text-2xl font-medium ${config.textColor} opacity-90`}>
          {config.sub} {result.member?.name}
        </p>
        
        {/* Expiration Date Info */}
        {result.status === CheckInStatus.EXPIRED && result.member && (
             <div className="mt-8 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white">
                <p className="text-sm uppercase tracking-widest font-bold opacity-75">Expiration Date</p>
                <p className="text-xl font-mono">
                    {new Date(result.member.expirationDate).toLocaleDateString()}
                </p>
             </div>
        )}

        {/* Employee Timestamp Info */}
        {result.status === CheckInStatus.SUCCESS && result.message && (
             <div className="mt-8 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white">
                <div className="flex items-center gap-2 justify-center">
                    <Clock size={20} />
                    <p className="text-xl font-mono">
                        {new Date().toLocaleTimeString()}
                    </p>
                </div>
             </div>
        )}
      </div>

      {/* Manual close button if they don't want to wait */}
      <button 
        onClick={onReset}
        className="absolute bottom-10 px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors font-semibold"
      >
        Dismiss
      </button>
    </div>
  );
};

export default TrafficLight;