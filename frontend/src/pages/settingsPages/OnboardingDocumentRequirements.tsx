import React, { useState } from "react";
import MainLayout from "@/components/MainLayout";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Switch,
  Tag,
  Popconfirm,
  Tooltip,
  Card,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  FormOutlined,
} from "@ant-design/icons";
import {
  useGetDocumentRequirementsQuery,
  useCreateDocumentRequirementMutation,
  useUpdateDocumentRequirementMutation,
  useDeleteDocumentRequirementMutation,
  useInitializeDefaultRequirementsMutation,
  type DocumentRequirement,
} from "@/store/api/documentRequirementsApi";

const { TextArea } = Input;
const { Option } = Select;

const OnboardingDocumentRequirements: React.FC = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<DocumentRequirement | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const {
    data: requirementsData,
    isLoading,
    refetch,
  } = useGetDocumentRequirementsQuery();

  const [createRequirement, { isLoading: isCreating }] = useCreateDocumentRequirementMutation();
  const [updateRequirement, { isLoading: isUpdating }] = useUpdateDocumentRequirementMutation();
  const [deleteRequirement, { isLoading: isDeleting }] = useDeleteDocumentRequirementMutation();
  const [initializeDefaults, { isLoading: isInitializingDefaults }] = useInitializeDefaultRequirementsMutation();

  const requirements = requirementsData?.data?.requirements || [];

  const handleAdd = () => {
    setEditingRequirement(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'document',
      required: true,
      isActive: true,
      order: requirements.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: DocumentRequirement) => {
    setEditingRequirement(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      required: record.required,
      description: record.description || '',
      order: record.order,
      isActive: record.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequirement(id).unwrap();
      message.success("Document requirement deleted successfully");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to delete document requirement");
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRequirement) {
        await updateRequirement({
          _id: editingRequirement._id,
          ...values,
        }).unwrap();
        message.success("Document requirement updated successfully");
      } else {
        await createRequirement(values).unwrap();
        message.success("Document requirement created successfully");
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingRequirement(null);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save document requirement");
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setIsInitializing(true);
      await initializeDefaults().unwrap();
      message.success("Default document requirements initialized successfully");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to initialize default requirements");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleMoveOrder = async (requirement: DocumentRequirement, direction: 'up' | 'down') => {
    const currentIndex = requirements.findIndex((r) => r._id === requirement._id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= requirements.length) return;

    const targetRequirement = requirements[newIndex];
    const newOrder = targetRequirement.order;
    const targetNewOrder = requirement.order;

    try {
      // Swap orders
      await Promise.all([
        updateRequirement({
          _id: requirement._id,
          name: requirement.name,
          type: requirement.type,
          required: requirement.required,
          description: requirement.description,
          order: newOrder,
          isActive: requirement.isActive,
        }).unwrap(),
        updateRequirement({
          _id: targetRequirement._id,
          name: targetRequirement.name,
          type: targetRequirement.type,
          required: targetRequirement.required,
          description: targetRequirement.description,
          order: targetNewOrder,
          isActive: targetRequirement.isActive,
        }).unwrap(),
      ]);
      message.success("Order updated successfully");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update order");
    }
  };

  const columns = [
    {
      title: "Order",
      dataIndex: "order",
      key: "order",
      width: 80,
      sorter: (a: DocumentRequirement, b: DocumentRequirement) => a.order - b.order,
      render: (_: any, record: DocumentRequirement) => (
        <Space>
          <Tooltip title="Move up">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => handleMoveOrder(record, 'up')}
              disabled={record.order === 1}
            />
          </Tooltip>
          <span>{record.order}</span>
          <Tooltip title="Move down">
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMoveOrder(record, 'down')}
              disabled={record.order === requirements.length}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: DocumentRequirement) => (
        <Space>
          {record.type === 'form' ? (
            <FormOutlined style={{ color: '#1890ff' }} />
          ) : (
            <FileTextOutlined style={{ color: '#52c41a' }} />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'form' ? 'blue' : 'green'}>
          {type === 'form' ? 'Form' : 'Document'}
        </Tag>
      ),
    },
    {
      title: "Required",
      dataIndex: "required",
      key: "required",
      width: 100,
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'}>
          {required ? 'Required' : 'Optional'}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_: any, record: DocumentRequirement) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this requirement?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={isDeleting}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <Card
          title={
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold m-0">Onboarding Document Requirements</h2>
                <p className="text-muted-foreground mt-1 mb-0">
                  Manage required documents for the candidate onboarding process
                </p>
              </div>
            </div>
          }
          extra={
            <Space>
              {requirements.length === 0 && (
                <Button
                  type="default"
                  onClick={handleInitializeDefaults}
                  loading={isInitializingDefaults}
                >
                  Initialize Defaults
                </Button>
              )}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Add Requirement
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={requirements}
            rowKey="_id"
            loading={isLoading}
            pagination={false}
          />
        </Card>

        <Modal
          title={editingRequirement ? "Edit Document Requirement" : "Add Document Requirement"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            form.resetFields();
            setEditingRequirement(null);
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="Document Name"
              rules={[{ required: true, message: "Please enter document name" }]}
            >
              <Input placeholder="e.g., PAN Card Copy" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Type"
              rules={[{ required: true, message: "Please select type" }]}
            >
              <Select placeholder="Select type">
                <Option value="document">Document</Option>
                <Option value="form">Form</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                rows={3}
                placeholder="Optional description for this document"
              />
            </Form.Item>

            <Form.Item
              name="required"
              label="Required"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="order"
              label="Display Order"
              rules={[{ required: true, message: "Please enter order" }]}
            >
              <Input type="number" min={1} />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isCreating || isUpdating}
                >
                  {editingRequirement ? "Update" : "Create"}
                </Button>
                <Button
                  onClick={() => {
                    setIsModalOpen(false);
                    form.resetFields();
                    setEditingRequirement(null);
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default OnboardingDocumentRequirements;

