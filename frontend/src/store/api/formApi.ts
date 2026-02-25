import { apiSlice } from './apiSlice';

export interface FormTemplateField {
  _id?: string;
  name: string;
  type: 'Text' | 'Image' | 'Dropdown' | 'Number' | 'Date' | 'Email' | 'Phone' | 'Textarea';
  mandatory: boolean;
  cameraOnly?: boolean;
  options?: string[];
  order: number;
}

export interface FormTemplate {
  _id: string;
  templateName: string;
  fields: FormTemplateField[];
  businessId: string;
  createdBy: string | {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  assignedTo?: string[] | Array<{
    _id: string;
    name: string;
    employeeId: string;
  }>;
  assignedToCount?: number;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string;
}

export interface FormResponse {
  _id: string;
  templateId: string | FormTemplate;
  taskId: string | {
    _id: string;
    taskId: string;
    taskTitle: string;
    status: string;
    assignedDate: string;
    customerId?: {
      _id: string;
      customerName: string;
      customerNumber: string;
      companyName?: string;
      address: string;
      phone?: string;
      city: string;
      pincode: string;
      customFields?: Record<string, any>;
    };
  };
  staffId: string | {
    _id: string;
    name: string;
    employeeId: string;
    email: string;
  };
  responses: Record<string, any>;
  isSubmitted?: boolean;
  submittedAt?: string;
  submittedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormTemplateRequest {
  templateName: string;
  fields: FormTemplateField[];
  assignedTo?: string[];
}

export interface UpdateFormTemplateRequest {
  templateName?: string;
  fields?: FormTemplateField[];
  assignedTo?: string[];
  isActive?: boolean;
}

export interface CreateFormResponseRequest {
  templateId: string;
  taskId: string;
  staffId: string;
  responses: Record<string, any>;
}

export const formApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Form Templates
    getFormTemplates: builder.query<
      { success: boolean; data: { templates: FormTemplate[] } },
      void
    >({
      query: () => '/form-templates',
      providesTags: ['FormTemplate'],
    }),
    getFormTemplateById: builder.query<
      { success: boolean; data: { template: FormTemplate } },
      string
    >({
      query: (id) => `/form-templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'FormTemplate', id }],
    }),
    createFormTemplate: builder.mutation<
      { success: boolean; data: { template: FormTemplate } },
      CreateFormTemplateRequest
    >({
      query: (data) => ({
        url: '/form-templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['FormTemplate'],
    }),
    updateFormTemplate: builder.mutation<
      { success: boolean; data: { template: FormTemplate } },
      { id: string; data: UpdateFormTemplateRequest }
    >({
      query: ({ id, data }) => ({
        url: `/form-templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FormTemplate', id }, 'FormTemplate'],
    }),
    deleteFormTemplate: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/form-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FormTemplate'],
    }),

    // Form Responses
    getFormResponses: builder.query<
      {
        success: boolean;
        data: {
          responses: FormResponse[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      {
        templateId?: string;
        staffId?: string;
        taskId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: '/form-responses',
        params,
      }),
      providesTags: ['FormResponse'],
    }),
    getFormResponseById: builder.query<
      { success: boolean; data: { response: FormResponse } },
      string
    >({
      query: (id) => `/form-responses/${id}`,
      providesTags: (result, error, id) => [{ type: 'FormResponse', id }],
    }),
    createFormResponse: builder.mutation<
      { success: boolean; data: { response: FormResponse } },
      CreateFormResponseRequest
    >({
      query: (data) => ({
        url: '/form-responses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['FormResponse'],
    }),

    // Form Details Report
    getFormDetailsReport: builder.query<
      { success: boolean; data: { responses: FormResponse[] } },
      { staffId?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/form-responses/report',
        params,
      }),
      providesTags: ['FormResponse'],
    }),
    // Submit/Approve Form Response
    submitFormResponse: builder.mutation<
      { success: boolean; data: { response: FormResponse } },
      string
    >({
      query: (id) => ({
        url: `/form-responses/${id}/submit`,
        method: 'PATCH',
      }),
      invalidatesTags: ['FormResponse'],
    }),
  }),
});

export const {
  useGetFormTemplatesQuery,
  useGetFormTemplateByIdQuery,
  useCreateFormTemplateMutation,
  useUpdateFormTemplateMutation,
  useDeleteFormTemplateMutation,
  useGetFormResponsesQuery,
  useGetFormResponseByIdQuery,
  useCreateFormResponseMutation,
  useGetFormDetailsReportQuery,
  useSubmitFormResponseMutation,
} = formApi;
