import { apiSlice } from './apiSlice';

export interface Notification {
    _id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    notificationType?: string; // The actual event type (e.g., 'goal_assigned', 'offer_sent')
    isRead: boolean;
    link?: string;
    createdAt: string;
}

interface GetNotificationsParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isRead?: string;
}

interface GetNotificationsResponse {
    success: boolean;
    data: Notification[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const notificationApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNotifications: builder.query<GetNotificationsResponse, GetNotificationsParams | void>({
            query: (params) => {
                const queryParams = new URLSearchParams();
                if (params) {
                    if (params.page) queryParams.append('page', params.page.toString());
                    if (params.limit) queryParams.append('limit', params.limit.toString());
                    if (params.search) queryParams.append('search', params.search);
                    if (params.type) queryParams.append('type', params.type);
                    if (params.isRead !== undefined) queryParams.append('isRead', params.isRead);
                }
                const queryString = queryParams.toString();
                return `/notifications${queryString ? `?${queryString}` : ''}`;
            },
            providesTags: ['Notifications'],
        }),
        markAsRead: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notifications'],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
} = notificationApi;
