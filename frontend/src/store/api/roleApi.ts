import { apiSlice } from './apiSlice';

export interface Permission {
  module: string;
  actions: string[];
}

export interface Role {
  _id?: string | null; // Optional because system roles without DB entry won't have _id
  name: string;
  description?: string;
  companyId?: string | null;
  permissions: Permission[];
  isSystemRole: boolean;
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Permission[];
  isActive?: boolean;
}

export interface RoleConfiguration {
  modules: string[];
  actions: string[];
  systemRoles: string[];
}

export interface RoleHierarchyNode {
  _id: string;
  name: string;
  parentRoleId?: string | null;
  hierarchyLevel: number;
  displayOrder: number;
  children?: RoleHierarchyNode[];
}

export interface RoleHierarchyResponse {
  hierarchy: RoleHierarchyNode[];
  flat: Array<{
    _id: string;
    name: string;
    parentRoleId: string | null;
    hierarchyLevel: number;
    displayOrder: number;
  }>;
}

export interface UpdateHierarchyRequest {
  roleId: string;
  parentRoleId?: string | null;
  hierarchyLevel?: number;
  displayOrder?: number;
}

export const roleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get role configuration (modules and actions)
    getRoleConfiguration: builder.query<
      { success: boolean; data: RoleConfiguration },
      void
    >({
      query: () => '/roles/configuration',
      providesTags: ['Settings'],
    }),

    // Get all roles
    getRoles: builder.query<
      { success: boolean; data: { roles: Role[] } },
      void
    >({
      query: () => '/roles',
      providesTags: ['Settings'],
    }),

    // Get role by ID
    getRoleById: builder.query<
      { success: boolean; data: { role: Role } },
      string
    >({
      query: (id) => `/roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Settings', id }],
    }),

    // Create role
    createRole: builder.mutation<
      { success: boolean; data: { role: Role } },
      CreateRoleRequest
    >({
      query: (roleData) => ({
        url: '/roles',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Update role
    updateRole: builder.mutation<
      { success: boolean; data: { role: Role } },
      { id: string; data: UpdateRoleRequest }
    >({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Settings', id },
        'Settings',
      ],
    }),

    // Delete role
    deleteRole: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    // Get role hierarchy
    getRoleHierarchy: builder.query<
      { success: boolean; data: RoleHierarchyResponse },
      void
    >({
      query: () => '/roles/hierarchy',
      providesTags: ['Settings'],
    }),

    // Update role hierarchy
    updateRoleHierarchy: builder.mutation<
      { success: boolean; data: { role: Role } },
      UpdateHierarchyRequest
    >({
      query: (data) => ({
        url: '/roles/hierarchy',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Move role in hierarchy
    moveRoleInHierarchy: builder.mutation<
      { success: boolean; data: { role: Role } },
      { id: string; newParentId?: string | null; newLevel: number; newOrder: number }
    >({
      query: ({ id, newParentId, newLevel, newOrder }) => ({
        url: `/roles/${id}/move`,
        method: 'POST',
        body: { newParentId, newLevel, newOrder },
      }),
      invalidatesTags: ['Settings'],
    }),

    // Get visible roles (based on hierarchy)
    getVisibleRoles: builder.query<
      { success: boolean; data: { roles: Role[] } },
      void
    >({
      query: () => '/roles/visible',
      providesTags: ['Settings'],
    }),

    // Get assignable roles (for user assignment)
    getAssignableRoles: builder.query<
      { success: boolean; data: { roles: Role[] } },
      void
    >({
      query: () => '/roles/assignable',
      providesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetRoleConfigurationQuery,
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetRoleHierarchyQuery,
  useUpdateRoleHierarchyMutation,
  useMoveRoleInHierarchyMutation,
  useGetVisibleRolesQuery,
  useGetAssignableRolesQuery,
} = roleApi;

