import { useState } from 'react';
import { GLOBAL_TEACHER_PASSWORD } from './constants';

type Props = { onLogin: (teacherName: string) => void };

export default function TeacherLogin({ onLogin }: Props) {
  const [teacherName, setTeacherName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return setStatus('Please enter your name.');
    if (password !== GLOBAL_TEACHER_PASSWORD) return setStatus('Incorrect password.');
    onLogin(teacherName.trim());
  };

  return (
    <section className="mx-auto mt-8 max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-indigo-100">
      <h1 className="text-2xl font-bold text-slate-900">Teacher Login</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to manage activities and links.</p>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Teacher name" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Global password" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" />
        {status && <p className="text-sm text-rose-600">{status}</p>}
        <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500">Log In</button>
      </form>
    </section>
  );
}
