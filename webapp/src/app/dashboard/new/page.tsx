"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShieldAlert, GitBranch } from 'lucide-react';

export default function NewScan() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/projects', { repositoryUrl, branch });
      const reportId = res.data.reports[0].id;
      router.push(`/dashboard/scan/${reportId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to initiate scan');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <ShieldAlert className="text-primary" size={28} />
        <h1 className="text-2xl font-bold tracking-tight">INITIATE NEW SECURITY SCAN</h1>
      </div>

      <div className="cyber-panel p-8 shadow-neon">
        {error && <div className="bg-destructive/20 text-destructive border border-destructive p-3 rounded mb-6 text-sm font-mono">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2">TARGET REPOSITORY URL</label>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full bg-background border border-border rounded-md p-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-2 font-mono">MUST BE A PUBLIC GITHUB REPOSITORY OR INCLUDE ACCESS TOKEN.</p>
          </div>

          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2 flex items-center gap-2">
              <GitBranch size={16} /> TARGET BRANCH
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-background border border-border rounded-md p-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md hover:bg-primary/90 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  INITIATING SCAN SEQUENCE...
                </>
              ) : (
                'COMMENCE ANALYSIS'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
