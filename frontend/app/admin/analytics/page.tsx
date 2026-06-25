'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Download, Filter } from 'lucide-react';

const weeklyData = [
  { day: 'Mon', suspicion: 42, violations: 8, integrity: 82 },
  { day: 'Tue', suspicion: 55, violations: 14, integrity: 75 },
  { day: 'Wed', suspicion: 38, violations: 6, integrity: 88 },
  { day: 'Thu', suspicion: 61, violations: 18, integrity: 70 },
  { day: 'Fri', suspicion: 47, violations: 11, integrity: 78 },
  { day: 'Sat', suspicion: 29, violations: 4, integrity: 91 },
  { day: 'Sun', suspicion: 44, violations: 9, integrity: 80 },
];

const violationBreakdown = [
  { name: 'Looking Away', value: 35, color: '#4F6EF7' },
  { name: 'Mobile Detected', value: 25, color: '#00D4FF' },
  { name: 'Multiple Faces', value: 20, color: '#F59E0B' },
  { name: 'Head Movement', value: 10, color: '#10B981' },
  { name: 'Others', value: 10, color: '#64748B' },
];

const hourlyAlerts = [
  { hour: '09:00', alerts: 2 }, { hour: '10:00', alerts: 8 },
  { hour: '11:00', alerts: 14 }, { hour: '12:00', alerts: 6 },
  { hour: '13:00', alerts: 11 }, { hour: '14:00', alerts: 9 },
];

const subjectRisk = [
  { subject: 'Math', fullMark: 100, A: 65 },
  { subject: 'CS', fullMark: 100, A: 48 },
  { subject: 'Physics', fullMark: 100, A: 72 },
  { subject: 'Chemistry', fullMark: 100, A: 55 },
  { subject: 'English', fullMark: 100, A: 30 },
  { subject: 'History', fullMark: 100, A: 42 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
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

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('week');

  const kpis = [
    { label: 'Avg Suspicion Score', value: '44.4', change: '-12%', up: false, color: 'text-danger' },
    { label: 'Exam Integrity Score', value: '86%', change: '+3%', up: true, color: 'text-success' },
    { label: 'Total Violations', value: '70', change: '+8%', up: false, color: 'text-warning' },
    { label: 'Flagged Students', value: '12', change: '-2', up: true, color: 'text-primary' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Analytics</h1>
          <p className="text-foreground-muted text-sm mt-1">Behavioral insights and monitoring trends</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-2 border border-border rounded-xl p-1">
            {['day', 'week', 'month'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  timeRange === r ? 'bg-primary text-white' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="btn-ghost text-sm py-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-5"
          >
            <div className="text-xs text-foreground-muted mb-2">{kpi.label}</div>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className={`text-xs mt-2 flex items-center gap-1 ${kpi.up ? 'text-success' : 'text-danger'}`}>
              {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {kpi.change} vs last {timeRange}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Suspicion Score Trend - 2/3 width */}
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Suspicion Score Trend</h2>
            <span className="text-xs text-foreground-muted">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gradSuspicion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F6EF7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F6EF7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIntegrity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#64748B' }}
                iconType="circle" iconSize={8}
              />
              <Area type="monotone" dataKey="suspicion" name="Suspicion Score" stroke="#4F6EF7" fill="url(#gradSuspicion)" strokeWidth={2} dot={{ fill: '#4F6EF7', r: 3 }} />
              <Area type="monotone" dataKey="integrity" name="Integrity Score" stroke="#10B981" fill="url(#gradIntegrity)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Violation Breakdown - 1/3 */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Violation Breakdown</h2>
          <div className="flex justify-center mb-4">
            <div className="w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={violationBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                    {violationBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-2.5">
            {violationBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-foreground-muted flex-1 truncate">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-8 text-right">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Hourly alert distribution */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Hourly Alert Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyAlerts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="alerts" name="Alerts" fill="#4F6EF7" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject risk radar */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Subject Risk Analysis</h2>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={subjectRisk}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
              <Radar name="Risk Score" dataKey="A" stroke="#4F6EF7" fill="#4F6EF7" fillOpacity={0.25} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top violators table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Top Flagged Students</h2>
          <button className="btn-ghost text-xs py-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam</th>
              <th>Suspicion Score</th>
              <th>Violations</th>
              <th>Risk Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Karan Singh', id: 'STU10025', exam: 'Operating Systems', score: 76, violations: 8, risk: 'high', status: 'Flagged' },
              { name: 'Ananya Patel', id: 'STU10034', exam: 'Database Systems', score: 58, violations: 5, risk: 'medium', status: 'Monitoring' },
              { name: 'Raj Mehta', id: 'STU10041', exam: 'Algorithms', score: 91, violations: 12, risk: 'critical', status: 'Terminated' },
              { name: 'Priya Shah', id: 'STU10019', exam: 'Computer Networks', score: 34, violations: 3, risk: 'medium', status: 'Monitoring' },
            ].map((row, i) => (
              <tr key={i}>
                <td>
                  <div>
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-foreground-muted">{row.id}</div>
                  </div>
                </td>
                <td className="text-foreground-muted">{row.exam}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.score >= 80 ? 'bg-danger' : row.score >= 50 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${row.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold text-foreground">{row.score}</span>
                  </div>
                </td>
                <td className="text-center font-semibold text-foreground">{row.violations}</td>
                <td><span className={`risk-badge ${row.risk}`}>{row.risk}</span></td>
                <td>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                    row.status === 'Terminated' ? 'bg-danger/15 text-danger' :
                    row.status === 'Flagged' ? 'bg-warning/15 text-warning' :
                    'bg-primary/15 text-primary'
                  }`}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
