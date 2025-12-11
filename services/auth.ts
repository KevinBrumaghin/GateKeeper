import { AppMode } from '../types';
import { supabase } from './supabase';

const SESSION_KEY = 'gatekeeper_session_meta';

interface AuthResponse {
    success: boolean;
    error?: string;
}

export const auth = {
  isAuthenticated: (): boolean => {
    // Check local storage for basic presence, but Supabase SDK handles real state
    return !!localStorage.getItem(SESSION_KEY);
  },

  getCurrentUser: () => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login failed:", error);
        return { success: false, error: error.message };
    }

    if (!data.user || !data.session) {
        return { success: false, error: "Login failed. Please check your email to verify your account." };
    }

    // Store metadata for the UI
    const metadata = data.user.user_metadata;
    const sessionData = {
        username: email,
        gymName: metadata.gymName || 'My Gym',
        mode: metadata.mode || 'MEMBERSHIP',
        pin: metadata.pin || '1234'
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { success: true };
  },

  register: async (email: string, password: string, gymName: string, pin: string, mode: AppMode): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                gymName,
                pin,
                mode
            }
        }
    });

    if (error) {
        console.error("Registration failed:", error);
        return { success: false, error: error.message };
    }

    // Check for existing user (Supabase security feature)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { success: false, error: "This email is already registered." };
    }

    // CRITICAL FIX: If user exists but no session, Email Verification is required.
    // Do NOT log them in locally.
    if (data.user && !data.session) {
        return { 
            success: false, 
            error: "Registration successful! Please check your email to confirm your account before logging in." 
        };
    }

    if (!data.user) {
        return { success: false, error: "Registration failed." };
    }

    // Only auto-login if we actually have a session
    const sessionData = {
        username: email,
        gymName,
        mode,
        pin
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { success: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  },

  verifyPin: async (pin: string): Promise<boolean> => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    const user = JSON.parse(session);
    return user.pin === pin;
  }
};