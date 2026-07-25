"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, GitBranch, Clock, AlertTriangle, Trash } from 'lucide-react';

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

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.preventDefault();
    if (confirm("Are you sure you want to completely delete this report? This cannot be undone.")) {
      try {
        await api.delete(`/reports/${reportId}`);
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (error) {
        alert("Failed to delete report");
      }
    }
  };

  if (loading) return <div className="animate-pulse text-primary font-mono">LOADING PROJECTS...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your scanned repositories and analysis reports.</p>
        </div>
        <Link href="/dashboard/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={18} /> New Scan
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <GitBranch size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No projects found</h3>
          <p className="mb-6">You haven't scanned any repositories yet.</p>
          <Link href="/dashboard/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Initiate First Scan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const latestReport = project.reports[0];
            const isCompleted = latestReport?.status === 'COMPLETED';
            
            return (
              <Link href={latestReport ? `/dashboard/scan/${latestReport.id}` : '#'} key={project.id} className="group outline-none">
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="truncate pr-4 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {project.repositoryUrl.split('/').slice(-2).join('/')}
                    </div>
                    <div className="flex items-center gap-2">
                      {latestReport && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-500' :
                          latestReport.status === 'FAILED' ? 'bg-destructive/10 text-destructive' :
                          'bg-amber-500/10 text-amber-500 animate-pulse'
                        }`}>
                          {latestReport.status}
                        </span>
                      )}
                      {latestReport && (
                        <button onClick={(e) => handleDelete(e, latestReport.id)} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive p-1.5 rounded-md transition-colors" title="Delete Report">
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mb-6 bg-muted/30 w-fit px-2 py-1 rounded-md">
                    <GitBranch size={14} /> {project.branch}
                  </div>
                  
                  <div className="mt-auto flex justify-between items-end border-t border-border/50 pt-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Clock size={14} />
                      {new Date(project.reports[0]?.createdAt || project.createdAt).toLocaleDateString()}
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Score</span>
                        <span className={`font-bold text-xl ${
                          latestReport.riskScore > 75 ? 'text-destructive' :
                          latestReport.riskScore > 50 ? 'text-orange-500' :
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
