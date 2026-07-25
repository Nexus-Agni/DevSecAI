"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';

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

export default function ScansPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Flatten the reports across all projects to get a history of scans
  const allScans = projects.flatMap(project => 
    project.reports.map(report => ({
      ...report,
      repositoryUrl: project.repositoryUrl,
      branch: project.branch,
      projectId: project.id
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25';
      case 'FAILED': return 'bg-destructive/15 text-destructive hover:bg-destructive/25';
      default: return 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 animate-pulse';
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 75) return 'text-destructive';
    if (score > 50) return 'text-orange-500';
    if (score > 25) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
        <p className="text-muted-foreground mt-2">View the complete history of all security scans across your repositories.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>A list of your most recent security analysis runs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead className="text-right">Scanned</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allScans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No scans found. Run your first scan to see results here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">
                          {scan.repositoryUrl.split('/').slice(-2).join('/')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{scan.branch}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`\${getStatusColor(scan.status)} border-none`}>
                            {scan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {scan.status === 'COMPLETED' ? (
                            <span className={getRiskColor(scan.riskScore)}>{scan.riskScore}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link 
                            href={`/dashboard/scan/${scan.id}`}
                            className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink size={16} />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
