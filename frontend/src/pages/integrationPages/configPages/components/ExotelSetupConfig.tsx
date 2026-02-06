import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Input,
  Button,
  message,
  Typography,
  Divider,
  Space,
  Tag,
  Row,
  Col,
  Tooltip,
  Alert,
  Spin,
  Tabs,
} from "antd";
import {
  CloudServerOutlined,
  KeyOutlined,
  PhoneOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  LockOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  ApiOutlined,
  WarningOutlined,
  CopyOutlined,
  EditOutlined,
  CalendarOutlined,
  HistoryOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import {
  useGetExotelConfigQuery,
  useSaveExotelConfigMutation,
  useTestExotelConnectionMutation,
  useDisconnectExotelMutation,
} from "@/store/api/exotelApi";
import IvrCallLogsTable from "./IvrCallLogsTable";
const { Title, Text } = Typography;

// Move FormField component OUTSIDE to prevent re-creation on every render
const FormField = ({ label, required, tooltip, error, children }: any) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ marginBottom: 8 }}>
      <Space>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
          </Tooltip>
        )}
        {required && <Text type='danger'>*</Text>}
      </Space>
    </div>
    {children}
    {error && (
      <Text
        type='danger'
        style={{ fontSize: 12, display: "block", marginTop: 4 }}
      >
        {error}
      </Text>
    )}
  </div>
);

