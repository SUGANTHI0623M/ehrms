
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
        getTemplates: builder.query<
            { success: boolean; data: { templates: OfferTemplate[] } },
            { type?: string; status?: string } | void
        >({
            query: (params) => ({
                url: '/offer-templates',
                params: params || undefined,
            }),
            providesTags: ['OfferTemplate'],
        }),

        getTemplateById: builder.query<
            { success: boolean; data: { template: OfferTemplate } },
            string
        >({
            query: (id) => `/offer-templates/${id}`,
            providesTags: (result, error, id) => [{ type: 'OfferTemplate', id }],
        }),

        createTemplate: builder.mutation<
            { success: boolean; data: { template: OfferTemplate }; message: string },
            Partial<OfferTemplate>
        >({
            query: (data) => ({
                url: '/offer-templates',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['OfferTemplate'],
        }),

        updateTemplate: builder.mutation<
            { success: boolean; data: { template: OfferTemplate }; message: string },
            { id: string; data: Partial<OfferTemplate> }
        >({
            query: ({ id, data }) => ({
                url: `/offer-templates/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'OfferTemplate', id }, 'OfferTemplate'],
        }),

        deleteTemplate: builder.mutation<
            { success: boolean; message: string },
            string
        >({
            query: (id) => ({
                url: `/offer-templates/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['OfferTemplate'],
        }),
    }),
});

export const {
    useGetTemplatesQuery,
    useGetTemplateByIdQuery,
    useCreateTemplateMutation,
    useUpdateTemplateMutation,
    useDeleteTemplateMutation,
} = offerTemplateApi;
