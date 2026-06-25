'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, AlertTriangle, TrendingUp, TrendingDown,
  Eye, Smartphone, UserX, Activity, ArrowUpRight, Calendar,
  MoreHorizontal, ChevronRight, Video, Wifi
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { analyticsAPI, alertAPI, monitoringAPI } from '@/lib/api';
import CountUp from 'react-countup';

const COLORS = ['#4F6EF7', '#00D4FF', '#F59E0B', '#10B981', '#EF4444'];

const suspicionTrend = [
  { time: 'Mon', score: 42, violations: 8 },
  { time: 'Tue', score: 55, violations: 14 },
  { time: 'Wed', score: 38, violations: 6 },
  { time: 'Thu', score: 61, violations: 18 },
  { time: 'Fri', score: 47, violations: 11 },
  { time: 'Sat', score: 29, violations: 4 },
  { time: 'Sun', score: 44, violations: 9 },
];

const riskDistribution = [
  { name: 'Looking Away', value: 35, color: '#4F6EF7' },
  { name: 'Mobile Detected', value: 25, color: '#00D4FF' },
  { name: 'Multiple Faces', value: 20, color: '#F59E0B' },
  { name: 'Excessive Movement', value: 10, color: '#10B981' },
  { name: 'Others', value: 10, color: '#64748B' },
];

const liveStudents = [
  { id: 'STU10023', name: 'Rohit Sharma', exam: 'Data Structures', score: 18, risk: 'low', duration: '00:45:32', verified: true },
  { id: 'STU10034', name: 'Ananya Patel', exam: 'Database Systems', score: 42, risk: 'medium', duration: '00:40:12', verified: true },
  { id: 'STU10025', name: 'Karan Singh', exam: 'Operating Systems', score: 76, risk: 'high', duration: '00:35:50', verified: true },
  { id: 'STU10026', name: 'Pooja Verma', exam: 'Computer Networks', score: 12, risk: 'low', duration: '00:50:21', verified: true },
];

