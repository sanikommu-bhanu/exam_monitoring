'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Shield, Cpu, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<'admin' | 'student'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data } = await authAPI.login(email, password);
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Welcome back, ${data.user.full_name}!`);
      
      if (data.user.role === 'student') {
        if (!data.user.is_profile_complete) {
          router.push('/student/profile');
        } else if (!data.user.face_verified) {
          router.push('/student/register-face');
        } else {
          router.push('/student/dashboard');
        }
      } else {
        router.push('/admin/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col w-1/2 p-12 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(79,110,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(79,110,247,0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/15 rounded-full blur-3xl" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">ProctorAI</div>
            <div className="text-xs text-foreground-muted">Smart Exam Monitoring</div>
          </div>
        </div>
        
        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Proctoring
            </div>
            <h1 className="text-5xl font-bold text-foreground leading-tight mb-6">
              Intelligent<br />
              <span className="gradient-text">Exam Security</span><br />
              at Scale
            </h1>
            <p className="text-foreground-muted text-lg leading-relaxed max-w-md">
              Advanced facial authentication, real-time behavioral analysis, and 
              AI-driven monitoring for academic integrity you can trust.
            </p>
          </motion.div>
          
          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            {[
              { icon: '👁', label: 'Eye Tracking' },
              { icon: '🧠', label: 'AI Behavioral Analysis' },
              { icon: '📱', label: 'Phone Detection' },
              { icon: '🔒', label: 'Face Authentication' },
            ].map((f) => (
              <div key={f.label}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-sm text-foreground-muted">
                <span className="text-base">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </motion.div>
          
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 grid grid-cols-3 gap-6"
          >
            {[
              { value: '99.2%', label: 'Detection accuracy' },
              { value: '< 200ms', label: 'Analysis latency' },
              { value: '50K+', label: 'Exams monitored' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-foreground-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
        
        <div className="relative z-10 text-xs text-foreground-muted flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          Secure • Reliable • AI Powered
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-base font-bold text-foreground">ProctorAI</div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Welcome Back!</h2>
            <p className="text-foreground-muted mt-2">Please login to continue</p>
          </div>
          
          {/* Tab switcher */}
          <div className="flex bg-surface-2 p-1 rounded-xl mb-6 border border-border">
            {(['admin', 'student'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${
                  tab === t
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {t === 'admin' ? 'Email Login' : 'Student Login'}
              </button>
            ))}
          </div>
          
          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tab === 'admin' ? 'admin@university.edu' : 'student@university.edu'}
                  className="ai-input pl-10"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="ai-input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-surface-2 accent-primary"
                />
                <span className="text-sm text-foreground-muted">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Login
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-foreground-muted uppercase">
              <span className="bg-background px-3">OR</span>
            </div>
          </div>
          
          <button className="btn-ghost w-full justify-center py-3">
            <Cpu className="w-4 h-4" />
            Login with SSO
          </button>
          
          <p className="mt-6 text-center text-sm text-foreground-muted">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline font-medium">
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
      
      {/* Bottom bar */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <span className="text-xs text-foreground-subtle">
          Powered by AI • Secure • Private
        </span>
      </div>
    </div>
  );
}
