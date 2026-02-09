import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Mail, TestTube, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
  useGetSendGridConfigQuery,
  useSaveSendGridConfigMutation,
  useTestSendGridConnectionMutation,
  useSendTestEmailMutation,
  useDisconnectSendGridMutation,
} from "@/store/api/sendgridApi";

const SendGridConfig = () => {
  const navigate = useNavigate();
  const { data: configData, isLoading: isLoadingConfig, refetch } = useGetSendGridConfigQuery();
  const [saveConfig, { isLoading: isSaving }] = useSaveSendGridConfigMutation();
  const [testConnection, { isLoading: isTesting }] = useTestSendGridConnectionMutation();
  const [sendTestEmail, { isLoading: isSendingTest }] = useSendTestEmailMutation();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectSendGridMutation();

  const [formData, setFormData] = useState({
    apiKey: "",
    senderEmail: "",
    senderName: "",
    replyToEmail: "",
    isEnabled: false,
  });

  const [testEmailData, setTestEmailData] = useState({
    to: "",
    subject: "Test Email from HRMS",
    html: "<p>This is a test email from HRMS SendGrid integration.</p>",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing config
  useEffect(() => {
    if (configData?.data?.config) {
      const config = configData.data.config;
      setFormData({
        apiKey: "", // Don't populate API key for security
        senderEmail: config.senderEmail || "",
        senderName: config.senderName || "",
        replyToEmail: config.replyToEmail || "",
        isEnabled: config.isEnabled || false,
      });
    }
  }, [configData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.apiKey && !configData?.data?.config) {
      newErrors.apiKey = "API Key is required";
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
        apiKey: formData.apiKey || undefined, // Only send if provided
        senderEmail: formData.senderEmail,
        senderName: formData.senderName,
        replyToEmail: formData.replyToEmail || undefined,
        isEnabled: formData.isEnabled,
      }).unwrap();

      message.success(result.message || "Configuration saved successfully!");
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to save configuration";
      message.error(errorMessage);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection({
        apiKey: formData.apiKey || undefined,
      }).unwrap();

      if (result.success && result.data.connected) {
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
              <h1 className="text-3xl font-bold text-foreground">SendGrid Email Integration</h1>
              <p className="text-muted-foreground mt-2">
                Configure SendGrid for transactional emails, notifications, and system alerts
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

        <Card>
          <CardHeader>
            <CardTitle>SendGrid Configuration</CardTitle>
            <CardDescription>
              Enter your SendGrid API credentials and sender information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  API Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={config ? "Enter new API key to update" : "SG.xxxxxxxxxxxxxxxx"}
                  value={formData.apiKey}
                  onChange={(e) => {
                    setFormData({ ...formData, apiKey: e.target.value });
                    if (errors.apiKey) setErrors({ ...errors, apiKey: "" });
                  }}
                  required={!config}
                />
                {errors.apiKey && (
                  <p className="text-sm text-red-500">{errors.apiKey}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {config
                    ? "Leave empty to keep existing API key. Enter new key to update."
                    : "Get your API key from SendGrid Dashboard → Settings → API Keys"}
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

              {config?.webhookUrl && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={config.webhookUrl} readOnly className="bg-muted" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(config.webhookUrl || "");
                        message.success("Webhook URL copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this URL in SendGrid Dashboard → Settings → Mail Settings → Event Webhook
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="isEnabled" className="text-base font-medium">
                    Enable SendGrid Integration
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, SendGrid will be used for all transactional emails
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
                  disabled={isTesting || isLoadingConfig}
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

        {config?.isConnected && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your SendGrid configuration
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

export default SendGridConfig;

