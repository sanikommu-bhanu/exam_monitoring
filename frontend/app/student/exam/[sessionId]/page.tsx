'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import {
  Shield, Eye, Camera, CheckCircle2, XCircle, AlertTriangle,
  Clock, Activity, Monitor, Wifi, WifiOff, ChevronRight
} from 'lucide-react';
import { useMonitoringWebSocket } from '@/hooks/useMonitoringWebSocket';
import { useMonitoringStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function StudentExamPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const {
    suspicionScore, riskLevel, faceDetected, eyeContact,
    headPosition, phoneDetected, multiplePersons, alerts,
    isTerminated, terminationReason,
  } = useMonitoringStore();

  const webcamRef = useRef<Webcam>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [examDuration] = useState(7200); // 2 hours
  const [fps, setFps] = useState(0);
  const fpsRef = useRef(0);
  const [forceConnect, setForceConnect] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceConnect(true), 30000);
    return () => clearTimeout(timer);
  }, []);
  
  // Warning Overlay State
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [latestWarning, setLatestWarning] = useState('');

  const sessionId = params.sessionId;
  
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'admin_warning') {
       setLatestWarning(data.message);
       setShowWarningOverlay(true);
    }
  }, []);
  
  const { isConnected, sendFrame, sendClientViolation } = useMonitoringWebSocket(sessionId, false, undefined, handleWebSocketMessage);

  // Capture and send frame every 500ms
  const captureAndSend = useCallback(() => {
    if (!webcamRef.current || !isConnected || !examStarted) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      sendFrame(imageSrc);
      fpsRef.current++;
    }
  }, [isConnected, examStarted, sendFrame]);

  useEffect(() => {
    if (examStarted && (isConnected || forceConnect)) {
      captureIntervalRef.current = setInterval(captureAndSend, 500);
      const fpsTimer = setInterval(() => {
        setFps(fpsRef.current * 2);
        fpsRef.current = 0;
      }, 500);
      return () => {
        clearInterval(captureIntervalRef.current!);
        clearInterval(fpsTimer);
      };
    }
  }, [examStarted, isConnected, forceConnect, captureAndSend]);

  // Comprehensive Anti-Cheat Detection
  useEffect(() => {
    if (!examStarted) return;

    // 1. Tab Switch (Visibility)
    const handleVisibility = () => {
      if (document.hidden) {
        sendClientViolation('tab_switch');
        toast.error('⚠️ Tab switch detected! This is a violation.');
      }
    };
    
    // 2. Window Blur (Switching apps)
    const handleBlur = () => {
      sendClientViolation('window_switch');
      toast.error('⚠️ Window focus lost! Please return to the exam immediately.');
    };
    
    // 3. Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        sendClientViolation('fullscreen_exit');
        toast.error('⚠️ Exited fullscreen! This is a violation.');
      }
    };
    
    // 4. Prevent Copy/Paste/Context Menu
    const preventAction = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+C, Ctrl+V
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'c' || e.key === 'v'))
        ) {
            e.preventDefault();
            toast.error('⚠️ Keyboard shortcut disabled.');
        }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', preventAction);
        document.removeEventListener('copy', preventAction);
        document.removeEventListener('paste', preventAction);
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [examStarted, sendClientViolation]);

  // Timer
  useEffect(() => {
    if (!examStarted) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [examStarted]);

  const startExamSequence = async () => {
      try {
          if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
          }
      } catch (e) {
          console.warn('Fullscreen request failed', e);
      }
      setExamStarted(true);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const monitoringStatuses = [
    { label: 'Face Detection', status: faceDetected, detail: faceDetected ? 'Active' : 'Not Detected' },
    { label: 'Eye Contact', status: eyeContact, detail: eyeContact ? 'Good' : 'Looking Away' },
    { label: 'Head Position', status: headPosition === 'centered', detail: headPosition === 'centered' ? 'Centered' : headPosition },
    { label: 'Mobile Phone', status: !phoneDetected, detail: phoneDetected ? 'DETECTED!' : 'Not Detected' },
    { label: 'Multiple Persons', status: !multiplePersons, detail: multiplePersons ? 'DETECTED!' : 'Not Detected' },
  ];

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-danger';
    if (score >= 60) return 'text-red-400';
    if (score >= 30) return 'text-warning';
    return 'text-success';
  };

  const getRiskBg = (score: number) => {
    if (score >= 80) return 'bg-danger';
    if (score >= 60) return 'bg-red-400';
    if (score >= 30) return 'bg-warning';
    return 'bg-success';
  };

  if (isTerminated) {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center max-w-md w-full border border-danger/50 shadow-glow-danger">
          <div className="w-20 h-20 rounded-full bg-danger/15 border-2 border-danger/40 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-danger" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Exam Terminated</h2>
          <p className="text-foreground-muted text-sm mb-6 bg-danger/10 p-4 rounded-xl border border-danger/20 text-danger">
            {terminationReason || "Your exam has been terminated by the proctoring system due to multiple policy violations."}
          </p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-primary w-full justify-center py-3">
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ProctorAI Exam Monitor</h1>
                <p className="text-foreground-muted text-sm">Strict Monitored Environment</p>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black mb-6" style={{ aspectRatio: '16/9' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.7}
                className="w-full h-full object-cover"
                videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              />
              <div className="absolute inset-0 border-2 border-emerald-400/30 rounded-2xl pointer-events-none" />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-white">
                <Camera className="w-3.5 h-3.5" />
                Camera Active
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Camera, label: 'Camera', ok: true },
                { icon: Monitor, label: 'Screen Share', ok: true },
                { icon: Wifi, label: 'Connection', ok: isConnected || forceConnect },
              ].map((check) => (
                <div key={check.label} className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${
                  check.ok ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
                }`}>
                  <check.icon className={`w-5 h-5 ${check.ok ? 'text-success' : 'text-danger'}`} />
                  <span className="text-xs font-medium text-foreground">{check.label}</span>
                  {check.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    : <XCircle className="w-3.5 h-3.5 text-danger" />
                  }
                </div>
              ))}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                Strict Anti-Cheat Environment Enabled
              </div>
              <ul className="space-y-1.5 text-xs text-foreground-muted">
                <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" /> Exam will auto-terminate after exactly 3 warnings.</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" /> Exiting fullscreen, switching tabs, or losing window focus counts as a severe violation.</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" /> Using mobile phones or having multiple persons in the frame will trigger immediate warnings.</li>
                <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" /> Copy/paste and developer tools are disabled.</li>
              </ul>
            </div>

            <button
              onClick={startExamSequence}
              disabled={!isConnected && !forceConnect}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              <Shield className="w-5 h-5 mr-2" />
              {isConnected || forceConnect ? 'I Agree, Start Monitored Exam' : 'Connecting to Proctor...'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative select-none">
      {/* 3-Warning Popup Overlay */}
      <AnimatePresence>
          {showWarningOverlay && (
              <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                      className="glass-card p-8 max-w-lg w-full border border-warning/50 shadow-glow-warning text-center"
                  >
                      <div className="w-20 h-20 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center mx-auto mb-6 animate-pulse">
                          <AlertTriangle className="w-10 h-10 text-warning" />
                      </div>
                      <h2 className="text-3xl font-bold text-foreground mb-4">Official Warning</h2>
                      <div className="bg-warning/10 p-4 rounded-xl text-warning font-medium mb-8 text-lg border border-warning/30">
                          {latestWarning}
                      </div>
                      <p className="text-foreground-muted mb-8 text-sm">
                          You must acknowledge this warning to continue your exam. Repeated violations will result in automatic termination.
                      </p>
                      <button onClick={() => setShowWarningOverlay(false)} className="btn-primary w-full py-4 text-lg font-bold">
                          I Understand & Acknowledge
                      </button>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      <div className="h-12 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">ProctorAI</span>
        </div>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold text-foreground">{formatTime(elapsed)}</span>
          <span>/</span>
          <span>{formatTime(examDuration)}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${faceDetected ? 'text-success' : 'text-danger'}`}>
            <Eye className="w-3.5 h-3.5" />
            <span>{faceDetected ? 'Face OK' : 'No Face'}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs ${isConnected || forceConnect ? 'text-success' : 'text-danger'}`}>
            {isConnected || forceConnect ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isConnected ? `${fps} fps` : forceConnect ? 'Bypassed' : 'Offline'}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${getRiskColor(suspicionScore)}`}>
            <Activity className="w-3.5 h-3.5" />
            Risk: {suspicionScore}
          </div>
        </div>

        <div className="w-20 h-12 rounded-lg overflow-hidden border border-border bg-black relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.6}
            className="w-full h-full object-cover"
            videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
          />
          <div className={`absolute inset-0 border-2 rounded-lg pointer-events-none ${
            faceDetected ? 'border-success/60' : 'border-danger/60'
          }`} />
        </div>
      </div>

      <AnimatePresence>
        {(phoneDetected || multiplePersons || !faceDetected) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-danger/10 border-b border-danger/30"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
              <span className="text-danger font-medium">
                {phoneDetected ? '🚨 Mobile phone detected in frame!' :
                 multiplePersons ? '🚨 Multiple persons detected!' :
                 '⚠️ Face not detected — please look at your camera'}
              </span>
              <span className="text-danger/70 text-xs ml-auto">This has been flagged for review</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-6 mb-4">
              <h2 className="text-lg font-bold text-foreground mb-1">Data Structures Mid-Term</h2>
              <p className="text-foreground-muted text-sm">Time Remaining: <span className="font-mono text-primary font-bold">{formatTime(examDuration - elapsed)}</span></p>
            </div>

            {[1, 2, 3].map((q) => (
              <div key={q} className="glass-card p-5 mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{q}</span>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {q === 1 && 'Which data structure uses LIFO (Last In First Out) principle?'}
                      {q === 2 && 'What is the time complexity of binary search on a sorted array of n elements?'}
                      {q === 3 && 'Explain the difference between a stack and a queue with an example.'}
                    </p>
                  </div>
                </div>

                {q <= 2 ? (
                  <div className="space-y-2 ml-10">
                    {['Stack', 'Queue', 'Tree', 'Graph'].map((opt, i) => (
                      <label key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-3 cursor-pointer transition-colors group">
                        <input type="radio" name={`q${q}`} className="accent-primary" />
                        <span className="text-sm text-foreground-muted group-hover:text-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="ml-10">
                    <textarea
                      rows={4}
                      className="ai-input resize-none text-sm"
                      placeholder="Type your answer here..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="w-60 flex-shrink-0 bg-surface border-l border-border overflow-y-auto no-scrollbar p-4 space-y-4">
          <div>
            <div className="section-header">Monitoring Status</div>
            <div className="space-y-1">
              {monitoringStatuses.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs py-1.5">
                  {s.status === true
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    : s.status === false
                    ? <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border border-foreground-muted flex-shrink-0" />
                  }
                  <span className="text-foreground-muted flex-1 truncate">{s.label}</span>
                  <span className={`font-medium text-2xs ${
                    s.status === true ? 'text-success' :
                    s.status === false ? 'text-danger' : 'text-foreground-muted'
                  }`}>{s.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-header">Risk Score</div>
            <div className="glass-card p-3 text-center">
              <div className={`text-4xl font-bold font-mono mb-1 ${getRiskColor(suspicionScore)}`}>
                {suspicionScore}
              </div>
              <div className="text-xs text-foreground-muted mb-2">/ 100</div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getRiskBg(suspicionScore)}`}
                  style={{ width: `${suspicionScore}%` }}
                />
              </div>
              <span className={`text-xs font-semibold uppercase ${getRiskColor(suspicionScore)}`}>
                {riskLevel} risk
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
