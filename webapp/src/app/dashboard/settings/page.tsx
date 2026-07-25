"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences.</p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="admin@devsecai.local" />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage your API keys for programmatic access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Production Key</p>
                    <p className="text-sm text-muted-foreground">Created on Jul 24, 2026</p>
                  </div>
                  <Button variant="outline" size="sm">Revoke</Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Input readOnly value="sk_live_***************************" className="font-mono text-sm bg-background" />
                  <Button variant="secondary">Copy</Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline">Generate New Key</Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert size={20} /> Danger Zone
            </CardTitle>
            <CardDescription>Irreversible destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
