import React, { useState, useEffect } from "react";
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
  Spin,
} from "antd";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import PermissionMatrix from "@/components/PermissionMatrix";
import RoleHierarchyTree from "@/components/RoleHierarchyTree";
import {
  useGetRolesQuery,
  useGetRoleConfigurationQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  type Role,
  type Permission,
} from "@/store/api/roleApi";

const { TextArea } = Input;

const RoleManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const { data: rolesData, isLoading: isLoadingRoles, refetch: refetchRoles } = useGetRolesQuery();
  const { data: configData, isLoading: isLoadingConfig } = useGetRoleConfigurationQuery();
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();
  const [deleteRoleMutation, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const roles = rolesData?.data?.roles || [];
  const config = configData?.data || { modules: [], actions: [], systemRoles: [] };

  const handleCreate = () => {
    setEditingRole(null);
    form.resetFields();
    
    // Initialize permissions when modal opens
    if (config.modules && config.modules.length > 0) {
      form.setFieldsValue({
        permissions: config.modules.map(module => ({
          module,
          actions: []
        }))
      });
    }
    setShowModal(true);
  };

  // Ensure permissions are initialized when creating a new role (not when editing)
  useEffect(() => {
    if (showModal && !editingRole && config.modules && config.modules.length > 0) {
      const currentPermissions = form.getFieldValue('permissions');
      
      // Only initialize if permissions are empty or don't match modules
      if (!currentPermissions || currentPermissions.length === 0) {
        const initialPermissions = config.modules.map(module => ({
          module,
          actions: []
        }));
        form.setFieldsValue({ permissions: initialPermissions });
      } else if (currentPermissions.length !== config.modules.length) {
        // If modules changed, update permissions
        const moduleMap = new Map(currentPermissions.map((p: any) => [p.module, p.actions || []]));
        const updatedPermissions = config.modules.map(module => ({
          module,
          actions: moduleMap.get(module) || []
        }));
        form.setFieldsValue({ permissions: updatedPermissions });
      }
    }
  }, [config.modules, showModal, editingRole, form]);

  const handleEdit = (role: Role) => {
    // Only prevent editing Super Admin and Admin - all other roles can be edited
    const isEditDisabled = role.name === 'Super Admin' || role.name === 'Admin';
    if (isEditDisabled) {
      message.error("Cannot edit system roles (Super Admin, Admin).");
      return;
    }
    
    // For roles without _id, we can still allow editing if it's a custom role
    // Only block if it's a system role without _id
    if (!role._id || typeof role._id !== 'string' || role._id.trim() === '') {
      // If it's marked as system role but doesn't have _id, we can't edit it
      // But for custom roles, we should allow creating/editing
      if (role.isSystemRole) {
        message.error({
          content: `Cannot edit "${role.name}": This role doesn't exist in the database yet. Please create it first.`,
          duration: 5,
        });
        return;
      }
      // For custom roles without _id, we'll allow editing (it will be created)
    }
    
    // Store role with explicit _id preservation
    const roleWithId: Role = {
      ...role,
      _id: role._id // Explicitly preserve _id
    };
    
    console.log("Storing role with ID:", roleWithId._id);
    setEditingRole(roleWithId);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: config.modules.map(module => {
        const existing = role.permissions.find(p => p.module === module);
        return {
          module,
          actions: existing?.actions || []
        };
      })
    });
    setShowModal(true);
  };

  const handleDelete = async (role: Role) => {
    // Only prevent deleting Super Admin and Admin - all other roles can be deleted
    const isSystem = role.name === 'Super Admin' || role.name === 'Admin';
    if (isSystem) {
      message.error("Cannot delete system roles (Super Admin, Admin).");
      return;
    }
    
    // Ensure role has _id before allowing delete
    if (!role._id || typeof role._id !== 'string' || role._id.trim() === '') {
      message.error({
        content: `Cannot delete "${role.name}": This role doesn't exist in the database.`,
        duration: 5,
      });
      return;
    }

    Modal.confirm({
      title: "Delete Role",
      content: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteRoleMutation(role._id).unwrap();
          message.success("Role deleted successfully");
          refetchRoles();
        } catch (error: any) {
          message.error(error?.data?.error?.message || "Failed to delete role");
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      // Format permissions
      const permissions: Permission[] = values.permissions
        .filter((p: any) => p.actions && p.actions.length > 0)
        .map((p: any) => ({
          module: p.module,
          actions: p.actions
        }));

      if (editingRole) {
        // Only block Super Admin and Admin - all other roles can be updated
        const isEditDisabled = editingRole.name === 'Super Admin' || editingRole.name === 'Admin';
        if (isEditDisabled) {
          message.error("Cannot update system roles (Super Admin, Admin).");
          return;
        }
        
        // For roles without _id, we'll create them instead of updating
        const roleId = editingRole._id;
        if (!roleId || typeof roleId !== 'string' || roleId.trim() === '') {
          // If role doesn't have _id, create it instead
          const result = await createRole({
            name: values.name,
            description: values.description,
            permissions,
          }).unwrap();
          
          message.success("Role created successfully");
          await refetchRoles();
          setShowModal(false);
          setEditingRole(null);
          form.resetFields();
          return;
        }
        
        // Debug log before API call
        console.log("Updating role ID:", roleId);
        console.log("Role ID type:", typeof roleId);
        console.log("Update payload:", {
          name: values.name,
          description: values.description,
          permissions,
          isActive: values.isActive,
        });
        
        const result = await updateRole({
          id: roleId,
          data: {
            name: values.name,
            description: values.description,
            permissions,
            isActive: values.isActive,
          },
        }).unwrap();
        message.success("Role updated successfully");
        
        // Ensure roles are refreshed to get updated permissions
        await refetchRoles();
      } else {
        // Validate that role name is not Super Admin or Admin
        if (values.name.trim() === 'Super Admin' || values.name.trim() === 'Admin') {
          message.error("Cannot create system roles (Super Admin or Admin).");
          return;
        }
        
        const result = await createRole({
          name: values.name,
          description: values.description,
          permissions,
        }).unwrap();
        
        message.success("Role created successfully");
        
        // Ensure roles are refreshed to get the new role with _id
        await refetchRoles();
      }

      setShowModal(false);
      setEditingRole(null);
      form.resetFields();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save role");
    }
  };

  const columns = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Role) => (
        <Space>
          <span>{text}</span>
          {record.isSystemRole && <Tag color="blue">System</Tag>}
          {!record.isActive && <Tag color="red">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (text: string) => text || "-",
    },
    {
      title: "Modules",
      key: "modules",
      render: (_: any, record: Role) => (
        <Tag>{record.permissions.length} module(s)</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Role) => {
        // Only disable Edit for Super Admin and Admin - all other roles can be edited
        const isEditDisabled = 
          record.name === 'Super Admin' || 
          record.name === 'Admin';
        
        // Only disable Delete for Super Admin and Admin - all other roles can be deleted
        const isDeleteDisabled = 
          record.name === 'Super Admin' || 
          record.name === 'Admin';
        
        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={isEditDisabled}
              title={
                record.name === 'Super Admin' || record.name === 'Admin'
                  ? "System roles cannot be edited"
                  : undefined
              }
            >
              Edit
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              disabled={isDeleteDisabled}
              loading={isDeleting}
              title={
                record.name === 'Super Admin' || record.name === 'Admin'
                  ? "System roles cannot be deleted"
                  : undefined
              }
            >
              Delete
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Role Management</CardTitle>
            <Space>
              <Button
                type="default"
                icon={<ApartmentOutlined />}
                onClick={() => setShowHierarchyModal(true)}
              >
                Manage Hierarchy
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Create Role
              </Button>
            </Space>
          </CardHeader>
          <CardContent>
            {isLoadingRoles ? (
              <div className="text-center py-8">
                <Spin size="large" />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={roles}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </CardContent>
        </Card>

        <Modal
          title={editingRole ? "Edit Role" : "Create Role"}
          open={showModal}
          onCancel={() => {
            setShowModal(false);
            setEditingRole(null);
            form.resetFields();
          }}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              isActive: true,
            }}
          >
            <Form.Item
              name="name"
              label="Role Name"
              rules={[
                { required: true, message: "Role name is required" },
                { min: 2, message: "Role name must be at least 2 characters" },
                {
                  validator: (_, value) => {
                    if (value && (value.trim() === 'Super Admin' || value.trim() === 'Admin')) {
                      return Promise.reject(new Error('Cannot use system role name (Super Admin or Admin).'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input
                placeholder="Enter role name"
                disabled={editingRole?.name === 'Super Admin' || editingRole?.name === 'Admin' || editingRole?.name === 'Candidate'}
              />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <TextArea
                rows={3}
                placeholder="Enter role description"
                disabled={editingRole?.name === 'Super Admin' || editingRole?.name === 'Admin'}
              />
            </Form.Item>

            <Form.Item 
              label={
                <span>
                  <span className="text-red-500 mr-1">*</span>
                  Permissions
                </span>
              }
              required
              tooltip="Select which actions each module can perform. Use global controls to select/remove all permissions at once."
            >
              {isLoadingConfig ? (
                <div className="text-center py-8">
                  <Spin size="large" />
                  <p className="mt-2 text-muted-foreground">Loading permissions configuration...</p>
                </div>
              ) : config.modules.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-yellow-50">
                  <p className="text-yellow-800 font-medium">No modules available.</p>
                  <p className="text-sm text-yellow-600 mt-1">
                    Please check role configuration API endpoint.
                  </p>
                </div>
              ) : (
                <Form.Item
                  name="permissions"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value || value.length === 0) {
                          return Promise.resolve();
                        }
                        // Validate that at least one permission is selected
                        const hasAnyPermission = value.some((p: any) => 
                          p.actions && p.actions.length > 0
                        );
                        if (!hasAnyPermission) {
                          return Promise.reject(new Error('Please select at least one permission'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <PermissionMatrix
                    modules={config.modules}
                    actions={config.actions}
                    disabled={editingRole ? (editingRole.name === 'Super Admin' || editingRole.name === 'Admin') : false}
                  />
                </Form.Item>
              )}
            </Form.Item>

            {editingRole && (
              <Form.Item name="isActive" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            )}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isCreating || isUpdating}
                >
                  {editingRole ? "Update" : "Create"}
                </Button>
                <Button onClick={() => setShowModal(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Hierarchy Management Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <ApartmentOutlined />
              <span>Manage Role Hierarchy</span>
            </div>
          }
          open={showHierarchyModal}
          onCancel={() => setShowHierarchyModal(false)}
          footer={null}
          width={900}
          style={{ top: 20 }}
        >
          <RoleHierarchyTree onClose={() => setShowHierarchyModal(false)} />
        </Modal>
      </div>
    </MainLayout>
  );
};

export default RoleManagement;

