'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import {
  Shield, Eye, Camera, CheckCircle2, XCircle, AlertTriangle,
  Clock, Activity, Monitor, Wifi, WifiOff, Info, ChevronRight
} from 'lucide-react';
import { useMonitoringWebSocket } from '@/hooks/useMonitoringWebSocket';
import { useMonitoringStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface MonitorStatus {
  label: string;
  status: boolean | null;
  detail: string;
}

export default function StudentExamPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    suspicionScore, riskLevel, faceDetected, eyeContact,
    headPosition, phoneDetected, multiplePersons, alerts,
    isTerminated, terminationReason,
    setMonitoringData, addAlert
  } = useMonitoringStore();

  const webcamRef = useRef<Webcam>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tabSwitchSentRef = useRef(false);

  const sessionId = params.sessionId;
  const { isConnected, sendFrame, sendTabSwitch } = useMonitoringWebSocket(sessionId);

  const [examStarted, setExamStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [examDuration] = useState(7200); // 2 hours
  const [fps, setFps] = useState(0);
  const fpsRef = useRef(0);

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
    if (examStarted && isConnected) {
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
  }, [examStarted, isConnected, captureAndSend]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && examStarted) {
        sendTabSwitch();
        toast.error('⚠️ Tab switch detected! This has been recorded.', { duration: 5000 });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [examStarted, sendTabSwitch]);

  // Timer
  useEffect(() => {
    if (!examStarted) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [examStarted]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const monitoringStatuses: MonitorStatus[] = [
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
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-danger/15 border-2 border-danger/40 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Exam Terminated</h2>
          <p className="text-foreground-muted text-sm mb-6">
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
                <p className="text-foreground-muted text-sm">Data Structures Mid-Term Examination</p>
              </div>
            </div>

            {/* Webcam preview */}
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

              {/* Face guide box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-56 border-2 border-dashed border-emerald-400/50 rounded-lg" />
              </div>
            </div>

            {/* System checks */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Camera, label: 'Camera', ok: true },
                { icon: Monitor, label: 'Screen Share', ok: true },
                { icon: Wifi, label: 'Connection', ok: isConnected },
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

            {/* Rules */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" />
                Exam Rules & Guidelines
              </div>
              <ul className="space-y-1.5 text-xs text-foreground-muted">
                {[
                  'Keep your face visible in the camera at all times',
                  'Do not look away from the screen for extended periods',
                  'No mobile phones or other devices allowed',
                  'Ensure only you are present in the camera frame',
                  'Do not switch browser tabs during the exam',
                  'Ensure good lighting and a clean background',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setExamStarted(true)}
                disabled={!isConnected}
                className="flex-1 btn-primary justify-center py-3 text-base"
              >
                <Shield className="w-5 h-5" />
                {isConnected ? 'Start Monitored Exam' : 'Connecting...'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Monitoring bar */}
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

        {/* Real-time indicators */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${faceDetected ? 'text-success' : 'text-danger'}`}>
            <Eye className="w-3.5 h-3.5" />
            <span>{faceDetected ? 'Face OK' : 'No Face'}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-success' : 'text-danger'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isConnected ? `${fps} fps` : 'Offline'}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${getRiskColor(suspicionScore)}`}>
            <Activity className="w-3.5 h-3.5" />
            Risk: {suspicionScore}
          </div>
        </div>

        {/* Mini webcam */}
        <div className="w-20 h-12 rounded-lg overflow-hidden border border-border bg-black relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.6}
            className="w-full h-full object-cover"
            videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
          />
          {/* Detection overlay */}
          <div className={`absolute inset-0 border-2 rounded-lg pointer-events-none ${
            faceDetected ? 'border-success/60' : 'border-danger/60'
          }`} />
          <div className="absolute bottom-0.5 left-0.5 right-0.5 flex items-center justify-center">
            <span className={`text-2xs font-bold px-1 rounded ${faceDetected ? 'text-success' : 'text-danger bg-danger/20'}`}>
              {faceDetected ? '●' : 'NO FACE'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts banner */}
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

      {/* Exam content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main exam content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-6 mb-4">
              <h2 className="text-lg font-bold text-foreground mb-1">Data Structures Mid-Term</h2>
              <p className="text-foreground-muted text-sm">Time Remaining: <span className="font-mono text-primary font-bold">{formatTime(examDuration - elapsed)}</span> | Total Marks: 100</p>
            </div>

            {/* Sample questions */}
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

        {/* Right monitoring panel */}
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

          {/* Score */}
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

          {/* Recent alerts */}
          {alerts.length > 0 && (
            <div>
              <div className="section-header">Recent Flags</div>
              <div className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className={`text-xs p-2 rounded-lg border ${
                    alert.severity === 'high' ? 'bg-danger/8 border-danger/20 text-danger' :
                    alert.severity === 'medium' ? 'bg-warning/8 border-warning/20 text-warning' :
                    'bg-info/8 border-info/20 text-info'
                  }`}>
                    <div className="font-medium">{alert.type.replace(/_/g, ' ')}</div>
                    <div className="opacity-70 mt-0.5">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
