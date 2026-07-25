"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShieldAlert, GitBranch, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <div className="bg-primary/10 p-2 rounded-lg">
          <ShieldAlert className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Security Scan</h1>
          <p className="text-sm text-muted-foreground">Analyze your repository for vulnerabilities</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target Configuration</CardTitle>
          <CardDescription>
            Enter the details of the repository you want to scan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">Repository URL</Label>
              <Input
                id="repositoryUrl"
                type="url"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be a public GitHub repository or include an access token.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="flex items-center gap-2">
                <GitBranch size={16} className="text-muted-foreground" /> Target Branch
              </Label>
              <Input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initiating Analysis...
                  </>
                ) : (
                  'Start Scan'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
