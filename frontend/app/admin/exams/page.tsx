'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Calendar, Clock, Users, Eye, Edit,
  Trash2, BookOpen, Play, CheckCircle2, X
} from 'lucide-react';

const exams = [
  { id: '1', code: 'CS301-MID', title: 'Data Structures Mid-Term', subject: 'Data Structures', date: 'May 20, 2024', time: '2:00 PM', duration: '2 hrs', enrolled: 45, appeared: 42, status: 'active' },
  { id: '2', code: 'CS401-DB', title: 'Database Systems Final', subject: 'Database Systems', date: 'May 21, 2024', time: '10:00 AM', duration: '3 hrs', enrolled: 38, appeared: 0, status: 'scheduled' },
  { id: '3', code: 'CS201-OS', title: 'Operating Systems', subject: 'Operating Systems', date: 'May 22, 2024', time: '9:00 AM', duration: '2.5 hrs', enrolled: 52, appeared: 0, status: 'scheduled' },
  { id: '4', code: 'CS101-NET', title: 'Computer Networks', subject: 'Networks', date: 'May 18, 2024', time: '11:00 AM', duration: '2 hrs', enrolled: 40, appeared: 40, status: 'completed' },
  { id: '5', code: 'CS501-AI', title: 'Artificial Intelligence', subject: 'AI/ML', date: 'May 25, 2024', time: '1:00 PM', duration: '3 hrs', enrolled: 28, appeared: 0, status: 'scheduled' },
];

const statusColors: Record<string, string> = {
  active: 'text-success bg-success/10 border-success/25',
  scheduled: 'text-primary bg-primary/10 border-primary/25',
  completed: 'text-foreground-muted bg-surface-3 border-border',
};

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', subject: '', exam_code: '', start_time: '', end_time: '',
    duration_minutes: 120,
    enable_face_detection: true, enable_eye_tracking: true,
    enable_head_pose: true, enable_phone_detection: true,
    enable_multiple_person_detection: true,
  });

  const filtered = exams.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter;
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.code.includes(search);
    return matchFilter && matchSearch;
  });

  const toggleField = (field: string) => setForm(f => ({ ...f, [field]: !f[field as keyof typeof f] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exams</h1>
          <p className="text-foreground-muted text-sm mt-1">Manage and schedule proctored examinations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Exam
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Now', value: exams.filter(e => e.status === 'active').length, color: 'text-success' },
          { label: 'Scheduled', value: exams.filter(e => e.status === 'scheduled').length, color: 'text-primary' },
          { label: 'Completed', value: exams.filter(e => e.status === 'completed').length, color: 'text-foreground-muted' },
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
          <input type="text" placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)} className="ai-input pl-9 h-9" />
        </div>
        <div className="flex bg-surface-2 border border-border rounded-xl p-1">
          {['all', 'active', 'scheduled', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-primary text-white' : 'text-foreground-muted hover:text-foreground'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Exams grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((exam, i) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card-hover p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{exam.title}</div>
                  <div className="text-xs text-foreground-muted font-mono">{exam.code}</div>
                </div>
              </div>
              <span className={`risk-badge border text-xs ${statusColors[exam.status]}`}>{exam.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { icon: Calendar, label: exam.date },
                { icon: Clock, label: `${exam.time} · ${exam.duration}` },
                { icon: Users, label: `${exam.enrolled} enrolled` },
                { icon: Eye, label: `${exam.appeared} appeared` },
              ].map((item, j) => (
                <div key={j} className="flex items-center gap-2 text-xs text-foreground-muted">
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {exam.status === 'active' && (
                <button className="btn-primary text-xs py-2 flex-1 justify-center">
                  <Eye className="w-3.5 h-3.5" />
                  Monitor Live
                </button>
              )}
              {exam.status === 'scheduled' && (
                <button className="btn-primary text-xs py-2 flex-1 justify-center">
                  <Play className="w-3.5 h-3.5" />
                  Activate
                </button>
              )}
              {exam.status === 'completed' && (
                <button className="btn-ghost text-xs py-2 flex-1 justify-center">
                  <Eye className="w-3.5 h-3.5" />
                  View Report
                </button>
              )}
              <button className="btn-ghost text-xs py-2 px-3">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button className="btn-ghost text-xs py-2 px-3 text-danger border-danger/20 hover:bg-danger/10">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Exam Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowCreate(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Create New Exam</h3>
                <button onClick={() => setShowCreate(false)} className="text-foreground-muted hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground-muted block mb-1.5">Exam Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Data Structures Mid-Term" className="ai-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground-muted block mb-1.5">Subject *</label>
                    <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. CS301" className="ai-input" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground-muted block mb-1.5">Exam Code</label>
                    <input type="text" value={form.exam_code} onChange={e => setForm(f => ({ ...f, exam_code: e.target.value }))} placeholder="Auto-generated" className="ai-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground-muted block mb-1.5">Start Time *</label>
                    <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="ai-input" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground-muted block mb-1.5">Duration (minutes)</label>
                    <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} className="ai-input" />
                  </div>
                </div>

                {/* Monitoring features */}
                <div>
                  <div className="text-xs font-medium text-foreground-muted mb-3">AI Monitoring Features</div>
                  <div className="space-y-2">
                    {[
                      { key: 'enable_face_detection', label: 'Face Detection' },
                      { key: 'enable_eye_tracking', label: 'Eye Tracking' },
                      { key: 'enable_head_pose', label: 'Head Pose Estimation' },
                      { key: 'enable_phone_detection', label: 'Mobile Phone Detection' },
                      { key: 'enable_multiple_person_detection', label: 'Multiple Person Detection' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-3 border border-border">
                        <span className="text-sm text-foreground">{label}</span>
                        <button
                          onClick={() => toggleField(key)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative ${form[key as keyof typeof form] ? 'bg-primary' : 'bg-surface-2 border border-border'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${form[key as keyof typeof form] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 justify-center py-2.5">Cancel</button>
                  <button className="btn-primary flex-1 justify-center py-2.5">
                    <Plus className="w-4 h-4" />
                    Create Exam
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
