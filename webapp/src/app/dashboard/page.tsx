"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, GitBranch, Clock, AlertTriangle } from 'lucide-react';

interface Report {
  id: string;
  status: string;
  riskScore: number;
  createdAt: string;
}

interface Project {
  id: string;
  repositoryUrl: string;
  branch: string;
  reports: Report[];
}

export default function DashboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div className="animate-pulse text-primary font-mono">LOADING PROJECTS...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">PROJECT REPOSITORY</h1>
        <Link href="/dashboard/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-neon">
          <Plus size={18} /> NEW SCAN
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="cyber-panel p-12 text-center text-muted-foreground font-mono flex flex-col items-center justify-center border-dashed">
          <GitBranch size={48} className="mb-4 opacity-50" />
          <p>NO PROJECTS FOUND IN DATABASE.</p>
          <p className="text-sm mt-2">INITIATE A NEW SCAN TO BEGIN ANALYSIS.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const latestReport = project.reports[0];
            const isCompleted = latestReport?.status === 'COMPLETED';
            
            return (
              <Link href={latestReport ? `/dashboard/scan/${latestReport.id}` : '#'} key={project.id}>
                <div className="cyber-panel p-6 hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="truncate pr-4 text-lg font-semibold group-hover:text-primary transition-colors">
                      {project.repositoryUrl.split('/').slice(-2).join('/')}
                    </div>
                    {latestReport && (
                      <span className={`text-xs font-mono px-2 py-1 rounded border ${
                        isCompleted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        latestReport.status === 'FAILED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                      }`}>
                        {latestReport.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground font-mono flex items-center gap-2 mb-6">
                    <GitBranch size={14} /> {project.branch}
                  </div>
                  
                  <div className="mt-auto flex justify-between items-end border-t border-border pt-4">
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(project.reports[0]?.createdAt || project.createdAt).toLocaleDateString()}
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">RISK SCORE:</span>
                        <span className={`font-bold text-lg ${
                          latestReport.riskScore > 75 ? 'text-destructive' :
                          latestReport.riskScore > 50 ? 'text-primary' :
                          latestReport.riskScore > 25 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {latestReport.riskScore}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
