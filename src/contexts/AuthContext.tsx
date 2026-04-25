import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

export type Division = 'marketing' | 'teknik' | 'keuangan' | 'audit' | 'hrd' | 'accounting';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  division: Division | null;
  loading: boolean;
  error: string | null;
  isMockMode: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  mockLogin: () => void;
  setDivision: (division: Division | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('propdev_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error parsing profile cache:', e);
      return null;
    }
  });
  const [division, setDivisionState] = useState<Division | null>(() => {
    return localStorage.getItem('propdev_division') as Division | null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(!isSupabaseConfigured);

  const setDivision = (div: Division | null) => {
    setDivisionState(div);
    if (div) {
      localStorage.setItem('propdev_division', div);
    } else {
      localStorage.removeItem('propdev_division');
    }
  };

  const mockLogin = () => {
    setIsMockMode(true);
    const mockUser = {
      id: 'mock-admin-id',
      email: 'admin@propdev.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    
    const mockProfile: Profile = {
      id: 'mock-admin-id',
      full_name: 'Admin Demo (Mock Mode)',
      username: 'admin',
      role: 'admin',
    };
    
    setUser(mockUser);
    setProfile(mockProfile);
    setLoading(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUserId = localStorage.getItem('propdev_user_id');
        
        if (savedUserId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', savedUserId)
            .single();
            
          if (profileData) {
            setProfile(profileData);
            setUser({ id: profileData.id, email: profileData.email } as User);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fungsi Hashing Sederhana (SHA-256) untuk keamanan sesuai guideline
  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const signIn = async (usernameInput: string, passwordInput: string) => {
    try {
      setLoading(true);
      setError(null);

      const cleanUsername = usernameInput.trim().toLowerCase();
      const hashedPassword = await hashPassword(passwordInput);

      // Cari di kolom username ATAU email
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.eq.${cleanUsername},email.eq.${cleanUsername},email.eq.${cleanUsername}@internal.com`)
        .eq('password', hashedPassword)
        .limit(1);

      if (profileError || !profilesData || profilesData.length === 0) {
        throw new Error('Username atau Password salah.');
      }

      const profileData = profilesData[0];

      setProfile(profileData);
      setUser({ id: profileData.id, email: profileData.email } as User);
      
      localStorage.setItem('propdev_user_id', profileData.id);
      localStorage.setItem('propdev_profile', JSON.stringify(profileData));

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Gagal masuk ke sistem.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: userId, 
                email: userEmail || '', 
                full_name: userEmail?.split('@')[0] || 'User',
                username: userEmail?.split('@')[0] || 'user',
                role: 'admin'
              }
            ])
            .select()
            .single();
          
          if (createError) throw createError;
          setProfile(newProfile);
          localStorage.setItem('propdev_profile', JSON.stringify(newProfile));
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        localStorage.setItem('propdev_profile', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('propdev_user_id');
    localStorage.removeItem('propdev_division');
    localStorage.removeItem('propdev_profile');
    setProfile(null);

    // 3. Trigger Supabase SignOut (Fire and forget)
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }

    // 4. PAKSA browser pindah ke login (Cara paling ampuh)
    // Ini akan merestart seluruh aplikasi dan memastikan state bersih
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, division, loading, error, isMockMode, signIn, signOut, mockLogin, setDivision }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
