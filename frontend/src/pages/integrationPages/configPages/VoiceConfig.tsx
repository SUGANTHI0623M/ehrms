import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Save, Phone, TestTube, ExternalLink, Info, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { useGetExotelConfigQuery } from "@/store/api/exotelApi";

type VoiceProvider = "twilio" | "vonage" | "aws-connect" | "exotel";

const VoiceConfig = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<VoiceProvider>("twilio");
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: "",
    apiSecret: "",
    phoneNumber: "",
    enableCallRecording: false,
    enableCallTranscription: false,
  });
  const [showApiSecret, setShowApiSecret] = useState(false);

  // Fetch Exotel configuration status when Exotel is selected
  const { data: exotelConfig, isLoading: isLoadingExotel } = useGetExotelConfigQuery(undefined, {
    skip: provider !== "exotel", // Only fetch when Exotel is selected
  });

  const isExotelConfigured = exotelConfig?.config?.isConnected || false;
  const exotelConfigExists = !!exotelConfig?.config;

  // Reset form data when provider changes
  useEffect(() => {
    if (provider !== "exotel") {
      setFormData({
        apiKey: "",
        apiSecret: "",
        phoneNumber: "",
        enableCallRecording: false,
        enableCallTranscription: false,
      });
      setIsConnected(false);
    }
  }, [provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provider === "exotel") {
      message.warning("Exotel is configured via Exotel Configuration module. Please configure it there.");
      return;
    }
    // TODO: Implement API call to save Voice configuration for other providers
    message.success("Voice configuration saved successfully!");
    setIsConnected(true);
  };

  const handleTest = async () => {
    if (provider === "exotel") {
      if (!isExotelConfigured) {
        message.warning("Please configure Exotel first in the Exotel Configuration module.");
        return;
      }
      message.info("Using Exotel configuration for voice calls.");
      return;
    }
    // TODO: Implement test voice call for other providers
    message.info("Initiating test voice call...");
  };

  const handleNavigateToExotel = () => {
    navigate("/integrations/exotel");
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
              <h1 className="text-3xl font-bold text-foreground">Voice Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Set up Voice messaging integration for automated calls
              </p>
            </div>
            <div className="flex items-center gap-4">
              {provider === "exotel" ? (
                <Badge variant={isExotelConfigured ? "default" : "secondary"} className="flex items-center gap-1">
                  {isExotelConfigured ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Configured
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Not Configured
                    </>
                  )}
                </Badge>
              ) : (
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Exotel Provider - Show informational message and link */}
        {provider === "exotel" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Exotel Configuration
              </CardTitle>
              <CardDescription>
                Exotel is configured via the dedicated Exotel Configuration module
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>External Configuration Required</AlertTitle>
                <AlertDescription className="mt-2">
                  Exotel integration is managed separately in the Exotel Configuration module. 
                  Please configure Exotel there to use it as your voice provider.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isExotelConfigured ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">
                      {isExotelConfigured ? "Exotel is configured and ready" : "Exotel is not configured"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isExotelConfigured 
                        ? "You can use Exotel for voice calls" 
                        : "Configure Exotel to enable voice functionality"}
                    </p>
                  </div>
                </div>
                <Button onClick={handleNavigateToExotel} variant="default">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Exotel Configuration
                </Button>
              </div>

              {!isExotelConfigured && (
                <Alert variant="destructive">
                  <AlertTitle>Configuration Required</AlertTitle>
                  <AlertDescription>
                    Voice actions are disabled until Exotel is configured. Please configure Exotel first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Voice Service Settings</CardTitle>
            <CardDescription>
              {provider === "exotel" 
                ? "Exotel configuration is managed separately"
                : "Configure your voice service provider settings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="provider">Voice Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(value) => setProvider(value as VoiceProvider)}
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select voice provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="vonage">Vonage</SelectItem>
                    <SelectItem value="aws-connect">AWS Connect</SelectItem>
                    <SelectItem value="exotel">Exotel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {provider === "exotel" 
                    ? "Exotel provides advanced IVR features and is configured separately."
                    : "Select your voice service provider. Exotel provides advanced IVR features."}
                </p>
              </div>

              {/* Only show configuration fields for non-Exotel providers */}
              {provider !== "exotel" && (
                <>
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
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+1234567890"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      The phone number to use for voice calls
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableCallRecording">Enable Call Recording</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically record all voice calls
                        </p>
                      </div>
                      <Switch
                        id="enableCallRecording"
                        checked={formData.enableCallRecording}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, enableCallRecording: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableCallTranscription">Enable Call Transcription</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically transcribe voice calls to text
                        </p>
                      </div>
                      <Switch
                        id="enableCallTranscription"
                        checked={formData.enableCallTranscription}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, enableCallTranscription: checked })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTest}
                  disabled={provider === "exotel" && !isExotelConfigured}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {provider === "exotel" ? "Test Voice Call (Exotel)" : "Test Voice Call"}
                </Button>
                {provider !== "exotel" && (
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                )}
                {provider === "exotel" && (
                  <Button type="button" onClick={handleNavigateToExotel} variant="default">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configure Exotel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
};

export default VoiceConfig;

