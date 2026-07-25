"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  ShieldAlert, Lock, FileCode, Package, Activity, 
  Terminal, Download, AlertTriangle, ArrowLeft,
  ChevronDown, ChevronUp, Trash
} from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

export default function ScanReport() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('sast');
  const [expandedSast, setExpandedSast] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const router = useRouter();

  const fetchReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data);
      if (res.data.pdfPath) {
        setIsGeneratingPdf(false);
      }
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
      if (!report || (report.status !== 'COMPLETED' && report.status !== 'FAILED') || isGeneratingPdf) {
        fetchReport();
        fetchLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, report?.status, isGeneratingPdf]);

  if (!report) return <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground animate-pulse">Loading report data...</div>;

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
      <div className="max-w-4xl mx-auto mt-10 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground">Analysis in Progress</h2>
              <p className="text-muted-foreground mt-1">Target: {report.project?.repositoryUrl}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full animate-pulse">
                {report.status}
              </span>
              <button onClick={handleStop} className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                Stop Analysis
              </button>
            </div>
          </div>
          
          <div className="bg-[#09090b] rounded-lg p-6 font-mono text-sm overflow-y-auto flex flex-col gap-2 h-96 border border-border shadow-inner">
            <div className="text-primary/70 mb-2">~ initiating security analysis pipeline...</div>
            
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 font-mono ${log.level === 'ERROR' ? 'text-destructive' : log.level === 'WARN' ? 'text-amber-500' : 'text-primary/90'}`}>
                <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="opacity-70 shrink-0 w-16">[{log.component}]</span>
                <span className="break-words whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
            
            {report.status !== 'COMPLETED' && report.status !== 'FAILED' && (
              <div className="text-primary animate-pulse mt-2">_</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="max-w-3xl mx-auto mt-10 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="bg-card border border-destructive/30 rounded-xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Scan Failed</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{report.errorMessage || "An unknown error occurred during analysis. Please check your repository configuration and try again."}</p>
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

  const getSeverityBadge = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === 'CRITICAL') return <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 rounded-full text-xs font-medium">Critical</span>;
    if (s === 'HIGH') return <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">High</span>;
    if (s === 'MEDIUM') return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">Medium</span>;
    return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium">Low</span>;
  }

  const riskColor = getRiskColor(report.riskScore);
  const chartData = [{ name: 'Risk', value: report.riskScore, fill: riskColor }];

  const handleDownload = async () => {
    try {
      if (!report.pdfPath) {
        setIsGeneratingPdf(true);
        await api.post(`/reports/${id}/pdf`);
        alert("PDF generation started. It will download automatically when ready.");
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
    <div className="space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Analysis Report</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
            Target: <span className="text-foreground font-mono bg-muted/30 px-2 py-0.5 rounded">{report.project?.repositoryUrl}</span>
            <span className="text-border">|</span>
            Branch: <span className="text-foreground font-mono bg-muted/30 px-2 py-0.5 rounded">{report.project?.branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDelete} className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 rounded-lg transition-colors font-medium text-sm">
             <Trash size={16} /> Delete
          </button>
          <button onClick={handleDownload} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50">
            <Download size={16} /> {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Dashboard Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Risk Score */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center col-span-1 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Overall Risk Score</h3>
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
              <span className="text-4xl font-bold" style={{ color: riskColor }}>
                {report.riskScore}
              </span>
            </div>
          </div>
        </div>

        {/* Severities */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Critical</span>
            <span className="text-4xl font-bold text-foreground">{report.criticalCount}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-sm font-medium text-muted-foreground mb-1">High</span>
            <span className="text-4xl font-bold text-foreground">{report.highCount}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Medium</span>
            <span className="text-4xl font-bold text-foreground">{report.mediumCount}</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-sm font-medium text-muted-foreground mb-1">Low</span>
            <span className="text-4xl font-bold text-foreground">{report.lowCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mt-8 overflow-x-auto no-scrollbar gap-2">
        {[
          { id: 'sast', icon: FileCode, label: 'SAST Threats', count: sast.length },
          { id: 'secrets', icon: Lock, label: 'Secrets', count: secrets.length },
          { id: 'deps', icon: Package, label: 'Dependencies', count: deps.length },
          { id: 'network', icon: Activity, label: 'IaC & Network', count: network.length },
          { id: 'logs', icon: Terminal, label: 'Logs', count: logs.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeTab === t.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-md'
            }`}
          >
            <t.icon size={16} /> {t.label} 
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'sast' && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {sast.length === 0 ? <p className="text-muted-foreground p-8 text-center">No SAST threats detected.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
                    <th className="p-4 w-32">Severity</th>
                    <th className="p-4">Vulnerability Title</th>
                    <th className="p-4 font-mono hidden md:table-cell">File Location</th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sast.map((finding: any, i: number) => (
                    <React.Fragment key={i}>
                      <tr 
                        onClick={() => setExpandedSast(expandedSast === i ? null : i)}
                        className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors ${expandedSast === i ? 'bg-muted/10' : ''}`}
                      >
                        <td className="p-4">{getSeverityBadge(finding.severity)}</td>
                        <td className="p-4 font-semibold text-foreground">{finding.title}</td>
                        <td className="p-4 font-mono text-muted-foreground hidden md:table-cell text-xs">{finding.file}:{finding.lineStart}</td>
                        <td className="p-4 text-muted-foreground">
                          {expandedSast === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {expandedSast === i && (
                        <tr className="bg-muted/5 border-b border-border">
                          <td colSpan={4} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="col-span-1 md:col-span-2 space-y-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                                  <p className="text-foreground leading-relaxed">{finding.description}</p>
                                </div>
                                <div className="bg-[#09090b] border border-border p-4 rounded-lg font-mono text-sm overflow-x-auto text-primary shadow-inner">
                                  <pre><code>{finding.snippet}</code></pre>
                                </div>
                              </div>
                              <div className="col-span-1 space-y-6">
                                {finding.owasp && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Classification</h4>
                                    <span className="bg-muted text-foreground px-3 py-1 rounded-md text-xs font-mono border border-border">{finding.owasp}</span>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Compromise Vector</h4>
                                  <p className="text-foreground/90 text-sm leading-relaxed">{finding.compromiseVector || 'An attacker could exploit this vulnerability.'}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Remediation</h4>
                                  <p className="text-foreground/90 text-sm leading-relaxed">{finding.remediation}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Similar table styling for Secrets */}
        {activeTab === 'secrets' && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {secrets.length === 0 ? <p className="text-muted-foreground p-8 text-center">No exposed secrets detected.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
                    <th className="p-4">Type</th>
                    <th className="p-4 font-mono hidden sm:table-cell">File</th>
                    <th className="p-4 font-mono">Value (Masked)</th>
                  </tr>
                </thead>
                <tbody>
                  {secrets.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-4 font-semibold text-foreground">{s.type}</td>
                      <td className="p-4 font-mono text-muted-foreground text-xs hidden sm:table-cell">{s.file}:{s.line}</td>
                      <td className="p-4 font-mono text-primary text-xs bg-primary/5 rounded my-2 mr-4 inline-block px-2 py-1">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'deps' && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {deps.length === 0 ? <p className="text-muted-foreground p-8 text-center">No vulnerable dependencies detected.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
                    <th className="p-4">Severity</th>
                    <th className="p-4">Package</th>
                    <th className="p-4 font-mono">Version</th>
                    <th className="p-4 font-mono">CVE / Advisory</th>
                  </tr>
                </thead>
                <tbody>
                  {deps.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-4">{getSeverityBadge(d.severity)}</td>
                      <td className="p-4 font-semibold">{d.package}</td>
                      <td className="p-4 font-mono text-muted-foreground text-xs">{d.version}</td>
                      <td className="p-4 font-mono text-primary text-xs">
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
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {network.length === 0 ? <p className="text-muted-foreground p-8 text-center">No Network or IaC misconfigurations detected.</p> : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-muted-foreground font-medium">
                    <th className="p-4 w-32">Severity</th>
                    <th className="p-4">Title</th>
                    <th className="p-4 font-mono hidden md:table-cell">File</th>
                  </tr>
                </thead>
                <tbody>
                  {network.map((finding: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-4">{getSeverityBadge(finding.severity)}</td>
                      <td className="p-4 font-semibold text-foreground">
                        {finding.title}
                        <div className="text-muted-foreground text-xs font-normal mt-1 max-w-lg">{finding.description}</div>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground hidden md:table-cell text-xs">{finding.file}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <div className="bg-[#09090b] border border-border rounded-xl shadow-inner overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 bg-card border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Terminal size={16} className="text-muted-foreground"/> Pipeline Execution Logs
              </h3>
            </div>
             <div className="p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 h-[500px]">
              {logs.length === 0 ? <p className="text-muted-foreground/50">No logs available.</p> : null}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.level === 'ERROR' ? 'text-destructive' : log.level === 'WARN' ? 'text-amber-500' : 'text-foreground/80'}`}>
                  <span className="opacity-40 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="opacity-60 shrink-0 w-16 text-primary">[{log.component}]</span>
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
