'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, Filter, CheckCircle2, Eye, Clock, ChevronDown, X } from 'lucide-react';
import { alertAPI } from '@/lib/api';

const mockAlerts = [
  { id: '1', time: '10:30 AM', type: 'Multiple Faces Detected', student: 'Karan Singh', studentId: 'STU10025', exam: 'Operating Systems', severity: 'high', reviewed: false, score: 76, snapshot: null },
  { id: '2', time: '10:22 AM', type: 'Mobile Phone Detected', student: 'Ananya Patel', studentId: 'STU10034', exam: 'Database Systems', severity: 'high', reviewed: false, score: 58, snapshot: null },
  { id: '3', time: '10:15 AM', type: 'Looking Away', student: 'Rohit Sharma', studentId: 'STU10023', exam: 'Data Structures', severity: 'medium', reviewed: true, score: 18, snapshot: null },
  { id: '4', time: '10:10 AM', type: 'Excessive Head Movement', student: 'Pooja Verma', studentId: 'STU10026', exam: 'Computer Networks', severity: 'medium', reviewed: false, score: 34, snapshot: null },
  { id: '5', time: '10:05 AM', type: 'Low Eye Contact', student: 'Rahul Kumar', studentId: 'STU10027', exam: 'Algorithms', severity: 'low', reviewed: true, score: 12, snapshot: null },
  { id: '6', time: '09:58 AM', type: 'Face Not Detected', student: 'Sneha Patel', studentId: 'STU10028', exam: 'Software Eng', severity: 'high', reviewed: false, score: 89, snapshot: null },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<typeof mockAlerts[0] | null>(null);

  const filtered = alerts.filter(a => {
    const matchesSeverity = filter === 'all' || a.severity === filter || (filter === 'unreviewed' && !a.reviewed);
    const matchesSearch = !search || a.student.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const reviewAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, reviewed: true } : a));
    setSelectedAlert(null);
  };

  const severityColors = {
    high: 'text-danger bg-danger/10 border-danger/30',
    medium: 'text-warning bg-warning/10 border-warning/30',
    low: 'text-info bg-info/10 border-info/30',
  };

  const stats = {
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'high').length,
    unreviewed: alerts.filter(a => !a.reviewed).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert Center</h1>
          <p className="text-foreground-muted text-sm mt-1">Review and manage proctoring alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold">
            {stats.unreviewed} Unreviewed
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Alerts', value: stats.total, color: 'text-foreground' },
          { label: 'High Severity', value: stats.high, color: 'text-danger' },
          { label: 'Needs Review', value: stats.unreviewed, color: 'text-warning' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-foreground-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ai-input pl-9 h-9"
          />
        </div>
        <div className="flex bg-surface-2 border border-border rounded-xl p-1">
          {['all', 'high', 'medium', 'low', 'unreviewed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f ? 'bg-primary text-white' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Alert Type</th>
              <th>Student</th>
              <th>Exam</th>
              <th>Suspicion Score</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((alert, i) => (
              <motion.tr
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <td className="font-mono text-xs text-foreground-muted">{alert.time}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      alert.severity === 'high' ? 'bg-danger' :
                      alert.severity === 'medium' ? 'bg-warning' : 'bg-info'
                    }`} />
                    <span className="text-sm font-medium text-foreground">{alert.type}</span>
                  </div>
                </td>
                <td>
                  <div>
                    <div className="text-sm font-medium text-foreground">{alert.student}</div>
                    <div className="text-xs text-foreground-muted">{alert.studentId}</div>
                  </div>
                </td>
                <td className="text-foreground-muted text-sm">{alert.exam}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          alert.score >= 60 ? 'bg-danger' :
                          alert.score >= 30 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${alert.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-semibold text-foreground">{alert.score}</span>
                  </div>
                </td>
                <td><span className={`risk-badge ${alert.severity}`}>{alert.severity}</span></td>
                <td>
                  {alert.reviewed
                    ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Reviewed</span>
                    : <span className="text-xs text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-lg">Pending</span>
                  }
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    {!alert.reviewed && (
                      <button
                        onClick={() => reviewAlert(alert.id)}
                        className="text-xs text-success hover:underline"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-foreground-muted">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No alerts found</p>
          </div>
        )}
      </div>

      {/* Alert detail modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setSelectedAlert(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Alert Details</h3>
              <button onClick={() => setSelectedAlert(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 rounded-xl border mb-4 ${severityColors[selectedAlert.severity as keyof typeof severityColors]}`}>
              <div className="font-semibold">{selectedAlert.type}</div>
              <div className="text-xs mt-0.5 opacity-80">{selectedAlert.time}</div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { label: 'Student', value: `${selectedAlert.student} (${selectedAlert.studentId})` },
                { label: 'Exam', value: selectedAlert.exam },
                { label: 'Suspicion Score', value: `${selectedAlert.score}/100` },
                { label: 'Severity', value: selectedAlert.severity.toUpperCase() },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-foreground-muted">{row.label}</span>
                  <span className="text-foreground font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {!selectedAlert.reviewed && (
                <button onClick={() => reviewAlert(selectedAlert.id)} className="flex-1 btn-primary justify-center py-2.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Reviewed
                </button>
              )}
              <button className="flex-1 btn-danger justify-center py-2.5">
                Take Action
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
