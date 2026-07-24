import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type LogLevel = 'info' | 'warning' | 'error';
export type LogEvent = 'estimate_generated' | 'auth_event' | 'system_error' | 'agent_activity';

interface LogPayload {
    level: LogLevel;
    event: LogEvent;
    message: string;
    details?: any;
    userId?: string;
}

/**
 * Enregistre un événement dans la collection system_logs de Firestore
 */
export async function logEvent(payload: LogPayload) {
    try {
        const logsRef = collection(db, 'system_logs');
        await addDoc(logsRef, {
            ...payload,
            timestamp: serverTimestamp(),
            // Ensure any undefined details are excluded to avoid Firestore errors
            details: payload.details ? JSON.parse(JSON.stringify(payload.details)) : null
        });
        
        // Log locally in development
        if (process.env.NODE_ENV !== 'production') {
            const consoleMethod = payload.level === 'error' ? console.error : 
                                  payload.level === 'warning' ? console.warn : console.log;
            consoleMethod(`[${payload.event.toUpperCase()}] ${payload.message}`, payload.details || '');
        }
    } catch (error) {
        console.error('Failed to write log to Firestore:', error);
    }
}
