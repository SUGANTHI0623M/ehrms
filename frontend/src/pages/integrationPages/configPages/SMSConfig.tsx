import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, MessageSquare, TestTube, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";

const SMSConfig = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    provider: "twilio",
    apiKey: "",
    apiSecret: "",
    senderId: "",
    countryCode: "+91",
  });
  const [showApiSecret, setShowApiSecret] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to save SMS configuration
    message.success("SMS configuration saved successfully!");
    setIsConnected(true);
  };

  const handleTest = async () => {
    // TODO: Implement test SMS sending
    message.info("Sending test SMS...");
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
              <h1 className="text-3xl font-bold text-foreground">SMS Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Configure SMS gateway and messaging settings
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SMS Gateway Settings</CardTitle>
            <CardDescription>
              Configure your SMS service provider settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="provider">SMS Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SMS provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="msg91">MSG91</SelectItem>
                    <SelectItem value="textlocal">TextLocal</SelectItem>
                    <SelectItem value="nexmo">Vonage (Nexmo)</SelectItem>
                    <SelectItem value="aws-sns">AWS SNS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key / Account SID</Label>
                <Input
                  id="apiKey"
                  placeholder="Enter your API key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret / Auth Token</Label>
                <div className="relative">
                  <Input
                    id="apiSecret"
                    type={showApiSecret ? "text" : "password"}
                    placeholder="Enter your API secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderId">Sender ID</Label>
                <Input
                  id="senderId"
                  placeholder="Your Company Name"
                  value={formData.senderId}
                  onChange={(e) => setFormData({ ...formData, senderId: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The name or number that will appear as the sender
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="countryCode">Default Country Code</Label>
                <Input
                  id="countryCode"
                  placeholder="+91"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={handleTest}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test SMS
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

export default SMSConfig;

