import React, { useState, useEffect } from 'react';
import Keypad from './components/Keypad';
import TrafficLight from './components/TrafficLight';
import WaiverCanvas from './components/WaiverCanvas';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import LandingAuth from './components/LandingAuth';
import EmployeeControls from './components/EmployeeControls';
import { db } from './services/db';
import { auth } from './services/auth';
import { supabase } from './services/supabase';
import { CheckInResult, CheckInStatus, ViewMode, Member, AppMode, EmployeeAction } from './types';
import { ShieldCheck, LayoutDashboard, LogOut, Briefcase } from 'lucide-react';

function App() {
  // Global Auth State
  const [hasSession, setHasSession] = useState(false);
  const [gymName, setGymName] = useState('');
  const [appMode, setAppMode] = useState<AppMode>('MEMBERSHIP');

  // App State
  const [view, setView] = useState<ViewMode>('KIOSK');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // For Admin Panel access
  const [isLoading, setIsLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [pendingWaiverMember, setPendingWaiverMember] = useState<Member | null>(null);
  const [pendingEmployeeMember, setPendingEmployeeMember] = useState<Member | null>(null);

  // Logout Verification State
  const [isVerifyingLogout, setIsVerifyingLogout] = useState(false);

  useEffect(() => {
    // Check for existing session on load
    if (auth.isAuthenticated()) {
      loadSession();
    }
  }, []);

  const loadSession = async () => {
     // Verify real session with Supabase to avoid "Zombie Session" where local storage says logged in but Supabase token is missing/invalid
     const { data } = await supabase.auth.getSession();
     if (!data.session) {
         // Zombie state detected: Clean up and force login
         auth.logout();
         setHasSession(false);
         return;
     }

     const user = auth.getCurrentUser();
     setGymName(user?.gymName || 'GateKeeper');
     setAppMode(user?.mode || 'MEMBERSHIP');
     setHasSession(true);
  }

  const handleGlobalLogoutRequest = () => {
    setIsVerifyingLogout(true);
  };

  const confirmGlobalLogout = () => {
    auth.logout();
    setHasSession(false);
    setView('KIOSK');
    setIsAuthenticated(false);
    setIsVerifyingLogout(false);
  };

  const handleCheckIn = async (code: string) => {
    setIsLoading(true);
    
    // Check by Member Number ID
    const member = await db.findMemberByNumber(code);
    setIsLoading(false);

    if (!member) {
      setCheckInResult({ status: CheckInStatus.NOT_FOUND });
      return;
    }

    // === EMPLOYEE MODE LOGIC ===
    if (appMode === 'EMPLOYEE') {
        // Skip waiver check for employees, go straight to controls
        setPendingEmployeeMember(member);
        return;
    }

    // === MEMBERSHIP MODE LOGIC ===
    
    // Check expiration
    const now = new Date();
    const expDate = new Date(member.expirationDate);

    if (expDate < now) {
      setCheckInResult({ status: CheckInStatus.EXPIRED, member });
      return;
    }

    // Check Waiver
    if (!member.hasWaiver) {
      setCheckInResult({ status: CheckInStatus.NO_WAIVER, member });
      // Short delay to show the orange screen before opening waiver modal
      setTimeout(() => {
        setCheckInResult(null);
        setPendingWaiverMember(member);
      }, 2000);
      return;
    }

    // Green Light
    setCheckInResult({ status: CheckInStatus.SUCCESS, member });
  };

  const handleEmployeeAction = async (action: EmployeeAction) => {
    if (pendingEmployeeMember) {
        await db.logTime(pendingEmployeeMember.id, action);
        
        let title = "SUCCESS";
        let message = "Action Recorded";

        switch(action) {
            case 'CLOCK_IN': title = "CLOCKED IN"; message = "Have a great shift,"; break;
            case 'CLOCK_OUT': title = "CLOCKED OUT"; message = "See you next time,"; break;
            case 'BREAK_START': title = "ON BREAK"; message = "Enjoy your break,"; break;
            case 'BREAK_END': title = "BACK TO WORK"; message = "Welcome back,"; break;
        }

        setCheckInResult({ 
            status: CheckInStatus.SUCCESS, 
            member: pendingEmployeeMember,
            title,
            message
        });
        setPendingEmployeeMember(null);
    }
  };

  const handleWaiverSave = async (signature: string) => {
    if (pendingWaiverMember) {
      await db.saveWaiver(pendingWaiverMember.id, signature);
      setPendingWaiverMember(null);
      // Automatically show success screen after signing
      setCheckInResult({ status: CheckInStatus.SUCCESS, member: pendingWaiverMember });
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    setView('KIOSK');
  };

  // If no session, show Landing/Auth screen
  if (!hasSession) {
    return <LandingAuth onSuccess={loadSession} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-gray-900">
      
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10 relative">
        <div className="flex items-center gap-2 select-none">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">
            {gymName.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {view === 'KIOSK' ? (
            <>
                <button 
                  onClick={() => setView('ADMIN')}
                  className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <LayoutDashboard size={18} />
                  <span className="hidden sm:inline">Admin Access</span>
                </button>
                 <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block"></div>
                <button 
                  onClick={handleGlobalLogoutRequest}
                  className="text-sm font-medium text-red-400 hover:text-red-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Logout completely"
                >
                  <LogOut size={18} />
                </button>
            </>
          ) : (
            <button 
              onClick={handleAdminLogout}
              className="text-sm font-medium text-gray-500 hover:text-red-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Exit Admin</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-0">
        {view === 'KIOSK' && (
          <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  {appMode === 'MEMBERSHIP' ? 'Member Check-in' : 'Employee Check-in'}
              </h2>
              <p className="text-slate-500">
                  {appMode === 'MEMBERSHIP' ? 'Enter your Member Number to access.' : 'Enter your Employee ID to clock in.'}
              </p>
            </div>
            
            <Keypad 
                onSubmit={handleCheckIn} 
                isLoading={isLoading} 
                label={appMode === 'MEMBERSHIP' ? 'Enter Member ID' : 'Enter Employee ID'}
            />
            
            <div className="mt-12 text-center text-xs text-gray-400">
              <p>Powered by GateKeeper Systems</p>
            </div>
          </div>
        )}

        {view === 'ADMIN' && (
          isAuthenticated ? (
            <AdminPanel />
          ) : (
            <div className="min-h-[80vh] flex items-center justify-center">
                <AdminLogin 
                onLogin={() => setIsAuthenticated(true)} 
                onCancel={handleAdminLogout} 
                />
            </div>
          )
        )}
      </main>

      {/* Overlays */}
      <TrafficLight 
        result={checkInResult} 
        onReset={() => setCheckInResult(null)} 
      />

      {pendingWaiverMember && (
        <WaiverCanvas 
          memberName={pendingWaiverMember.name} 
          onSave={handleWaiverSave}
          onCancel={() => setPendingWaiverMember(null)}
        />
      )}

      {pendingEmployeeMember && (
          <EmployeeControls 
            member={pendingEmployeeMember}
            onAction={handleEmployeeAction}
            onCancel={() => setPendingEmployeeMember(null)}
          />
      )}

      {/* Logout Verification Modal */}
      {isVerifyingLogout && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="w-full max-w-sm">
                <AdminLogin 
                    onLogin={confirmGlobalLogout} 
                    onCancel={() => setIsVerifyingLogout(false)}
                    title="Confirm Logout" 
                />
             </div>
        </div>
      )}
    </div>
  );
}

export default App;