import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";

const GoogleCalendarConfig = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [settings, setSettings] = useState({
    syncEvents: true,
    autoCreateEvents: false,
    syncAttendees: true,
    reminderMinutes: "15",
  });

  const handleGoogleAuth = async () => {
    // TODO: Implement Google OAuth flow
    message.info("Redirecting to Google for authorization...");
    // Simulate authorization
    setTimeout(() => {
      setIsAuthorized(true);
      setIsConnected(true);
      message.success("Successfully connected to Google Calendar!");
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to save Google Calendar configuration
    message.success("Google Calendar configuration saved successfully!");
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/integrations")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Google Calendar Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Connect your Google Calendar to sync events and get live updates
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Google Calendar Connection</CardTitle>
            <CardDescription>
              Authorize access to your Google Calendar account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthorized ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-6 border rounded-lg">
                  <Calendar className="h-12 w-12 text-blue-500" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Connect Google Calendar</h3>
                    <p className="text-sm text-muted-foreground">
                      Authorize HRMS to access your Google Calendar to sync events and appointments
                    </p>
                  </div>
                  <Button onClick={handleGoogleAuth}>
                    Connect Google Calendar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Successfully connected to Google Calendar
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your calendar is now synced with HRMS
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="syncEvents">Sync Events</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync events between HRMS and Google Calendar
                      </p>
                    </div>
                    <Switch
                      id="syncEvents"
                      checked={settings.syncEvents}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, syncEvents: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoCreateEvents">Auto-Create Events</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create calendar events for interviews and meetings
                      </p>
                    </div>
                    <Switch
                      id="autoCreateEvents"
                      checked={settings.autoCreateEvents}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, autoCreateEvents: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="syncAttendees">Sync Attendees</Label>
                      <p className="text-sm text-muted-foreground">
                        Include attendees when syncing events
                      </p>
                    </div>
                    <Switch
                      id="syncAttendees"
                      checked={settings.syncAttendees}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, syncAttendees: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
};

export default GoogleCalendarConfig;

