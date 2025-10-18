import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [apiKey] = useState("sk_live_abc123def456ghi789");
  const [webhookUrl] = useState("https://your-app.com/webhook/conferenceapp");

  const teamMembers = [
    { id: "1", name: "John Smith", email: "john@conference.com", role: "Admin" },
    { id: "2", name: "Sarah Johnson", email: "sarah@conference.com", role: "Editor" },
    { id: "3", name: "Mike Chen", email: "mike@conference.com", role: "Viewer" },
  ];

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key copied",
      description: "The API key has been copied to your clipboard.",
    });
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Webhook URL copied",
      description: "The webhook URL has been copied to your clipboard.",
    });
  };

  const handleRegenerateKey = () => {
    toast({
      title: "API Key regenerated",
      description: "Your new API key is ready to use.",
    });
  };

  const handleSaveAccount = () => {
    toast({
      title: "Account settings saved",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, team, and integrations
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" data-testid="tab-account">Account</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">API & Integrations</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Settings</CardTitle>
              <CardDescription>Update your conference and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conference-name">Conference Name</Label>
                <Input
                  id="conference-name"
                  defaultValue="Tech Summit 2024"
                  data-testid="input-conference-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  defaultValue="contact@techsummit.com"
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  defaultValue="https://techsummit.com"
                  data-testid="input-website"
                />
              </div>
              <Button onClick={handleSaveAccount} data-testid="button-save-account">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>Manage who has access to your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter email address" data-testid="input-team-email" />
                <Button data-testid="button-invite-member">Invite</Button>
              </div>

              <div className="space-y-2">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    data-testid={`team-member-${index}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="secondary">{member.role}</Badge>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Keys</CardTitle>
              <CardDescription>
                Use these keys to integrate with external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={apiKey}
                    type="password"
                    readOnly
                    className="font-mono"
                    data-testid="input-api-key"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyApiKey} data-testid="button-copy-api-key">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleRegenerateKey} data-testid="button-regenerate-key">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono"
                    data-testid="input-webhook-url"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyWebhook} data-testid="button-copy-webhook">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Widget Installation</p>
                    <p className="text-xs text-muted-foreground">Code deployed on your website</p>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Webhook</p>
                    <p className="text-xs text-muted-foreground">Real-time event notifications</p>
                  </div>
                  <Badge variant="secondary">Not configured</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Professional Plan</p>
                  <p className="text-sm text-muted-foreground">$99/month</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Messages</span>
                  <span>2,847 / 10,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <span>3 / 5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Storage</span>
                  <span>4.7 GB / 20 GB</span>
                </div>
              </div>
              <Button variant="outline" data-testid="button-upgrade-plan">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { date: "Jan 1, 2024", amount: "$99.00", status: "Paid" },
                  { date: "Dec 1, 2023", amount: "$99.00", status: "Paid" },
                  { date: "Nov 1, 2023", amount: "$99.00", status: "Paid" },
                ].map((invoice, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`invoice-${index}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{invoice.date}</p>
                      <p className="text-xs text-muted-foreground">{invoice.amount}</p>
                    </div>
                    <Badge>{invoice.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
