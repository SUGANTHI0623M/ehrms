import React, { useState, useEffect, useMemo } from "react";
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
    Tag,
    Spin,
    Card,
    Checkbox,
    Divider,
    Collapse,
} from "antd";
import { PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, PoweroffOutlined, SearchOutlined } from "@ant-design/icons";
import {
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useToggleUserStatusMutation,
    useDeleteUserMutation,
    type User,
} from "@/store/api/userApi";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useNavigate } from "react-router-dom";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";
import { setCredentials } from "@/store/slices/authSlice";
import { useGetCurrentUserQuery } from "@/store/api/authApi";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";

// Static roles - only 4 roles
const STATIC_ROLES = ['Employee', 'Candidate'] as const;

// Permission Matrix Component
interface PermissionMatrixProps {
    value?: string[];
    onChange?: (value: string[]) => void;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ value = [], onChange }) => {
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    
    const handleParentChange = (module: string, checked: boolean) => {
        const menu = ADMIN_SIDEBAR_MENUS[module];
        if (!menu) return;
        
        let newValue = [...value];
        
        if (checked) {
            // Add parent module (for backward compatibility and full access)
            if (!newValue.includes(module)) {
                newValue.push(module);
            }
            // Also add all sub-modules for granular control
            if (menu.subModules) {
                menu.subModules.forEach(sub => {
                    if (!newValue.includes(sub.module)) {
                        newValue.push(sub.module);
                    }
                });
            }
            // Expand the module
            setExpandedModules(prev => new Set(prev).add(module));
        } else {
            // Remove parent module
            newValue = newValue.filter(v => v !== module);
            // Remove all sub-modules
            if (menu.subModules) {
                menu.subModules.forEach(sub => {
                    newValue = newValue.filter(v => v !== sub.module);
                });
            }
            // Collapse the module
            setExpandedModules(prev => {
                const next = new Set(prev);
                next.delete(module);
                return next;
            });
        }
        
        onChange?.(newValue);
    };
    
    const handleSubModuleChange = (parentModule: string, subModule: string, checked: boolean) => {
        let newValue = [...value];
        
        if (checked) {
            // Add sub-module
            if (!newValue.includes(subModule)) {
                newValue.push(subModule);
            }
            // Check if all sub-modules are selected, then auto-select parent for full access
            const menu = ADMIN_SIDEBAR_MENUS[parentModule];
            if (menu?.subModules) {
                const allSubModulesSelected = menu.subModules.every(sub => 
                    newValue.includes(sub.module) || sub.module === subModule
                );
                if (allSubModulesSelected && !newValue.includes(parentModule)) {
                    newValue.push(parentModule);
                }
            }
        } else {
            // Remove sub-module
            newValue = newValue.filter(v => v !== subModule);
            // Remove parent if sub-module is deselected (to maintain consistency)
            newValue = newValue.filter(v => v !== parentModule);
        }
        
        onChange?.(newValue);
    };
    
    const toggleExpand = (module: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(module)) {
                next.delete(module);
            } else {
                next.add(module);
            }
            return next;
        });
    };
    
    return (
        <div style={{ width: '100%', marginTop: 8 }}>
            {Object.entries(ADMIN_SIDEBAR_MENUS).map(([module, menu]) => {
                const isParentSelected = value.includes(module);
                const isExpanded = expandedModules.has(module);
                const subModulesSelected = menu.subModules?.filter(sub => value.includes(sub.module)).length || 0;
                const totalSubModules = menu.subModules?.length || 0;
                
                return (
                    <div key={module} style={{ marginBottom: 12, border: '1px solid #d9d9d9', borderRadius: 4, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Checkbox
                                checked={isParentSelected}
                                indeterminate={!isParentSelected && subModulesSelected > 0 && subModulesSelected < totalSubModules}
                                onChange={(e) => handleParentChange(module, e.target.checked)}
                            >
                                <strong>{menu.label}</strong>
                                {subModulesSelected > 0 && !isParentSelected && (
                                    <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
                                        ({subModulesSelected}/{totalSubModules} selected)
                                    </span>
                                )}
                            </Checkbox>
                            {menu.subModules && menu.subModules.length > 0 && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => toggleExpand(module)}
                                    style={{ padding: 0, height: 'auto', marginLeft: 'auto' }}
                                >
                                    {isExpanded ? 'Hide' : 'Show'} Sub-modules
                                </Button>
                            )}
                        </div>
                        
                        {isExpanded && menu.subModules && menu.subModules.length > 0 && (
                            <div style={{ marginTop: 12, marginLeft: 24, paddingLeft: 16, borderLeft: '2px solid #e8e8e8' }}>
                                {menu.subModules.map((sub) => (
                                    <div key={sub.module} style={{ marginBottom: 8 }}>
                                        <Checkbox
                                            checked={value.includes(sub.module)}
                                            onChange={(e) => handleSubModuleChange(module, sub.module, e.target.checked)}
                                        >
                                            {sub.label}
                                        </Checkbox>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Employee sub-roles (designations)
const EMPLOYEE_SUB_ROLES = ['Senior HR', 'Junior HR', 'Manager'] as const;

// Admin sidebar menu items with their sub-modules
const ADMIN_SIDEBAR_MENUS: Record<string, { label: string; subModules?: Array<{ module: string; label: string }> }> = {
    'interview': {
        label: 'Interview',
        subModules: [
            { module: 'job_openings', label: 'Job Openings' },
            { module: 'candidates', label: 'Candidates' },
            { module: 'interview_appointments', label: 'Interview Appointments' },
            { module: 'interview_process', label: 'Interview Process' },
            { module: 'offer_letter', label: 'Offer Letter' },
            { module: 'document_collection', label: 'Document Collection' },
            { module: 'background_verification', label: 'Background Verification' },
            { module: 'refer_candidate', label: 'Refer a Candidate' },
        ]
    },
    'staff': {
        label: 'Staff',
        subModules: [
            { module: 'staff_overview', label: 'Staff Overview' },
            { module: 'salary_overview', label: 'Salary Overview' },
            { module: 'salary_structure', label: 'Salary Structure' },
            { module: 'attendance', label: 'Attendance' },
            { module: 'leaves_approval', label: 'Leaves Pending Approval' },
            { module: 'loans', label: 'Loans' },
            { module: 'expense_claims', label: 'Expense Claims' },
            { module: 'payslip_requests', label: 'Payslip Requests' },
        ]
    },
    'performance': {
        label: 'Performance',
        subModules: [
            { module: 'performance_overview', label: 'Performance Overview' },
            { module: 'performance_analytics', label: 'Performance Analytics' },
            { module: 'performance_reviews', label: 'Performance Reviews' },
            { module: 'review_cycles', label: 'Review Cycles' },
            { module: 'manager_review', label: 'Manager Review' },
            { module: 'hr_review', label: 'HR Review' },
            { module: 'goals_management', label: 'Goals Management' },
            { module: 'kra_kpi', label: 'KRA / KPI' },
            { module: 'pms_reports', label: 'PMS Reports' },
            { module: 'pms_settings', label: 'PMS Settings' },
        ]
    },
    'payroll': {
        label: 'Payroll',
        subModules: [
            { module: 'payroll_management', label: 'Payroll Management' },
        ]
    },
    'hrms-geo': {
        label: 'HRMS Geo',
        subModules: [
            { module: 'hrms_geo_dashboard', label: 'Dashboard' },
            { module: 'tracking', label: 'Tracking' },
            { module: 'forms', label: 'Forms' },
            { module: 'tasks', label: 'Tasks' },
            { module: 'customers', label: 'Customers' },
            { module: 'geo_settings', label: 'Geo Settings' },
        ]
    },
    'lms': {
        label: 'LMS',
        subModules: [
            { module: 'course_library', label: 'Course Library' },
            { module: 'live_session', label: 'Live Session' },
            { module: 'quiz_generator', label: 'Auto Quiz Generator' },
            { module: 'assessment', label: 'Quiz / Assessment' },
            { module: 'score_analytics', label: 'Score / Analytics' },
        ]
    },
    'assets': {
        label: 'Asset Management',
        subModules: [
            { module: 'assets_type', label: 'Assets Type' },
            { module: 'assets', label: 'Assets' },
        ]
    },
    'integrations': {
        label: 'Integrations',
        subModules: [
            { module: 'all_integrations', label: 'All Integrations' },
            { module: 'exotel', label: 'Exotel' },
            { module: 'email', label: 'Email' },
            { module: 'google_calendar', label: 'Google Calendar' },
            { module: 'sms', label: 'SMS' },
            { module: 'rcs', label: 'RCS' },
            { module: 'voice', label: 'Voice' },
        ]
    },
    'settings': {
        label: 'Settings',
        subModules: [
            { module: 'user_management', label: 'User Management' },
            { module: 'attendance_settings', label: 'Attendance Settings' },
            { module: 'business_settings', label: 'Business Settings' },
            { module: 'payroll_settings', label: 'Payroll Settings' },
            { module: 'business_info', label: 'Business Info' },
            { module: 'company_policy', label: 'Company Policy' },
            { module: 'onboarding_documents', label: 'Onboarding Documents' },
            { module: 'others', label: 'Others' },
        ]
    },
};

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.auth.user);
    const { refetch: refetchCurrentUser } = useGetCurrentUserQuery();
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
    // Super Admin and Admin always have access
    // Employees with settings or user_management in sidebarPermissions also have access
    const canAccess = useMemo(() => {
        if (!currentUser) return false;
        
        // Super Admin and Admin always have access
        if (currentUser.role === "Super Admin" || currentUser.role === "Admin") {
            return true;
        }
        
        // For Employees, check sidebarPermissions
        if (currentUser.role === "Employee") {
            const sidebarPerms = (currentUser as any).sidebarPermissions || [];
            
            // Check if employee has 'settings' or 'user_management' permission
            const hasSettingsPermission = sidebarPerms.includes('settings') || 
                                         sidebarPerms.includes('user_management');
            
            if (hasSettingsPermission) {
                return true;
            }
        }
        
        // Check if user has 'users' module permission via getUserPermissions
        const userPermissions = getUserPermissions(
            currentUser.role,
            typeof currentUser.roleId === 'object' ? currentUser.roleId : null,
            currentUser.permissions || [],
            (currentUser as any).sidebarPermissions || []
        );
        
        // Check if user has read/view permission for 'users' or 'settings' module
        const hasUsersPermission = hasAction(userPermissions, 'users', 'read') || 
                                   hasAction(userPermissions, 'users', 'view') ||
                                   hasAction(userPermissions, 'settings', 'read') || 
                                   hasAction(userPermissions, 'settings', 'view');
        
        return hasUsersPermission;
    }, [currentUser]);
    
    const canCreate = useMemo(() => {
        return canAccess && (currentUser?.role === "Super Admin" || currentUser?.role === "Admin");
    }, [canAccess, currentUser?.role]);
    
    const canUpdate = canAccess;
    
    const canDelete = useMemo(() => {
        return canAccess && (currentUser?.role === "Super Admin" || currentUser?.role === "Admin");
    }, [canAccess, currentUser?.role]);

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

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [toggleStatus, { isLoading: isToggling }] = useToggleUserStatusMutation();
    const [deleteUserMutation, { isLoading: isDeleting }] = useDeleteUserMutation();

    // Extract users and pagination
    const users = usersData?.data?.users || [];
    const pagination = usersData?.data?.pagination || { total: 0, pages: 1 };

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        form.setFieldsValue({
            role: undefined,
            subRole: undefined,
            sidebarPermissions: [],
        });
        setShowModal(true);
    };

    const handleEdit = (record: User) => {
        setEditingUser(record);
        const countryCode = record.countryCode || "91";
        setSelectedCountryCode(countryCode);
        
        form.setFieldsValue({
            name: record.name,
            email: record.email,
            phone: record.phone || "",
            countryCode: countryCode,
            role: record.role,
            subRole: record.subRole || undefined,
            sidebarPermissions: record.sidebarPermissions || [],
            password: undefined,
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
                // UPDATE
                const updateData: any = {
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    countryCode: values.countryCode || selectedCountryCode,
                    role: values.role,
                    subRole: values.role === 'Employee' ? (values.subRole || undefined) : undefined,
                    sidebarPermissions: values.role === 'Employee' ? (values.sidebarPermissions || []) : [],
                };
                
                // Only include password if provided and not empty
                if (values.password && values.password.trim() && values.password.trim().length > 0) {
                    updateData.password = values.password.trim();
                }
                
                const result = await updateUser({
                    id: editingUser._id,
                    data: updateData,
                }).unwrap();
                message.success("User updated successfully");
                
                // If the updated user is the current user, refresh their data in Redux
                if (currentUser && editingUser._id === currentUser.id) {
                    try {
                        const { data: userData } = await refetchCurrentUser();
                        if (userData?.success && userData?.data?.user) {
                            const token = localStorage.getItem('token');
                            if (token) {
                                // Type assertion needed due to different User types
                                dispatch(setCredentials({ user: userData.data.user as any, token }));
                            }
                        }
                    } catch (error) {
                        console.error('Failed to refresh current user data:', error);
                    }
                }
            } else {
                // CREATE
                await createUser({
                    email: values.email,
                    password: values.password,
                    name: values.name,
                    phone: values.phone || undefined,
                    countryCode: values.countryCode || selectedCountryCode,
                    role: values.role,
                    subRole: values.role === 'Employee' ? (values.subRole || undefined) : undefined,
                    sidebarPermissions: values.role === 'Employee' ? (values.sidebarPermissions || []) : [],
                }).unwrap();
                message.success("User created successfully");
            }

            setShowModal(false);
            form.resetFields();
            setSelectedCountryCode("91");
            refetchUsers();
        } catch (error: any) {
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

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Super Admin': return 'red';
            case 'Admin': return 'blue';
            case 'Employee': return 'green';
            case 'Candidate': return 'orange';
            default: return 'default';
        }
    };

    const getSubRoleColor = (subRole?: string) => {
        switch (subRole) {
            case 'Senior HR': return 'purple';
            case 'Junior HR': return 'cyan';
            case 'Manager': return 'gold';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            width: 200,
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            width: 250,
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
            width: 150,
            render: (phone: string) => phone || "-",
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            width: 180,
            render: (role: string, record: User) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Tag color={getRoleColor(role)} style={{ margin: 0 }}>
                        {role}
                    </Tag>
                    {record.role === 'Employee' && record.subRole && (
                        <Tag color={getSubRoleColor(record.subRole)} style={{ margin: 0 }}>
                            {record.subRole}
                        </Tag>
                    )}
                    {record.role === 'Employee' && record.sidebarPermissions && record.sidebarPermissions.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: 2 }}>
                            {record.sidebarPermissions.length} admin menu{record.sidebarPermissions.length > 1 ? 's' : ''}
                        </div>
                    )}
                </Space>
            ),
        },
        {
            title: "Company",
            dataIndex: "companyId",
            key: "companyId",
            width: 150,
            render: (company: any) => (company ? company.name : "-"),
        },
        {
            title: "Status",
            dataIndex: "isActive",
            key: "isActive",
            width: 100,
            render: (isActive: boolean) => (
                <Tag color={isActive ? "green" : "red"}>
                    {isActive ? "Active" : "Inactive"}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 80,
            fixed: 'right' as const,
            render: (_: unknown, record: User) => (
                <Dropdown menu={{ items: menu(record) }} trigger={["click"]}>
                    <MoreOutlined style={{ fontSize: 18, cursor: "pointer" }} />
                </Dropdown>
            ),
        },
    ];

    const selectedRole = Form.useWatch('role', form);

    return (
        <MainLayout>
            <div style={{ padding: 24 }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 16
                }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>User Management</h1>
                    
                    <Space size="middle" wrap>
                        <Input
                            placeholder="Search by name / email"
                            allowClear
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            onPressEnter={() => refetchUsers()}
                            style={{ width: 250 }}
                        />

                        <Select
                            allowClear
                            placeholder="Filter by Role"
                            style={{ width: 150 }}
                            onChange={(value) => {
                                setFilterRole(value);
                                setPage(1);
                            }}
                        >
                            {STATIC_ROLES.map((role) => (
                                <Select.Option key={role} value={role}>
                                    {role}
                                </Select.Option>
                            ))}
                        </Select>

                        <Select
                            allowClear
                            placeholder="Filter by Status"
                            style={{ width: 150 }}
                            onChange={(value) => {
                                setFilterStatus(value);
                                setPage(1);
                            }}
                        >
                            <Select.Option value="true">Active</Select.Option>
                            <Select.Option value="false">Inactive</Select.Option>
                        </Select>

                        {canCreate && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleAdd}
                                style={{ background: '#1DA54F', borderColor: '#1DA54F' }}
                            >
                                Add User
                            </Button>
                        )}
                    </Space>
                </div>

                {/* Users Table */}
                <Card>
                    <Spin spinning={isLoadingUsers || isToggling || isDeleting}>
                        <Table
                            rowKey="_id"
                            dataSource={users}
                            columns={columns}
                            scroll={{ x: 'max-content' }}
                            size={windowWidth <= 576 ? 'small' : 'middle'}
                            pagination={{
                                current: page,
                                pageSize: limit,
                                total: pagination.total,
                                showSizeChanger: false,
                                showTotal: (total, range) => 
                                    windowWidth <= 576 
                                        ? `${range[0]}-${range[1]} of ${total}`
                                        : `Showing ${range[0]}-${range[1]} of ${total} users`,
                                onChange: (page) => setPage(page),
                                simple: windowWidth <= 576,
                            }}
                        />
                    </Spin>
                </Card>

                {/* Add / Edit User Modal */}
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
                    width={700}
                    style={{ top: 20 }}
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
                            <Form.Item
                                label="Password"
                                name="password"
                                rules={[
                                    { min: 8, message: "Password must be at least 8 characters" },
                                ]}
                                tooltip="Leave blank to keep the current password, or enter a new password to change it."
                                help="Leave blank to keep current password"
                            >
                                <Input.Password 
                                    placeholder="Enter new password to change" 
                                    allowClear
                                />
                            </Form.Item>
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
                                onChange={(value) => {
                                    // Clear sub-role and sidebar permissions if role changes
                                    if (value !== 'Employee') {
                                        form.setFieldsValue({ 
                                            subRole: undefined,
                                            sidebarPermissions: []
                                        });
                                    }
                                }}
                            >
                                {STATIC_ROLES.map((role) => (
                                    <Select.Option key={role} value={role}>
                                        {role}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        {/* Employee Sub-Role and Sidebar Permissions */}
                        {selectedRole === 'Employee' && (
                            <>
                                <Form.Item
                                    label="Designation (Optional)"
                                    name="subRole"
                                    tooltip="Optional designation for this employee. This helps identify their level and responsibilities."
                                >
                                    <Select 
                                        placeholder="Select designation (optional)"
                                        allowClear
                                    >
                                        {EMPLOYEE_SUB_ROLES.map((subRole) => (
                                            <Select.Option key={subRole} value={subRole}>
                                                {subRole}
                                            </Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    label="Admin Menu Access"
                                    name="sidebarPermissions"
                                    tooltip="Select which admin menu items this employee can access in addition to their employee dashboard. Select parent modules to grant access to all sub-modules, or select specific sub-modules for granular control."
                                >
                                    <PermissionMatrix />
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
};

export default UserManagement;
