import { apiSlice } from './apiSlice';

export interface SendGridConfig {
  id?: string;
  companyId?: string;
  providerName: string;
  apiKey?: string; // Masked in responses
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  webhookUrl?: string;
  isEnabled: boolean;
  isConnected: boolean;
  lastVerifiedAt?: string;
  connectionError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SendGridConfigResponse {
  success: boolean;
  data: {
    config: SendGridConfig | null;
  };
}

export interface SaveSendGridConfigRequest {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  isEnabled?: boolean;
}

export interface TestConnectionRequest {
  apiKey?: string; // Optional, uses stored if not provided
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data: {
    connected: boolean;
    error?: string;
  };
}

export interface SendTestEmailRequest {
  to: string;
  subject: string;
  html?: string;
}

export interface SendTestEmailResponse {
  success: boolean;
  message: string;
  data: {
    messageId?: string;
  };
}

export const sendgridApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSendGridConfig: builder.query<SendGridConfigResponse, void>({
      query: () => '/integrations/sendgrid/config',
      providesTags: ['SendGrid'],
    }),
    saveSendGridConfig: builder.mutation<
      { success: boolean; message: string; data: { config: SendGridConfig } },
      SaveSendGridConfigRequest
    >({
      query: (configData) => ({
        url: '/integrations/sendgrid/config',
        method: 'POST',
        body: configData,
      }),
      invalidatesTags: ['SendGrid'],
    }),
    testSendGridConnection: builder.mutation<TestConnectionResponse, TestConnectionRequest>({
      query: (data) => ({
        url: '/integrations/sendgrid/test-connection',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SendGrid'],
    }),
    sendTestEmail: builder.mutation<SendTestEmailResponse, SendTestEmailRequest>({
      query: (emailData) => ({
        url: '/integrations/sendgrid/test-email',
        method: 'POST',
        body: emailData,
      }),
    }),
    disconnectSendGrid: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/integrations/sendgrid/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['SendGrid'],
    }),
  }),
});

export const {
  useGetSendGridConfigQuery,
  useSaveSendGridConfigMutation,
  useTestSendGridConnectionMutation,
  useSendTestEmailMutation,
  useDisconnectSendGridMutation,
} = sendgridApi;

