'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Eye, Shield, CheckCircle2, XCircle, UserPlus } from 'lucide-react';

const students = [
  { id: 'STU10023', name: 'Rohit Sharma', email: 'rohit@uni.edu', dept: 'Computer Science', sem: 6, faceVerified: true, exams: 8, avgScore: 18, violations: 3, status: 'active' },
  { id: 'STU10034', name: 'Ananya Patel', email: 'ananya@uni.edu', dept: 'Information Technology', sem: 4, faceVerified: true, exams: 6, avgScore: 42, violations: 7, status: 'active' },
  { id: 'STU10025', name: 'Karan Singh', email: 'karan@uni.edu', dept: 'Computer Science', sem: 6, faceVerified: true, exams: 9, avgScore: 76, violations: 15, status: 'flagged' },
  { id: 'STU10026', name: 'Pooja Verma', email: 'pooja@uni.edu', dept: 'Electronics', sem: 5, faceVerified: false, exams: 5, avgScore: 12, violations: 1, status: 'active' },
  { id: 'STU10027', name: 'Rahul Kumar', email: 'rahul@uni.edu', dept: 'Computer Science', sem: 3, faceVerified: true, exams: 4, avgScore: 28, violations: 4, status: 'active' },
  { id: 'STU10028', name: 'Sneha Shah', email: 'sneha@uni.edu', dept: 'Mathematics', sem: 2, faceVerified: true, exams: 3, avgScore: 89, violations: 0, status: 'active' },
];

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = students.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter || (filter === 'unverified' && !s.faceVerified);
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-foreground-muted text-sm mt-1">{students.length} registered students</p>
        </div>
        <button className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input type="text" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="ai-input pl-9 h-9" />
        </div>
        <div className="flex bg-surface-2 border border-border rounded-xl p-1">
          {['all', 'active', 'flagged', 'unverified'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-primary text-white' : 'text-foreground-muted hover:text-foreground'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Department</th>
              <th>Face Verified</th>
              <th>Exams</th>
              <th>Avg Risk Score</th>
              <th>Violations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xs font-bold">{s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{s.name}</div>
                      <div className="text-xs text-foreground-muted">{s.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="text-sm text-foreground-muted">{s.dept}</div>
                  <div className="text-xs text-foreground-subtle">Sem {s.sem}</div>
                </td>
                <td>
                  {s.faceVerified
                    ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                    : <span className="flex items-center gap-1 text-xs text-danger"><XCircle className="w-3.5 h-3.5" /> Not Registered</span>
                  }
                </td>
                <td className="text-center font-semibold text-foreground">{s.exams}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.avgScore >= 60 ? 'bg-danger' : s.avgScore >= 30 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${s.avgScore}%` }} />
                    </div>
                    <span className="text-xs font-mono font-semibold">{s.avgScore}</span>
                  </div>
                </td>
                <td className="text-center">
                  <span className={`font-semibold text-sm ${s.violations === 0 ? 'text-success' : s.violations <= 5 ? 'text-warning' : 'text-danger'}`}>{s.violations}</span>
                </td>
                <td>
                  <span className={`risk-badge ${s.status === 'flagged' ? 'high' : 'low'}`}>{s.status}</span>
                </td>
                <td>
                  <button className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
