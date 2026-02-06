import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Mail, TestTube, CheckCircle2, XCircle, AlertCircle, Edit, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
  useGetSendPulseConfigQuery,
  useGetSendPulseCredentialsQuery,
  useSaveSendPulseConfigMutation,
  useTestSendPulseConnectionMutation,
  useSendTestEmailMutation,
  useDisconnectSendPulseMutation,
} from "@/store/api/sendpulseApi";

const SendPulseConfig = () => {
  const navigate = useNavigate();
  const { data: configData, isLoading: isLoadingConfig, refetch } = useGetSendPulseConfigQuery();
  
  // State declarations must come before hooks that depend on them
  const [isEditing, setIsEditing] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  
  const { data: credentialsData, refetch: refetchCredentials } = useGetSendPulseCredentialsQuery(undefined, {
    skip: !isEditing || !configData?.data?.config, // Only fetch when editing and config exists
  });
  const [saveConfig, { isLoading: isSaving }] = useSaveSendPulseConfigMutation();
  const [testConnection, { isLoading: isTesting }] = useTestSendPulseConnectionMutation();
  const [sendTestEmail, { isLoading: isSendingTest }] = useSendTestEmailMutation();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectSendPulseMutation();

  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    senderEmail: "",
    senderName: "",
    replyToEmail: "",
    isEnabled: false,
  });

  const [testEmailData, setTestEmailData] = useState({
    to: "",
    subject: "Test Email from HRMS",
    html: "<p>This is a test email from HRMS SendPulse integration.</p>",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing config
  useEffect(() => {
    if (configData?.data?.config) {
      const config = configData.data.config;
      setFormData({
        clientId: "", // Will be populated when editing
        clientSecret: "", // Will be populated when editing
        senderEmail: config.senderEmail || "",
        senderName: config.senderName || "",
        replyToEmail: config.replyToEmail || "",
        isEnabled: config.isEnabled || false,
      });
      // If config exists, start in view mode
      setIsEditing(false);
    } else {
      // If no config exists, start in edit mode
      setIsEditing(true);
    }
  }, [configData]);

  // Load credentials when entering edit mode
  useEffect(() => {
    if (isEditing && configData?.data?.config && credentialsData?.data) {
      setFormData((prev) => ({
        ...prev,
        clientId: credentialsData.data.clientId || "",
        clientSecret: credentialsData.data.clientSecret || "",
      }));
    }
  }, [isEditing, credentialsData, configData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Credentials are only required for new configs, optional for updates
    if (!configData?.data?.config) {
      if (!formData.clientId) {
        newErrors.clientId = "Client ID is required";
      }
      if (!formData.clientSecret) {
        newErrors.clientSecret = "Client Secret is required";
      }
    }

    if (!formData.senderEmail) {
      newErrors.senderEmail = "Sender Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = "Invalid email format";
    }

    if (!formData.senderName) {
      newErrors.senderName = "Sender Name is required";
    }

    if (formData.replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.replyToEmail)) {
      newErrors.replyToEmail = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      message.error("Please fix the form errors");
      return;
    }

    try {
      const result = await saveConfig({
        // For updates, only send credentials if they were changed (not empty)
        // For new configs, they are required and validated above
        clientId: formData.clientId && formData.clientId.trim() ? formData.clientId : undefined,
        clientSecret: formData.clientSecret && formData.clientSecret.trim() ? formData.clientSecret : undefined,
        senderEmail: formData.senderEmail,
        senderName: formData.senderName,
        replyToEmail: formData.replyToEmail || undefined,
        isEnabled: formData.isEnabled,
      }).unwrap();

      message.success(result.message || "Configuration saved successfully!");
      refetch();
      setIsEditing(false); // Switch back to view mode after saving
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to save configuration";
      message.error(errorMessage);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      message.error("Please enter Client ID and Client Secret to test connection");
      return;
    }

    try {
      const result = await testConnection({
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      }).unwrap();

      if (result.success) {
        message.success(result.message || "Connection test successful!");
      } else {
        message.error(result.message || "Connection test failed");
      }
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Connection test failed";
      message.error(errorMessage);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailData.to) {
      message.error("Please enter a recipient email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailData.to)) {
      message.error("Invalid recipient email format");
      return;
    }

    try {
      const result = await sendTestEmail({
        to: testEmailData.to,
        subject: testEmailData.subject,
        html: testEmailData.html,
      }).unwrap();

      message.success(result.message || "Test email sent successfully!");
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to send test email";
      message.error(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await disconnect().unwrap();
      message.success(result.message || "Integration disconnected successfully");
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to disconnect";
      message.error(errorMessage);
    }
  };

  const config = configData?.data?.config;
  const status = config?.isConnected
    ? "Connected"
    : config?.isEnabled
    ? "Configured"
    : "Not Configured";

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
              <h1 className="text-3xl font-bold text-foreground">SendPulse Email Integration</h1>
              <p className="text-muted-foreground mt-2">
                Configure SendPulse for transactional emails, notifications, and system alerts
              </p>
            </div>
            <Badge variant={config?.isConnected ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
        </div>

        {config?.connectionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connection Error: {config.connectionError}
            </AlertDescription>
          </Alert>
        )}

        {/* View Saved Configuration - Only show when not editing */}
        {config && !isEditing && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {config.isConnected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    SendPulse Configuration
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {config.isConnected 
                      ? "Your SendPulse configuration is active and connected"
                      : config.isEnabled
                      ? "Configuration exists but connection is not verified"
                      : "Configuration exists but is disabled"}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    refetchCredentials(); // Fetch credentials when entering edit mode
                  }}
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Configuration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Sender Email</Label>
                  <p className="text-base font-medium">{config.senderEmail || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Sender Name</Label>
                  <p className="text-base font-medium">{config.senderName || "Not set"}</p>
                </div>
                {config.replyToEmail && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Reply-To Email</Label>
                    <p className="text-base font-medium">{config.replyToEmail}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Connection Status</Label>
                  <Badge variant={config.isConnected ? "default" : "secondary"}>
                    {config.isConnected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                {config.lastVerifiedAt && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Last Verified</Label>
                    <p className="text-base font-medium">
                      {new Date(config.lastVerifiedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Integration Status</Label>
                  <Badge variant={config.isEnabled ? "default" : "secondary"}>
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Client ID and Client Secret are stored securely and cannot be displayed. 
                    Click "Edit Configuration" to update your credentials or settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Form - Only show when editing or when no config exists */}
        {(isEditing || !config) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {config ? "Edit SendPulse Configuration" : "SendPulse Configuration"}
                  </CardTitle>
                  <CardDescription>
                    {config 
                      ? "Update your SendPulse API credentials and sender information"
                      : "Enter your SendPulse API credentials and sender information"}
                  </CardDescription>
                </div>
                {config && (
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setShowCredentials(false);
                      // Reset form to saved values
                      if (configData?.data?.config) {
                        const savedConfig = configData.data.config;
                        setFormData({
                          clientId: "",
                          clientSecret: "",
                          senderEmail: savedConfig.senderEmail || "",
                          senderName: savedConfig.senderName || "",
                          replyToEmail: savedConfig.replyToEmail || "",
                          isEnabled: savedConfig.isEnabled || false,
                        });
                        setErrors({});
                      }
                    }}
                    variant="ghost"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clientId">
                    Client ID <span className="text-red-500">*</span>
                  </Label>
                  {config && formData.clientId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCredentials(!showCredentials)}
                    >
                      {showCredentials ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Input
                  id="clientId"
                  type={showCredentials ? "text" : "password"}
                  placeholder={config ? "Enter new Client ID to update" : "2bade7687922134640c77ba414e228ff"}
                  value={formData.clientId}
                  onChange={(e) => {
                    setFormData({ ...formData, clientId: e.target.value });
                    if (errors.clientId) setErrors({ ...errors, clientId: "" });
                  }}
                  required={!config}
                />
                {errors.clientId && (
                  <p className="text-sm text-red-500">{errors.clientId}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {config
                    ? "Current Client ID is shown above. Leave as is to keep existing, or enter new ID to update."
                    : "Get your Client ID from SendPulse Dashboard → Settings → API"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clientSecret">
                    Client Secret <span className="text-red-500">*</span>
                  </Label>
                  {config && formData.clientSecret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCredentials(!showCredentials)}
                    >
                      {showCredentials ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Input
                  id="clientSecret"
                  type={showCredentials ? "text" : "password"}
                  placeholder={config ? "Enter new Client Secret to update" : "195fe5c38f13289bd0e840879e9f4a22"}
                  value={formData.clientSecret}
                  onChange={(e) => {
                    setFormData({ ...formData, clientSecret: e.target.value });
                    if (errors.clientSecret) setErrors({ ...errors, clientSecret: "" });
                  }}
                  required={!config}
                />
                {errors.clientSecret && (
                  <p className="text-sm text-red-500">{errors.clientSecret}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {config
                    ? "Current Client Secret is shown above. Leave as is to keep existing, or enter new secret to update."
                    : "Get your Client Secret from SendPulse Dashboard → Settings → API"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senderEmail">
                    Sender Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="senderEmail"
                    type="email"
                    placeholder="noreply@yourcompany.com"
                    value={formData.senderEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, senderEmail: e.target.value });
                      if (errors.senderEmail) setErrors({ ...errors, senderEmail: "" });
                    }}
                    required
                  />
                  {errors.senderEmail && (
                    <p className="text-sm text-red-500">{errors.senderEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">
                    Sender Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="senderName"
                    placeholder="Your Company Name"
                    value={formData.senderName}
                    onChange={(e) => {
                      setFormData({ ...formData, senderName: e.target.value });
                      if (errors.senderName) setErrors({ ...errors, senderName: "" });
                    }}
                    required
                  />
                  {errors.senderName && (
                    <p className="text-sm text-red-500">{errors.senderName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  placeholder="support@yourcompany.com"
                  value={formData.replyToEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, replyToEmail: e.target.value });
                    if (errors.replyToEmail) setErrors({ ...errors, replyToEmail: "" });
                  }}
                />
                {errors.replyToEmail && (
                  <p className="text-sm text-red-500">{errors.replyToEmail}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Email address where replies will be sent (defaults to sender email if not set)
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="isEnabled" className="text-base font-medium">
                    Enable SendPulse Integration
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, SendPulse will be used for all transactional emails
                  </p>
                </div>
                <Switch
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isEnabled: checked })
                  }
                />
              </div>

              {config?.lastVerifiedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {config.isConnected ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>
                    Last verified: {new Date(config.lastVerifiedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || isLoadingConfig || (!formData.clientId || !formData.clientSecret)}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
                <Button type="submit" disabled={isSaving || isLoadingConfig}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
                {config && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Test Email Section - Only show when connected */}
        {config?.isConnected && !isEditing && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your SendPulse configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmailTo">Recipient Email</Label>
                  <Input
                    id="testEmailTo"
                    type="email"
                    placeholder="recipient@example.com"
                    value={testEmailData.to}
                    onChange={(e) =>
                      setTestEmailData({ ...testEmailData, to: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testEmailSubject">Subject</Label>
                  <Input
                    id="testEmailSubject"
                    value={testEmailData.subject}
                    onChange={(e) =>
                      setTestEmailData({ ...testEmailData, subject: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testEmailHtml">HTML Content</Label>
                  <textarea
                    id="testEmailHtml"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={testEmailData.html}
                    onChange={(e) =>
                      setTestEmailData({ ...testEmailData, html: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmailData.to}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSendingTest ? "Sending..." : "Send Test Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </MainLayout>
  );
};

export default SendPulseConfig;

