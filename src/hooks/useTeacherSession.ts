import { useMemo, useState } from 'react';
import type { TeacherSession } from '../types/models';

const KEY_LOGGED = 'teacherLoggedIn';
const KEY_NAME = 'teacherName';

function readSession(): TeacherSession {
  const loggedIn = localStorage.getItem(KEY_LOGGED) === '1';
  const teacherName = localStorage.getItem(KEY_NAME) ?? '';
  return { loggedIn, teacherName };
}

function hasStoredSession(): boolean {
  return localStorage.getItem(KEY_LOGGED) === '1' || Boolean(localStorage.getItem(KEY_NAME));
}

export function useTeacherSession() {
  const [session, setSession] = useState<TeacherSession>(readSession);
  const [hasStoredAuth, setHasStoredAuth] = useState<boolean>(hasStoredSession);

  const actions = useMemo(() => ({
    login: (teacherName: string) => {
      localStorage.setItem(KEY_LOGGED, '1');
      localStorage.setItem(KEY_NAME, teacherName);
      setSession({ loggedIn: true, teacherName });
      setHasStoredAuth(true);
    },
    logout: () => {
      localStorage.removeItem(KEY_LOGGED);
      localStorage.removeItem(KEY_NAME);
      setSession({ loggedIn: false, teacherName: '' });
      setHasStoredAuth(false);
    },
    clearSavedSession: () => {
      localStorage.removeItem(KEY_LOGGED);
      localStorage.removeItem(KEY_NAME);
      setSession({ loggedIn: false, teacherName: '' });
      setHasStoredAuth(false);
    },
  }), []);

  return { session, hasStoredAuth, ...actions };
}
