'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, RotateCcw, Shield, Upload, ImageIcon, X } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RegisterFacePage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [captured, setCaptured] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [done, setDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WEBP).');
      return;
    }
    if (captured.length >= 3) {
      toast.error('Maximum 3 photos already added.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) setCaptured(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.slice(0, 3 - captured.length).forEach(handleFileUpload);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.slice(0, 3 - captured.length).forEach(handleFileUpload);
  };

  const removePhoto = (index: number) => {
    setCaptured(prev => prev.filter((_, i) => i !== index));
  };

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
      toast.error('Registration failed. Make sure your face is clearly visible in the photo.');
    }
    setIsRegistering(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-success/15 border-2 border-success/40 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">Face Registered! 🎉</h2>
          <p className="text-foreground-muted text-sm mb-6">
            Your biometric profile has been saved. You can now take proctored exams.
          </p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="btn-primary w-full justify-center py-3"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-base font-bold text-foreground">Face Registration</div>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Upload Your Photo</h2>
            <p className="text-foreground-muted text-sm">
              Upload a clear passport-size or face photo. This will be used to verify your identity before each exam.
            </p>
          </div>

          {/* Tips */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs text-primary font-semibold mb-2">📸 Photo Requirements</p>
            <ul className="text-xs text-foreground-muted space-y-1.5">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />Face clearly visible and centered</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />Good lighting — no shadows on face</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />No sunglasses, hats, or heavy makeup</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />Passport-size photos or ID photos work best</li>
            </ul>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => captured.length < 3 && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 p-10 ${
              captured.length >= 3
                ? 'opacity-40 cursor-not-allowed border-border bg-surface-3'
                : isDragging
                  ? 'border-primary bg-primary/10 cursor-copy'
                  : 'border-border hover:border-primary/60 bg-surface-3 hover:bg-surface-2 cursor-pointer'
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              isDragging ? 'bg-primary/20' : 'bg-surface-2'
            }`}>
              <ImageIcon className={`w-8 h-8 transition-colors ${isDragging ? 'text-primary' : 'text-foreground-muted'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {captured.length >= 3 ? 'Maximum 3 photos added' : 'Drop your photo here'}
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                or <span className="text-primary underline">click to browse</span> · JPG, PNG, WEBP supported
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Photo Thumbnails */}
          {captured.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground-muted mb-3 uppercase tracking-wider">
                Uploaded Photos ({captured.length}/3)
              </p>
              <div className="flex gap-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`flex-1 h-24 rounded-xl overflow-hidden border-2 relative group ${
                      captured[i] ? 'border-success' : 'border-border border-dashed'
                    }`}
                  >
                    {captured[i] ? (
                      <>
                        <img
                          src={captured[i]}
                          className="w-full h-full object-cover"
                          alt={`Face photo ${i + 1}`}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        <div className="absolute bottom-1.5 left-1.5 bg-success/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          ✓ Photo {i + 1}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-surface-3 flex flex-col items-center justify-center gap-1">
                        <ImageIcon className="w-5 h-5 text-foreground-subtle" />
                        <span className="text-xs text-foreground-subtle">Photo {i + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {captured.length > 0 && (
              <button
                onClick={() => setCaptured([])}
                className="btn-ghost px-3 py-2.5"
                title="Clear all photos"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={captured.length >= 3}
              className="btn-ghost flex-1 justify-center py-2.5 border border-border"
            >
              <Upload className="w-4 h-4" />
              {captured.length >= 3 ? 'All Photos Added' : `Add Photo ${captured.length + 1}/3`}
            </button>
            <button
              onClick={register}
              disabled={captured.length === 0 || isRegistering}
              className="btn-primary flex-1 justify-center py-2.5 bg-success hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Register Face <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
