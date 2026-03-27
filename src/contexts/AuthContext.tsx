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
  isMockMode: boolean;
  signOut: () => Promise<void>;
  mockLogin: () => void;
  setDivision: (division: Division) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [division, setDivisionState] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(!isSupabaseConfigured);

  const setDivision = (div: Division) => {
    setDivisionState(div);
    localStorage.setItem('propdev_division', div);
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
      role: 'admin',
    };
    
    setUser(mockUser);
    setProfile(mockProfile);
    setLoading(false);
  };

  useEffect(() => {
    // Restore division from localStorage
    const savedDivision = localStorage.getItem('propdev_division') as Division | null;
    if (savedDivision) {
      setDivisionState(savedDivision);
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: userId, 
                email: userEmail || '', 
                name: userEmail?.split('@')[0] || 'User',
                role: 'admin' // Default to admin for first user/demo
              }
            ])
            .select()
            .single();
          
          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setDivisionState(null);
    localStorage.removeItem('propdev_division');
  };

  return (
    <AuthContext.Provider value={{ user, profile, division, loading, isMockMode, signOut, mockLogin, setDivision }}>
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
