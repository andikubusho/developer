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
    <div className="min-h-screen bg-page flex overflow-hidden selection:bg-accent-lavender/30">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-mint/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-lavender/20 blur-[120px] rounded-full" />
      
      <div className="flex-1 hidden lg:flex flex-col justify-center p-20 bg-white/10 backdrop-blur-glass relative overflow-hidden border-r border-white/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,var(--color-accent-mint)_1px,transparent_0)] bg-[length:40px_40px]" />
        
        <div className="relative z-10">
          <img 
            src="/logo-perusahaan.png" 
            alt="Company Logo" 
            className="h-40 w-auto max-w-full object-contain object-left mb-10 mix-blend-multiply scale-[1.3] origin-left"
          />
          <h2 className="text-6xl font-black text-accent-dark leading-tight tracking-tight">
            Manajemen Properti <br /> Berbasis <span className="text-accent-lavender italic">Masa Depan.</span>
          </h2>
          <p className="text-text-secondary mt-8 text-xl font-medium max-w-xl leading-relaxed">
            PropDev ERP membantu ribuan pengembang mengelola proyek, marketing, keuangan, dan SDM dalam satu ekosistem yang cerdas dan efisien.
          </p>
          
          <div className="grid grid-cols-2 gap-8 mt-16 max-w-lg">
            <div className="p-6 rounded-xl bg-white/40 border border-white/60 backdrop-blur-glass-sm shadow-glass transition-transform hover:-translate-y-1">
              <Sparkles className="text-accent-lavender w-8 h-8 mb-4" />
              <p className="text-accent-dark font-bold">Smart Automation</p>
              <p className="text-text-secondary text-sm mt-1">Otomasi laporan keuangan & progress harian.</p>
            </div>
            <div className="p-6 rounded-xl bg-white/40 border border-white/60 backdrop-blur-glass-sm shadow-glass transition-transform hover:-translate-y-1">
              <ShieldCheck className="text-accent-mint w-8 h-8 mb-4" />
              <p className="text-accent-dark font-bold">Secure Infrastructure</p>
              <p className="text-text-secondary text-sm mt-1">Sistem audit & enkripsi data standar industri.</p>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-20 opacity-30">
          <p className="text-accent-dark font-black uppercase tracking-[0.4em] text-xs">PropDev ERP Pro v2.6.0</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md glass-card/40 backdrop-blur-glass p-10 rounded-xl border border-white/70 shadow-glass-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-mint via-accent-lavender to-accent-peach opacity-50" />
          
            <img 
              src="/src/assets/logo-perusahaan.png" 
              alt="Company Logo" 
              className="h-24 w-auto max-w-[280px] object-contain mx-auto mb-6 mix-blend-multiply scale-[1.3] origin-center"
            />

          <div className="mb-10 text-center">
            <h3 className="text-3xl font-black text-accent-dark tracking-tight">Selamat Datang</h3>
            <p className="text-text-secondary font-bold mt-2 uppercase tracking-widest text-[10px] opacity-70">Silakan masuk untuk melanjutkan akses sistem</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div role="alert" aria-live="assertive" className="p-4 bg-red-400/10 border border-red-400/20 text-xs font-black uppercase tracking-widest rounded-pill text-red-500 text-center">
                {error}
              </div>
            )}
            <Input
              label="Username (ID Login)"
              type="text"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              required
            />
            <Input
              label="Kata Sandi"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-14 text-md font-black" isLoading={loading}>
              Masuk ke Dashboard
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-white/40 w-full"></div>
              <span className="bg-white/10 backdrop-blur-glass px-4 text-[10px] font-black text-text-secondary uppercase tracking-widest absolute">Atau</span>
            </div>

            <Button 
              type="button" 
              variant="secondary" 
              onClick={mockLogin}
              className="w-full h-14"
            >
              Masuk Mode Demo (Admin)
            </Button>
          </form>

          <p className="text-center text-text-muted text-[9px] font-bold uppercase tracking-[0.2rem] mt-12">
            &copy; 2026 PropDev ERP Pro. Precision Redefined.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
