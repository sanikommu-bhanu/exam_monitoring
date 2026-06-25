'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2, MoreHorizontal, Mic, Video, Monitor, PhoneOff,
  AlertTriangle, Shield, Eye, User, Smartphone, Users,
  CheckCircle2, XCircle, Clock, Send, Ban, ChevronRight,
  Activity, Wifi, Volume2, Radio
} from 'lucide-react';
import { useMonitoringWebSocket } from '@/hooks/useMonitoringWebSocket';
import { useAdminStore } from '@/store';
import { monitoringAPI } from '@/lib/api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const mockSessions = [
  { id: 'sess-001', studentId: 'STU10023', name: 'Rohit Sharma', exam: 'Data Structures Mid-Term', score: 18, risk: 'low', time: '00:45:32', faceDetected: true, eyeContact: true, headPos: 'Centered', phone: false, multiPerson: false },
  { id: 'sess-002', studentId: 'STU10034', name: 'Ananya Patel', exam: 'Database Systems', score: 42, risk: 'medium', time: '00:40:12', faceDetected: true, eyeContact: false, headPos: 'Left', phone: false, multiPerson: false },
  { id: 'sess-003', studentId: 'STU10025', name: 'Karan Singh', exam: 'Operating Systems', score: 76, risk: 'high', time: '00:35:50', faceDetected: true, eyeContact: false, headPos: 'Right', phone: true, multiPerson: true },
  { id: 'sess-004', studentId: 'STU10026', name: 'Pooja Verma', exam: 'Computer Networks', score: 12, risk: 'low', time: '00:50:21', faceDetected: true, eyeContact: true, headPos: 'Centered', phone: false, multiPerson: false },
];

const scoreHistory = [
  { t: '09:00', v: 0 }, { t: '09:10', v: 5 }, { t: '09:20', v: 8 },
  { t: '09:30', v: 12 }, { t: '09:40', v: 10 }, { t: '09:50', v: 15 },
  { t: '10:00', v: 18 }, { t: '10:10', v: 16 }, { t: '10:20', v: 18 },
];

