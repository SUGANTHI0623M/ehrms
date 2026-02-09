import { apiSlice } from './apiSlice';

export interface User {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  countryCode?: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Team Leader' | 'Employee' | 'Candidate';
  isActive: boolean;
  companyId?: {
    _id: string;
    name: string;
    email: string;
  };
  roleId?: {
    _id: string;
    name: string;
    description?: string;
    permissions: Array<{
      module: string;
      actions: string[];
    }>;
  };
  permissions?: Array<{
    module: string;
    actions: string[];
  }>;
  managerId?: {
    _id: string;
    name: string;
    email: string;
  };
  departmentId?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Array<{
    module: string;
    actions: string[];
  }>;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  countryCode?: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Team Leader' | 'Employee' | 'Candidate';
  companyId?: string;
  roleId?: string;
  managerId?: string;
  departmentId?: string;
  teamId?: string;
  permissions?: Array<{
    module: string;
    actions: string[];
  }>;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  countryCode?: string;
  role?: 'Super Admin' | 'Admin' | 'Manager' | 'Team Leader' | 'Employee' | 'Candidate';
  companyId?: string;
  roleId?: string;
  managerId?: string;
  departmentId?: string;
  teamId?: string;
  permissions?: Array<{
    module: string;
    actions: string[];
  }>;
}

export interface GetUsersParams {
  search?: string;
  role?: string;
  isActive?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
  message?: string;
}

export interface RolesResponse {
  success: boolean;
  data: {
    roles: Role[];
  };
}

export interface UserStatsResponse {
  success: boolean;
  data: {
    stats: {
      total: number;
      active: number;
      inactive: number;
      roleCounts: Record<string, number>;
    };
  };
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all users
    getUsers: builder.query<UsersResponse, GetUsersParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append('search', params.search);
        if (params.role) queryParams.append('role', params.role);
        if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
        if (params.companyId) queryParams.append('companyId', params.companyId);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        return `/users?${queryParams.toString()}`;
      },
      providesTags: ['User'],
    }),

    // Get user by ID
    getUserById: builder.query<UserResponse, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Get roles
    getRoles: builder.query<RolesResponse, void>({
      query: () => '/users/roles',
      providesTags: ['Settings'],
    }),

    // Get user statistics
    getUserStats: builder.query<UserStatsResponse, void>({
      query: () => '/users/stats',
      providesTags: ['User'],
    }),

    // Create user
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    // Update user
    updateUser: builder.mutation<UserResponse, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),

    // Toggle user status (activate/deactivate)
    toggleUserStatus: builder.mutation<UserResponse, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User'],
    }),

    // Delete user
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetRolesQuery,
  useGetUserStatsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useDeleteUserMutation,
} = userApi;

