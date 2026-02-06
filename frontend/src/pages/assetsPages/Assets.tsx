import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, Tabs, Select, Table, Upload, Pagination, message, DatePicker, InputNumber, Form, Input } from "antd";
import { Plus, Eye, Upload as UploadIcon } from "lucide-react";
import { Dropdown } from "antd";
import { MoreHorizontal } from "lucide-react";
import { 
  useGetAssetsQuery, 
  useCreateAssetMutation, 
  useUpdateAssetMutation, 
  useDeleteAssetMutation,
  useGetAssetTypesQuery,
  Asset
} from "@/store/api/assetsApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useAppSelector } from "@/store/hooks";
import dayjs from "dayjs";

const { TabPane } = Tabs;
const { TextArea } = Input;

interface AssetFormData {
  name: string;
  type: string;
  assetTypeId?: string;
  serialNumber?: string;
  status: 'Working' | 'Under Maintenance' | 'Damaged' | 'Retired';
  location: string;
  branchId: string;
  assignedTo?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  notes?: string;
  image?: string;
}

const Assets = () => {
  const token = useAppSelector((state: any) => state.auth?.token) || localStorage.getItem('token');
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form] = Form.useForm();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Keep previous data stable to prevent blinking
  const previousAssetsRef = useRef<Asset[]>([]);
  const isInitialMount = useRef(true);

  // Simple query params - no filters
  const queryParams = useMemo(() => {
    return {
      page: currentPage,
      limit: pageSize
    };
  }, [currentPage, pageSize]);

  // Fetch assets with proper backend filtering
  const { data: assetsData, isLoading, isFetching } = useGetAssetsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    keepUnusedDataFor: 60,
  });

  const { data: branchesData } = useGetActiveBranchesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  
  const { data: assetTypesData } = useGetAssetTypesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  
  const { data: staffData } = useGetStaffQuery({ limit: 1000, status: 'Active' }, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  const [createAsset] = useCreateAssetMutation();
  const [updateAsset] = useUpdateAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();

  const allAssets = assetsData?.data?.assets || [];
  const totalAssets = assetsData?.data?.pagination?.total || 0;
  const branches = branchesData?.data?.branches || [];
  const assetTypes = assetTypesData?.data?.assetTypes || [];
  const staff = staffData?.data?.staff || [];
  
  // Use assets directly from API (backend handles filtering)
  const stableAllAssets = useMemo(() => {
    if (allAssets.length > 0) {
      previousAssetsRef.current = allAssets;
      return allAssets;
    }
    // If no new data but we have previous data, use previous to prevent empty state flash
    if (previousAssetsRef.current.length > 0 && !isLoading) {
      return previousAssetsRef.current;
    }
    return allAssets;
  }, [allAssets, isLoading]);
  
  // Reset initial mount flag after first load
  useEffect(() => {
    if (assetsData && isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [assetsData]);
  
  // No client-side filtering needed - backend handles it
  const filteredAssets = stableAllAssets;
  
  // No client-side pagination needed - backend handles it
  const assets = filteredAssets;
  const totalFiltered = totalAssets;
  
  // Only show loading on initial load, not when refetching with existing data or filtering
  const showLoading = isLoading && isInitialMount.current;

  const handleOpenAddModal = useCallback(() => {
    setEditingAsset(null);
    form.resetFields();
    setOpenAddModal(true);
  }, [form]);

  const handleOpenEditModal = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    form.setFieldsValue({
      ...asset,
      branchId: asset.branchId?._id,
      assetTypeId: asset.assetTypeId?._id,
      assignedTo: asset.assignedTo?._id,
      purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : undefined,
      warrantyExpiry: asset.warrantyExpiry ? dayjs(asset.warrantyExpiry) : undefined,
      image: asset.image ? [{ uid: '-1', name: 'image', status: 'done', url: asset.image }] : undefined,
    });
    setOpenAddModal(true);
  }, [form]);

  const handleDelete = useCallback(async (assetId: string) => {
    Modal.confirm({
      title: "Delete Asset",
      content: `Are you sure you want to delete this asset?`,
      onOk: async () => {
        try {
          await deleteAsset(assetId).unwrap();
          message.success("Asset deleted successfully");
        } catch (error: any) {
          message.error(error?.data?.error?.message || "Failed to delete asset");
        }
      },
    });
  }, [deleteAsset]);

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    // Get current token from component scope (from useAppSelector)
    const currentToken = token;
    
    if (!currentToken) {
      throw new Error('No authentication token found. Please login again.');
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    // Use same API URL logic as apiSlice
    const getApiUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname === '0.0.0.0' ||
                       hostname.startsWith('192.168.') ||
                       hostname.startsWith('10.') ||
                       hostname.startsWith('172.16.') ||
                       hostname === '[::1]';
        
        if (isLocal) {
          return 'http://localhost:9000/api';
        }
      }
      
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
      }
      
      if (typeof window !== 'undefined') {
        return window.location.origin + '/api';
      }
      
      return 'http://localhost:9000/api';
    };
    
    const API_URL = getApiUrl();
    
    try {
      const response = await fetch(`${API_URL}/assets/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });
      
      // Check if response is unauthorized
      if (response.status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Invalid token. Please login again.');
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || data.error || 'Failed to upload image');
      }
      
      return data.data.url;
    } catch (error: any) {
      // Re-throw with better error message
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to upload image. Please try again.');
    }
  }, [token]);

  const handleImageChange = useCallback(async (info: any) => {
    const { fileList } = info;
    
    // If file was removed
    if (fileList.length === 0) {
      form.setFieldsValue({ image: undefined });
      return;
    }
    
    const file = fileList[0];
    
    // If file is already uploaded (has URL), keep it
    if (file.url && file.status === 'done') {
      return;
    }
    
    // If file is a new upload, upload it
    if (file.originFileObj) {
      try {
        setUploadingImage(true);
        const url = await handleImageUpload(file.originFileObj);
        
        // Update form with the URL
        form.setFieldsValue({
          image: [{ uid: file.uid, name: file.name, status: 'done', url }]
        });
      } catch (error: any) {
        message.error(error.message || 'Failed to upload image');
        // Remove the failed file from the list
        form.setFieldsValue({ image: [] });
      } finally {
        setUploadingImage(false);
      }
    }
  }, [form, handleImageUpload]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      // Extract image URL from fileList if it exists
      let imageUrl: string | undefined;
      if (values.image && Array.isArray(values.image) && values.image.length > 0) {
        const imageFile = values.image[0];
        imageUrl = imageFile.url || imageFile.response?.url;
      }
      
      const formData: Partial<AssetFormData> = {
        ...values,
        image: imageUrl,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined,
        warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : undefined,
      };
      
      // Remove image from formData if it's still a fileList object
      if (Array.isArray(formData.image)) {
        delete formData.image;
      }

      if (editingAsset) {
        await updateAsset({ id: editingAsset._id, data: formData }).unwrap();
        message.success("Asset updated successfully");
      } else {
        await createAsset(formData).unwrap();
        message.success("Asset created successfully");
      }
      setOpenAddModal(false);
      form.resetFields();
      setEditingAsset(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || `Failed to ${editingAsset ? 'update' : 'create'} asset`);
    }
  }, [editingAsset, updateAsset, createAsset, form]);


  const MoreActions = useCallback(({ record }: { record: Asset }) => {
    const handleMenuClick = ({ key }: { key: string }) => {
      if (key === "edit") {
        handleOpenEditModal(record);
      } else if (key === "delete") {
        Modal.confirm({
          title: "Delete Asset",
          content: `Are you sure you want to delete "${record.name}"?`,
          onOk: () => handleDelete(record._id),
        });
      } else if (key === "view") {
        Modal.info({
          title: "Asset Details",
          width: 600,
          content: (
            <div className="space-y-2">
              <p><strong>Name:</strong> {record.name}</p>
              <p><strong>Type:</strong> {record.type}</p>
              <p><strong>Asset Type:</strong> {record.assetTypeId?.name || "N/A"}</p>
              <p><strong>Serial Number:</strong> {record.serialNumber || "N/A"}</p>
              <p><strong>Status:</strong> {record.status}</p>
              <p><strong>Branch:</strong> {record.branchId?.branchName} ({record.branchId?.branchCode})</p>
              <p><strong>Location:</strong> {record.location}</p>
              <p><strong>Assigned To:</strong> {record.assignedTo ? `${record.assignedTo.name} (${record.assignedTo.employeeId})` : "Unassigned"}</p>
              <p><strong>Purchase Date:</strong> {record.purchaseDate ? dayjs(record.purchaseDate).format('DD/MM/YYYY') : "N/A"}</p>
              <p><strong>Purchase Price:</strong> {record.purchasePrice ? `₹${record.purchasePrice.toLocaleString()}` : "N/A"}</p>
              <p><strong>Warranty Expiry:</strong> {record.warrantyExpiry ? dayjs(record.warrantyExpiry).format('DD/MM/YYYY') : "N/A"}</p>
              {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}
            </div>
          ),
        });
      }
    };

    const items = [
      { key: "view", label: "👁 View" },
      { key: "edit", label: "✏️ Edit" },
      { key: "delete", label: "🗑 Delete" },
    ];

    return (
      <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={["click"]} placement="bottomRight">
        <Button size="sm" className="text-white p-2">
          <MoreHorizontal size={18} />
        </Button>
      </Dropdown>
    );
  }, [handleOpenEditModal, handleDelete]);

  const columns = useMemo(() => [
    {
      title: "Asset Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Asset Type",
      dataIndex: ["assetTypeId", "name"],
      key: "assetType",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Branch",
      dataIndex: ["branchId", "branchName"],
      key: "branch",
      render: (_: any, record: Asset) => 
        record.branchId ? `${record.branchId.branchName} (${record.branchId.branchCode})` : "N/A",
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "Assigned To",
      dataIndex: ["assignedTo", "name"],
      key: "assignedTo",
      render: (_: any, record: Asset) => 
        record.assignedTo ? `${record.assignedTo.name} (${record.assignedTo.employeeId})` : "Unassigned",
    },
    {
      title: "Serial Number",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text: string) => {
        const statusColors: Record<string, string> = {
          "Working": "bg-green-100 text-green-700",
          "Under Maintenance": "bg-yellow-100 text-yellow-700",
          "Damaged": "bg-red-100 text-red-700",
          "Retired": "bg-gray-100 text-gray-700",
        };
        return (
          <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[text] || "bg-gray-100 text-gray-700"}`}>
          {text}
        </span>
        );
      },
      align: "center" as const,
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: Asset) => (
        <div className="flex justify-center">
          <MoreActions record={record} />
        </div>
      ),
    },
  ], [MoreActions]);

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Assets Management</h1>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Button className="text-white w-full sm:w-auto" onClick={handleOpenAddModal}>
              <Plus className="mr-1" size={18} /> Add New Asset
            </Button>
          </div>
        </div>

        {/* TABLE */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Asset List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto transition-opacity duration-200">
              <Table
                dataSource={assets}
                columns={columns}
                rowKey={(record) => record._id}
                loading={showLoading}
                pagination={false}
                locale={{ emptyText: "No assets found" }}
                scroll={{ x: 'max-content' }}
                size="middle"
                className="assets-table"
              />
            </div>

            <div className="flex justify-end pt-6">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={totalFiltered}
                showSizeChanger
                showTotal={(total) => `Total ${total} assets`}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ADD/EDIT ASSET MODAL */}
        <Modal
          centered
          open={openAddModal}
          onCancel={() => {
            setOpenAddModal(false);
            form.resetFields();
            setEditingAsset(null);
          }}
          footer={null}
          width={1000}
          title={editingAsset ? "Edit Asset" : "Add New Asset"}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              status: "Working",
            }}
            preserve={false}
          >
          <Tabs>
            {/* TAB 1 – ASSET DETAILS */}
            <TabPane tab="Asset Details" key="1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <Form.Item
                    name="image"
                    label="Asset Image"
                    className="md:col-span-2"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => {
                      if (Array.isArray(e)) {
                        return e;
                      }
                      return e?.fileList;
                    }}
                  >
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      beforeUpload={() => false}
                      onChange={handleImageChange}
                      onRemove={() => {
                        form.setFieldsValue({ image: undefined });
                      }}
                      accept="image/jpeg,image/jpg,image/png"
                    >
                      {uploadingImage ? (
                        <div>
                          <div className="animate-spin">⏳</div>
                          <div className="mt-2">Uploading...</div>
                        </div>
                      ) : (
                        <div>
                          <UploadIcon size={20} />
                          <div className="mt-2">Upload</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    name="name"
                    label="Asset Name"
                    rules={[{ required: true, message: "Please enter asset name" }]}
                  >
                    <Input placeholder="Enter Asset Name" />
                  </Form.Item>

                  <Form.Item
                    name="type"
                    label="Asset Type (General)"
                    rules={[{ required: true, message: "Please enter asset type" }]}
                  >
                    <Input placeholder="e.g., Laptop, Phone, Furniture" />
                  </Form.Item>

                  <Form.Item
                    name="assetTypeId"
                    label="Asset Category"
                  >
                    <Select placeholder="Select Asset Category" allowClear>
                      {assetTypes.map((type) => (
                        <Select.Option key={type._id} value={type._id}>
                          {type.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="branchId"
                    label="Branch"
                    rules={[{ required: true, message: "Please select a branch" }]}
                  >
                    <Select placeholder="Select Branch">
                      {branches.map((branch) => (
                        <Select.Option key={branch._id} value={branch._id}>
                          {branch.branchName} ({branch.branchCode})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="location"
                    label="Location"
                    rules={[{ required: true, message: "Please enter location" }]}
                  >
                    <Input placeholder="e.g., Floor 2, Room 201" />
                  </Form.Item>

                  <Form.Item
                    name="serialNumber"
                    label="Serial Number"
                  >
                    <Input placeholder="Enter Serial Number" />
                  </Form.Item>

                  <Form.Item
                    name="assignedTo"
                    label="Assign To Employee"
                  >
                    <Select placeholder="Select Employee" allowClear showSearch optionFilterProp="children">
                      {staff.map((employee) => (
                        <Select.Option key={employee._id} value={employee._id}>
                          {employee.name} ({employee.employeeId})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: "Please select status" }]}
                  >
                    <Select>
                      <Select.Option value="Working">Working</Select.Option>
                      <Select.Option value="Under Maintenance">Under Maintenance</Select.Option>
                      <Select.Option value="Damaged">Damaged</Select.Option>
                      <Select.Option value="Retired">Retired</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="notes"
                    label="Notes"
                    className="md:col-span-2"
                  >
                    <TextArea rows={4} placeholder="Enter any additional notes or description" />
                  </Form.Item>
                </div>
              </TabPane>

              {/* TAB 2 – PURCHASE & WARRANTY DETAILS */}
              <TabPane tab="Purchase & Warranty" key="2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <Form.Item
                    name="purchaseDate"
                    label="Purchase Date"
                  >
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    name="purchasePrice"
                    label="Purchase Price (₹)"
                  >
                    <InputNumber
                      className="w-full"
                      placeholder="Enter purchase price"
                      min={0}
                      formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="warrantyExpiry"
                    label="Warranty Expiry Date"
                    className="md:col-span-2"
                  >
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
              </div>
            </TabPane>
          </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <Button variant="outline" onClick={() => {
                setOpenAddModal(false);
                form.resetFields();
                setEditingAsset(null);
              }}>
                Cancel
              </Button>
              <Button className="text-white" htmlType="submit">
                {editingAsset ? "Update" : "Create"}
              </Button>
          </div>
          </Form>
        </Modal>
      </main>
    </MainLayout>
  );
};

export default Assets;
