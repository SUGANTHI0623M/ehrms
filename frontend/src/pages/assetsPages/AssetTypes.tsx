import { useState, useMemo, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Table, Modal, Form, Input, message } from "antd";
import { Plus, Search, X } from "lucide-react";
import { Dropdown } from "antd";
import { MoreHorizontal } from "lucide-react";
import {
  useGetAssetTypesQuery,
  useCreateAssetTypeMutation,
  useUpdateAssetTypeMutation,
  useDeleteAssetTypeMutation,
  AssetType
} from "@/store/api/assetsApi";

const { TextArea } = Input;

const AssetTypes = () => {
  const [search, setSearch] = useState("");
  const [isAddModal, setIsAddModal] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetType | null>(null);
  const [form] = Form.useForm();

  const { data: assetTypesData, isLoading, isFetching } = useGetAssetTypesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    keepUnusedDataFor: 60,
  });
  const [createAssetType] = useCreateAssetTypeMutation();
  const [updateAssetType] = useUpdateAssetTypeMutation();
  const [deleteAssetType] = useDeleteAssetTypeMutation();

  const assetTypes = assetTypesData?.data?.assetTypes || [];
  
  // Only show loading on initial load, not when refetching with existing data
  const showLoading = isLoading && !assetTypesData;

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assetTypes;
    const searchLower = search.toLowerCase();
    return assetTypes.filter((item) =>
      item.name.toLowerCase().includes(searchLower)
    );
  }, [assetTypes, search]);

  const handleOpenAddModal = useCallback(() => {
    setEditingAssetType(null);
    form.resetFields();
    setIsAddModal(true);
  }, [form]);

  const handleOpenEditModal = useCallback((assetType: AssetType) => {
    setEditingAssetType(assetType);
    form.setFieldsValue({
      name: assetType.name,
      description: assetType.description || "",
    });
    setIsAddModal(true);
  }, [form]);

  const handleSubmit = useCallback(async (values: { name: string; description?: string }) => {
    try {
      if (editingAssetType) {
        await updateAssetType({ id: editingAssetType._id, data: values }).unwrap();
        message.success("Asset type updated successfully");
      } else {
        await createAssetType(values).unwrap();
        message.success("Asset type created successfully");
      }
      setIsAddModal(false);
      form.resetFields();
      setEditingAssetType(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || `Failed to ${editingAssetType ? 'update' : 'create'} asset type`);
    }
  }, [editingAssetType, updateAssetType, createAssetType, form]);

  const handleDelete = useCallback(async (assetTypeId: string, assetTypeName: string) => {
    Modal.confirm({
      title: "Delete Asset Type",
      content: `Are you sure you want to delete "${assetTypeName}"? This action cannot be undone.`,
      onOk: async () => {
        try {
          await deleteAssetType(assetTypeId).unwrap();
          message.success("Asset type deleted successfully");
        } catch (error: any) {
          message.error(error?.data?.error?.message || "Failed to delete asset type");
        }
      },
    });
  }, [deleteAssetType]);

  const MoreActions = useCallback(({ record }: { record: AssetType }) => {
    const handleMenuClick = ({ key }: { key: string }) => {
      if (key === "edit") {
        handleOpenEditModal(record);
      } else if (key === "delete") {
        handleDelete(record._id, record.name);
      }
    };

    const items = [
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
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => text || <span className="text-gray-400">No description</span>,
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: AssetType) => (
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-3xl font-bold">Asset Types</h1>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <ShadcnInput
                placeholder="Search By Name"
                className={`pl-10 ${search ? "pr-10" : ""}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>

            <Button
              className="text-white w-full sm:w-auto"
              onClick={handleOpenAddModal}
            >
              <Plus className="w-4 h-4 mr-1" /> Add New Asset Type
            </Button>
          </div>
        </div>

        {/* TABLE */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Asset Types List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table
                dataSource={filteredAssets}
                columns={columns}
                loading={showLoading}
                pagination={{ pageSize: 10 }}
                rowKey="_id"
                locale={{ emptyText: "No asset types found" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ADD/EDIT MODAL */}
        <Modal
          centered
          open={isAddModal}
          onCancel={() => {
            setIsAddModal(false);
            form.resetFields();
            setEditingAssetType(null);
          }}
          footer={null}
          title={editingAssetType ? "Edit Asset Type" : "Add New Asset Type"}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            preserve={false}
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: "Please enter asset type name" }]}
            >
              <Input placeholder="Please Enter Name" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                rows={4}
                placeholder="Enter description (optional)"
              />
            </Form.Item>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddModal(false);
                  form.resetFields();
                  setEditingAssetType(null);
                }}
              >
                Cancel
              </Button>
              <Button className="text-white" htmlType="submit">
                {editingAssetType ? "Update" : "Create"}
              </Button>
            </div>
          </Form>
        </Modal>
      </main>
    </MainLayout>
  );
};

export default AssetTypes;
