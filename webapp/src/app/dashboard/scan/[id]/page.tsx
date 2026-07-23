"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  ShieldAlert, Lock, FileCode, Package, Activity, 
  Terminal, Download, AlertTriangle 
} from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

export default function ScanReport() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('sast');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const router = useRouter();

  const fetchReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/reports/${id}/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchLogs();
    const interval = setInterval(() => {
      if (!report || (report.status !== 'COMPLETED' && report.status !== 'FAILED')) {
        fetchReport();
        fetchLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, report?.status]);

  if (!report) return <div className="animate-pulse text-primary font-mono text-center mt-20">ESTABLISHING CONNECTION TO REPORT DATABASE...</div>;

  const isCompleted = report.status === 'COMPLETED';
  const isFailed = report.status === 'FAILED';

  const handleStop = async () => {
    try {
      await api.post(`/reports/${id}/cancel`);
      fetchReport();
      fetchLogs();
    } catch (error) {
      alert("Failed to stop analysis");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to completely delete this report? This cannot be undone.")) {
      try {
        await api.delete(`/reports/${id}`);
        router.push('/dashboard');
      } catch (error) {
        alert("Failed to delete report");
      }
    }
  };

  if (!isCompleted && !isFailed) {
    return (
      <div className={isFullScreen ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-8" : "max-w-4xl mx-auto mt-10"}>
        <div className={`cyber-panel flex flex-col ${isFullScreen ? 'flex-grow h-full' : 'p-8'}`}>
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4 p-4 md:p-0">
            <h2 className="text-xl font-bold tracking-widest text-primary">ANALYSIS IN PROGRESS</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded border border-primary/20 animate-pulse">
                {report.status}
              </span>
              <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-muted-foreground hover:text-primary font-mono text-sm border border-border px-2 py-1 rounded">
                {isFullScreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
              </button>
              <button onClick={handleStop} className="bg-destructive/20 text-destructive border border-destructive px-3 py-1 rounded font-mono text-sm hover:bg-destructive/40 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                STOP
              </button>
            </div>
          </div>
          
          <div className={`bg-black border border-primary/30 rounded p-4 font-mono text-sm overflow-y-auto flex flex-col gap-1 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] ${isFullScreen ? 'flex-grow' : 'h-96'}`}>
            <div className="text-emerald-400 opacity-70 mb-2">&gt; INITIATING DEVSEC SCAN SEQUENCE...</div>
            <div className="text-emerald-400 opacity-70 mb-2">&gt; TARGET: {report.project?.repositoryUrl}</div>
            
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 font-mono ${log.level === 'ERROR' ? 'text-destructive' : log.level === 'WARN' ? 'text-amber-500' : 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]'}`}>
                <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="opacity-70 shrink-0 w-16">[{log.component}]</span>
                <span className="break-words whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
            
            {report.status !== 'COMPLETED' && report.status !== 'FAILED' && (
              <div className="text-emerald-400 animate-pulse mt-2">&gt; _</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <div className="cyber-panel p-8 border-destructive/50 text-center">
          <AlertTriangle className="text-destructive mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-destructive mb-2">SCAN FAILED</h2>
          <p className="text-muted-foreground font-mono">{report.errorMessage || "An unknown error occurred during analysis."}</p>
        </div>
      </div>
    );
  }

  // Parse findings
  const sast = report.findingsSast ? (typeof report.findingsSast === 'string' ? JSON.parse(report.findingsSast) : report.findingsSast) : [];
  const secrets = report.findingsSecrets ? (typeof report.findingsSecrets === 'string' ? JSON.parse(report.findingsSecrets) : report.findingsSecrets) : [];
  const deps = report.findingsDependencies ? (typeof report.findingsDependencies === 'string' ? JSON.parse(report.findingsDependencies) : report.findingsDependencies) : [];
  const network = report.findingsNetwork ? (typeof report.findingsNetwork === 'string' ? JSON.parse(report.findingsNetwork) : report.findingsNetwork) : [];

  const getRiskColor = (score: number) => {
    if (score > 75) return '#ef4444'; // red
    if (score > 50) return '#f97316'; // orange
    if (score > 25) return '#f59e0b'; // amber
    return '#10b981'; // emerald
  };

  const riskColor = getRiskColor(report.riskScore);
  const chartData = [{ name: 'Risk', value: report.riskScore, fill: riskColor }];

  const handleDownload = async () => {
    try {
      if (!report.pdfPath) {
        await api.post(`/reports/${id}/pdf`);
        alert("PDF generation started. Please refresh in a moment and try downloading again.");
        return;
      }
      const res = await api.get(`/reports/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DevSecAI_Report_${id.substring(0,8)}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("PDF not available yet or download failed.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">SECURITY ANALYSIS REPORT</h1>
          <p className="text-sm font-mono text-muted-foreground flex items-center gap-2 mt-1">
            TARGET: <span className="text-foreground">{report.project?.repositoryUrl}</span>
            <span className="text-border">|</span>
            BRANCH: <span className="text-foreground">{report.project?.branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} className="flex items-center gap-2 border border-destructive text-destructive hover:bg-destructive/10 px-4 py-2 rounded transition-colors font-mono text-sm">
             DELETE REPORT
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 border border-primary text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-sm">
            <Download size={16} /> DOWNLOAD PDF
          </button>
        </div>
      </div>

      {/* Dashboard Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Risk Score */}
        <div className="cyber-panel p-6 flex flex-col items-center justify-center col-span-1 shadow-neon">
          <h3 className="text-sm font-mono text-muted-foreground mb-2">OVERALL RISK SCORE</h3>
          <div className="relative w-40 h-40">
            <RadialBarChart 
              width={160} height={160} 
              innerRadius="70%" outerRadius="100%" 
              data={chartData} startAngle={180} endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background clockWise={false} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
            <div className="absolute inset-0 flex items-center justify-center -mt-6">
              <span className="text-4xl font-bold font-mono" style={{ color: riskColor }}>
                {report.riskScore}
              </span>
            </div>
          </div>
        </div>

        {/* Severities */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="cyber-panel p-4 flex flex-col items-center justify-center bg-destructive/5 border-destructive/20">
            <span className="text-xs font-mono text-destructive mb-1">CRITICAL</span>
            <span className="text-3xl font-bold text-destructive">{report.criticalCount}</span>
          </div>
          <div className="cyber-panel p-4 flex flex-col items-center justify-center bg-orange-500/5 border-orange-500/20">
            <span className="text-xs font-mono text-orange-500 mb-1">HIGH</span>
            <span className="text-3xl font-bold text-orange-500">{report.highCount}</span>
          </div>
          <div className="cyber-panel p-4 flex flex-col items-center justify-center bg-amber-500/5 border-amber-500/20">
            <span className="text-xs font-mono text-amber-500 mb-1">MEDIUM</span>
            <span className="text-3xl font-bold text-amber-500">{report.mediumCount}</span>
          </div>
          <div className="cyber-panel p-4 flex flex-col items-center justify-center bg-emerald-500/5 border-emerald-500/20">
            <span className="text-xs font-mono text-emerald-500 mb-1">LOW</span>
            <span className="text-3xl font-bold text-emerald-500">{report.lowCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mt-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'sast', icon: FileCode, label: 'SAST THREATS', count: sast.length },
          { id: 'secrets', icon: Lock, label: 'EXPOSED SECRETS', count: secrets.length },
          { id: 'deps', icon: Package, label: 'VULNERABLE DEPENDENCIES', count: deps.length },
          { id: 'network', icon: Activity, label: 'NETWORK / IaC', count: network.length },
          { id: 'logs', icon: Terminal, label: 'PIPELINE LOGS', count: logs.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 font-mono text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <t.icon size={16} /> {t.label} 
            <span className="bg-background border border-border px-1.5 py-0.5 rounded text-xs">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'sast' && (
          <div className="space-y-4">
            {sast.length === 0 ? <p className="text-muted-foreground font-mono p-4">NO SAST THREATS DETECTED.</p> : null}
            {sast.map((finding: any, i: number) => (
              <div key={i} className="cyber-panel p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      {finding.title}
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        finding.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        finding.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>{finding.severity}</span>
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground mt-1">{finding.file} : lines {finding.lineStart}-{finding.lineEnd}</p>
                  </div>
                </div>
                
                <div className="bg-background border border-border p-4 rounded font-mono text-sm overflow-x-auto mb-4 text-emerald-400">
                  <pre><code>{finding.snippet}</code></pre>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-primary font-bold mb-1">DESCRIPTION</h4>
                    <p className="text-foreground/80">{finding.description}</p>
                    {finding.owasp && <p className="text-muted-foreground mt-2 font-mono text-xs">OWASP: {finding.owasp}</p>}
                  </div>
                  <div>
                    <h4 className="text-destructive font-bold mb-1">COMPROMISE VECTOR</h4>
                    <p className="text-foreground/80">{finding.compromiseVector || 'An attacker could exploit this vulnerability.'}</p>
                    
                    <h4 className="text-emerald-500 font-bold mb-1 mt-4">REMEDIATION</h4>
                    <p className="text-foreground/80">{finding.remediation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add similar empty states / basic tables for other tabs to keep it clean */}
        {activeTab === 'secrets' && (
          <div className="cyber-panel p-4 overflow-x-auto">
            {secrets.length === 0 ? <p className="text-muted-foreground font-mono p-4">NO EXPOSED SECRETS DETECTED.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-mono">
                    <th className="p-3">TYPE</th>
                    <th className="p-3">FILE</th>
                    <th className="p-3">VALUE (MASKED)</th>
                  </tr>
                </thead>
                <tbody>
                  {secrets.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 font-semibold text-primary">{s.type}</td>
                      <td className="p-3 font-mono text-muted-foreground">{s.file}:{s.line}</td>
                      <td className="p-3 font-mono">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'deps' && (
          <div className="cyber-panel p-4 overflow-x-auto">
            {deps.length === 0 ? <p className="text-muted-foreground font-mono p-4">NO VULNERABLE DEPENDENCIES DETECTED.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-mono">
                    <th className="p-3">SEVERITY</th>
                    <th className="p-3">PACKAGE</th>
                    <th className="p-3">VERSION</th>
                    <th className="p-3">VULNERABILITY ID</th>
                  </tr>
                </thead>
                <tbody>
                  {deps.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                          d.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          d.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>{d.severity}</span>
                      </td>
                      <td className="p-3 font-semibold">{d.package}</td>
                      <td className="p-3 font-mono text-muted-foreground">{d.version}</td>
                      <td className="p-3 font-mono text-primary">
                        <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.vulnerabilityId}</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-4">
             {network.length === 0 ? <p className="text-muted-foreground font-mono p-4">NO NETWORK / IaC ISSUES DETECTED.</p> : null}
             {network.map((finding: any, i: number) => (
              <div key={i} className="cyber-panel p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      {finding.title}
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        finding.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        finding.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>{finding.severity}</span>
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground mt-1">{finding.file}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-primary font-bold mb-1">DESCRIPTION</h4>
                    <p className="text-foreground/80">{finding.description}</p>
                  </div>
                  <div>
                    <h4 className="text-emerald-500 font-bold mb-1">REMEDIATION</h4>
                    <p className="text-foreground/80">{finding.remediation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className={isFullScreen ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-8" : "cyber-panel p-4"}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-primary font-mono tracking-wider">PIPELINE EXECUTION LOGS</h3>
              <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-muted-foreground hover:text-primary font-mono text-sm border border-border px-3 py-1 rounded">
                {isFullScreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
              </button>
            </div>
             <div className={`bg-black border border-primary/30 rounded p-4 font-mono text-xs md:text-sm overflow-y-auto flex flex-col gap-1 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] ${isFullScreen ? 'flex-grow h-full' : 'max-h-[600px]'}`}>
              {logs.length === 0 ? <p className="text-emerald-400/50">NO LOGS AVAILABLE.</p> : null}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 font-mono ${log.level === 'ERROR' ? 'text-destructive' : log.level === 'WARN' ? 'text-amber-500' : 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.8)]'}`}>
                  <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="opacity-70 shrink-0 w-16">[{log.component}]</span>
                  <span className="break-words whitespace-pre-wrap">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
