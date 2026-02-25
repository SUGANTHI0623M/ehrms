import { apiSlice } from './apiSlice';

export interface SendPulseConfig {
  id: string;
  providerName: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  isEnabled: boolean;
  isConnected: boolean;
  lastVerifiedAt?: string;
  connectionError?: string;
}

export interface SendPulseConfigResponse {
  success: boolean;
  data: {
    config: SendPulseConfig | null;
  };
}

export interface SaveSendPulseConfigRequest {
  clientId: string;
  clientSecret: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
  isEnabled: boolean;
}

export interface TestConnectionRequest {
  clientId: string;
  clientSecret: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: {
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

export interface SendPulseCredentialsResponse {
  success: boolean;
  data: {
    clientId: string;
    clientSecret: string;
  };
}

export const sendpulseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSendPulseConfig: builder.query<SendPulseConfigResponse, void>({
      query: () => '/integrations/sendpulse/config',
      providesTags: ['SendPulse'],
    }),
    getSendPulseCredentials: builder.query<SendPulseCredentialsResponse, void>({
      query: () => '/integrations/sendpulse/credentials',
      providesTags: ['SendPulse'],
    }),
    saveSendPulseConfig: builder.mutation<
      { success: boolean; message: string; data: { config: SendPulseConfig } },
      SaveSendPulseConfigRequest
    >({
      query: (configData) => ({
        url: '/integrations/sendpulse/config',
        method: 'POST',
        body: configData,
      }),
      invalidatesTags: ['SendPulse'],
    }),
    testSendPulseConnection: builder.mutation<TestConnectionResponse, TestConnectionRequest>({
      query: (data) => ({
        url: '/integrations/sendpulse/test-connection',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SendPulse'],
    }),
    sendTestEmail: builder.mutation<SendTestEmailResponse, SendTestEmailRequest>({
      query: (emailData) => ({
        url: '/integrations/sendpulse/test-email',
        method: 'POST',
        body: emailData,
      }),
    }),
    disconnectSendPulse: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/integrations/sendpulse/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['SendPulse'],
    }),
  }),
});

export const {
  useGetSendPulseConfigQuery,
  useGetSendPulseCredentialsQuery,
  useSaveSendPulseConfigMutation,
  useTestSendPulseConnectionMutation,
  useSendTestEmailMutation,
  useDisconnectSendPulseMutation,
} = sendpulseApi;

