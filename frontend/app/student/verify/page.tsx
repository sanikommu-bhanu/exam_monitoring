'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { Shield, Camera, CheckCircle2, XCircle, User, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Step = 'intro' | 'camera' | 'verifying' | 'success' | 'failed';

export default function IdentityVerificationPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const webcamRef = useRef<Webcam>(null);
  const [step, setStep] = useState<Step>('intro');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ confidence: number; message: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  const capturePhoto = useCallback(() => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          const img = webcamRef.current?.getScreenshot();
          if (img) {
            setCapturedImage(img);
            verifyIdentity(img);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const verifyIdentity = async (image: string) => {
    setStep('verifying');
    try {
      const { data } = await authAPI.verifyFace(image);
      setVerifyResult({ confidence: data.confidence, message: data.message });
      setStep(data.verified ? 'success' : 'failed');
    } catch (error: any) {
      setVerifyResult({ confidence: 0, message: error.response?.data?.detail || 'Verification failed' });
      setStep('failed');
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setVerifyResult(null);
    setStep('camera');
  };

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-foreground">ProctorAI</div>
            <div className="text-xs text-foreground-muted">Identity Verification</div>
          </div>
        </div>

        <div className="glass-card p-8">
          <AnimatePresence mode="wait">
            {/* Intro step */}
            {step === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4 animate-float">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Identity Verification</h2>
                  <p className="text-foreground-muted text-sm mt-2">
                    Please look at the camera for face verification before your exam begins.
                  </p>
                </div>

                <div className="bg-surface-3 rounded-xl p-4 mb-6 space-y-2">
                  {[
                    'Ensure good lighting on your face',
                    'Look directly at the camera',
                    'Remove glasses if possible',
                    'Keep a neutral expression',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {tip}
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4">
                  <div className="text-sm text-foreground-muted">Verifying as:</div>
                  <div className="text-base font-bold text-foreground mt-1">{user?.full_name}</div>
                  <div className="text-sm text-foreground-muted">{user?.student_id}</div>
                </div>

                <button onClick={() => setStep('camera')} className="btn-primary w-full justify-center py-3">
                  <Camera className="w-5 h-5" />
                  Open Camera
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Camera step */}
            {step === 'camera' && (
              <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="text-lg font-bold text-foreground text-center mb-4">Position Your Face</h2>

                <div className="relative rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: '4/3' }}>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.9}
                    className="w-full h-full object-cover"
                    videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                  />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      <div className="w-48 h-56 border-2 border-dashed border-emerald-400/70 rounded-full" />
                      {/* Corner decorations */}
                      {['-top-2 -left-2', '-top-2 -right-2', '-bottom-2 -left-2', '-bottom-2 -right-2'].map((pos, i) => (
                        <div key={i} className={`absolute ${pos} w-4 h-4 border-2 border-emerald-400 ${i < 2 ? 'border-b-0' : 'border-t-0'} ${i % 2 === 0 ? 'border-r-0' : 'border-l-0'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Scanning effect */}
                  <div className="absolute inset-0 scan-overlay opacity-50 pointer-events-none" />

                  {/* Countdown overlay */}
                  {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-8xl font-bold text-white">{countdown}</div>
                    </div>
                  )}
                </div>

                <p className="text-center text-sm text-foreground-muted mb-4">
                  Center your face in the oval guide and click Capture
                </p>

                <button
                  onClick={capturePhoto}
                  disabled={countdown > 0}
                  className="btn-primary w-full justify-center py-3"
                >
                  <Camera className="w-5 h-5" />
                  {countdown > 0 ? `Capturing in ${countdown}...` : 'Capture Photo'}
                </button>
              </motion.div>
            )}

            {/* Verifying step */}
            {step === 'verifying' && (
              <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                {capturedImage && (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 mx-auto mb-6">
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                  </div>
                )}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Verifying Identity...</h2>
                <p className="text-foreground-muted text-sm">Comparing face with registered profile</p>

                <div className="mt-6 space-y-2 text-left">
                  {['Detecting face landmarks', 'Computing facial embeddings', 'Matching with registered profile'].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      <span className="text-foreground-muted">{s}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Success step */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </motion.div>

                {capturedImage && (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-success/40 mx-auto mb-4">
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Verified" />
                  </div>
                )}

                <h2 className="text-xl font-bold text-foreground mb-1">Identity Verified!</h2>
                <p className="text-foreground-muted text-sm mb-2">{verifyResult?.message}</p>
                <div className="text-success font-bold text-lg mb-6">
                  Match Confidence: {verifyResult?.confidence?.toFixed(1)}%
                </div>

                <div className="bg-success/5 border border-success/20 rounded-xl p-3 mb-6 text-sm text-success">
                  ✓ You may now proceed to your exam
                </div>

                <button onClick={() => router.push(`/student/exam/${user?.id}`)} className="btn-primary w-full justify-center py-3">
                  Proceed to Exam
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Failed step */}
            {step === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 rounded-full bg-danger/15 border-2 border-danger/40 flex items-center justify-center mx-auto mb-4"
                >
                  <XCircle className="w-10 h-10 text-danger" />
                </motion.div>

                <h2 className="text-xl font-bold text-foreground mb-1">Verification Failed</h2>
                <p className="text-foreground-muted text-sm mb-2">{verifyResult?.message}</p>
                {typeof verifyResult?.confidence === 'number' && verifyResult.confidence > 0 && (
                  <div className="text-danger font-bold mb-4">
                    Match: {verifyResult.confidence.toFixed(1)}% (Required: 60%+)
                  </div>
                )}

                <div className="bg-danger/5 border border-danger/20 rounded-xl p-3 mb-6 text-sm text-danger">
                  Ensure good lighting and look directly at the camera
                </div>

                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 btn-ghost justify-center py-3">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button className="flex-1 btn-danger justify-center py-3">
                    Contact Admin
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-4 text-xs text-foreground-subtle">
          Powered by AI • Secure • Private
        </div>
      </motion.div>
    </div>
  );
}
