'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, Bell, Eye, Cpu, Database, Users, RefreshCw } from 'lucide-react';

const sections = [
  {
    id: 'monitoring', icon: Eye, title: 'Monitoring Settings',
    fields: [
      { key: 'face_detection_threshold', label: 'Face Detection Confidence', type: 'range', min: 0.3, max: 0.99, step: 0.01, value: 0.5 },
      { key: 'yolo_confidence', label: 'Object Detection Confidence', type: 'range', min: 0.3, max: 0.99, step: 0.01, value: 0.5 },
      { key: 'looking_away_threshold', label: 'Looking Away Alert (seconds)', type: 'number', value: 5 },
      { key: 'face_absent_threshold', label: 'Face Absent Alert (seconds)', type: 'number', value: 3 },
    ]
  },
  {
    id: 'scoring', icon: Cpu, title: 'Scoring Engine Weights',
    fields: [
      { key: 'weight_face_missing', label: 'Face Not Detected Weight', type: 'number', value: 20 },
      { key: 'weight_looking_away', label: 'Looking Away Weight', type: 'number', value: 8 },
      { key: 'weight_multiple_persons', label: 'Multiple Persons Weight', type: 'number', value: 30 },
      { key: 'weight_phone_detected', label: 'Phone Detected Weight', type: 'number', value: 30 },
      { key: 'suspicious_threshold', label: 'Suspicious Score Threshold', type: 'number', value: 60 },
      { key: 'high_risk_threshold', label: 'High Risk Score Threshold', type: 'number', value: 80 },
    ]
  },
  {
    id: 'alerts', icon: Bell, title: 'Alert Configuration',
    toggles: [
      { key: 'email_alerts', label: 'Email alerts for high risk events', value: true },
      { key: 'auto_terminate', label: 'Auto-terminate exam at critical score', value: false },
      { key: 'snapshot_on_alert', label: 'Capture snapshot on alert', value: true },
      { key: 'notify_student', label: 'Notify student of violations', value: true },
    ]
  },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    face_detection_threshold: 0.5,
    yolo_confidence: 0.5,
    looking_away_threshold: 5,
    face_absent_threshold: 3,
    weight_face_missing: 20,
    weight_looking_away: 8,
    weight_multiple_persons: 30,
    weight_phone_detected: 30,
    suspicious_threshold: 60,
    high_risk_threshold: 80,
    email_alerts: true,
    auto_terminate: false,
    snapshot_on_alert: true,
    notify_student: true,
  });

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-foreground-muted text-sm mt-1">Configure AI monitoring and alert thresholds</p>
        </div>
        <button onClick={handleSave} className={`btn-primary transition-all ${saved ? 'bg-success' : ''}`}>
          {saved ? <><RefreshCw className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {sections.map((section, i) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <section.icon className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          </div>

          {section.fields && (
            <div className="space-y-4">
              {section.fields.map(field => (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm text-foreground-muted">{field.label}</label>
                    <span className="text-sm font-semibold text-foreground font-mono">
                      {settings[field.key]}
                      {field.type === 'range' ? '' : field.key.includes('threshold') ? '' : ''}
                    </span>
                  </div>
                  {field.type === 'range' ? (
                    <input
                      type="range"
                      min={field.min} max={field.max} step={field.step}
                      value={settings[field.key]}
                      onChange={e => setSettings(s => ({ ...s, [field.key]: parseFloat(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  ) : (
                    <input
                      type="number"
                      value={settings[field.key]}
                      onChange={e => setSettings(s => ({ ...s, [field.key]: parseFloat(e.target.value) }))}
                      className="ai-input w-32"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {section.toggles && (
            <div className="space-y-3">
              {section.toggles.map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between p-3 rounded-xl bg-surface-3 border border-border">
                  <span className="text-sm text-foreground">{toggle.label}</span>
                  <button
                    onClick={() => setSettings(s => ({ ...s, [toggle.key]: !s[toggle.key] }))}
                    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${settings[toggle.key] ? 'bg-primary' : 'bg-surface-2 border border-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${settings[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