const ExotelSetupConfig = ({ onCancel, onSuccess }: { onCancel?: () => void; onSuccess?: () => void }) => {
  const [accountSid, setAccountSid] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [accountRegion, setAccountRegion] = useState("");
  const [exotelApiKey, setExotelApiKey] = useState("");
  const [exotelApiToken, setExotelApiToken] = useState("");
  const [exoPhone, setExoPhone] = useState("");
  const [webhookUrls, setWebhookUrls] = useState({
    sales: "",
    support: "",
    appointments: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    lastVerified: null as string | null,
    error: null as string | null,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("authentication");

  const { data: configData, isLoading, refetch } = useGetExotelConfigQuery();
  const [saveConfig, { isLoading: isSaving }] = useSaveExotelConfigMutation();
  const [testConnection, { isLoading: isTesting }] =
    useTestExotelConnectionMutation();
  const [disconnect] = useDisconnectExotelMutation();

  // Update form when configData changes
  useEffect(() => {
    if (configData?.config) {
      const config = configData.config;
      setAccountSid(config.accountSid || "");
      setSubdomain(config.subdomain || "");
      setAccountRegion(config.accountRegion || "");
      setExoPhone(config.exoPhone || "");
      setConnectionStatus({
        isConnected: config.isConnected || false,
        lastVerified: config.lastVerifiedAt || null,
        error: config.connectionError || null,
      });
      setIsConfigured(true);
      setIsEditing(false);
    } else if (configData && !configData.config) {
      // No config exists
      setIsConfigured(false);
      setIsEditing(true);
    }
    if (configData?.webhookUrls) {
      setWebhookUrls(configData.webhookUrls);
    }
  }, [configData]);

  const clearFieldError = useCallback((fieldName: string) => {
    setFormErrors(prev => {
      if (!prev[fieldName]) return prev;
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Memoized change handlers
  const handleAccountSidChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountSid(e.target.value);
      clearFieldError("accountSid");
    },
    [clearFieldError]
  );

  const handleSubdomainChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubdomain(e.target.value);
      clearFieldError("subdomain");
    },
    [clearFieldError]
  );

  const handleAccountRegionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAccountRegion(e.target.value);
      clearFieldError("accountRegion");
    },
    [clearFieldError]
  );

  const handleExotelApiKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExotelApiKey(e.target.value);
      clearFieldError("exotelApiKey");
    },
    [clearFieldError]
  );

  const handleExotelApiTokenChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExotelApiToken(e.target.value);
      clearFieldError("exotelApiToken");
    },
    [clearFieldError]
  );

  const handleExoPhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExoPhone(e.target.value);
      clearFieldError("exoPhone");
    },
    [clearFieldError]
  );

  const validateForm = useCallback(
    (skipCredentials = false) => {
      const errors: Record<string, string> = {};

      if (!accountSid.trim()) {
        errors.accountSid = "Account SID is required";
      } else if (accountSid.trim().length < 3) {
        errors.accountSid = "Account SID must be at least 3 characters";
      } else if (!/^[a-zA-Z0-9]+$/.test(accountSid.trim())) {
        errors.accountSid = "Account SID can only contain letters and numbers";
      }

      if (subdomain && !/^[a-zA-Z0-9.-]+$/.test(subdomain.trim())) {
        errors.subdomain = "Invalid subdomain format";
      }

      if (accountRegion && !/^[a-zA-Z0-9\s]*$/.test(accountRegion.trim())) {
        errors.accountRegion =
          "Region code can only contain letters, numbers, and spaces";
      }

      // Skip credential validation if already configured and testing connection
      if (!skipCredentials) {
        if (!exotelApiKey.trim()) {
          errors.exotelApiKey = "API Key is required";
        } else if (exotelApiKey.trim().length < 3) {
          errors.exotelApiKey = "API Key must be at least 3 characters";
        }

        if (!exotelApiToken.trim()) {
          errors.exotelApiToken = "API Token is required";
        } else if (exotelApiToken.trim().length < 3) {
          errors.exotelApiToken = "API Token must be at least 3 characters";
        }

        if (!exoPhone.trim()) {
          errors.exoPhone = "ExoPhone Number is required";
        } else if (!/^\+?[0-9]{10,15}$/.test(exoPhone.trim())) {
          errors.exoPhone = "Invalid phone number format (10-15 digits)";
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [
      accountSid,
      subdomain,
      accountRegion,
      exotelApiKey,
      exotelApiToken,
      exoPhone,
    ]
  );

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      message.error("Please fill in all required fields correctly");
      return;
    }

    try {
      const configToSave = {
        accountSid: accountSid.trim(),
        subdomain: subdomain.trim() || "api.exotel.com",
        accountRegion: accountRegion?.trim() || "",
        apiKey: exotelApiKey.trim(),
        apiToken: exotelApiToken.trim(),
        exoPhone: exoPhone.trim(),
      };

      await saveConfig(configToSave).unwrap();

      message.success("Configuration saved successfully!");

      // Clear sensitive fields
      setExotelApiKey("");
      setExotelApiToken("");

      // Refetch config to update the UI
      await refetch();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      message.error(
        err.data?.error || err.error || "Failed to save configuration"
      );
    }
  }, [
    validateForm,
    accountSid,
    subdomain,
    accountRegion,
    exotelApiKey,
    exotelApiToken,
    exoPhone,
    saveConfig,
    refetch,
    onSuccess,
  ]);

  const handleTestConnection = useCallback(async () => {
    // Allow test connection with stored credentials if already configured
    const canUseStoredCredentials =
      isConfigured && !exotelApiKey && !exotelApiToken;

    if (!validateForm(canUseStoredCredentials)) {
      message.error("Please fill in all required fields correctly");
      return;
    }

    try {
      // Only send credentials if they're provided (for updating)
      const testData: any = {
        accountSid: accountSid.trim(),
        subdomain: subdomain.trim() || "api.exotel.com",
        exoPhone: exoPhone.trim(),
      };

      // Add credentials only if provided
      if (exotelApiKey.trim()) {
        testData.apiKey = exotelApiKey.trim();
      }
      if (exotelApiToken.trim()) {
        testData.apiToken = exotelApiToken.trim();
      }

      await testConnection(testData).unwrap();

      setConnectionStatus({
        isConnected: true,
        lastVerified: new Date().toISOString(),
        error: null,
      });

      message.success("Connection successful! Exotel is authenticated.");

      // Refetch config to update connection status
      await refetch();

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Test connection error:", err);
      const errorMsg = err.data?.error || err.error || "Connection failed";
      setConnectionStatus({
        isConnected: false,
        lastVerified: null,
        error: errorMsg,
      });
      message.error(`Connection failed: ${errorMsg}`);
    }
  }, [
    validateForm,
    accountSid,
    subdomain,
    exoPhone,
    exotelApiKey,
    exotelApiToken,
    testConnection,
    refetch,
    onSuccess,
    isConfigured,
  ]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect().unwrap();
      setConnectionStatus({
        isConnected: false,
        lastVerified: null,
        error: null,
      });

      // Refetch to update UI
      await refetch();

      message.info("Exotel disconnected");
    } catch (err: any) {
      console.error("Disconnect error:", err);
      message.error(err.data?.error || "Failed to disconnect");
    }
  }, [disconnect, refetch]);

  const handleEditConfig = useCallback(() => {
    setIsEditing(true);
    setExotelApiKey("");
    setExotelApiToken("");
    setExoPhone("");
    setFormErrors({});
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setExotelApiKey("");
    setExotelApiToken("");
    setExoPhone("");
    setFormErrors({});

    // Reset to saved values
    if (configData?.config) {
      const config = configData.config;
      setAccountSid(config.accountSid || "");
      setSubdomain(config.subdomain || "");
      setAccountRegion(config.accountRegion || "");
      setExoPhone(config.exoPhone || "");
    }
  }, [configData]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  }, []);

  const isFieldDisabled = useMemo(
    () => connectionStatus.isConnected || (isConfigured && !isEditing),
    [connectionStatus.isConnected, isConfigured, isEditing]
  );

  // Separate the tab content into memoized components
  const authenticationTabContent = useMemo(
    () => (
      <div>
        {connectionStatus.error && (
          <Alert
            message='Connection Error'
            description={connectionStatus.error}
            type='error'
            showIcon
            icon={<WarningOutlined />}
            closable
            style={{ marginBottom: 24 }}
          />
        )}

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SolutionOutlined
              style={{ fontSize: 18, color: "var(--primary-color)" }}
            />
            <Title level={4} style={{ margin: 0 }}>
              Account Configuration
            </Title>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <FormField
                label='Account SID'
                required
                tooltip='Your unique Exotel account identifier'
                error={formErrors.accountSid}
              >
                <Input
                  placeholder='e.g., tunepath3'
                  size='large'
                  value={accountSid}
                  onChange={handleAccountSidChange}
                  disabled={isFieldDisabled}
                />
              </FormField>
            </Col>

            <Col span={12}>
              <FormField
                label='Subdomain'
                tooltip='API endpoint domain (default: api.exotel.com)'
                error={formErrors.subdomain}
              >
                <Input
                  placeholder='api.exotel.com'
                  size='large'
                  prefix={<GlobalOutlined style={{ color: "#8c8c8c" }} />}
                  value={subdomain}
                  onChange={handleSubdomainChange}
                  disabled={isFieldDisabled}
                />
              </FormField>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <FormField
                label='Account Region'
                tooltip='Optional region code (e.g., Singapore, Mumbai)'
                error={formErrors.accountRegion}
              >
                <Input
                  placeholder='e.g., Singapore'
                  size='large'
                  value={accountRegion}
                  onChange={handleAccountRegionChange}
                  disabled={isFieldDisabled}
                />
              </FormField>
            </Col>

            <Col span={12}>
              <FormField
                label='API Key'
                required
                error={formErrors.exotelApiKey}
                tooltip={
                  isConfigured && !isEditing
                    ? "API Key is securely stored and encrypted"
                    : ""
                }
              >
                {isConfigured && !isEditing ? (
                  <Input
                    size='large'
                    prefix={<KeyOutlined style={{ color: "#8c8c8c" }} />}
                    value='••••••••••••••••••••'
                    disabled
                    style={{ color: "#8c8c8c" }}
                  />
                ) : (
                  <Input
                    placeholder='Enter your API Key'
                    size='large'
                    prefix={<KeyOutlined style={{ color: "#8c8c8c" }} />}
                    value={exotelApiKey}
                    onChange={handleExotelApiKeyChange}
                    disabled={connectionStatus.isConnected}
                    autoComplete='new-password'
                  />
                )}
                {isEditing && (
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, display: "block", marginTop: 4 }}
                  >
                    Re-enter your API Key to update configuration
                  </Text>
                )}
              </FormField>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <FormField
                label='API Token'
                required
                error={formErrors.exotelApiToken}
                tooltip={
                  isConfigured && !isEditing
                    ? "API Token is securely stored and encrypted"
                    : ""
                }
              >
                {isConfigured && !isEditing ? (
                  <Input
                    size='large'
                    prefix={<KeyOutlined style={{ color: "#8c8c8c" }} />}
                    value='••••••••••••••••••••'
                    disabled
                    type='password'
                    style={{ color: "#8c8c8c" }}
                  />
                ) : (
                  <Input.Password
                    placeholder='Enter your API Token'
                    size='large'
                    prefix={<KeyOutlined style={{ color: "#8c8c8c" }} />}
                    visibilityToggle
                    value={exotelApiToken}
                    onChange={handleExotelApiTokenChange}
                    disabled={connectionStatus.isConnected}
                    autoComplete='new-password'
                  />
                )}
                {isEditing && (
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, display: "block", marginTop: 4 }}
                  >
                    Re-enter your API Token to update configuration
                  </Text>
                )}
              </FormField>
            </Col>
            <Col span={12}>
              <FormField
                label='ExoPhone Number'
                required
                error={formErrors.exoPhone}
                tooltip='Your Exotel phone number for making calls'
              >
                {isConfigured && !isEditing ? (
                  <Input
                    size='large'
                    prefix={<PhoneOutlined style={{ color: "#8c8c8c" }} />}
                    value={exoPhone}
                    disabled
                    style={{ color: "#8c8c8c" }}
                  />
                ) : (
                  <Input
                    placeholder='e.g., 09112345678'
                    size='large'
                    prefix={<PhoneOutlined style={{ color: "#8c8c8c" }} />}
                    value={exoPhone}
                    onChange={handleExoPhoneChange}
                    disabled={connectionStatus.isConnected}
                  />
                )}
                {isEditing && (
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, display: "block", marginTop: 4 }}
                  >
                    Re-enter your ExoPhone Number to update configuration
                  </Text>
                )}
              </FormField>
            </Col>
          </Row>
        </div>

        <Divider />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 16,
          }}
        >
          <Space size='middle'>
            {!connectionStatus.isConnected && (
              <>
                {isConfigured && !isEditing ? (
                  <>
                    <Button
                      type='default'
                      onClick={handleEditConfig}
                      icon={<EditOutlined />}
                      size='large'
                    >
                      Edit Configuration
                    </Button>
                    <Button
                      type='primary'
                      onClick={handleTestConnection}
                      icon={<ApiOutlined />}
                      loading={isTesting}
                      size='large'
                      style={{
                        minWidth: 160,
                        background: "linear-gradient(90deg, #1890ff, #36cfc9)",
                        border: "none",
                      }}
                    >
                      {isTesting ? "Testing..." : "Test Connection"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type='primary'
                      onClick={handleSave}
                      icon={<SaveOutlined />}
                      loading={isSaving}
                      size='large'
                      disabled={isTesting}
                      style={{ minWidth: 140 }}
                    >
                      {isSaving ? "Saving..." : "Save Configuration"}
                    </Button>

                    <Button
                      type='primary'
                      onClick={handleTestConnection}
                      icon={<ApiOutlined />}
                      loading={isTesting}
                      size='large'
                      disabled={isSaving}
                      style={{
                        minWidth: 160,
                        background: "linear-gradient(90deg, #1890ff, #36cfc9)",
                        border: "none",
                      }}
                    >
                      {isTesting ? "Testing..." : "Test Connection"}
                    </Button>

                    {isConfigured && isEditing && (
                      <Button
                        type='default'
                        onClick={handleCancelEdit}
                        size='large'
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </>
            )}

            {connectionStatus.isConnected && (
              <Button
                danger
                onClick={handleDisconnect}
                icon={<DisconnectOutlined />}
                size='large'
              >
                Disconnect
              </Button>
            )}
          </Space>

          <Text type='secondary' style={{ fontSize: 12 }}>
            <LockOutlined style={{ marginRight: 4 }} />
            All sensitive data is encrypted
          </Text>
        </div>
      </div>
    ),
    [
      connectionStatus.error,
      connectionStatus.isConnected,
      formErrors,
      accountSid,
      subdomain,
      accountRegion,
      exotelApiKey,
      exotelApiToken,
      exoPhone,
      isFieldDisabled,
      isConfigured,
      isEditing,
      isSaving,
      isTesting,
      handleAccountSidChange,
      handleSubdomainChange,
      handleAccountRegionChange,
      handleExotelApiKeyChange,
      handleExotelApiTokenChange,
      handleExoPhoneChange,
      handleEditConfig,
      handleSave,
      handleTestConnection,
      handleCancelEdit,
      handleDisconnect,
    ]
  );

  const webhooksTabContent = useMemo(
    () => (
      <div>
        <Alert
          description='Use these URLs to configure webhooks in your Exotel dashboard. These endpoints will receive call events and data.'
          type='info'
          showIcon
          style={{ marginBottom: 24, borderRadius: "10px" }}
        />

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PhoneOutlined style={{ fontSize: 18, color: "#52c41a" }} />
            <Title level={4} style={{ margin: 0 }}>
              Sales
            </Title>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              code
              style={{ fontSize: 14, flex: 1, wordBreak: "break-all" }}
            >
              {webhookUrls.sales
                ? webhookUrls.sales.length > 100
                  ? `${webhookUrls.sales.slice(0, 100)}....`
                  : webhookUrls.sales
                : "Configure and save settings to generate webhook URL"}
            </Text>
            {webhookUrls.sales && (
              <Button
                type='text'
                icon={<CopyOutlined />}
                onClick={() =>
                  copyToClipboard(webhookUrls.sales, "Sales webhook URL")
                }
                style={{ marginLeft: 12 }}
              >
                Copy
              </Button>
            )}
          </div>
          <Text
            type='secondary'
            style={{ fontSize: 12, marginTop: 4, display: "block" }}
          >
            Configure this URL in your Exotel flow for sales-related calls
            (type=leads)
          </Text>
        </div>

        <Divider style={{ margin: "32px 0" }} />

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PhoneOutlined style={{ fontSize: 18, color: "#1890ff" }} />
            <Title level={4} style={{ margin: 0 }}>
              Support
            </Title>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              code
              style={{ fontSize: 14, flex: 1, wordBreak: "break-all" }}
            >
              {webhookUrls.support
                ? webhookUrls.support.length > 100
                  ? `${webhookUrls.support.slice(0, 100)}....`
                  : webhookUrls.support
                : "Configure and save settings to generate webhook URL"}
            </Text>
            {webhookUrls.support && (
              <Button
                type='text'
                icon={<CopyOutlined />}
                onClick={() =>
                  copyToClipboard(webhookUrls.support, "Support webhook URL")
                }
                style={{ marginLeft: 12 }}
              >
                Copy
              </Button>
            )}
          </div>
          <Text
            type='secondary'
            style={{ fontSize: 12, marginTop: 4, display: "block" }}
          >
            Configure this URL in your Exotel flow for support-related calls
            (type=tickets)
          </Text>
        </div>

        <Divider style={{ margin: "32px 0" }} />

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CalendarOutlined style={{ fontSize: 18, color: "#fa8c16" }} />
            <Title level={4} style={{ margin: 0 }}>
              Appointments
            </Title>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              code
              style={{ fontSize: 14, flex: 1, wordBreak: "break-all" }}
            >
              {webhookUrls.appointments
                ? webhookUrls.appointments.length > 100
                  ? `${webhookUrls.appointments.slice(0, 100)}....`
                  : webhookUrls.appointments
                : "Configure and save settings to generate webhook URL"}
            </Text>
            {webhookUrls.appointments && (
              <Button
                type='text'
                icon={<CopyOutlined />}
                onClick={() =>
                  copyToClipboard(
                    webhookUrls.appointments,
                    "Appointments webhook URL"
                  )
                }
                style={{ marginLeft: 12 }}
              >
                Copy
              </Button>
            )}
          </div>
          <Text
            type='secondary'
            style={{ fontSize: 12, marginTop: 4, display: "block" }}
          >
            Configure this URL in your Exotel flow for appointment-related calls
            (type=appointments)
          </Text>
        </div>

        <Divider style={{ margin: "32px 0" }} />

        <Alert
          message='How to Configure'
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                1. Copy the appropriate webhook URL using the copy button
              </p>
              <p style={{ marginBottom: 8 }}>
                2. Log in to your Exotel dashboard
              </p>
              <p style={{ marginBottom: 8 }}>
                3. Navigate to your IVR flow settings
              </p>
              <p style={{ marginBottom: 0 }}>
                4. Paste the webhook URL in the callback URL field
              </p>
            </div>
          }
          type='warning'
          showIcon
          style={{ marginBottom: 24, borderRadius: "10px" }}
        />
      </div>
    ),
    [webhookUrls, copyToClipboard]
  );

  // Fixed tabItems with minimal dependencies
  const tabItems = useMemo(
    () => [
      {
        key: "authentication",
        label: (
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Authentication
          </span>
        ),
        children: authenticationTabContent,
      },
      {
        key: "webhooks",
        label: (
          <span>
            <LinkOutlined style={{ marginRight: 8 }} />
            Webhooks
          </span>
        ),
        children: webhooksTabContent,
      },
      {
        key: "logs",
        label: (
          <span>
            <HistoryOutlined style={{ marginRight: 8 }} />
            Call Logs
          </span>
        ),
        children: <IvrCallLogsTable />,
      },
    ],
    [authenticationTabContent, webhooksTabContent]
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size='large' />
        <div style={{ marginTop: 16 }}>
          <Text type='secondary'>Loading configuration...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <Card
        bordered={false}
        className='shadow-sm border border-gray-100'
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ marginBottom: 32 }}>
          <Space direction='vertical' size={8} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Title
                level={3}
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <CloudServerOutlined
                  style={{ fontSize: 24, color: "var(--primary-color)" }}
                />
                Exotel IVR Integration
              </Title>
              <Space>
                <Tag
                  style={{ borderRadius: "10px" }}
                  color={connectionStatus.isConnected ? "success" : "default"}
                >
                  {connectionStatus.isConnected ? (
                    <>
                      <CheckCircleOutlined /> Connected
                    </>
                  ) : (
                    <>
                      <DisconnectOutlined /> Not Connected
                    </>
                  )}
                </Tag>
                {isConfigured && (
                  <Tag
                    color='blue'
                    icon={<InfoCircleOutlined />}
                    style={{ borderRadius: "10px" }}
                  >
                    Configured
                  </Tag>
                )}
              </Space>
            </div>
            <Text type='secondary'>
              Configure your Exotel telephony integration for IVR call handling
            </Text>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size='large'
        />
      </Card>
    </div>
  );
};

export default ExotelSetupConfig;

