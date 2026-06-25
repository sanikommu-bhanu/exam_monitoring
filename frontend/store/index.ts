import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student' | 'proctor' | 'super_admin';
  student_id?: string;
  department?: string;
  profile_image_url?: string;
  face_verified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      
      updateUser: (updates) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...updates } });
        }
      },
    }),
    {
      name: 'proctor-ai-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Monitoring store
interface MonitoringState {
  suspicionScore: number;
  riskLevel: string;
  isMonitoring: boolean;
  faceDetected: boolean;
  eyeContact: boolean;
  headPosition: string;
  phoneDetected: boolean;
  multiplePersons: boolean;
  gazeDirection: string;
  alerts: Alert[];
  sessionId: string | null;
  setMonitoringData: (data: Partial<MonitoringState>) => void;
  addAlert: (alert: Alert) => void;
  setSession: (sessionId: string) => void;
  resetMonitoring: () => void;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
}

export const useMonitoringStore = create<MonitoringState>((set) => ({
  suspicionScore: 0,
  riskLevel: 'low',
  isMonitoring: false,
  faceDetected: true,
  eyeContact: true,
  headPosition: 'centered',
  phoneDetected: false,
  multiplePersons: false,
  gazeDirection: 'center',
  alerts: [],
  sessionId: null,
  
  setMonitoringData: (data) => set((state) => ({ ...state, ...data })),
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 50)
  })),
  
  setSession: (sessionId) => set({ sessionId, isMonitoring: true }),
  
  resetMonitoring: () => set({
    suspicionScore: 0,
    riskLevel: 'low',
    isMonitoring: false,
    faceDetected: true,
    eyeContact: true,
    headPosition: 'centered',
    phoneDetected: false,
    multiplePersons: false,
    gazeDirection: 'center',
    alerts: [],
    sessionId: null,
  }),
}));

// Admin dashboard store
interface AdminState {
  activeSessions: any[];
  totalStudents: number;
  activeExams: number;
  alertsToday: number;
  highRiskStudents: number;
  recentAlerts: any[];
  setDashboardData: (data: Partial<AdminState>) => void;
  updateSession: (sessionId: string, data: any) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  activeSessions: [],
  totalStudents: 0,
  activeExams: 0,
  alertsToday: 0,
  highRiskStudents: 0,
  recentAlerts: [],
  
  setDashboardData: (data) => set((state) => ({ ...state, ...data })),
  
  updateSession: (sessionId, data) => set((state) => ({
    activeSessions: state.activeSessions.map(s =>
      s.id === sessionId ? { ...s, ...data } : s
    )
  })),
}));
