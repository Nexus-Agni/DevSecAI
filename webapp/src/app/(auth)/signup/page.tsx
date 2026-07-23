"use client";
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/signup', { name, email, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-panel p-8 w-full max-w-md mx-auto mt-20 shadow-neon">
      <h2 className="text-2xl font-bold mb-6 text-primary border-b border-border pb-2">REQUEST ACCESS</h2>
      {error && <div className="bg-destructive/20 text-destructive border border-destructive p-3 rounded mb-4 text-sm font-mono">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-mono text-muted-foreground mb-1">OPERATIVE NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-border rounded p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-muted-foreground mb-1">USER IDENTIFIER (EMAIL)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-border rounded p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-muted-foreground mb-1">ACCESS CODE (PASSWORD)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full border border-primary text-primary font-bold py-2 rounded hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {loading ? 'PROCESSING...' : 'SUBMIT REQUEST'}
        </button>
      </form>
      <div className="mt-6 text-center text-sm font-mono text-muted-foreground">
        ALREADY REGISTERED? <Link href="/login" className="text-primary hover:underline">INITIATE SESSION</Link>
      </div>
    </div>
  );
}
