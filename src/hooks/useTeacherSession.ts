import { useMemo, useState } from 'react';
import type { TeacherSession } from '../types/models';

const KEY_LOGGED = 'teacherLoggedIn';
const KEY_NAME = 'teacherName';
const KEY_PASSWORD = 'teacherPassword';

function readSession(): TeacherSession {
  const loggedIn = localStorage.getItem(KEY_LOGGED) === '1';
  const teacherName = localStorage.getItem(KEY_NAME) ?? '';
  const teacherPassword = localStorage.getItem(KEY_PASSWORD) ?? '';
  return { loggedIn, teacherName, teacherPassword };
}

function hasStoredSession(): boolean {
  return localStorage.getItem(KEY_LOGGED) === '1' || Boolean(localStorage.getItem(KEY_NAME)) || Boolean(localStorage.getItem(KEY_PASSWORD));
}

export function useTeacherSession() {
  const [session, setSession] = useState<TeacherSession>(readSession);
  const [hasStoredAuth, setHasStoredAuth] = useState<boolean>(hasStoredSession);

  const actions = useMemo(() => ({
    login: (teacherName: string, teacherPassword: string) => {
      localStorage.setItem(KEY_LOGGED, '1');
      localStorage.setItem(KEY_NAME, teacherName);
      localStorage.setItem(KEY_PASSWORD, teacherPassword);
      setSession({ loggedIn: true, teacherName, teacherPassword });
      setHasStoredAuth(true);
    },
    logout: () => {
      localStorage.removeItem(KEY_LOGGED);
      localStorage.removeItem(KEY_NAME);
      localStorage.removeItem(KEY_PASSWORD);
      setSession({ loggedIn: false, teacherName: '', teacherPassword: '' });
      setHasStoredAuth(false);
    },
    clearSavedSession: () => {
      localStorage.removeItem(KEY_LOGGED);
      localStorage.removeItem(KEY_NAME);
      localStorage.removeItem(KEY_PASSWORD);
      setSession({ loggedIn: false, teacherName: '', teacherPassword: '' });
      setHasStoredAuth(false);
    },
  }), []);

  return { session, hasStoredAuth, ...actions };
}
