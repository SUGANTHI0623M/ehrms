import { apiSlice } from './apiSlice';

export interface ExotelConfig {
  _id?: string;
  accountSid: string;
  subdomain: string;
  accountRegion?: string;
  apiKey: string;
  apiToken: string;
  exoPhone: string;
  isConnected?: boolean;
  lastVerifiedAt?: string;
  connectionError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExotelWebhookUrls {
  sales: string;
  support: string;
  appointments: string;
}

export interface ExotelConfigResponse {
  success: boolean;
  config?: ExotelConfig;
  webhookUrls?: ExotelWebhookUrls;
}

export interface SaveExotelConfigRequest {
  accountSid: string;
  subdomain: string;
  accountRegion?: string;
  apiKey: string;
  apiToken: string;
  exoPhone: string;
}

export interface TestExotelConnectionRequest {
  accountSid: string;
  subdomain: string;
  exoPhone: string;
  apiKey?: string;
  apiToken?: string;
}

export interface IvrCallLog {
  _id: string;
  callSid: string;
  callFrom: string;
  callTo?: string;
  dialWhomNumber?: string;
  attendedBy?: string;
  type: 'leads' | 'tickets';
  direction: 'incoming' | 'outgoing';
  callDuration: number;
  callStatus: string;
  recordingUrl?: string;
  result?: {
    success: boolean;
    message?: string;
  };
  createdAt: string;
}

export interface IvrCallLogsResponse {
  success: boolean;
  data: IvrCallLog[];
  stats?: {
    totalCalls: number;
    completedCalls: number;
    leadCalls: number;
    ticketCalls: number;
  };
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const exotelApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExotelConfig: builder.query<ExotelConfigResponse, void>({
      query: () => '/integrations/exotel/config',
      providesTags: ['Exotel'],
    }),
    saveExotelConfig: builder.mutation<
      { success: boolean; data: { config: ExotelConfig } },
      SaveExotelConfigRequest
    >({
      query: (configData) => ({
        url: '/integrations/exotel/config',
        method: 'POST',
        body: configData,
      }),
      invalidatesTags: ['Exotel'],
    }),
    testExotelConnection: builder.mutation<
      { success: boolean; message: string },
      TestExotelConnectionRequest
    >({
      query: (testData) => ({
        url: '/integrations/exotel/test',
        method: 'POST',
        body: testData,
      }),
    }),
    disconnectExotel: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/integrations/exotel/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['Exotel'],
    }),
    getIvrCallLogs: builder.query<
      IvrCallLogsResponse,
      {
        page?: number;
        limit?: number;
        type?: 'all' | 'leads' | 'tickets';
        direction?: 'all' | 'incoming' | 'outgoing';
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (params) => ({
        url: '/integrations/exotel/call-logs',
        params,
      }),
      providesTags: ['Exotel'],
    }),
  }),
});

export const {
  useGetExotelConfigQuery,
  useSaveExotelConfigMutation,
  useTestExotelConnectionMutation,
  useDisconnectExotelMutation,
  useGetIvrCallLogsQuery,
} = exotelApi;

