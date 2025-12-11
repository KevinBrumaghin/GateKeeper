import React, { useState } from 'react';
import { auth } from '../services/auth';
import { AppMode } from '../types';
import { ShieldCheck, ArrowRight, UserPlus, LogIn, CheckCircle, Lock, Briefcase, Users } from 'lucide-react';

interface LandingAuthProps {
  onSuccess: () => void;
}

const LandingAuth: React.FC<LandingAuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    gymName: '',
    pin: '',
    mode: 'MEMBERSHIP' as AppMode
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await auth.login(formData.email, formData.password);
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error || 'Invalid email or password');
        }
      } else {
        // Validation
        if (!formData.gymName) {
            setError('Please enter your Business Name');
            setIsLoading(false);
            return;
        }
        if (formData.pin.length !== 4 || isNaN(Number(formData.pin))) {
            setError('PIN must be exactly 4 digits');
            setIsLoading(false);
            return;
        }

        const result = await auth.register(formData.email, formData.password, formData.gymName, formData.pin, formData.mode);
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side - Brand / Hero */}
      <div className="md:w-1/2 bg-slate-900 p-12 flex flex-col justify-between text-white relative overflow-hidden min-h-[400px]">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 z-0"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/50">
                <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <span className="font-extrabold text-3xl tracking-tight text-white">
                GATE<span className="text-blue-500">KEEPER</span>
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Secure Access <br/>
            <span className="text-blue-500">Made Simple.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            The universal check-in kiosk for businesses, gyms, clubs, and offices.
          </p>
        </div>

        <div className="relative z-10 mt-12 space-y-4 hidden md:block">
            <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="text-green-500 w-5 h-5" />
                <span>Instant Traffic Light Check-in</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="text-green-500 w-5 h-5" />
                <span>Smart Membership Management</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="text-green-500 w-5 h-5" />
                <span>Employee Time Tracking</span>
            </div>
        </div>

        <div className="mt-12 text-slate-600 text-sm relative z-10">
            © 2025 GateKeeper Systems.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="md:w-1/2 p-4 md:p-12 flex flex-col justify-center bg-gray-50 overflow-y-auto h-screen md:h-auto">
        <div className="max-w-md mx-auto w-full my-auto">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex gap-4 mb-8 p-1 bg-gray-100 rounded-xl">
                    <button 
                        onClick={() => { setIsLogin(true); setError(''); }}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => { setIsLogin(false); setError(''); }}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {isLogin ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-gray-500 mb-6 text-sm">
                    {isLogin ? 'Enter your credentials to access the kiosk.' : 'Create an account for your organization.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div 
                                    onClick={() => setFormData({...formData, mode: 'MEMBERSHIP'})}
                                    className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${formData.mode === 'MEMBERSHIP' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
                                >
                                    <Users size={24} />
                                    <span className="text-xs font-bold text-center">Membership</span>
                                </div>
                                <div 
                                    onClick={() => setFormData({...formData, mode: 'EMPLOYEE'})}
                                    className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${formData.mode === 'EMPLOYEE' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
                                >
                                    <Briefcase size={24} />
                                    <span className="text-xs font-bold text-center">Employee</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder={formData.mode === 'MEMBERSHIP' ? 'e.g. City Gym' : 'e.g. Tech Corp'}
                                    value={formData.gymName}
                                    onChange={e => setFormData({...formData, gymName: e.target.value})}
                                    />
                            </div>
                        </>
                    )}
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="admin@company.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin PIN (4 Digits)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    maxLength={4}
                                    pattern="\d{4}"
                                    inputMode="numeric"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pl-11 tracking-widest font-mono"
                                    placeholder="1234"
                                    value={formData.pin}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 4) setFormData({...formData, pin: val});
                                    }}
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                            <p className="text-xs text-gray-400 mt-1 ml-1">Used to access the dashboard from Kiosk mode.</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 mt-4"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLogin ? (
                                <>
                                    <LogIn size={20} />
                                    Access System
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    Create Account
                                </>
                            )
                        )}
                    </button>
                </form>

                {isLogin && (
                     <p className="text-center mt-6 text-xs text-gray-400">
                        Demo: <span className="font-mono text-gray-600">admin@gatekeeper.com / admin</span> (PIN: 1234)
                    </p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingAuth;