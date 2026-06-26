'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    
    try {
      await authAPI.register(formData);
      toast.success('Registration successful! Please login.');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">ProctorAI</div>
            <div className="text-xs text-foreground-muted">Student Portal</div>
          </div>
        </div>
        
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
          <p className="text-foreground-muted text-sm mb-6">Register with your Saveetha email address.</p>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-1.5">Saveetha Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="name@university.edu" className="ai-input pl-10" required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground-muted block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="password" name="password" value={formData.password} onChange={handleChange}
                  placeholder="••••••••••" className="ai-input pl-10" required minLength={8}
                />
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-3 mt-2">
              {loading ? 'Creating Account...' : (
                <div className="flex items-center gap-2">
                  Register Account <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-foreground-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
