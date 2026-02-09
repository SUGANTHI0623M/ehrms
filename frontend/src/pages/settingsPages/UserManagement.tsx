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
    Dropdown,
    MenuProps,
    message,
    Switch,
    Tag,
    Spin,
} from "antd";
import { PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, PoweroffOutlined, SearchOutlined } from "@ant-design/icons";
import {
    useGetUsersQuery,
    useGetRolesQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useToggleUserStatusMutation,
    useDeleteUserMutation,
    type User,
} from "@/store/api/userApi";
import { 
    useGetRolesQuery as useGetCustomRolesQuery, 
    useGetRoleConfigurationQuery,
    useGetRoleByIdQuery,
    type Permission,
} from "@/store/api/roleApi";
import { useAppSelector } from "@/store/hooks";
import { useNavigate } from "react-router-dom";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";
import PermissionMatrix from "@/components/PermissionMatrix";


const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = useAppSelector((state) => state.auth.user);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [form] = Form.useForm();
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>("91");
    const countryOptions = getCountryOptions();

    // Check if user has access to User Management
    const canAccess = currentUser?.role === "Super Admin" || currentUser?.role === "Admin";
    const canCreate = canAccess;
    const canUpdate = canAccess;
    const canDelete = canAccess;

    // API hooks
    const {
        data: usersData,
        isLoading: isLoadingUsers,
        error: usersError,
        refetch: refetchUsers,
    } = useGetUsersQuery({
        search: search || undefined,
        role: filterRole || undefined,
        isActive: filterStatus || undefined,
        page,
        limit,
    });

    // Get all roles for user assignment (use all roles, not just assignable)
    const {
        data: rolesData,
        isLoading: isLoadingRoles,
    } = useGetRolesQuery(undefined, {
        skip: !canAccess,
    });

    // Fetch custom roles for roleId assignment
    const {
        data: customRolesData,
        isLoading: isLoadingCustomRoles,
    } = useGetCustomRolesQuery(undefined, {
        skip: !canAccess,
    });

    // Fetch role configuration for permissions
    const {
        data: roleConfigData,
        isLoading: isLoadingRoleConfig,
    } = useGetRoleConfigurationQuery(undefined, {
        skip: !canAccess || !editingUser,
    });

    // Fetch role details if user has a custom role
    const userRoleId = editingUser?.roleId?._id || editingUser?.roleId;
    const {
        data: userRoleData,
        isLoading: isLoadingUserRole,
    } = useGetRoleByIdQuery(userRoleId as string, {
        skip: !canAccess || !editingUser || !userRoleId || typeof userRoleId !== 'string',
    });

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [toggleStatus, { isLoading: isToggling }] = useToggleUserStatusMutation();
    const [deleteUserMutation, { isLoading: isDeleting }] = useDeleteUserMutation();

    // Extract roles for dropdown - use all roles (excluding Candidate)
    const roles = (rolesData?.data?.roles || []).filter((r: any) => r.name !== 'Candidate');
    
    // Define role order for proper sorting
    const roleOrder = ['Super Admin', 'Admin', 'Senior HR', 'HR', 'Manager', 'Team Leader', 'Employee', 'Candidate', 'Demo Client', 'Developer'];
    
    const roleOptions = roles
        .map((r) => ({
            label: r.name,
            value: r.name,
            order: roleOrder.indexOf(r.name) !== -1 ? roleOrder.indexOf(r.name) : 999, // Put unknown roles at end
        }))
        .sort((a, b) => a.order - b.order)
        .map((r) => ({
            label: r.label,
            value: r.value,
        }));

    // Extract custom roles for roleId assignment
    const customRoles = customRolesData?.data?.roles || [];
    const customRoleOptions = customRoles
        .filter((r) => !r.isSystemRole && r.isActive)
        .map((r) => ({
            label: r.name,
            value: r._id,
        }));

    // Extract users and pagination
    const users = usersData?.data?.users || [];
    const pagination = usersData?.data?.pagination || { total: 0, pages: 1 };

    // Handle errors
    useEffect(() => {
        if (usersError) {
            const errorMessage = (usersError as any)?.data?.error?.message || "Failed to load users";
            if (errorMessage.includes("Access denied") || errorMessage.includes("Insufficient permissions")) {
                message.error("You don't have permission to access User Management");
            } else {
                message.error(errorMessage);
            }
        }
    }, [usersError]);

    // Redirect if no access
    if (!canAccess) {
        return (
            <MainLayout>
                <div style={{ padding: 24, textAlign: "center" }}>
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access User Management.</p>
                </div>
            </MainLayout>
        );
    }

    const handleAdd = () => {
        setEditingUser(null);
        setSelectedCountryCode("91");
        form.resetFields();
        setShowModal(true);
    };

    const handleEdit = (record: User) => {
        // Allow editing candidates - removed restriction
        
        setEditingUser(record);
        const countryCode = record.countryCode || "91";
        setSelectedCountryCode(countryCode);
        
        // Get permissions from user's direct permissions or from role if available
        // User permissions take precedence over role permissions
        const userPermissions = record.permissions || [];
        const rolePermissions = record.roleId?.permissions || [];
        // Use user permissions if available, otherwise fall back to role permissions
        // Ensure permissions are in the correct format (array of objects with module and actions)
        let initialPermissions: any[] = [];
        if (userPermissions.length > 0) {
            // Check if already in correct format
            if (typeof userPermissions[0] === 'object' && userPermissions[0]?.module) {
                initialPermissions = userPermissions;
            } else {
                // Convert from string array if needed (shouldn't happen, but handle it)
                initialPermissions = [];
            }
        } else if (rolePermissions.length > 0) {
            // Use role permissions as initial value
            initialPermissions = rolePermissions;
        }
        
        form.setFieldsValue({
            name: record.name,
            email: record.email,
            phone: record.phone || "",
            countryCode: countryCode,
            role: record.role,
            roleId: record.roleId?._id || undefined,
            password: undefined, // Clear password field - it cannot be shown for security reasons
            permissions: initialPermissions, // Set permissions from user or role
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: "Delete User",
            content: "Are you sure you want to delete this user? This will deactivate the user account.",
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
                try {
                    await deleteUserMutation(id).unwrap();
                    message.success("User deleted successfully");
                    refetchUsers();
                } catch (error: any) {
                    const errorMessage = error?.data?.error?.message || "Failed to delete user";
                    message.error(errorMessage);
                }
            },
        });
    };

    const handleToggleStatus = async (user: User) => {
        try {
            await toggleStatus({
                id: user._id,
                isActive: !user.isActive,
            }).unwrap();
            message.success(`User ${!user.isActive ? "activated" : "deactivated"} successfully`);
            refetchUsers();
        } catch (error: any) {
            const errorMessage = error?.data?.error?.message || "Failed to update user status";
            message.error(errorMessage);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            if (editingUser) {
                // Allow editing candidates - removed restriction
                
                // UPDATE
                const updateData: any = {
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    countryCode: values.countryCode || selectedCountryCode,
                    role: values.role,
                    roleId: values.roleId || undefined,
                    // Always send permissions array (even if empty) - this ensures permissions are saved
                    permissions: Array.isArray(values.permissions) ? values.permissions : [],
                };
                
                // Only include password if provided and not empty
                // If password is empty/undefined, backend will keep the existing password
                if (values.password && values.password.trim() && values.password.trim().length > 0) {
                    updateData.password = values.password.trim();
                }
                
                await updateUser({
                    id: editingUser._id,
                    data: updateData,
                }).unwrap();
                message.success("User updated successfully");
            } else {
                // CREATE
                await createUser({
                    email: values.email,
                    password: values.password,
                    name: values.name,
                    phone: values.phone || undefined,
                    countryCode: values.countryCode || selectedCountryCode,
                    role: values.role,
                    roleId: values.roleId || undefined,
                    // Include permissions for new users too
                    permissions: Array.isArray(values.permissions) ? values.permissions : [],
                }).unwrap();
                message.success("User created successfully");
            }

            setShowModal(false);
            form.resetFields();
            setSelectedCountryCode("91");
            refetchUsers();
        } catch (error: any) {
            // Improved error handling with specific messages
            let errorMessage = "Operation failed";
            
            if (error?.data?.error) {
                if (error.data.error.message) {
                    errorMessage = error.data.error.message;
                } else if (error.data.error.missingFields) {
                    errorMessage = `Missing required fields: ${error.data.error.missingFields.join(', ')}`;
                } else if (error.data.error.errors && Array.isArray(error.data.error.errors)) {
                    errorMessage = error.data.error.errors.map((e: any) => e.msg || e.message).join(', ');
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            message.error(errorMessage);
        }
    };

    const menu = (record: User): MenuProps["items"] => [
        {
            key: "edit",
            label: (
                <span onClick={() => handleEdit(record)}>
                    <EditOutlined /> Edit
                </span>
            ),
            disabled: !canUpdate,
        },
        {
            key: "status",
            label: (
                <span onClick={() => handleToggleStatus(record)}>
                    <PoweroffOutlined /> {record.isActive ? "Deactivate" : "Activate"}
                </span>
            ),
            disabled: !canUpdate,
        },
        {
            key: "delete",
            label: (
                <span onClick={() => handleDelete(record._id)}>
                    <DeleteOutlined /> Delete
                </span>
            ),
            disabled: !canDelete,
            danger: true,
        },
    ];

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
            render: (phone: string) => phone || "-",
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (role: string, record: User) => (
                <Space direction="vertical" size={0}>
                    <Tag color={role === "Super Admin" ? "red" : role === "Admin" ? "blue" : "default"}>
                        {role}
                    </Tag>
                    {record.roleId && (
                        <Tag color="purple" style={{ marginTop: 4 }}>
                            Custom: {record.roleId.name}
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Company",
            dataIndex: "companyId",
            key: "companyId",
            render: (company: any) => (company ? company.name : "-"),
        },
        {
            title: "Status",
            dataIndex: "isActive",
            key: "isActive",
            render: (isActive: boolean) => (
                <Tag color={isActive ? "green" : "red"}>
                    {isActive ? "Active" : "Inactive"}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: User) => (
                <Dropdown menu={{ items: menu(record) }} trigger={["click"]}>
                    <MoreOutlined style={{ fontSize: 18, cursor: "pointer" }} />
                </Dropdown>
            ),
        },
    ];

    return (
        <MainLayout>
            <style>{`
                /* Header Container */
                .user-management-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                    gap: 16px;
                    width: 100%;
                }

                /* Title */
                .user-management-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                    padding: 0;
                    line-height: 40px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                }

                /* Controls Container */
                .user-management-controls {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    align-items: center;
                    flex: 1;
                    justify-content: flex-end;
                    min-width: 0;
                    width: 100%;
                }

                /* Search Input */
                .user-management-search {
                    height: 40px !important;
                    min-width: 200px;
                    max-width: 300px;
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                }
                .user-management-search .ant-input {
                    height: 40px !important;
                    line-height: 40px !important;
                    padding: 4px 11px 4px 32px !important;
                }
                .user-management-search .ant-input-affix-wrapper {
                    height: 40px !important;
                    display: flex;
                    align-items: center;
                }
                .user-management-search .anticon {
                    line-height: 1;
                    display: flex;
                    align-items: center;
                }

                /* Filter Selects */
                .user-management-filter {
                    height: 40px !important;
                    min-width: 150px;
                    max-width: 200px;
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                }
                .user-management-filter .ant-select {
                    height: 40px !important;
                    display: flex;
                    align-items: center;
                }
                .user-management-filter .ant-select-selector {
                    height: 40px !important;
                    display: flex;
                    align-items: center;
                }
                .user-management-filter .ant-select-selection-item,
                .user-management-filter .ant-select-selection-placeholder {
                    line-height: 40px !important;
                    display: flex;
                    align-items: center;
                }
                .user-management-filter .ant-select-selection-search {
                    height: 38px !important;
                    line-height: 38px !important;
                }

                /* Buttons */
                .user-management-button {
                    height: 40px !important;
                    padding: 0 22px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex-shrink: 0;
                    white-space: nowrap;
                    border-radius: 6px;
                    font-size: 14px;
                    line-height: 1.5715;
                }
                .user-management-button .anticon {
                    display: inline-flex;
                    align-items: center;
                }
                .user-management-button-primary {
                    background-color: #1DA54F !important;
                    border-color: #1DA54F !important;
                    font-weight: 600 !important;
                }
                .user-management-button-primary:hover,
                .user-management-button-primary:focus {
                    background-color: #189044 !important;
                    border-color: #189044 !important;
                }

                /* Responsive Design - Large Desktop */
                @media (min-width: 1400px) {
                    .user-management-search {
                        min-width: 260px;
                    }
                    .user-management-filter {
                        min-width: 180px;
                    }
                }

                /* Responsive Design - Desktop */
                @media (max-width: 1399px) and (min-width: 1201px) {
                    .user-management-search {
                        min-width: 220px;
                    }
                    .user-management-filter {
                        min-width: 160px;
                    }
                }

                /* Responsive Design - Small Desktop / Large Tablet */
                @media (max-width: 1200px) {
                    .user-management-header {
                        align-items: center;
                    }
                    .user-management-controls {
                        align-items: center;
                    }
                    .user-management-search {
                        min-width: 180px;
                        max-width: 250px;
                    }
                    .user-management-filter {
                        min-width: 140px;
                        max-width: 180px;
                    }
                }

                /* Responsive Design - Tablet */
                @media (max-width: 992px) {
                    .user-management-header {
                        flex-direction: row;
                        align-items: center;
                        gap: 12px;
                    }
                    .user-management-title {
                        margin-bottom: 0;
                        flex: 0 0 auto;
                        width: auto;
                    }
                    .user-management-controls {
                        justify-content: flex-end;
                        flex: 1;
                        min-width: 0;
                        align-items: center;
                    }
                    .user-management-search {
                        flex: 0 1 auto;
                        min-width: 180px;
                        max-width: 250px;
                    }
                    .user-management-filter {
                        flex: 0 0 auto;
                        min-width: 140px;
                        max-width: 180px;
                    }
                    .user-management-button {
                        flex: 0 0 auto;
                    }
                }

                /* Responsive Design - Small Tablet */
                @media (max-width: 768px) {
                    .user-management-header {
                        flex-direction: row;
                        align-items: center;
                        gap: 12px;
                    }
                    .user-management-title {
                        flex: 0 0 auto;
                        width: auto;
                        margin-bottom: 0;
                    }
                    .user-management-controls {
                        flex-direction: row;
                        flex-wrap: wrap;
                        justify-content: flex-end;
                        flex: 1;
                        min-width: 0;
                        align-items: center;
                    }
                    .user-management-search {
                        flex: 1 1 100%;
                        min-width: 100%;
                        max-width: 100%;
                        order: 1;
                    }
                    .user-management-filter {
                        flex: 1 1 calc(50% - 6px);
                        min-width: calc(50% - 6px);
                        max-width: calc(50% - 6px);
                        order: 2;
                    }
                    .user-management-button {
                        flex: 1 1 calc(50% - 6px);
                        min-width: calc(50% - 6px);
                        max-width: calc(50% - 6px);
                        order: 3;
                    }
                }

                /* Responsive Design - Mobile */
                @media (max-width: 576px) {
                    .user-management-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }
                    .user-management-title {
                        font-size: 1.25rem;
                        line-height: 32px;
                        width: 100%;
                        text-align: left;
                        margin-bottom: 0;
                    }
                    .user-management-controls {
                        flex-direction: column;
                        align-items: stretch;
                        width: 100%;
                        gap: 12px;
                    }
                    .user-management-search {
                        width: 100% !important;
                        min-width: 100% !important;
                        max-width: 100% !important;
                        flex: 1 1 100% !important;
                        order: 1;
                    }
                    .user-management-filter {
                        width: 100% !important;
                        min-width: 100% !important;
                        max-width: 100% !important;
                        flex: 1 1 100% !important;
                        order: 2;
                    }
                    .user-management-button {
                        width: 100% !important;
                        min-width: 100% !important;
                        max-width: 100% !important;
                        flex: 1 1 100% !important;
                        order: 3;
                    }
                }

                /* Extra Small Mobile */
                @media (max-width: 375px) {
                    .user-management-title {
                        font-size: 1.125rem;
                    }
                    .user-management-button {
                        padding: 0 16px !important;
                        font-size: 13px;
                    }
                }

                /* Table Responsive Styles */
                .user-management-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                /* Mobile Table Styles */
                @media (max-width: 768px) {
                    .user-management-table-wrapper {
                        overflow-x: auto;
                    }
                    
                    /* Hide less important columns on mobile */
                    .ant-table-thead > tr > th:nth-child(3),
                    .ant-table-tbody > tr > td:nth-child(3) {
                        display: none; /* Hide Phone column */
                    }
                    
                    .ant-table-thead > tr > th:nth-child(5),
                    .ant-table-tbody > tr > td:nth-child(5) {
                        display: none; /* Hide Company column */
                    }

                    /* Make table cells more compact */
                    .ant-table-thead > tr > th,
                    .ant-table-tbody > tr > td {
                        padding: 8px 12px !important;
                        font-size: 13px;
                    }

                    /* Adjust table layout */
                    .ant-table {
                        font-size: 13px;
                    }

                    .ant-table-thead > tr > th {
                        font-size: 12px;
                        font-weight: 600;
                    }
                }

                @media (max-width: 576px) {
                    /* Hide Phone and Company columns on small mobile */
                    .ant-table-thead > tr > th:nth-child(3),
                    .ant-table-tbody > tr > td:nth-child(3),
                    .ant-table-thead > tr > th:nth-child(5),
                    .ant-table-tbody > tr > td:nth-child(5) {
                        display: none;
                    }

                    /* Further reduce padding */
                    .ant-table-thead > tr > th,
                    .ant-table-tbody > tr > td {
                        padding: 6px 8px !important;
                        font-size: 12px;
                    }

                    /* Make Name column wider */
                    .ant-table-thead > tr > th:first-child,
                    .ant-table-tbody > tr > td:first-child {
                        min-width: 120px;
                    }

                    /* Compact Email column */
                    .ant-table-thead > tr > th:nth-child(2),
                    .ant-table-tbody > tr > td:nth-child(2) {
                        min-width: 150px;
                        max-width: 180px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    /* Compact Role column */
                    .ant-table-thead > tr > th:nth-child(4),
                    .ant-table-tbody > tr > td:nth-child(4) {
                        min-width: 100px;
                    }

                    /* Compact Status column */
                    .ant-table-thead > tr > th:nth-child(6),
                    .ant-table-tbody > tr > td:nth-child(6) {
                        min-width: 70px;
                    }

                    /* Compact Actions column */
                    .ant-table-thead > tr > th:last-child,
                    .ant-table-tbody > tr > td:last-child {
                        min-width: 50px;
                        text-align: center;
                    }

                    /* Pagination adjustments */
                    .ant-pagination {
                        margin: 16px 0 !important;
                    }

                    .ant-pagination-options {
                        display: none;
                    }
                }

                @media (max-width: 375px) {
                    /* Even more compact on extra small screens */
                    .ant-table-thead > tr > th,
                    .ant-table-tbody > tr > td {
                        padding: 4px 6px !important;
                        font-size: 11px;
                    }

                    .ant-table-thead > tr > th {
                        font-size: 11px;
                    }

                    /* Truncate long text */
                    .ant-table-tbody > tr > td {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
            `}</style>
            <div style={{ padding: 24 }}>
                {/* Header */}
                <div className="user-management-header">
                    {/* LEFT TITLE */}

                    {/* RIGHT → Search + Filter + Add */}
                    <div className="user-management-controls">
                        <Input
                            placeholder="Search by name / email"
                            allowClear
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            onPressEnter={() => refetchUsers()}
                            className="user-management-search"
                        />

                        <Select
                            allowClear
                            placeholder="Filter by Role"
                            className="user-management-filter"
                            onChange={(value) => {
                                setFilterRole(value);
                                setPage(1);
                            }}
                            loading={isLoadingRoles || isLoadingCustomRoles}
                        >
                            {roleOptions.map((r) => (
                                <Select.Option key={r.value} value={r.value}>
                                    {r.label}
                                </Select.Option>
                            ))}
                        </Select>

                        <Select
                            allowClear
                            placeholder="Filter by Status"
                            className="user-management-filter"
                            onChange={(value) => {
                                setFilterStatus(value);
                                setPage(1);
                            }}
                        >
                            <Select.Option value="true">Active</Select.Option>
                            <Select.Option value="false">Inactive</Select.Option>
                        </Select>

                        <Button
                            type="default"
                            onClick={() => navigate("/role-management")}
                            className="user-management-button"
                        >
                            Create Role
                        </Button>
                        {canCreate && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAdd}
                                className="user-management-button user-management-button-primary"
                            >
                                Add User
                            </Button>
                        )}
                    </div>
                </div>

                {/* USERS TABLE */}
                <Spin spinning={isLoadingUsers || isToggling || isDeleting}>
                    <div className="user-management-table-wrapper">
                        <Table
                            rowKey="_id"
                            dataSource={users}
                            columns={columns}
                            scroll={{ x: 'max-content' }}
                            size={windowWidth <= 576 ? 'small' : undefined}
                            pagination={{
                                current: page,
                                pageSize: limit,
                                total: pagination.total,
                                showSizeChanger: false,
                                showTotal: (total, range) => 
                                    windowWidth <= 576 
                                        ? `${range[0]}-${range[1]} of ${total}`
                                        : `Total ${total} users`,
                                onChange: (page) => setPage(page),
                                simple: windowWidth <= 576,
                            }}
                        />
                    </div>
                </Spin>

                {/* ADD / EDIT USER MODAL */}
                <Modal
                    title={editingUser ? "Edit User" : "Add User"}
                    open={showModal}
                    onCancel={() => {
                        setShowModal(false);
                        form.resetFields();
                        setEditingUser(null);
                    }}
                    onOk={handleSubmit}
                    okText={editingUser ? "Update User" : "Create User"}
                    confirmLoading={isCreating || isUpdating}
                    width={editingUser ? 900 : 600}
                >
                    <Form layout="vertical" form={form}>
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: "Enter name" }]}
                        >
                            <Input placeholder="Enter name" />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: "Email is required" },
                                { type: "email", message: "Please enter a valid email address" },
                            ]}
                        >
                            <Input placeholder="Enter email" disabled={!!editingUser} />
                        </Form.Item>

                        {editingUser && (
                            <>
                                <Form.Item
                                    label="Password"
                                    name="password"
                                    rules={[
                                        { min: 8, message: "Password must be at least 8 characters" },
                                    ]}
                                    tooltip="A password is already set for this user. Leave blank to keep the current password, or enter a new password to change it."
                                    help="Leave blank to keep current password • Enter new password to change it"
                                >
                                    <Input.Password 
                                        placeholder="•••••••• (Password is set - enter new password to change)" 
                                        allowClear
                                    />
                                </Form.Item>
                                <div style={{ 
                                    marginTop: -16, 
                                    marginBottom: 16, 
                                    padding: '8px 12px', 
                                    backgroundColor: '#f0f0f0', 
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    color: '#666'
                                }}>
                                    <strong>Note:</strong> For security reasons, existing passwords cannot be displayed. 
                                    The current password will remain unchanged if you leave this field blank.
                                </div>
                            </>
                        )}

                        {!editingUser && (
                            <>
                                <Form.Item
                                    label="Password"
                                    name="password"
                                    rules={[
                                        { required: true, message: "Password is required" },
                                        { min: 8, message: "Password must be at least 8 characters" },
                                    ]}
                                >
                                    <Input.Password placeholder="Enter password" />
                                </Form.Item>

                                <Form.Item
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    dependencies={["password"]}
                                    rules={[
                                        { required: true, message: "Please confirm your password" },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue("password") === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(
                                                    new Error("Passwords do not match")
                                                );
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password placeholder="Confirm password" />
                                </Form.Item>
                            </>
                        )}

                        <Form.Item
                            label="Country Code"
                            name="countryCode"
                            rules={[{ required: true, message: "Country code is required" }]}
                        >
                            <Select
                                value={selectedCountryCode}
                                onSelect={(value) => {
                                    setSelectedCountryCode(value);
                                    form.setFieldValue('countryCode', value);
                                    // Trigger phone validation when country code changes
                                    form.validateFields(['phone']);
                                }}
                                placeholder="Select country code"
                                showSearch
                                filterOption={(input, option) => {
                                    const label = option?.children || option?.label || '';
                                    return String(label).toLowerCase().includes(input.toLowerCase());
                                }}
                                optionFilterProp="children"
                            >
                                {countryOptions.map((option) => (
                                    <Select.Option key={option.value} value={option.value}>
                                        {option.label}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Phone Number"
                            name="phone"
                            dependencies={['countryCode']}
                            rules={[
                                { required: true, message: "Phone number is required" },
                                { pattern: /^[0-9]+$/, message: "Phone number must contain only digits" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value) {
                                            return Promise.resolve();
                                        }
                                        const countryCode = getFieldValue('countryCode') || selectedCountryCode;
                                        if (!countryCode) {
                                            return Promise.resolve();
                                        }
                                        
                                        const isValid = phoneUtils.validateMobileNumber(countryCode, value);
                                        if (isValid) {
                                            return Promise.resolve();
                                        }
                                        
                                        const limits = phoneUtils.getLimits(countryCode);
                                        if (limits) {
                                            return Promise.reject(
                                                new Error(`Phone number must be between ${limits.min} and ${limits.max} digits for this country code`)
                                            );
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input 
                                placeholder="Enter phone number" 
                                onChange={(e) => {
                                    // Only allow digits
                                    const value = e.target.value.replace(/\D/g, '');
                                    form.setFieldValue('phone', value);
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Role"
                            name="role"
                            rules={[{ required: true, message: "Role is required" }]}
                        >
                            <Select 
                                placeholder="Select role" 
                                loading={isLoadingRoles}
                                disabled={editingUser?.role === 'Candidate'}
                                onChange={(value) => {
                                    // When role changes, check if it's a custom role and auto-populate permissions
                                    if (value) {
                                        // Find the role in roles data (includes both system and custom roles)
                                        const selectedRole = roles.find((r: any) => r.name === value);
                                        
                                        // If it's a custom role (has _id and is not a system role), use its permissions
                                        const roleId = (selectedRole as any)?._id;
                                        if (roleId && !selectedRole?.isSystemRole && selectedRole?.permissions) {
                                            // Auto-populate permissions from the selected custom role
                                            form.setFieldsValue({ 
                                                roleId: roleId,
                                                permissions: selectedRole.permissions
                                            });
                                        } else {
                                            // For system roles, clear custom role and permissions
                                            form.setFieldsValue({ 
                                                roleId: undefined,
                                                permissions: []
                                            });
                                        }
                                    } else {
                                        form.setFieldsValue({ 
                                            roleId: undefined,
                                            permissions: []
                                        });
                                    }
                                }}
                            >
                                {roleOptions
                                    .filter((r) => r.value !== 'Candidate') // Remove Candidate from role options
                                    .map((r) => (
                                        <Select.Option key={r.value} value={r.value}>
                                            {r.label}
                                        </Select.Option>
                                    ))}
                            </Select>
                        </Form.Item>
                        {editingUser?.role === 'Candidate' && (
                            <div style={{ marginTop: -16, marginBottom: 16 }}>
                                <span style={{ color: '#ff9800', fontSize: '12px' }}>
                                    Note: Candidate role cannot be changed. Please use Candidate Management to edit candidate details.
                                </span>
                            </div>
                        )}

                        {/* Custom Role Assignment (only for customizable roles) */}
                        {(form.getFieldValue("role") === "Manager" || 
                          form.getFieldValue("role") === "Team Leader" || 
                          form.getFieldValue("role") === "Employee") && (
                            <Form.Item
                                label="Custom Role (Optional)"
                                name="roleId"
                                tooltip="Assign a custom role to override default permissions for this user"
                            >
                                <Select 
                                    placeholder="Select custom role (optional)" 
                                    allowClear
                                    loading={isLoadingCustomRoles}
                                    onChange={async (value) => {
                                        // When custom role changes, fetch and update permissions
                                        if (value && customRolesData?.data?.roles) {
                                            const selectedRole = customRolesData.data.roles.find(r => r._id === value);
                                            if (selectedRole?.permissions) {
                                                // Auto-populate permissions from the selected custom role
                                                form.setFieldsValue({ permissions: selectedRole.permissions });
                                            }
                                        } else {
                                            // Clear permissions when custom role is cleared
                                            form.setFieldsValue({ permissions: [] });
                                        }
                                    }}
                                >
                                    {customRoleOptions.map((r) => (
                                        <Select.Option key={r.value} value={r.value}>
                                            {r.label}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}

                        {/* Permissions Section - Show when editing any user (including candidates) */}
                        {editingUser && roleConfigData?.data && (
                            <Form.Item
                                label="Permissions"
                                name="permissions"
                                tooltip={editingUser.role === 'Candidate' 
                                    ? "Manage permissions for this candidate. These permissions will override the default candidate permissions."
                                    : "Permissions are inherited from the assigned custom role. You can modify them here or edit the role in Role Management."}
                            >
                                <div style={{ 
                                    border: '1px solid #d9d9d9', 
                                    borderRadius: '6px', 
                                    padding: '16px',
                                    backgroundColor: '#fafafa'
                                }}>
                                    <Spin spinning={isLoadingRoleConfig || isLoadingUserRole}>
                                        <PermissionMatrix
                                            modules={roleConfigData.data.modules || []}
                                            actions={roleConfigData.data.actions || []}
                                            value={form.getFieldValue("permissions") || []}
                                            onChange={(permissions) => {
                                                form.setFieldsValue({ permissions });
                                            }}
                                            disabled={false} // Enabled - allow editing permissions for all users including candidates
                                        />
                                    </Spin>
                                    <div style={{ 
                                        marginTop: '12px', 
                                        padding: '8px 12px', 
                                        backgroundColor: '#fff3cd', 
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#856404'
                                    }}>
                                        {editingUser.role !== 'Candidate' && (
                                            <>
                                                <strong>Note:</strong> Permissions can be managed here or by editing the custom role in <a href="/role-management" onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate('/role-management');
                                                }}>Role Management</a>.
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Form.Item>
                        )}
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
};

export default UserManagement;
