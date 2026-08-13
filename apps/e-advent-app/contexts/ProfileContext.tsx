import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCalendarByAccessCode,
  type AccessCredentials,
  type CalendarPayload,
} from '../api/api';

// accessSession.js is CommonJS (unit-tested helpers)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  STORAGE_KEYS,
  buildAccessSessionFromApi,
} = require('../utils/accessSession');

type ProfileContextType = {
  email: string | null;
  accessCode: string | null;
  calendarId: string | null;
  calendar: CalendarPayload | null;
  isLoggedIn: boolean;
  isBootstrapping: boolean;
  isLoading: boolean;
  credentials: AccessCredentials | null;
  login: (email: string, accessCode: string) => Promise<CalendarPayload>;
  logout: () => Promise<void>;
  refreshCalendar: () => Promise<CalendarPayload | null>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

async function clearSessionStorage() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.email,
    STORAGE_KEYS.accessCode,
    STORAGE_KEYS.calendarId,
    STORAGE_KEYS.openedDays,
  ]);
}

async function persistSession(session: { email: string; accessCode: string; calendarId: string }) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.email, session.email],
    [STORAGE_KEYS.accessCode, session.accessCode],
    [STORAGE_KEYS.calendarId, session.calendarId],
  ]);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarPayload | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const applySession = useCallback(
    (session: { email: string; accessCode: string; calendarId: string }, cal: CalendarPayload) => {
      setEmail(session.email);
      setAccessCode(session.accessCode);
      setCalendarId(session.calendarId);
      setCalendar(cal);
    },
    []
  );

  const login = useCallback(
    async (emailValue: string, accessCodeValue: string) => {
      setIsLoading(true);
      try {
        const response = await getCalendarByAccessCode(emailValue.trim(), accessCodeValue.trim());
        const session = buildAccessSessionFromApi({
          email: emailValue,
          accessCode: accessCodeValue,
          calendarId: response.calendar.id,
        });
        if (!session) {
          throw new Error('Nie udało się utworzyć sesji profilu.');
        }
        await persistSession(session);
        applySession(session, response.calendar);
        return response.calendar;
      } catch (error) {
        await clearSessionStorage();
        setEmail(null);
        setAccessCode(null);
        setCalendarId(null);
        setCalendar(null);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await clearSessionStorage();
    setEmail(null);
    setAccessCode(null);
    setCalendarId(null);
    setCalendar(null);
  }, []);

  const refreshCalendar = useCallback(async () => {
    if (!email || !accessCode) return null;
    const response = await getCalendarByAccessCode(email, accessCode);
    const session = buildAccessSessionFromApi({
      email,
      accessCode,
      calendarId: response.calendar.id,
    });
    if (session) {
      await persistSession(session);
      applySession(session, response.calendar);
    }
    return response.calendar;
  }, [email, accessCode, applySession]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [[, savedEmail], [, savedCode]] = await AsyncStorage.multiGet([
          STORAGE_KEYS.email,
          STORAGE_KEYS.accessCode,
        ]);
        if (savedEmail && savedCode) {
          try {
            await login(savedEmail, savedCode);
          } catch (error) {
            console.error('Profile bootstrap login failed:', error);
          }
        }
      } catch (error) {
        console.error('Profile bootstrap error:', error);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
    // intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const credentials = useMemo<AccessCredentials | null>(() => {
    if (!email || !accessCode) return null;
    return { email, accessCode };
  }, [email, accessCode]);

  const value = useMemo<ProfileContextType>(
    () => ({
      email,
      accessCode,
      calendarId,
      calendar,
      isLoggedIn: !!email && !!accessCode && !!calendarId,
      isBootstrapping,
      isLoading,
      credentials,
      login,
      logout,
      refreshCalendar,
    }),
    [
      email,
      accessCode,
      calendarId,
      calendar,
      isBootstrapping,
      isLoading,
      credentials,
      login,
      logout,
      refreshCalendar,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
