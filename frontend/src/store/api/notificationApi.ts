import { apiSlice } from './apiSlice';

export interface Notification {
    _id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export const notificationApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getNotifications: builder.query<{ success: boolean; data: Notification[] }, void>({
            query: () => '/notifications',
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
