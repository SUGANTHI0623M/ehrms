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
  Table,
  Switch,
  Select,
  Modal,
  Form,
  InputNumber,
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
  SyncOutlined,
  HistoryOutlined,
  MessageOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  useGetAskevaConfigQuery,
  useGetAskevaCredentialsQuery,
  useSaveAskevaConfigMutation,
  useTestAskevaConnectionMutation,
  useDisconnectAskevaMutation,
  useSyncAskevaTemplatesMutation,
  useGetAskevaTemplatesQuery,
  useMapAskevaTemplateMutation,
  useGetAskevaWebhookLogsQuery,
  useGetEventTemplateMappingsQuery,
  useGetEventTemplateMappingQuery,
  useSaveEventTemplateMappingMutation,
  useDeleteEventTemplateMappingMutation,
} from "@/store/api/askevaApi";
const { Title, Text } = Typography;

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

const AskevaSetupConfig = ({ onCancel, onSuccess }: { onCancel?: () => void; onSuccess?: () => void }) => {
  const [backendUrl, setBackendUrl] = useState("https://backend.askeva.io");
  const [apiKey, setApiKey] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    lastVerified: null as string | null,
    error: null as string | null,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("authentication");

  const { data: configData, isLoading, refetch } = useGetAskevaConfigQuery();
  const { data: credentialsData, refetch: refetchCredentials } = useGetAskevaCredentialsQuery(undefined, {
    skip: !isEditing || !configData?.data?.config, // Only fetch when editing and config exists
  });
  const [saveConfig, { isLoading: isSaving }] = useSaveAskevaConfigMutation();
  const [testConnection, { isLoading: isTesting }] = useTestAskevaConnectionMutation();
  const [disconnect] = useDisconnectAskevaMutation();
  const [syncTemplates, { isLoading: isSyncing }] = useSyncAskevaTemplatesMutation();
  const [templatePage, setTemplatePage] = useState(1);
  const [templateLimit, setTemplateLimit] = useState(100);
  const { data: templatesData, refetch: refetchTemplates } = useGetAskevaTemplatesQuery({
    page: templatePage,
    limit: templateLimit
  });
  // Fetch all templates for dropdowns (without pagination)
  const { data: allTemplatesData } = useGetAskevaTemplatesQuery({
    page: 1,
    limit: 1000 // Large limit to get all templates for dropdowns
  });
  const [mapTemplate] = useMapAskevaTemplateMutation();
  const { data: webhookLogsData } = useGetAskevaWebhookLogsQuery({ limit: 50, offset: 0 });
  const { data: eventMappingsData, refetch: refetchEventMappings } = useGetEventTemplateMappingsQuery();
  const [saveEventMapping, { isLoading: isSavingMapping }] = useSaveEventTemplateMappingMutation();
  const [deleteEventMapping, { isLoading: isDeletingMapping }] = useDeleteEventTemplateMappingMutation();
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [isMappingModalVisible, setIsMappingModalVisible] = useState(false);
  const [selectedEventForMapping, setSelectedEventForMapping] = useState<any>(null);

  // Load existing config
  useEffect(() => {
    if (configData?.data?.config) {
      const config = configData.data.config;
      setBackendUrl(config.backendUrl || "https://backend.askeva.io");
      setApiKey(""); // Will be populated when editing
      setConnectionStatus({
        isConnected: config.isConnected || false,
        lastVerified: config.lastVerifiedAt || null,
        error: config.connectionError || null,
      });
      setIsConfigured(true);
      setIsEditing(false);
    } else if (configData && !configData.data.config) {
      setIsConfigured(false);
      setIsEditing(true);
    }
  }, [configData]);

  // Load credentials when entering edit mode
  useEffect(() => {
    if (isEditing && configData?.data?.config && credentialsData?.data) {
      setBackendUrl(credentialsData.data.backendUrl || "https://backend.askeva.io");
      setApiKey(credentialsData.data.apiKey || "");
    }
  }, [isEditing, credentialsData, configData]);

  const clearFieldError = useCallback((fieldName: string) => {
    setFormErrors(prev => {
      if (!prev[fieldName]) return prev;
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const handleBackendUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackendUrl(e.target.value);
      clearFieldError("backendUrl");
    },
    [clearFieldError]
  );

  const handleApiKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setApiKey(e.target.value);
      clearFieldError("apiKey");
    },
    [clearFieldError]
  );

  const validateForm = useCallback(
    (skipCredentials = false) => {
      const errors: Record<string, string> = {};

      if (!backendUrl.trim()) {
        errors.backendUrl = "Backend URL is required";
      } else {
        try {
          const url = new URL(backendUrl.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            errors.backendUrl = "Backend URL must use http:// or https://";
          }
          // Warn if path is included (but don't block - backend will normalize it)
          if (url.pathname && url.pathname !== '/') {
            // Just a warning, backend will normalize it
          }
        } catch {
          errors.backendUrl = "Invalid URL format";
        }
      }

      // API key required for new config, optional for updates
      if (!skipCredentials && !isConfigured && !apiKey.trim()) {
        errors.apiKey = "API Key is required for new configuration";
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [backendUrl, apiKey, isConfigured]
  );

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      message.error("Please fill in all required fields correctly");
      return;
    }

    try {
      const configToSave: any = {
        backendUrl: backendUrl.trim() || "https://backend.askeva.io",
      };

      // Only include API key if provided (for updates, allow keeping existing)
      if (apiKey.trim()) {
        configToSave.apiKey = apiKey.trim();
      }

      await saveConfig(configToSave).unwrap();
      message.success("Configuration saved successfully!");
      setApiKey(""); // Clear after save
      await refetch();
      await refetchCredentials();
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      message.error(err.data?.error?.message || "Failed to save configuration");
    }
  }, [
      validateForm,
      backendUrl,
      apiKey,
      saveConfig,
      refetch,
      refetchCredentials,
      onSuccess,
    ]);

  const handleTestConnection = useCallback(async () => {
    const canUseStoredCredentials = isConfigured && !apiKey;

    if (!validateForm(canUseStoredCredentials)) {
      message.error("Please fill in all required fields correctly");
      return;
    }

    try {
      const testData: any = {
        backendUrl: backendUrl.trim() || "https://backend.askeva.io",
      };

      if (apiKey.trim()) {
        testData.apiKey = apiKey.trim();
      }

      await testConnection(testData).unwrap();
      setConnectionStatus({
        isConnected: true,
        lastVerified: new Date().toISOString(),
        error: null,
      });
      message.success("Connection successful!");
      await refetch();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.data?.error?.message || "Connection failed";
      setConnectionStatus({
        isConnected: false,
        lastVerified: null,
        error: errorMsg,
      });
      message.error(`Connection failed: ${errorMsg}`);
    }
  }, [
      validateForm,
      backendUrl,
      apiKey,
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
      await refetch();
      message.info("ASKEVA disconnected");
    } catch (err: any) {
      message.error(err.data?.error?.message || "Failed to disconnect");
    }
  }, [disconnect, refetch]);

  const handleSyncTemplates = useCallback(async () => {
    try {
      const result = await syncTemplates().unwrap();
      message.success(`Successfully synced ${result.data.synced} templates`);
      await refetchTemplates();
      await refetch();
    } catch (err: any) {
      message.error(err.data?.error?.message || "Failed to sync templates");
    }
  }, [syncTemplates, refetchTemplates, refetch]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  }, []);

  const isFieldDisabled = useMemo(
    () => connectionStatus.isConnected || (isConfigured && !isEditing),
    [connectionStatus.isConnected, isConfigured, isEditing]
  );

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
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <MessageOutlined style={{ fontSize: 18, color: "hsl(var(--primary))" }} />
            <Title level={4} style={{ margin: 0 }}>ASKEVA Configuration</Title>
          </div>

          <Row gutter={16}>
            <Col span={24}>
              <FormField
                label='Backend URL'
                required
                tooltip='Base URL for API calls (e.g., https://backend.askeva.io). You can also provide the full endpoint URL (e.g., https://backend.askeva.io/v1/message/send-message) - the system will automatically extract the base URL.'
                error={formErrors.backendUrl}
              >
                <Input
                  placeholder='https://backend.askeva.io or https://backend.askeva.io/v1/message/send-message'
                  size='large'
                  prefix={<CloudServerOutlined style={{ color: "#8c8c8c" }} />}
                  value={backendUrl}
                  onChange={handleBackendUrlChange}
                  disabled={isFieldDisabled}
                />
              </FormField>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <FormField
                label='API Key / Access Token'
                required
                error={formErrors.apiKey}
                tooltip={isConfigured && !isEditing ? "API Key is securely stored and encrypted" : "Enter your API token from AskEVA"}
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
                  <Input.Password
                    placeholder='Enter your API Key'
                    size='large'
                    prefix={<KeyOutlined style={{ color: "#8c8c8c" }} />}
                    visibilityToggle
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    disabled={connectionStatus.isConnected}
                    autoComplete='new-password'
                  />
                )}
              </FormField>
            </Col>
          </Row>

          {/* {configData?.data?.config?.webhookUrl && (
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={24}>
                <FormField
                  label='Webhook URL'
                  tooltip='Use this URL to configure webhooks in ASKEVA dashboard'
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Input
                      value={configData.data.config.webhookUrl}
                      size='large'
                      disabled
                      prefix={<LinkOutlined style={{ color: "#8c8c8c" }} />}
                    />
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(configData.data.config!.webhookUrl, "Webhook URL")}
                    >
                      Copy
                    </Button>
                  </div>
                </FormField>
              </Col>
            </Row>
          )} */}
        </div>

        <Divider />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
          <Space size='middle'>
            {!connectionStatus.isConnected && (
              <>
                {isConfigured && !isEditing ? (
                  <>
                    <Button
                      type='default'
                      onClick={() => setIsEditing(true)}
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
                    >
                      {isSaving ? "Saving..." : "Save Configuration"}
                    </Button>
                    <Button
                      type='primary'
                      onClick={handleTestConnection}
                      icon={<ApiOutlined />}
                      loading={isTesting}
                      size='large'
                    >
                      {isTesting ? "Testing..." : "Test Connection"}
                    </Button>
                    {isConfigured && isEditing && (
                      <Button
                        type='default'
                        onClick={() => setIsEditing(false)}
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
      connectionStatus,
      formErrors,
      backendUrl,
      apiKey,
      isFieldDisabled,
      isConfigured,
      isEditing,
      isSaving,
      isTesting,
      configData,
      handleBackendUrlChange,
      handleApiKeyChange,
      handleSave,
      handleTestConnection,
      handleDisconnect,
      copyToClipboard,
    ]
  );

  const templatesTabContent = useMemo(() => {
    const templates = templatesData?.data?.templates || [];
    const config = configData?.data?.config;

    // HRMS Event Types
    const eventTypes = [
      { value: 'candidate_applied', label: 'Candidate Applied' },
      { value: 'interview_scheduled', label: 'Interview Scheduled' },
      { value: 'interview_reminder', label: 'Interview Reminder' },
      { value: 'offer_sent', label: 'Offer Sent' },
      { value: 'offer_accepted', label: 'Offer Accepted' },
      { value: 'onboarding_started', label: 'Onboarding Started' },
      { value: 'onboarding_completed', label: 'Onboarding Completed' },
    ];

    const handleMapTemplate = async (templateId: string, eventTypes: string[]) => {
      try {
        await mapTemplate({ templateId, eventTypes }).unwrap();
        message.success('Template mapping updated successfully');
        await refetchTemplates();
      } catch (err: any) {
        message.error(err.data?.error?.message || 'Failed to update template mapping');
      }
    };

    const columns = [
      {
        title: 'Template Name',
        dataIndex: 'templateName',
        key: 'templateName',
        width: 200,
        fixed: 'left' as const,
        render: (name: string) => (
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
        ),
      },
      {
        title: 'Components',
        key: 'components',
        width: 250,
        render: (_: any, record: any) => {
          const components = record.components || [];
          const componentTypes = components.map((c: any) => c.type).filter(Boolean);
          return (
            <Space wrap size={[4, 4]}>
                  {componentTypes.length > 0 ? (
                componentTypes.map((type: string, idx: number) => (
                  <Tag key={idx} color="green" style={{ margin: 0 }}>
                    {type.toUpperCase()}
                  </Tag>
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No components</Text>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Language',
        dataIndex: 'language',
        key: 'language',
        width: 100,
        render: (lang: string) => <Tag>{lang.toUpperCase()}</Tag>,
      },
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: (cat: string) => <Tag color="purple">{cat}</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: string) => {
          const colorMap: Record<string, string> = {
            APPROVED: 'green',
            PENDING: 'orange',
            REJECTED: 'red',
            PAUSED: 'default',
          };
          return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
        },
      },
      {
        title: 'Mapped Events',
        dataIndex: 'mappedEventTypes',
        key: 'mappedEventTypes',
        width: 200,
        render: (mappedEvents: string[], record: any) => {
          if (!mappedEvents || mappedEvents.length === 0) {
            return <Text type='secondary' style={{ fontSize: 12 }}>No events mapped</Text>;
          }
          return (
            <Space wrap size={[4, 4]}>
              {mappedEvents.map((event) => {
                const eventLabel = eventTypes.find(e => e.value === event)?.label || event;
                return <Tag key={event} color="green" style={{ margin: 0 }}>{eventLabel}</Tag>;
              })}
            </Space>
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 180,
        fixed: 'right' as const,
        render: (_: any, record: any) => (
          <Space direction="vertical" size={4}>
            <Button
              size='small'
              type="primary"
              onClick={() => {
                // Open modal for mapping
                const modal = Modal.info({
                  title: `Map Template: ${record.templateName}`,
                  width: 600,
                  content: (
                    <div style={{ marginTop: 16 }}>
                      <Text>Select HRMS events to map to this template:</Text>
                      <Select
                        mode='multiple'
                        style={{ width: '100%', marginTop: 8 }}
                        placeholder='Select events'
                        defaultValue={record.mappedEventTypes || []}
                        options={eventTypes}
                        onChange={(values) => {
                          handleMapTemplate(record.templateId, values);
                          modal.destroy();
                        }}
                      />
                    </div>
                  ),
                  onOk: () => modal.destroy(),
                });
              }}
            >
              Map Events
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 12 }}>Active:</Text>
              <Switch
                size='small'
                checked={record.isActive !== false}
                onChange={async (checked) => {
                  try {
                    message.info('Template status toggle - feature coming soon');
                  } catch (err) {
                    message.error('Failed to update template status');
                  }
                }}
              />
            </div>
          </Space>
        ),
      },
      {
        title: 'Last Synced',
        dataIndex: 'lastSyncedAt',
        key: 'lastSyncedAt',
        width: 180,
        render: (date: string) => date ? (
          <Text style={{ fontSize: 12 }}>{new Date(date).toLocaleString()}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
        ),
      },
    ];

    return (
      <div>
          <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>WhatsApp Templates</Title>
            <Text type='secondary'>Manage and sync message templates from ASKEVA</Text>
          </div>
          <Space>
            <Button
              type='primary'
              icon={<SyncOutlined />}
              onClick={handleSyncTemplates}
              loading={isSyncing}
            >
              {isSyncing ? "Syncing..." : "Sync Templates"}
            </Button>
          </Space>
        </div>

        {config?.lastSyncedAt && (
          <Alert
            message={`Last synced: ${new Date(config.lastSyncedAt).toLocaleString()}`}
            description={config.templateSyncStatus === 'success' 
              ? `Successfully synced templates` 
              : `Sync failed: ${config.templateSyncError || 'Unknown error'}`}
            type={config.templateSyncStatus === 'success' ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="_id"
            loading={!templatesData}
            pagination={{ 
              current: templatePage,
              pageSize: templateLimit,
              total: templatesData?.data?.pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} templates`,
              responsive: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, pageSize) => {
                setTemplatePage(page);
                if (pageSize && pageSize !== templateLimit) {
                  setTemplateLimit(pageSize);
                  setTemplatePage(1); // Reset to first page when page size changes
                }
              },
              onShowSizeChange: (current, size) => {
                setTemplateLimit(size);
                setTemplatePage(1); // Reset to first page when page size changes
              }
            }}
            scroll={{ x: 1200 }}
            size="small"
            style={{ 
              width: '100%',
            }}
          />
        </div>
      </div>
    );
  }, [templatesData, configData, isSyncing, handleSyncTemplates, mapTemplate, refetchTemplates]);

  const webhookLogsTabContent = useMemo(() => {
    const logs = webhookLogsData?.data?.logs || [];

    const columns = [
      {
        title: 'Event Type',
        dataIndex: 'eventType',
        key: 'eventType',
      },
      {
        title: 'Processed',
        dataIndex: 'processed',
        key: 'processed',
        render: (processed: boolean) => (
          <Tag color={processed ? 'green' : 'orange'}>
            {processed ? 'Yes' : 'No'}
          </Tag>
        ),
      },
      {
        title: 'Received At',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => new Date(date).toLocaleString(),
      },
    ];

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>Webhook Logs</Title>
          <Text type='secondary'>Recent webhook events from ASKEVA</Text>
        </div>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </div>
    );
  }, [webhookLogsData]);

  // Event Mapping Configuration Tab
  const eventMappingTabContent = useMemo(() => {
    const templates = templatesData?.data?.templates || [];
    // Use all templates for dropdown (not paginated) - fetch with large limit
    const allTemplatesForDropdown = allTemplatesData?.data?.templates || templates;
    const approvedTemplates = allTemplatesForDropdown.filter((t: any) => t.status === 'APPROVED' && t.isActive !== false);
    const eventMappings = eventMappingsData?.data?.mappings || [];

    // HRMS Event Types with descriptions
    const eventTypes = [
      { value: 'candidate_applied', label: 'Candidate Applied', description: 'Triggered when a candidate applies for a job' },
      { value: 'interview_scheduled', label: 'Interview Scheduled', description: 'Triggered when an interview is scheduled' },
      { value: 'interview_reminder', label: 'Interview Reminder', description: 'Reminder sent before interview' },
      { value: 'offer_sent', label: 'Offer Sent', description: 'Triggered when an offer letter is sent' },
      { value: 'offer_accepted', label: 'Offer Accepted', description: 'Triggered when candidate accepts offer' },
      { value: 'onboarding_started', label: 'Onboarding Started', description: 'Triggered when onboarding begins' },
      { value: 'onboarding_completed', label: 'Onboarding Completed', description: 'Triggered when onboarding is completed' },
      { value: 'forgot_password', label: 'Forgot Password', description: 'OTP sent for password reset' },
    ];

    // Available HRMS data fields for mapping
    const hrmsFields = [
      { value: 'candidateName', label: 'Candidate Name', category: 'Candidate' },
      { value: 'Name', label: 'Name (Alternative)', category: 'Candidate' },
      { value: 'name', label: 'Name (Lowercase)', category: 'Candidate' },
      { value: 'candidateEmail', label: 'Candidate Email', category: 'Candidate' },
      { value: 'email', label: 'Email', category: 'Candidate' },
      { value: 'candidatePhone', label: 'Candidate Phone', category: 'Candidate' },
      { value: 'jobTitle', label: 'Job Title', category: 'Job' },
      { value: 'jobtitle', label: 'Job Title (Lowercase)', category: 'Job' },
      { value: 'interviewDate', label: 'Interview Date', category: 'Interview' },
      { value: 'interviewTime', label: 'Interview Time', category: 'Interview' },
      { value: 'interviewLocation', label: 'Interview Location', category: 'Interview' },
      { value: 'offerAmount', label: 'Offer Amount', category: 'Offer' },
      { value: 'joiningDate', label: 'Joining Date', category: 'Offer' },
      { value: 'otp', label: 'OTP Code', category: 'Authentication' },
      { value: 'userName', label: 'User Name', category: 'User' },
      { value: '{{2}}', label: 'Credentials Message ({{2}})', category: 'Credentials' },
      { value: '2', label: 'Credentials Message (2)', category: 'Credentials' },
      { value: 'password', label: 'Password', category: 'Credentials' },
      { value: 'loginUrl', label: 'Login URL', category: 'Credentials' },
    ];

    // Extract variables from template (both numeric {{1}}, {{2}} and text-based {{Name}}, {{jobtitle}})
    const extractVariables = (components: any[]): string[] => {
      const variables: Set<string> = new Set();
      
      // Pattern to match both numeric variables {{1}}, {{2}} and text-based variables {{Name}}, {{jobtitle}}
      const variablePattern = /\{\{([^}]+)\}\}/g;
      
      components.forEach((component: any) => {
        if (component.text) {
          const matches = component.text.match(variablePattern);
          if (matches) {
            matches.forEach((match: string) => variables.add(match));
          }
        }
        if (component.cards && Array.isArray(component.cards)) {
          component.cards.forEach((card: any) => {
            if (card.components) {
              card.components.forEach((comp: any) => {
                if (comp.text) {
                  const matches = comp.text.match(variablePattern);
                  if (matches) {
                    matches.forEach((match: string) => variables.add(match));
                  }
                }
                if (comp.parameters) {
                  comp.parameters.forEach((param: any) => {
                    if (param.text) {
                      const matches = param.text.match(variablePattern);
                      if (matches) {
                        matches.forEach((match: string) => variables.add(match));
                      }
                    }
                  });
                }
              });
            }
          });
        }
      });
      
      // Sort variables: numeric first ({{1}}, {{2}}), then text-based ({{Name}}, {{jobtitle}})
      return Array.from(variables).sort((a, b) => {
        const aContent = a.replace(/\{\{|\}\}/g, '');
        const bContent = b.replace(/\{\{|\}\}/g, '');
        const aIsNumeric = !isNaN(parseInt(aContent));
        const bIsNumeric = !isNaN(parseInt(bContent));
        
        if (aIsNumeric && bIsNumeric) {
          return parseInt(aContent) - parseInt(bContent);
        }
        if (aIsNumeric && !bIsNumeric) return -1;
        if (!aIsNumeric && bIsNumeric) return 1;
        return a.localeCompare(b);
      });
    };

    const handleCreateMapping = (event: any) => {
      setSelectedEventForMapping({ event, template: null, mapping: null });
      setIsMappingModalVisible(true);
      setEditingMappingId(null);
    };

    const handleEditMapping = (mapping: any) => {
      const event = eventTypes.find(e => e.value === mapping.hrmsEventType);
      const template = templates.find((t: any) => t._id === mapping.templateId?._id || t._id === mapping.templateId);
      setSelectedEventForMapping({ event, template, mapping });
      setIsMappingModalVisible(true);
      setEditingMappingId(mapping._id);
    };

    const handleDeleteMapping = async (id: string) => {
      Modal.confirm({
        title: 'Delete Event Template Mapping',
        content: 'Are you sure you want to delete this mapping? This action cannot be undone.',
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await deleteEventMapping(id).unwrap();
            message.success('Event template mapping deleted successfully');
            await refetchEventMappings();
          } catch (err: any) {
            message.error(err.data?.error?.message || 'Failed to delete mapping');
          }
        }
      });
    };

    const columns = [
      {
        title: 'Event Type',
        dataIndex: 'hrmsEventType',
        key: 'hrmsEventType',
        width: 200,
        render: (eventType: string) => {
          const event = eventTypes.find(e => e.value === eventType);
          return event ? event.label : eventType;
        },
      },
      {
        title: 'Template',
        key: 'template',
        width: 250,
        render: (_: any, record: any) => {
          const template = typeof record.templateId === 'object' ? record.templateId : 
            templates.find((t: any) => t._id === record.templateId);
          return template ? (
            <Space>
              <Text strong>{template.templateName}</Text>
              <Tag>{template.language}</Tag>
            </Space>
          ) : <Text type="secondary">N/A</Text>;
        },
      },
      {
        title: 'Variables Mapped',
        key: 'variables',
        width: 200,
        render: (_: any, record: any) => {
          const count = record.variables?.length || 0;
          return <Tag color="green">{count} variable{count !== 1 ? 's' : ''}</Tag>;
        },
      },
      {
        title: 'Status',
        dataIndex: 'isEnabled',
        key: 'isEnabled',
        width: 100,
        render: (enabled: boolean) => (
          <Tag color={enabled ? 'green' : 'default'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Tag>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 180,
        fixed: 'right' as const,
        render: (_: any, record: any) => (
          <Space>
            <Button
              size="small"
              type="primary"
              onClick={() => handleEditMapping(record)}
            >
              Edit
            </Button>
            <Button
              size="small"
              danger
              onClick={() => handleDeleteMapping(record._id)}
              loading={isDeletingMapping}
            >
              Delete
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <div style={{ padding: '0 8px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Event Template Configuration</Title>
            <Text type='secondary'>Configure templates and variable mappings for each HRMS event</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedEventForMapping({ event: null, template: null, mapping: null });
              setIsMappingModalVisible(true);
              setEditingMappingId(null);
            }}
          >
            Create New Mapping
          </Button>
        </div>

        <Spin spinning={isDeletingMapping} tip="Deleting mapping...">
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table
              dataSource={eventMappings}
              columns={columns}
              rowKey="_id"
              loading={!eventMappingsData}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} mappings`,
                responsive: true,
                pageSizeOptions: ['10', '20', '50']
              }}
              scroll={{ x: 1000 }}
              size="small"
              locale={{
                emptyText: (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <Text type="secondary">No event template mappings found. Click "Create New Mapping" to get started.</Text>
                  </div>
                )
              }}
            />
          </div>
        </Spin>

        {/* Create/Edit Mapping Modal */}
        {isMappingModalVisible && (
          <EventMappingModal
            visible={isMappingModalVisible}
            event={selectedEventForMapping?.event}
            template={selectedEventForMapping?.template}
            mapping={selectedEventForMapping?.mapping}
            editingId={editingMappingId}
            templates={approvedTemplates}
            eventTypes={eventTypes}
            hrmsFields={hrmsFields}
            extractVariables={extractVariables}
            onSave={async (mappingData: any) => {
              try {
                await saveEventMapping({
                  id: editingMappingId || undefined,
                  ...mappingData
                }).unwrap();
                message.success(editingMappingId ? 'Mapping updated successfully' : 'Mapping created successfully');
                setIsMappingModalVisible(false);
                setSelectedEventForMapping(null);
                setEditingMappingId(null);
                await refetchEventMappings();
                await refetchTemplates();
              } catch (err: any) {
                message.error(err.data?.error?.message || 'Failed to save mapping');
              }
            }}
            onCancel={() => {
              setIsMappingModalVisible(false);
              setSelectedEventForMapping(null);
              setEditingMappingId(null);
            }}
            isLoading={isSavingMapping}
          />
        )}
      </div>
    );
  }, [
    templatesData,
    allTemplatesData,
    eventMappingsData,
    saveEventMapping,
    deleteEventMapping,
    isSavingMapping,
    isDeletingMapping,
    isMappingModalVisible,
    selectedEventForMapping,
    editingMappingId,
    refetchEventMappings,
    refetchTemplates
  ]);

  const tabItems = useMemo(
    () => [
      {
        key: "authentication",
        label: (
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Configuration
          </span>
        ),
        children: authenticationTabContent,
      },
      {
        key: "templates",
        label: (
          <span>
            <MessageOutlined style={{ marginRight: 8 }} />
            Templates
          </span>
        ),
        children: templatesTabContent,
      },
      {
        key: "event-mapping",
        label: (
          <span>
            <ApiOutlined style={{ marginRight: 8 }} />
            Event Mapping
          </span>
        ),
        children: eventMappingTabContent,
      },
      // {
      //   key: "webhooks",
      //   label: (
      //     <span>
      //       <HistoryOutlined style={{ marginRight: 8 }} />
      //       Webhook Logs
      //     </span>
      //   ),
      //   children: webhookLogsTabContent,
      // },
    ],
    [authenticationTabContent, templatesTabContent, eventMappingTabContent, webhookLogsTabContent]
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
                <MessageOutlined style={{ fontSize: 24, color: "hsl(var(--primary))" }} />
                ASKEVA WhatsApp Integration
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
                  <Tag color='green' icon={<InfoCircleOutlined />} style={{ borderRadius: "10px" }}>
                    Configured
                  </Tag>
                )}
              </Space>
            </div>
            <Text type='secondary'>
              Configure WhatsApp messaging and webhook handling via ASKEVA
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

// Event Mapping Modal Component
const EventMappingModal = ({
  visible,
  event,
  template,
  mapping,
  editingId,
  templates,
  eventTypes,
  hrmsFields,
  extractVariables,
  onSave,
  onCancel,
  isLoading
}: {
  visible: boolean;
  event: any;
  template: any;
  mapping: any;
  editingId: string | null;
  templates: any[];
  eventTypes: any[];
  hrmsFields: any[];
  extractVariables: (components: any[]) => string[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [form] = Form.useForm();
  const [selectedEventType, setSelectedEventType] = useState<string>(event?.value || mapping?.hrmsEventType || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(template?._id || mapping?.templateId?._id || mapping?.templateId || '');
  const [variableMappings, setVariableMappings] = useState<Array<{
    templateVariable: string;
    hrmsField: string;
    defaultValue?: string;
  }>>(mapping?.variables || []);

  // When template changes, extract variables and display them
  useEffect(() => {
    if (selectedTemplateId) {
      const selectedTemplate = templates.find((t: any) => t._id === selectedTemplateId);
      if (selectedTemplate) {
        const variables = extractVariables(selectedTemplate.components || []);
        
        // If editing and has existing mappings, preserve them but add any new variables
        if (editingId && variableMappings.length > 0) {
          const existingVars = new Set(variableMappings.map((m: any) => m.templateVariable));
          const newVars = variables.filter((v: string) => !existingVars.has(v));
          
          // Add new variables that weren't in the existing mapping
          if (newVars.length > 0) {
            setVariableMappings([
              ...variableMappings,
              ...newVars.map((varName) => ({
                templateVariable: varName,
                hrmsField: '',
                defaultValue: ''
              }))
            ]);
          }
          
          // Remove variables that no longer exist in template
          const currentVars = new Set(variables);
          setVariableMappings(variableMappings.filter((m: any) => currentVars.has(m.templateVariable)));
        } else {
          // Create fresh mappings for all variables
          setVariableMappings(
            variables.map((varName) => ({
              templateVariable: varName,
              hrmsField: '',
              defaultValue: ''
            }))
          );
        }
      } else {
        setVariableMappings([]);
      }
    } else {
      setVariableMappings([]);
    }
  }, [selectedTemplateId, templates, extractVariables]);

  // Load existing mapping data
  useEffect(() => {
    if (mapping) {
      form.setFieldsValue({
        hrmsEventType: mapping.hrmsEventType,
        templateId: mapping.templateId?._id || mapping.templateId,
        isEnabled: mapping.isEnabled !== false
      });
      setSelectedEventType(mapping.hrmsEventType);
      setSelectedTemplateId(mapping.templateId?._id || mapping.templateId);
      setVariableMappings(mapping.variables || []);
    } else if (event) {
      form.setFieldsValue({
        hrmsEventType: event.value,
        isEnabled: true
      });
      setSelectedEventType(event.value);
    }
  }, [mapping, event, form]);

  const handleAddVariable = () => {
    const newVar = `{{${variableMappings.length + 1}}}`;
    setVariableMappings([...variableMappings, {
      templateVariable: newVar,
      hrmsField: '',
      defaultValue: ''
    }]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariableMappings(variableMappings.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const selectedTemplateObj = templates.find((t: any) => t._id === selectedTemplateId);
      
      if (!selectedTemplateObj) {
        message.error('Please select a template');
        return;
      }

      // if (variableMappings.length === 0) {
      //   message.warning('Please add at least one variable mapping');
      //   return;
      // }

      // Validate all variable mappings have HRMS fields OR default values
      const invalidMappings = variableMappings.filter(m => !m.hrmsField && !m.defaultValue);
      if (invalidMappings.length > 0) {
        const missingVars = invalidMappings.map(m => m.templateVariable).join(', ');
        message.error(`Please map all template variables to HRMS fields or provide default values. Missing: ${missingVars}`);
        return;
      }

      // Ensure all variables from template are included
      const templateVars = extractVariables(selectedTemplateObj.components || []);
      const mappedVars = new Set(variableMappings.map((m: any) => m.templateVariable));
      const missingVars = templateVars.filter((v: string) => !mappedVars.has(v));
      
      if (missingVars.length > 0) {
        message.error(`Missing mappings for template variables: ${missingVars.join(', ')}`);
        return;
      }

      await onSave({
        hrmsEventType: values.hrmsEventType,
        templateId: selectedTemplateId,
        templateName: selectedTemplateObj.templateName,
        isEnabled: values.isEnabled !== false,
        variables: variableMappings
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={editingId ? 'Edit Event Template Mapping' : 'Create Event Template Mapping'}
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      width={1000}
      okText="Save"
      cancelText="Cancel"
      confirmLoading={isLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Event Type"
              name="hrmsEventType"
              rules={[{ required: true, message: 'Please select an event type' }]}
            >
              <Select
                placeholder="Select event type"
                value={selectedEventType}
                onChange={(value) => {
                  setSelectedEventType(value);
                  form.setFieldsValue({ hrmsEventType: value });
                }}
                disabled={!!editingId}
                options={eventTypes.map(e => ({
                  label: e.label,
                  value: e.value
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Template"
              name="templateId"
              rules={[{ required: true, message: 'Please select a template' }]}
            >
              <Select
                placeholder="Select template"
                value={selectedTemplateId}
                onChange={(value) => {
                  setSelectedTemplateId(value);
                  form.setFieldsValue({ templateId: value });
                  // Reset variable mappings when template changes
                  setVariableMappings([]);
                }}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={templates.map((t: any) => {
                  const varCount = extractVariables(t.components || []).length;
                  return {
                    label: `${t.templateName} (${t.language})${varCount > 0 ? ` - ${varCount} var${varCount !== 1 ? 's' : ''}` : ''}`,
                    value: t._id
                  };
                })}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Status"
          name="isEnabled"
          valuePropName="checked"
        >
          <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
        </Form.Item>

        <Divider>Variable Mapping</Divider>

        {selectedTemplateId ? (
          <>
            {variableMappings.length === 0 ? (
              <Alert
                message="No variables found"
                description="The selected template doesn't contain any variables ({{1}}, {{2}}, etc.)"
                type="info"
                style={{ marginBottom: 16 }}
              />
            ) : (
              <>
                <Alert
                  message={`Template has ${variableMappings.length} variable${variableMappings.length !== 1 ? 's' : ''} - All must be mapped`}
                  description={
                    <div>
                      <Text strong>Required:</Text> All template variables must be mapped to HRMS fields or have default values.
                      <br />
                      <Space wrap style={{ marginTop: 8 }}>
                        {variableMappings.map((m: any, idx: number) => {
                          const isMapped = !!(m.hrmsField || m.defaultValue);
                          return (
                            <Tag 
                              key={idx} 
                              color={isMapped ? 'green' : 'red'}
                              icon={isMapped ? <CheckCircleOutlined /> : <WarningOutlined />}
                            >
                              {m.templateVariable} {isMapped ? '✓' : '✗'}
                            </Tag>
                          );
                        })}
                      </Space>
                    </div>
                  }
                  type={variableMappings.every((m: any) => m.hrmsField || m.defaultValue) ? 'success' : 'warning'}
                  style={{ marginBottom: 16 }}
                  showIcon
                />
                {variableMappings.map((mapping, index) => {
                  const isMapped = !!(mapping.hrmsField || mapping.defaultValue);
                  const isRequired = !mapping.defaultValue;
                  return (
            <Card
              key={index}
              size="small"
              style={{ 
                marginBottom: 12,
                border: isMapped ? '1px solid #d9d9d9' : '1px solid #ff4d4f',
                backgroundColor: isMapped ? '#fff' : '#fff2f0'
              }}
              extra={
                <Space>
                  {isMapped ? (
                    <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Mapped</Tag>
                  ) : (
                    <Tag color="red" icon={<WarningOutlined />} style={{ margin: 0 }}>Not Mapped</Tag>
                  )}
                  {variableMappings.length > 1 && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => handleRemoveVariable(index)}
                    >
                      Remove
                    </Button>
                  )}
                </Space>
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Template Variable">
                    <Input disabled value={mapping.templateVariable} />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    label={
                      <span>
                        HRMS Field {isRequired && <Text type="danger">*</Text>}
                      </span>
                    }
                    required={isRequired}
                    validateStatus={!mapping.hrmsField && !mapping.defaultValue ? 'error' : ''}
                    help={!mapping.hrmsField && !mapping.defaultValue ? 'Required: Map to HRMS field or provide default value' : ''}
                  >
                    <Select
                      placeholder="Select HRMS field"
                      value={mapping.hrmsField}
                      onChange={(value) => {
                        const updated = [...variableMappings];
                        updated[index].hrmsField = value;
                        setVariableMappings(updated);
                      }}
                      showSearch
                      allowClear
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={hrmsFields.map(field => ({
                        label: `${field.label} (${field.category})`,
                        value: field.value
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item 
                    label={
                      <span>
                        Default Value {!mapping.hrmsField && <Text type="danger">*</Text>}
                      </span>
                    }
                    required={!mapping.hrmsField}
                    validateStatus={!mapping.hrmsField && !mapping.defaultValue ? 'error' : ''}
                    help={!mapping.hrmsField && !mapping.defaultValue ? 'Required if no HRMS field' : 'Use if HRMS field value is missing'}
                  >
                    <Input
                      placeholder={!mapping.hrmsField ? "Required" : "Optional"}
                      value={mapping.defaultValue || ''}
                      onChange={(e) => {
                        const updated = [...variableMappings];
                        updated[index].defaultValue = e.target.value;
                        setVariableMappings(updated);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <Alert
            message="Select a template"
            description="Please select a template first to see its variables"
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        {variableMappings.length > 0 && (
          <Button
            type="dashed"
            onClick={handleAddVariable}
            block
            icon={<PlusOutlined />}
            style={{ marginTop: 16 }}
          >
            Add Additional Variable Mapping
          </Button>
        )}
      </Form>
    </Modal>
  );
};

export default AskevaSetupConfig;

