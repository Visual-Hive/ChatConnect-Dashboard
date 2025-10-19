import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Copy, RefreshCw, Plus, X, Eye, EyeOff, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const { toast } = useToast();
  const { client, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [clientName, setClientName] = useState(client?.name || "");

  // Mutation to update client name
  const updateClientMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/dashboard/clients/${client?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to update client");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({
        title: "Client updated",
        description: "Your client name has been updated.",
      });
    },
  });

  // Mutation to regenerate API key
  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/dashboard/clients/${client?.id}/regenerate-key`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to regenerate API key");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({
        title: "API Key regenerated",
        description: "Your new API key is ready to use. Make sure to update your widget code.",
      });
    },
  });

  // Mutation to update allowed domains
  const updateDomainsMutation = useMutation({
    mutationFn: async (domains: string[]) => {
      const response = await fetch(`/api/dashboard/clients/${client?.id}/domains`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domains }),
      });
      if (!response.ok) throw new Error("Failed to update domains");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({
        title: "Domains updated",
        description: "Your allowed domains have been updated.",
      });
    },
  });

  const handleCopyApiKey = () => {
    if (client?.publicApiKey) {
      navigator.clipboard.writeText(client.publicApiKey);
      toast({
        title: "API Key copied",
        description: "The API key has been copied to your clipboard.",
      });
    }
  };

  const handleRegenerateKey = () => {
    regenerateKeyMutation.mutate();
  };

  const handleSaveClient = () => {
    if (clientName && clientName !== client?.name) {
      updateClientMutation.mutate(clientName);
    }
  };

  const handleAddDomain = () => {
    if (newDomain && client) {
      const currentDomains = client.allowedDomains || [];
      if (!currentDomains.includes(newDomain)) {
        updateDomainsMutation.mutate([...currentDomains, newDomain]);
        setNewDomain("");
      }
    }
  };

  const handleRemoveDomain = (domain: string) => {
    if (client) {
      const currentDomains = client.allowedDomains || [];
      updateDomainsMutation.mutate(currentDomains.filter(d => d !== domain));
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return "";
    if (showApiKey) return key;
    // Show first 8 chars and last 8 chars
    if (key.length > 16) {
      return `${key.slice(0, 8)}${"•".repeat(32)}${key.slice(-8)}`;
    }
    return "•".repeat(key.length);
  };

  const teamMembers = [
    { id: "1", name: "John Smith", email: "john@conference.com", role: "Admin" },
    { id: "2", name: "Sarah Johnson", email: "sarah@conference.com", role: "Editor" },
    { id: "3", name: "Mike Chen", email: "mike@conference.com", role: "Viewer" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account, team, and integrations
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" data-testid="tab-account">Account</TabsTrigger>
          <TabsTrigger value="api" data-testid="tab-api">API & Integrations</TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
              <CardDescription>Your account and client details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={user?.username || ""}
                  disabled
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={client?.id || ""}
                  disabled
                  className="font-mono text-xs"
                />
              </div>
              <Button 
                onClick={handleSaveClient} 
                disabled={updateClientMutation.isPending || !clientName || clientName === client?.name}
                data-testid="button-save-account"
              >
                {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Public API Key</CardTitle>
              <CardDescription>
                Use this key to authenticate widget requests from your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={maskApiKey(client?.publicApiKey || "")}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-api-key"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    data-testid="button-toggle-api-key"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyApiKey} 
                    data-testid="button-copy-api-key"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={regenerateKeyMutation.isPending}
                    data-testid="button-regenerate-key"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Key
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately invalidate your current API key. Any existing widgets using the old key will stop working until you update them with the new key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegenerateKey}>
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allowed Domains</CardTitle>
              <CardDescription>
                Restrict widget access to specific domains for CORS protection. Leave empty to allow all domains.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="example.com or *.example.com" 
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                  data-testid="input-new-domain"
                />
                <Button 
                  onClick={handleAddDomain}
                  disabled={!newDomain || updateDomainsMutation.isPending}
                  data-testid="button-add-domain"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {client?.allowedDomains && client.allowedDomains.length > 0 ? (
                <div className="space-y-2">
                  {client.allowedDomains.map((domain, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg border"
                      data-testid={`domain-${index}`}
                    >
                      <span className="font-mono text-sm">{domain}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveDomain(domain)}
                        disabled={updateDomainsMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No domain restrictions configured. All domains are allowed.
                </p>
              )}
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
                  <Badge>{client?.status === "active" ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>Manage who has access to your dashboard (Coming Soon)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter email address" disabled data-testid="input-team-email" />
                <Button disabled data-testid="button-invite-member">Invite</Button>
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
                    <Button variant="ghost" size="icon" disabled>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
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
                  <p className="text-lg font-semibold">Free Plan</p>
                  <p className="text-sm text-muted-foreground">$0/month</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Messages</span>
                  <span>Unlimited</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <span>1 / 1</span>
                </div>
              </div>
              <Button variant="outline" disabled data-testid="button-upgrade-plan">
                Upgrade Plan (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
