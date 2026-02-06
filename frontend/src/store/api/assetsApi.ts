import { apiSlice } from './apiSlice';

export interface Asset {
  _id: string;
  name: string;
  type: string;
  serialNumber?: string;
  assetTypeId?: {
    _id: string;
    name: string;
  };
  status: 'Working' | 'Under Maintenance' | 'Damaged' | 'Retired';
  location: string;
  assignedTo?: {
    _id: string;
    name: string;
    employeeId: string;
  };
  branchId: {
    _id: string;
    branchName: string;
    branchCode: string;
  };
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  image?: string;
  notes?: string;
}

export interface AssetType {
  _id: string;
  name: string;
  description?: string;
}

export const assetsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAssets: builder.query<
      {
        success: boolean;
        data: {
          assets: Asset[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { status?: string; type?: string; assignedTo?: string; branchId?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/assets',
        params,
      }),
      providesTags: ['Assets'],
    }),
    getAssetById: builder.query<{ success: boolean; data: { asset: Asset } }, string>({
      query: (id) => `/assets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Assets', id }],
    }),
    createAsset: builder.mutation<
      { success: boolean; data: { asset: Asset } },
      Partial<Asset>
    >({
      query: (assetData) => ({
        url: '/assets',
        method: 'POST',
        body: assetData,
      }),
      invalidatesTags: ['Assets'],
    }),
    updateAsset: builder.mutation<
      { success: boolean; data: { asset: Asset } },
      { id: string; data: Partial<Asset> }
    >({
      query: ({ id, data }) => ({
        url: `/assets/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Assets', id }, 'Assets'],
    }),
    deleteAsset: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/assets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Assets'],
    }),
    getAssetTypes: builder.query<{ success: boolean; data: { assetTypes: AssetType[] } }, void>({
      query: () => '/assets/types',
      providesTags: ['Assets'],
    }),
    createAssetType: builder.mutation<
      { success: boolean; data: { assetType: AssetType } },
      Partial<AssetType>
    >({
      query: (assetTypeData) => ({
        url: '/assets/types',
        method: 'POST',
        body: assetTypeData,
      }),
      invalidatesTags: ['Assets'],
    }),
    updateAssetType: builder.mutation<
      { success: boolean; data: { assetType: AssetType } },
      { id: string; data: Partial<AssetType> }
    >({
      query: ({ id, data }) => ({
        url: `/assets/types/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Assets'],
    }),
    deleteAssetType: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/assets/types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Assets'],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetByIdQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useGetAssetTypesQuery,
  useCreateAssetTypeMutation,
  useUpdateAssetTypeMutation,
  useDeleteAssetTypeMutation,
} = assetsApi;

