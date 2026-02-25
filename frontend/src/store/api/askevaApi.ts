import { apiSlice } from './apiSlice';

export interface AskevaConfig {
  _id?: string;
  companyId?: string;
  providerName: string; // Always "AskEVA" (readonly)
  backendUrl: string; // Backend URL for API calls
  apiKey?: string; // Masked in responses
  webhookUrl?: string;
  isEnabled: boolean;
  isConnected?: boolean;
  lastVerifiedAt?: string;
  connectionError?: string;
  lastSyncedAt?: string; // Last template sync time
  templateSyncStatus?: 'success' | 'failed' | 'pending';
  templateSyncError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AskevaConfigResponse {
  success: boolean;
  data: {
    config: AskevaConfig | null;
  };
}

export interface AskevaCredentialsResponse {
  success: boolean;
  data: {
    apiKey: string;
    backendUrl: string;
  };
}

export interface SaveAskevaConfigRequest {
  backendUrl: string;
  apiKey: string;
}

export interface TestAskevaConnectionRequest {
  apiKey?: string;
}

export interface AskevaTemplate {
  _id: string;
  companyId: string;
  templateId: string;
  templateName: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  components: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: Array<{
      type: string;
      text?: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
  mappedEventTypes?: string[];
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AskevaTemplatesResponse {
  success: boolean;
  data: {
    templates: AskevaTemplate[];
  };
}

export interface SyncTemplatesResponse {
  success: boolean;
  data: {
    synced: number;
    message: string;
  };
}

export interface MapTemplateRequest {
  templateId: string;
  eventTypes: string[];
}

export interface AskevaWebhookLog {
  _id: string;
  companyId: string;
  eventType: string;
  payload: any;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

export interface AskevaWebhookLogsResponse {
  success: boolean;
  data: {
    logs: AskevaWebhookLog[];
    total: number;
    limit: number;
    offset: number;
  };
}

export const askevaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAskevaConfig: builder.query<AskevaConfigResponse, void>({
      query: () => '/integrations/askeva/config',
      providesTags: ['Askeva'],
    }),
    getAskevaCredentials: builder.query<AskevaCredentialsResponse, void>({
      query: () => '/integrations/askeva/credentials',
      providesTags: ['Askeva'],
    }),
    saveAskevaConfig: builder.mutation<
      { success: boolean; data: { config: AskevaConfig } },
      SaveAskevaConfigRequest
    >({
      query: (configData) => ({
        url: '/integrations/askeva/config',
        method: 'POST',
        body: configData,
      }),
      invalidatesTags: ['Askeva'],
    }),
    testAskevaConnection: builder.mutation<
      { success: boolean; message: string },
      TestAskevaConnectionRequest
    >({
      query: (testData) => ({
        url: '/integrations/askeva/test-connection',
        method: 'POST',
        body: testData,
      }),
      invalidatesTags: ['Askeva'],
    }),
    disconnectAskeva: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/integrations/askeva/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['Askeva'],
    }),
    syncAskevaTemplates: builder.mutation<SyncTemplatesResponse, void>({
      query: () => ({
        url: '/integrations/askeva/templates/sync',
        method: 'POST',
      }),
      invalidatesTags: ['Askeva'],
    }),
    getAskevaTemplates: builder.query<
      AskevaTemplatesResponse & { 
        data: { 
          templates: any[]; 
          pagination: { page: number; limit: number; total: number; pages: number } 
        } 
      },
      { 
        page?: number; 
        limit?: number; 
        status?: string; 
        category?: string; 
        search?: string;
      }
    >({
      query: (params) => ({
        url: '/integrations/askeva/templates',
        params,
      }),
      providesTags: ['Askeva'],
    }),
    mapAskevaTemplate: builder.mutation<
      { success: boolean; message: string },
      MapTemplateRequest
    >({
      query: (data) => ({
        url: '/integrations/askeva/templates/map',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Askeva'],
    }),
    getAskevaWebhookLogs: builder.query<
      AskevaWebhookLogsResponse,
      { limit?: number; offset?: number }
    >({
      query: (params) => ({
        url: '/integrations/askeva/webhook-logs',
        params,
      }),
      providesTags: ['Askeva'],
    }),
    getAskevaMessageLogs: builder.query<
      { success: boolean; data: { logs: any[]; total: number; limit: number; offset: number } },
      { 
        limit?: number; 
        offset?: number;
        module?: string;
        status?: string;
        candidateId?: string;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (params) => ({
        url: '/integrations/askeva/message-logs',
        params,
      }),
      providesTags: ['Askeva'],
    }),
    // Event Template Mapping CRUD
    getEventTemplateMappings: builder.query<
      { success: boolean; data: { mappings: any[] } },
      void
    >({
      query: () => '/integrations/askeva/event-mappings',
      providesTags: ['Askeva'],
    }),
    getEventTemplateMapping: builder.query<
      { success: boolean; data: { mapping: any } },
      string
    >({
      query: (id) => `/integrations/askeva/event-mappings/${id}`,
      providesTags: ['Askeva'],
    }),
    saveEventTemplateMapping: builder.mutation<
      { success: boolean; data: { mapping: any }; message: string },
      {
        id?: string;
        hrmsEventType: string;
        templateId: string;
        templateName?: string;
        isEnabled?: boolean;
        variables: Array<{
          templateVariable: string;
          hrmsField: string;
          defaultValue?: string;
        }>;
      }
    >({
      query: (data) => ({
        url: data.id 
          ? `/integrations/askeva/event-mappings/${data.id}`
          : '/integrations/askeva/event-mappings',
        method: data.id ? 'PUT' : 'POST',
        body: data,
      }),
      invalidatesTags: ['Askeva'],
    }),
    deleteEventTemplateMapping: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/integrations/askeva/event-mappings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Askeva'],
    }),
  }),
});

export const {
  useGetAskevaConfigQuery,
  useGetAskevaCredentialsQuery,
  useSaveAskevaConfigMutation,
  useTestAskevaConnectionMutation,
  useDisconnectAskevaMutation,
  useSyncAskevaTemplatesMutation,
  useGetAskevaTemplatesQuery,
  useMapAskevaTemplateMutation,
  useGetAskevaWebhookLogsQuery,
  useGetAskevaMessageLogsQuery,
  useGetEventTemplateMappingsQuery,
  useGetEventTemplateMappingQuery,
  useSaveEventTemplateMappingMutation,
  useDeleteEventTemplateMappingMutation,
} = askevaApi;

