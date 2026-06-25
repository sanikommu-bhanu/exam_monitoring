'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen, Clock, Shield, CheckCircle2, AlertTriangle,
  TrendingUp, Calendar, ChevronRight, Award, Activity
} from 'lucide-react';
import { useAuthStore } from '@/store';

const upcomingExams = [
  { id: '1', code: 'CS301', title: 'Data Structures Mid-Term', date: 'Today, 2:00 PM', duration: '2 hours', status: 'upcoming' },
  { id: '2', code: 'CS401', title: 'Database Systems', date: 'Tomorrow, 10:00 AM', duration: '3 hours', status: 'upcoming' },
  { id: '3', code: 'CS201', title: 'Operating Systems', date: 'May 22, 9:00 AM', duration: '2.5 hours', status: 'scheduled' },
];

const pastExams = [
  { id: '4', title: 'Computer Networks', date: 'May 18', score: 82, violations: 2, risk: 'low' },
  { id: '5', title: 'Algorithms', date: 'May 15', score: 45, violations: 5, risk: 'medium' },
  { id: '6', title: 'Software Engineering', date: 'May 10', score: 91, violations: 0, risk: 'low' },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-foreground">ProctorAI</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">{user?.full_name?.charAt(0) ?? 'S'}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{user?.full_name}</div>
            <div className="text-xs text-foreground-muted">{user?.student_id}</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-foreground-muted mt-1">You have <span className="text-primary font-semibold">1 exam today</span>. Good luck!</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: 'Exams Taken', value: '12', color: 'text-primary bg-primary/10' },
            { icon: Award, label: 'Avg Score', value: '78%', color: 'text-success bg-success/10' },
            { icon: Shield, label: 'Integrity Score', value: '94%', color: 'text-accent bg-accent/10' },
            { icon: AlertTriangle, label: 'Total Violations', value: '7', color: 'text-warning bg-warning/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-foreground-muted">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Face verification status */}
        {!user?.face_verified && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/5 border border-warning/30 rounded-2xl p-4 flex items-center gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-warning">Face Not Registered</div>
              <div className="text-xs text-foreground-muted mt-0.5">Register your face to take proctored exams</div>
            </div>
            <Link href="/student/register-face" className="btn-primary text-xs py-2">
              Register Now
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        )}

        {/* Upcoming exams */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Upcoming Exams</h2>
            <button className="text-xs text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {upcomingExams.map((exam, i) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-surface-3 border border-border hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{exam.title}</div>
                  <div className="text-xs text-foreground-muted flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{exam.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.duration}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-foreground-muted bg-surface-2 px-2 py-1 rounded-lg">{exam.code}</span>
                  {exam.status === 'upcoming' ? (
                    <Link
                      href="/student/verify"
                      className="btn-primary text-xs py-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Start Exam
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-foreground-muted bg-surface-2 border border-border px-3 py-1.5 rounded-lg">Scheduled</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Past exam results */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Past Exam Results</h2>
            <button className="text-xs text-primary hover:underline">View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Date</th>
                <th>Integrity Score</th>
                <th>Violations</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {pastExams.map((exam) => (
                <tr key={exam.id}>
                  <td className="font-medium text-foreground">{exam.title}</td>
                  <td className="text-foreground-muted">{exam.date}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${exam.score >= 80 ? 'bg-success' : exam.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${exam.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{exam.score}%</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`font-semibold ${exam.violations === 0 ? 'text-success' : exam.violations <= 3 ? 'text-warning' : 'text-danger'}`}>
                      {exam.violations}
                    </span>
                  </td>
                  <td><span className={`risk-badge ${exam.risk}`}>{exam.risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
