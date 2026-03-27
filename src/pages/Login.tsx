import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { mockLogin, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('Pendaftaran berhasil! Silakan cek email Anda atau langsung login jika email dikonfirmasi otomatis.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Gagal terhubung ke database. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diset di Secrets.');
      } else {
        setError(err.message || 'Gagal. Periksa kembali data Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@propdev.com');
    setPassword('password123');
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">PropDev ERP</h1>
          <p className="text-slate-500 mt-2">
            {isRegister ? 'Daftar akun baru' : 'Masuk ke sistem manajemen properti'}
          </p>
        </div>

        <Card className="shadow-xl border-none">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className={`p-3 border text-sm rounded-lg ${error.includes('berhasil') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              {isRegister ? 'Daftar' : 'Masuk'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            </button>
            
            {!isRegister && (
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                  onClick={handleDemoLogin}
                >
                  Gunakan Akun Demo
                </Button>
                
                <button 
                  onClick={() => {
                    mockLogin();
                  }}
                  className="w-full text-xs text-slate-400 hover:text-indigo-500 underline"
                >
                  Bypass Login (Mode Testing UI)
                </button>
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-slate-400 text-xs mt-8">
          &copy; 2026 PropDev ERP Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
