'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useMonitoringStore } from '@/store';
import toast from 'react-hot-toast';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useMonitoringWebSocket(sessionId: string | null, isAdmin = false, adminId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const { setMonitoringData, addAlert } = useMonitoringStore();

  const connect = useCallback(() => {
    if (!sessionId && !adminId) return;

    const url = isAdmin
      ? `${WS_URL}/ws/admin/${adminId}`
      : `${WS_URL}/ws/monitoring/${sessionId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectCount(0);
      console.log('[ProctorAI WS] Connected:', url);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('[ProctorAI WS] Parse error:', e);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log('[ProctorAI WS] Disconnected:', event.code);

      // Auto-reconnect (max 5 attempts)
      if (reconnectCount < 5 && event.code !== 1000) {
        const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
        reconnectRef.current = setTimeout(() => {
          setReconnectCount(c => c + 1);
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[ProctorAI WS] Error:', error);
    };
  }, [sessionId, adminId, isAdmin, reconnectCount]);

  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'analysis_result':
        const monitoring = data.monitoring || {};
        const scoring = data.scoring || {};
        
        setMonitoringData({
          suspicionScore: scoring.suspicion_score ?? 0,
          riskLevel: scoring.risk_level ?? 'low',
          faceDetected: monitoring.face_detected ?? true,
          eyeContact: monitoring.eye_contact ?? true,
          headPosition: monitoring.head_position ?? 'centered',
          phoneDetected: monitoring.phone_detected ?? false,
          multiplePersons: monitoring.multiple_persons ?? false,
          gazeDirection: monitoring.gaze_direction ?? 'center',
        });

        // Process alerts
        if (data.alerts && data.alerts.length > 0) {
          data.alerts.forEach((alert: any) => {
            addAlert({
              id: Date.now().toString(),
              type: alert.type,
              severity: alert.severity,
              message: alert.message,
              timestamp: data.timestamp,
            });
            
            if (alert.severity === 'high' || alert.severity === 'critical') {
              toast.error(`⚠️ ${alert.message}`, { duration: 4000 });
            }
          });
        }
        break;

      case 'admin_warning':
        toast(data.message, {
          icon: '⚠️',
          duration: 8000,
          style: {
            background: '#1E2743',
            color: '#F59E0B',
            border: '1px solid #F59E0B',
          }
        });
        break;

      case 'exam_terminated':
        toast.error(`Exam terminated: ${data.reason}`, { duration: 10000 });
        break;

      case 'connection_established':
        console.log('[ProctorAI WS] Session established:', data.session_id);
        break;

      case 'live_update':
        // Admin receives student live updates
        break;
    }
  }, [setMonitoringData, addAlert]);

  const sendFrame = useCallback((frameBase64: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'frame_analysis',
        frame: frameBase64,
        timestamp: new Date().toISOString(),
      }));
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, []);

  const sendAdminCommand = useCallback((command: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: command, ...payload }));
    }
  }, []);

  const sendTabSwitch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'tab_switch' }));
    }
  }, []);

  useEffect(() => {
    connect();
    
    // Heartbeat every 30s
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    
    return () => {
      clearInterval(heartbeatInterval);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [sessionId]);

  return {
    isConnected,
    sendFrame,
    sendAdminCommand,
    sendTabSwitch,
    reconnectCount,
  };
}
