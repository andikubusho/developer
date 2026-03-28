import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Building2, Sparkles, ShieldCheck } from 'lucide-react';
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
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
            </h3>
            <p className="text-slate-500 font-bold mt-2">
              {isRegister ? 'Bergabunglah dengan ekosistem properti cerdas' : 'Silakan masuk untuk melanjutkan akses sistem'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className={`p-4 border-none text-xs font-black uppercase tracking-widest rounded-2xl ${error.includes('berhasil') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-danger'}`}>
                {error}
              </div>
            )}
            <Input
              label="Email Perusahaan"
              type="email"
              placeholder="nama@perusahaan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 tracking-tight">Kata Sandi</label>
                {!isRegister && <button type="button" className="text-xs font-bold text-primary hover:underline">Lupa Password?</button>}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl text-md font-black shadow-xl shadow-indigo-100" isLoading={loading}>
              {isRegister ? 'Daftar Sekarang' : 'Masuk ke Dashboard'}
            </Button>
          </form>

          <div className="mt-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
                <span className="bg-white px-4 text-slate-400">Atau</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 hover:bg-slate-100 font-black transition-all"
              >
                {isRegister ? 'Kembali ke Login' : 'Belum punya akun? Daftar Sekarang'}
              </button>
              
              {!isRegister && (
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full h-14 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary rounded-2xl font-bold bg-transparent"
                    onClick={handleDemoLogin}
                  >
                    Coba Akun Demo
                  </Button>
                  
                  <button 
                    onClick={() => mockLogin()}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-colors italic"
                  >
                    Bypass Authentication (UI Testing Only)
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-[0.2rem] mt-12 pb-8">
            &copy; 2026 PropDev ERP Pro. Precision Redefined.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
