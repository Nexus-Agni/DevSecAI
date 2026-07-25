"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github, Gitlab, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub account to scan public and private repositories automatically.',
      icon: Github,
      connected: true,
      color: 'text-foreground'
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Import projects directly from GitLab and run security pipelines on every commit.',
      icon: Gitlab,
      connected: false,
      color: 'text-orange-500'
    },
    {
      id: 'bitbucket',
      name: 'Bitbucket',
      description: 'Sync your Bitbucket workspaces to monitor team codebases for vulnerabilities.',
      icon: LinkIcon,
      connected: false,
      color: 'text-blue-500'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">Connect DevSecAI to your favorite version control providers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="flex flex-col h-full">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <div className={`p-3 bg-muted rounded-lg \${integration.color}`}>
                  <integration.icon size={24} />
                </div>
                {integration.connected && (
                  <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} className="mr-1" /> Connected
                  </span>
                )}
              </div>
              <CardTitle className="text-xl">{integration.name}</CardTitle>
              <CardDescription className="min-h-[60px]">
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto pt-4 border-none bg-transparent">
              <Button 
                variant={integration.connected ? "outline" : "default"} 
                className="w-full"
              >
                {integration.connected ? 'Manage Settings' : 'Connect'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