function StatusIndicator({ label, status, value }: { label: string; status: 'good' | 'warning' | 'danger' | 'inactive'; value?: string }) {
  const colors = {
    good: { dot: 'bg-success', text: 'text-success', pct: 'text-success' },
    warning: { dot: 'bg-warning', text: 'text-warning', pct: 'text-warning' },
    danger: { dot: 'bg-danger', text: 'text-danger', pct: 'text-danger' },
    inactive: { dot: 'bg-foreground-muted', text: 'text-foreground-muted', pct: 'text-foreground-muted' },
  };
  const c = colors[status];

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${c.dot} ${status === 'good' ? 'shadow-glow-success' : ''}`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      {value && <span className={`text-sm font-semibold ${c.pct}`}>{value}</span>}
    </div>
  );
}

export default function LiveMonitoringPage() {
  const [selectedSession, setSelectedSession] = useState(mockSessions[0]);
  const [warningMsg, setWarningMsg] = useState('');
  const { isConnected, sendAdminCommand } = useMonitoringWebSocket(null, true, 'admin-1');

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#DC2626';
    if (score >= 60) return '#EF4444';
    if (score >= 30) return '#F59E0B';
    return '#10B981';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High Risk';
    if (score >= 30) return 'Medium';
    return 'Low Risk';
  };

  const sendWarning = () => {
    if (!warningMsg.trim()) return;
    sendAdminCommand('send_warning', { session_id: selectedSession.id, message: warningMsg });
    setWarningMsg('');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-background">
      {/* Left: Student grid list */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-surface overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="status-dot live" />
            <span className="text-sm font-semibold text-foreground">Live Sessions</span>
            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{mockSessions.length}</span>
          </div>
        </div>

        {mockSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className={`p-4 border-b border-border/50 cursor-pointer transition-all hover:bg-surface-3 ${
              selectedSession.id === session.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-surface-3 border border-border flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground-muted">{session.name.charAt(0)}</span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                  session.risk === 'high' ? 'bg-danger' :
                  session.risk === 'medium' ? 'bg-warning' : 'bg-success'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{session.name}</div>
                <div className="text-2xs text-foreground-muted truncate">{session.studentId}</div>
                <div className="text-2xs text-foreground-muted truncate">{session.exam}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-foreground-muted">Score: </span>
                <span className={`font-bold ${
                  session.score >= 60 ? 'text-danger' :
                  session.score >= 30 ? 'text-warning' : 'text-success'
                }`}>{session.score}</span>
              </div>
              <span className="text-2xs text-foreground-muted font-mono">{session.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Center: Video feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 bg-surface border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
          <span className="flex items-center gap-1.5 bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">
            <span className="status-dot live w-1.5 h-1.5" />
            LIVE
          </span>
          <span className="text-sm font-mono text-foreground">00:45:32</span>
          <span className="text-sm text-foreground font-semibold">Live Monitoring</span>
          <span className="text-foreground-muted">•</span>
          <span className="status-dot active" />
          <span className="text-sm text-foreground-muted">23 Students Active</span>
          <div className="flex-1" />
          <button className="btn-ghost text-xs py-1.5">
            <Maximize2 className="w-3.5 h-3.5" />
            Expand
          </button>
        </div>

        {/* Video area */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {/* Simulated video feed */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Fake camera feed - large face silhouette */}
              <div className="w-64 h-64 rounded-full bg-gray-800 flex items-center justify-center">
                <User className="w-32 h-32 text-gray-600" />
              </div>

              {/* Face detection box */}
              <div className="absolute"
                style={{
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -55%)',
                  width: '220px', height: '260px',
                  border: '2px solid #10B981',
                  borderRadius: '8px',
                  boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                }}
              >
                {/* Corner brackets */}
                {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                  'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                  <div key={i} className={`absolute w-4 h-4 border-emerald-400 ${cls}`} />
                ))}
              </div>

              {/* Face detected label */}
              <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                Face Detected
              </div>

              {/* Scan line */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="scan-overlay absolute inset-0" />
              </div>
            </div>
          </div>

          {/* Student info overlay */}
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
            <div className="text-xs text-foreground-muted">Candidate ID: <span className="text-white font-mono">{selectedSession.studentId}</span></div>
            <div className="text-sm font-semibold text-white mt-0.5">Name: {selectedSession.name}</div>
            <div className="text-xs text-foreground-muted">Exam: <span className="text-white">{selectedSession.exam}</span></div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 right-1/2 translate-x-1/2 flex items-center gap-3">
            {[
              { icon: Mic, label: 'Mic', color: 'bg-surface-3' },
              { icon: Video, label: 'Video', color: 'bg-surface-3' },
              { icon: Monitor, label: 'Screen', color: 'bg-surface-3' },
              { icon: PhoneOff, label: 'End', color: 'bg-danger' },
            ].map((ctrl) => (
              <button key={ctrl.label}
                className={`w-10 h-10 ${ctrl.color} rounded-full flex items-center justify-center border border-white/10 hover:opacity-80 transition-opacity`}
              >
                <ctrl.icon className="w-4 h-4 text-white" />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="h-14 bg-surface border-t border-border flex items-center px-4 gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Send warning message..."
              value={warningMsg}
              onChange={(e) => setWarningMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendWarning()}
              className="ai-input h-9 text-xs pr-10"
            />
            <button onClick={sendWarning} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary-300">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button className="btn-ghost text-xs py-2 text-warning border-warning/30 hover:bg-warning/10">
            <AlertTriangle className="w-3.5 h-3.5" />
            Send Warning
          </button>
          <button className="btn-ghost text-xs py-2 text-danger border-danger/30 hover:bg-danger/10">
            <Ban className="w-3.5 h-3.5" />
            Mark Suspicious
          </button>
          <button className="btn-danger text-xs py-2">
            <PhoneOff className="w-3.5 h-3.5" />
            End Exam
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 border-l border-border bg-surface overflow-y-auto no-scrollbar">
        {/* AI Monitoring Status */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">AI Monitoring Status</h3>
          <StatusIndicator label="Face Detection" status="good" value="100%" />
          <StatusIndicator label="Eye Contact" status="good" value={`${selectedSession.eyeContact ? '85%' : '23%'}`} />
          <StatusIndicator label="Head Position" status={selectedSession.headPos === 'Centered' ? 'good' : 'warning'} value={selectedSession.headPos} />
          <StatusIndicator label="Mobile Phone" status={selectedSession.phone ? 'danger' : 'inactive'} value={selectedSession.phone ? 'Detected' : 'Not Detected'} />
          <StatusIndicator label="Multiple Persons" status={selectedSession.multiPerson ? 'danger' : 'inactive'} value={selectedSession.multiPerson ? 'Detected' : 'Not Detected'} />
          <StatusIndicator label="Environmental Noise" status="good" value="Low" />
        </div>

        {/* Suspicion Score */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Suspicion Score</h3>
            <button className="text-foreground-muted hover:text-foreground">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gauge */}
          <div className="flex flex-col items-center py-2">
            <div className="w-32 h-32">
              <CircularProgressbar
                value={selectedSession.score}
                maxValue={100}
                text={`${selectedSession.score}`}
                circleRatio={0.6}
                styles={buildStyles({
                  rotation: 0.7,
                  strokeLinecap: 'round',
                  trailColor: '#1A2035',
                  pathColor: getRiskColor(selectedSession.score),
                  textColor: '#E2E8F0',
                  textSize: '24px',
                })}
              />
            </div>
            <div className="text-xs text-foreground-muted -mt-4">/100</div>
            <div className={`text-sm font-bold mt-1 ${
              selectedSession.score >= 60 ? 'text-danger' :
              selectedSession.score >= 30 ? 'text-warning' : 'text-success'
            }`}>
              {getRiskLabel(selectedSession.score)}
            </div>
            <div className="text-xs text-foreground-muted mt-1">
              {selectedSession.score < 30 ? 'The candidate is behaving normally.' : 'Suspicious activity detected.'}
            </div>
          </div>
        </div>

        {/* Exam Progress */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Exam Progress</h3>
            <Maximize2 className="w-3.5 h-3.5 text-foreground-muted" />
          </div>
          <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
            <span>Time Elapsed</span>
            <span>Total Duration</span>
          </div>
          <div className="flex items-center justify-between text-sm font-mono font-semibold text-foreground mb-3">
            <span>{selectedSession.time}</span>
            <span>02:00:00</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '37%' }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="text-right text-xs text-foreground-muted mt-1">37%</div>
        </div>

        {/* Score trend */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Score Trend</h3>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={scoreHistory}>
              <Line type="monotone" dataKey="v" stroke="#4F6EF7" strokeWidth={2} dot={false} />
              <Tooltip
                contentStyle={{ background: '#141829', border: '1px solid #1E2743', borderRadius: '8px', fontSize: '11px' }}
                labelFormatter={() => ''}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm font-medium hover:bg-warning/20 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              Send Warning
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/20 transition-colors">
              <Shield className="w-4 h-4" />
              Mark as Suspicious
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors">
              <Ban className="w-4 h-4" />
              End Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
