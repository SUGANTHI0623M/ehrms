
import { apiSlice } from './apiSlice';

export interface OfferTemplate {
    _id: string;
    name: string;
    description: string;
    content: string;
    type: 'Offer Letter' | 'Contract' | 'Other';
    status: 'Active' | 'Draft' | 'Archived';
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    businessId: string;
    createdAt: string;
    updatedAt: string;
}

export const offerTemplateApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getOfferTemplates: builder.query<
            { success: boolean; data: { templates: OfferTemplate[] } },
            { type?: string; status?: string } | void
        >({
            query: (params) => {
                const endpoint = '/offer-templates';
                console.log('[offerTemplateApi] ====== GET OFFER TEMPLATES ======');
                console.log('[offerTemplateApi] Fetching OFFER templates from:', endpoint);
                console.log('[offerTemplateApi] Full URL:', `${window.location.origin.includes('localhost') ? 'http://localhost:7001/api' : '/api'}${endpoint}`);
                console.log('[offerTemplateApi] Params:', params);
                console.log('[offerTemplateApi] ===============================');
                
                return {
                    url: endpoint,
                    params: params || undefined,
                };
            },
            providesTags: ['OfferTemplate'],
        }),

        getOfferTemplateById: builder.query<
            { success: boolean; data: { template: OfferTemplate } },
            string
        >({
            query: (id) => {
                const endpoint = `/offer-templates/${id}`;
                console.log('[offerTemplateApi] Getting OFFER template by ID from:', endpoint);
                return endpoint;
            },
            providesTags: (result, error, id) => [{ type: 'OfferTemplate', id }],
        }),

        createOfferTemplate: builder.mutation<
            { success: boolean; data: { template: OfferTemplate }; message: string },
            Partial<OfferTemplate>
        >({
            query: (data) => {
                // Explicitly construct the full URL to avoid any path rewriting
                const endpoint = '/offer-templates';
                
                // Log the endpoint being called with full details
                console.log('[offerTemplateApi] ====== OFFER TEMPLATE API ======');
                console.log('[offerTemplateApi] Creating OFFER template at endpoint:', endpoint);
                console.log('[offerTemplateApi] Full URL will be:', `${window.location.origin.includes('localhost') ? 'http://localhost:7001/api' : '/api'}${endpoint}`);
                console.log('[offerTemplateApi] Payload keys:', Object.keys(data));
                console.log('[offerTemplateApi] Payload:', {
                    name: data.name,
                    type: data.type,
                    hasContent: !!data.content,
                    hasMessageBody: !!(data as any).messageBody, // Should be undefined
                    hasStatus: !!data.status
                });
                console.log('[offerTemplateApi] ===============================');
                
                return {
                    url: endpoint,
                    method: 'POST',
                    body: data,
                };
            },
            invalidatesTags: ['OfferTemplate'],
        }),

        updateOfferTemplate: builder.mutation<
            { success: boolean; data: { template: OfferTemplate }; message: string },
            { id: string; data: Partial<OfferTemplate> }
        >({
            query: ({ id, data }) => {
                const endpoint = `/offer-templates/${id}`;
                console.log('[offerTemplateApi] Updating OFFER template at:', endpoint);
                return {
                    url: endpoint,
                    method: 'PUT',
                    body: data,
                };
            },
            invalidatesTags: (result, error, { id }) => [{ type: 'OfferTemplate', id }, 'OfferTemplate'],
        }),

        deleteOfferTemplate: builder.mutation<
            { success: boolean; message: string },
            string
        >({
            query: (id) => {
                const endpoint = `/offer-templates/${id}`;
                console.log('[offerTemplateApi] Deleting OFFER template at:', endpoint);
                return {
                    url: endpoint,
                    method: 'DELETE',
                };
            },
            invalidatesTags: ['OfferTemplate'],
        }),
    }),
});

// Export hooks with explicit names to avoid conflicts with celebrationApi
export const {
    useGetOfferTemplatesQuery,
    useGetOfferTemplateByIdQuery,
    useCreateOfferTemplateMutation,
    useUpdateOfferTemplateMutation,
    useDeleteOfferTemplateMutation,
} = offerTemplateApi;
