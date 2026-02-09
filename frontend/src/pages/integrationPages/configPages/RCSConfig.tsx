import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, MessageCircle, TestTube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";

const RCSConfig = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: "",
    apiSecret: "",
    brandId: "",
    agentId: "",
    enableRichMessages: true,
    enableInteractiveMessages: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to save RCS configuration
    message.success("RCS configuration saved successfully!");
    setIsConnected(true);
  };

  const handleTest = async () => {
    // TODO: Implement test RCS message sending
    message.info("Sending test RCS message...");
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
              <h1 className="text-3xl font-bold text-foreground">RCS Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Set up Rich Communication Services integration
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RCS Service Settings</CardTitle>
            <CardDescription>
              Configure your RCS (Rich Communication Services) provider settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="Enter your RCS API key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="Enter your API secret"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Brand ID</Label>
                <Input
                  id="brandId"
                  placeholder="Enter your brand ID"
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  placeholder="Enter your agent ID"
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableRichMessages">Enable Rich Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Send rich media messages with images, videos, and cards
                    </p>
                  </div>
                  <Switch
                    id="enableRichMessages"
                    checked={formData.enableRichMessages}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableRichMessages: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableInteractiveMessages">Enable Interactive Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to interact with messages (buttons, quick replies)
                    </p>
                  </div>
                  <Switch
                    id="enableInteractiveMessages"
                    checked={formData.enableInteractiveMessages}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enableInteractiveMessages: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={handleTest}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Message
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
};

export default RCSConfig;

