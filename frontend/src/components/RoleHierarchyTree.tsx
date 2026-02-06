import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Spin, Select, Input } from 'antd';
import { 
  ApartmentOutlined, 
  ArrowDownOutlined,
  ArrowUpOutlined,
  EditOutlined
} from '@ant-design/icons';
import {
  useGetRoleHierarchyQuery,
  useGetRolesQuery,
  useUpdateRoleHierarchyMutation,
  useMoveRoleInHierarchyMutation,
  type RoleHierarchyNode,
} from '@/store/api/roleApi';

interface RoleHierarchyTreeProps {
  onClose?: () => void;
}

const RoleHierarchyTree: React.FC<RoleHierarchyTreeProps> = ({ onClose }) => {
  const { data, isLoading, refetch } = useGetRoleHierarchyQuery();
  const { data: rolesData } = useGetRolesQuery();
  const [updateHierarchy] = useUpdateRoleHierarchyMutation();
  const [moveRole] = useMoveRoleInHierarchyMutation();
  const [hierarchy, setHierarchy] = useState<RoleHierarchyNode[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);

  const allRoles = rolesData?.data?.roles || [];

  useEffect(() => {
    if (data?.data?.hierarchy) {
      setHierarchy(data.data.hierarchy);
    }
  }, [data]);

  const handleMoveRole = async (roleId: string, targetParentId: string | null, newLevel: number) => {
    try {
      await moveRole({
        id: roleId,
        newParentId: targetParentId,
        newLevel: newLevel,
        newOrder: 0,
      }).unwrap();

      message.success('Role moved successfully');
      refetch();
      setEditingRole(null);
      setNewParentId(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || 'Failed to move role');
    }
  };

  const handleUpdateHierarchy = async (roleId: string, parentId: string | null, level: number) => {
    try {
      await updateHierarchy({
        roleId,
        parentRoleId: parentId,
        hierarchyLevel: level,
      }).unwrap();

      message.success('Hierarchy updated successfully');
      refetch();
      setEditingRole(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || 'Failed to update hierarchy');
    }
  };

  const renderNode = (node: RoleHierarchyNode, level: number = 0): React.ReactNode => {
    const indent = level * 32;
    const isEditing = editingRole === node._id;
    const availableParents = allRoles.filter(r => r._id && r._id !== node._id);
    
    return (
      <div key={node._id} className="mb-3">
        <Card
          size="small"
          className="shadow-sm hover:shadow-md transition-shadow"
          style={{ marginLeft: `${indent}px` }}
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ApartmentOutlined className="text-blue-500" />
                <span className="font-semibold">{node.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  Level {node.hierarchyLevel}
                </span>
              </div>
              <Space>
                {!isEditing ? (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingRole(node._id);
                      setNewParentId(node.parentRoleId || null);
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <Space>
                    <Select
                      size="small"
                      style={{ width: 200 }}
                      placeholder="Select parent role"
                      value={newParentId}
                      onChange={setNewParentId}
                      allowClear
                    >
                      {availableParents.map(role => (
                        <Select.Option key={role._id} value={role._id || ''}>
                          {role.name}
                        </Select.Option>
                      ))}
                    </Select>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        if (newParentId !== node.parentRoleId) {
                          const parentRole = allRoles.find(r => r._id === newParentId);
                          const newLevel = parentRole ? (node.hierarchyLevel + 1) : 0;
                          handleUpdateHierarchy(node._id, newParentId, newLevel);
                        } else {
                          setEditingRole(null);
                        }
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingRole(null);
                        setNewParentId(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </Space>
                )}
              </Space>
            </div>
          }
        >
          {node.children && node.children.length > 0 && (
            <div className="mt-3 ml-6 border-l-2 border-blue-300 pl-4">
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Spin size="large" />
        <p className="mt-4 text-muted-foreground">Loading hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <h3 className="font-semibold text-lg">Organizational Hierarchy</h3>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop roles to reorganize the hierarchy. Higher levels can view data from lower levels.
          </p>
        </div>
        <Space>
          <Button onClick={() => refetch()}>Refresh</Button>
          {onClose && <Button onClick={onClose}>Close</Button>}
        </Space>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
        {hierarchy.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ApartmentOutlined className="text-4xl mb-4 text-gray-300" />
            <p className="font-medium">No hierarchy defined yet.</p>
            <p className="text-sm mt-1">Create roles and assign them to the hierarchy.</p>
          </div>
        ) : (
          hierarchy.map(node => renderNode(node))
        )}
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold mb-2">Hierarchy Rules:</h4>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Higher level roles can view data from all lower level roles</li>
          <li>• Lower level roles can only view their own data or direct reports</li>
          <li>• Drag roles to change reporting structure</li>
          <li>• Changes take effect immediately after saving</li>
        </ul>
      </div>
    </div>
  );
};

export default RoleHierarchyTree;

