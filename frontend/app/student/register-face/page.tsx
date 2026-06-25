'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { Camera, CheckCircle2, ArrowRight, RotateCcw, Info, Shield } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RegisterFacePage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const webcamRef = useRef<Webcam>(null);
  const [captured, setCaptured] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const capturePhoto = useCallback(() => {
    if (captured.length >= 3) return;
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          const img = webcamRef.current?.getScreenshot();
          if (img) setCaptured(prev => [...prev, img]);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [captured.length]);

  const register = async () => {
    if (captured.length === 0) return;
    setIsRegistering(true);
    let successCount = 0;
    for (const img of captured) {
      try {
        await authAPI.registerFace(img);
        successCount++;
      } catch {}
    }
    if (successCount > 0) {
      updateUser({ face_verified: true });
      setDone(true);
      toast.success('Face registered successfully!');
    } else {
      toast.error('Registration failed. Please try again.');
    }
    setIsRegistering(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">Face Registered!</h2>
          <p className="text-foreground-muted text-sm mb-6">Your biometric profile has been saved. You can now take proctored exams.</p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-primary w-full justify-center py-3">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-base font-bold text-foreground">Face Registration</div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Register Your Face</h2>
          <p className="text-foreground-muted text-sm mb-4">Capture 3 photos for accurate face recognition. Look straight and slightly left/right.</p>

          <div className="relative rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: '4/3' }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.9}
              className="w-full h-full object-cover"
              videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-52 border-2 border-dashed border-primary/60 rounded-full" />
            </div>
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-8xl font-bold text-white">{countdown}</div>
              </div>
            )}
          </div>

          {/* Captured thumbnails */}
          <div className="flex gap-3 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className={`flex-1 h-20 rounded-xl overflow-hidden border-2 ${captured[i] ? 'border-success' : 'border-border border-dashed'}`}>
                {captured[i]
                  ? <img src={captured[i]} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                  : <div className="w-full h-full bg-surface-3 flex items-center justify-center text-xs text-foreground-muted">Photo {i + 1}</div>
                }
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            {captured.length > 0 && (
              <button onClick={() => setCaptured([])} className="btn-ghost px-3 py-2.5">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={capturePhoto}
              disabled={captured.length >= 3 || countdown > 0}
              className="btn-primary flex-1 justify-center py-2.5"
            >
              <Camera className="w-4 h-4" />
              {captured.length >= 3 ? 'All Photos Taken' : `Capture Photo ${captured.length + 1}/3`}
            </button>
            {captured.length >= 1 && (
              <button
                onClick={register}
                disabled={isRegistering}
                className="btn-primary flex-1 justify-center py-2.5 bg-success hover:bg-emerald-600"
              >
                {isRegistering ? 'Registering...' : 'Register Face'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
