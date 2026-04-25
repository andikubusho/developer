import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Building2, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { user, signIn, mockLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const internalEmail = `${username.toLowerCase()}@internal.com`;
      const result = await signIn(username, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Username atau Password salah.');
      }
      
      navigate('/');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
      
      <div className="flex-1 hidden lg:flex flex-col justify-center p-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:40px_40px]" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-10 border border-white/10 shadow-2xl">
            <Building2 className="text-white w-10 h-10" />
          </div>
          <h2 className="text-6xl font-black text-white leading-tight tracking-tight">
            Manajemen Properti <br /> Berbasis <span className="text-indigo-200 italic">Masa Depan.</span>
          </h2>
          <p className="text-indigo-100/70 mt-8 text-xl font-medium max-w-xl leading-relaxed">
            PropDev ERP membantu ribuan pengembang mengelola proyek, marketing, keuangan, dan SDM dalam satu ekosistem yang cerdas dan efisien.
          </p>
          
          <div className="grid grid-cols-2 gap-8 mt-16 max-w-lg">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Sparkles className="text-indigo-200 w-8 h-8 mb-4" />
              <p className="text-white font-bold">Smart Automation</p>
              <p className="text-indigo-100/50 text-sm mt-1">Otomasi laporan keuangan & progress harian.</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <ShieldCheck className="text-indigo-200 w-8 h-8 mb-4" />
              <p className="text-white font-bold">Secure Infrastructure</p>
              <p className="text-indigo-100/50 text-sm mt-1">Sistem audit & enkripsi data standar industri.</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-20 opacity-30">
          <p className="text-white font-black uppercase tracking-[0.4em] text-xs">PropDev ERP Pro v2.6.0</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:rounded-l-[60px] shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.03)] z-10 transition-all">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6">
              <Building2 className="text-primary w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PropDev ERP</h1>
          </div>

          <div className="mb-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h3>
            <p className="text-slate-500 font-bold mt-2">Silakan masuk untuk melanjutkan akses sistem</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border-none text-xs font-black uppercase tracking-widest rounded-2xl text-danger">
                {error}
              </div>
            )}
            <Input
              label="Username"
              type="text"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              required
            />
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 tracking-tight">Kata Sandi</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl text-md font-black shadow-xl shadow-indigo-100" isLoading={loading}>
              Masuk ke Dashboard
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-100 w-full"></div>
              <span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest absolute">Atau</span>
            </div>

            <Button 
              type="button" 
              variant="ghost" 
              onClick={mockLogin}
              className="w-full h-14 rounded-2xl text-slate-500 border-2 border-slate-100 hover:bg-slate-50 font-bold"
            >
              Masuk Mode Demo (Admin)
            </Button>
          </form>

          <p className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-[0.2rem] mt-12 pb-8">
            &copy; 2026 PropDev ERP Pro. Precision Redefined.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