const recentAlerts = [
  { time: '10:30 AM', type: 'Multiple Faces Detected', student: 'Karan Singh (STU10025)', severity: 'high' },
  { time: '10:22 AM', type: 'Mobile Phone Detected', student: 'Ananya Patel (STU10024)', severity: 'high' },
  { time: '10:15 AM', type: 'Looking Away', student: 'Rohit Sharma (STU10023)', severity: 'medium' },
  { time: '10:10 AM', type: 'Excessive Head Movement', student: 'Pooja Verma (STU10026)', severity: 'medium' },
  { time: '10:05 AM', type: 'Low Eye Contact', student: 'Rahul Kumar (STU10027)', severity: 'low' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="text-foreground-muted mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 1248,
    activeExams: 8,
    alertsGenerated: 24,
    highRiskStudents: 5,
    alertsChangePct: -8,
    highRiskChangePct: 3,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsAPI.getDashboard();
        if (data.overview) setStats(s => ({ ...s, ...data.overview }));
      } catch {}
    })();
  }, []);

  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents,
      change: '+12% from yesterday',
      changePos: true,
      icon: Users,
      iconColor: 'bg-blue-500/15 text-blue-400',
      gradient: 'from-blue-500/10 to-transparent',
    },
    {
      label: 'Active Exams',
      value: stats.activeExams,
      change: '+2 from yesterday',
      changePos: true,
      icon: BookOpen,
      iconColor: 'bg-emerald-500/15 text-emerald-400',
      gradient: 'from-emerald-500/10 to-transparent',
    },
    {
      label: 'Alerts Generated',
      value: stats.alertsGenerated,
      change: `${stats.alertsChangePct}% from yesterday`,
      changePos: false,
      icon: AlertTriangle,
      iconColor: 'bg-amber-500/15 text-amber-400',
      gradient: 'from-amber-500/10 to-transparent',
    },
    {
      label: 'High Risk Students',
      value: stats.highRiskStudents,
      change: '+3 from yesterday',
      changePos: false,
      icon: Activity,
      iconColor: 'bg-red-500/15 text-red-400',
      gradient: 'from-red-500/10 to-transparent',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-foreground-muted text-sm">Welcome back, Admin 👋</div>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">
            Here's what's happening with your exams today.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-foreground-muted bg-surface-2 border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            May 20, 2024
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.gradient} rounded-full -translate-y-8 translate-x-8`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${card.iconColor} flex items-center justify-center`}>
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground-subtle" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                <CountUp end={card.value} duration={1.5} separator="," />
              </div>
              <div className="text-sm text-foreground-muted mt-1">{card.label}</div>
              <div className={`text-xs mt-2 font-medium ${card.changePos ? 'text-success' : 'text-danger'}`}>
                {card.changePos ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                {card.change}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live Exams Overview */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Live Exams Overview</h2>
          <button className="text-xs text-primary hover:underline flex items-center gap-1">
            View All Exams <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {liveStudents.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="bg-surface-3 rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer group"
            >
              {/* Video placeholder with live badge */}
              <div className="relative h-32 bg-gradient-to-b from-surface-3 to-background flex items-center justify-center overflow-hidden">
                <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-border flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground-muted">{s.name.charAt(0)}</span>
                </div>
                {/* Live overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 px-2 py-0.5 rounded-lg">
                  <span className="status-dot live w-1.5 h-1.5" />
                  <span className="text-white text-2xs font-bold">LIVE</span>
                </div>
                {/* Score badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-2xs font-bold ${
                  s.score >= 60 ? 'bg-danger/90 text-white' :
                  s.score >= 30 ? 'bg-warning/90 text-black' :
                  'bg-success/90 text-white'
                }`}>
                  {s.score}/100
                </div>
                {/* Face detection box animation */}
                <div className="absolute inset-4 border border-emerald-400/40 rounded-lg group-hover:border-emerald-400/80 transition-colors"
                  style={{ boxShadow: '0 0 12px rgba(16,185,129,0.2)' }}
                />
              </div>

              <div className="p-3">
                <div className="font-semibold text-foreground text-sm truncate">{s.name}</div>
                <div className="text-2xs text-foreground-muted">{s.id}</div>
                <div className="text-2xs text-foreground-muted mt-0.5 truncate">{s.exam}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-2xs text-foreground-muted">
                    <span className="text-foreground">Risk:</span>
                    <span className={`ml-1 font-semibold ${
                      s.risk === 'high' ? 'text-danger' :
                      s.risk === 'medium' ? 'text-warning' : 'text-success'
                    }`}>{s.score}/100</span>
                  </div>
                  <span className="text-2xs text-foreground-muted">{s.duration}</span>
                </div>
                {/* Mini progress */}
                <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.score >= 60 ? 'bg-danger' :
                      s.score >= 30 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts Summary */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Alerts Summary</h2>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">24</span>
              </div>
              <span className="text-sm text-foreground-muted">Total Alerts</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'High Risk', value: 6, color: '#EF4444' },
                      { name: 'Medium Risk', value: 10, color: '#F59E0B' },
                      { name: 'Low Risk', value: 8, color: '#10B981' },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { color: '#EF4444' },
                      { color: '#F59E0B' },
                      { color: '#10B981' },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-3 flex-1">
              {[
                { label: 'High Risk', count: 6, pct: 25, color: 'bg-danger' },
                { label: 'Medium Risk', count: 10, pct: 42, color: 'bg-warning' },
                { label: 'Low Risk', count: 8, pct: 33, color: 'bg-success' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground-muted">{item.label}</span>
                      <span className="text-foreground font-medium">{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Distribution chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Risk Distribution</h2>
            <select className="text-xs bg-surface-3 border border-border rounded-lg px-2 py-1 text-foreground-muted">
              <option>Today</option>
              <option>This Week</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={suspicionTrend}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#EF4444" fill="url(#colorScore)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="violations" stroke="#F59E0B" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <div className="w-3 h-0.5 bg-danger" />
              Avg Suspicion Score
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <div className="w-3 h-0.5 bg-warning border-dashed" />
              Violations
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts + Live sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Alerts */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Alerts</h2>
            <button className="text-xs text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-0">
            {recentAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'high' ? 'bg-danger shadow-glow-danger' :
                  alert.severity === 'medium' ? 'bg-warning' : 'bg-info'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{alert.type}</span>
                    <span className="text-2xs text-foreground-muted flex-shrink-0">{alert.time}</span>
                  </div>
                  <div className="text-xs text-foreground-muted mt-0.5 truncate">{alert.student}</div>
                </div>
                <div className={`risk-badge flex-shrink-0 text-2xs ${alert.severity}`}>{alert.severity}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Violation Breakdown */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Violation Breakdown</h2>
            <span className="text-xs text-foreground-muted">This Week</span>
          </div>

          <div className="flex gap-4">
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={32} outerRadius={56} paddingAngle={2} dataKey="value">
                    {riskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-2.5 flex-1">
              {riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-foreground-muted flex-1 truncate">{item.name}</span>
                  <span className="text-xs font-semibold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Integrity Score */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Exam Integrity Score</div>
                <div className="text-xs text-foreground-muted mt-0.5">Overall exam integrity is good this week.</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold text-success">86%</div>
                <div className="text-xs text-success font-medium">Good</div>
              </div>
            </div>
            <div className="mt-2 h-2 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '86%' }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-gradient-to-r from-success to-emerald-400 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
