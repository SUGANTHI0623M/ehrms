import React, { useEffect } from 'react';
import { Checkbox, Card, Button, Space } from 'antd';
import { CheckSquareOutlined, BorderOutlined } from '@ant-design/icons';

interface PermissionMatrixProps {
  modules: string[];
  actions: string[];
  value?: Array<{ module: string; actions: string[] }>;
  onChange?: (permissions: Array<{ module: string; actions: string[] }>) => void;
  disabled?: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  modules,
  actions,
  value = [],
  onChange,
  disabled = false,
}) => {
  // Initialize permissions - ensure all modules are present
  const permissions = React.useMemo(() => {
    if (!modules || modules.length === 0) {
      return [];
    }

    // If value is provided and has data, use it but ensure all modules are included
    if (value && value.length > 0) {
      const valueMap = new Map(value.map(p => [p.module, p.actions || []]));
      return modules.map(module => ({
        module,
        actions: valueMap.get(module) || []
      }));
    }

    // Otherwise, initialize with empty actions for all modules
    return modules.map(module => ({ module, actions: [] }));
  }, [modules, value]);

  // Sync with form when modules change - initialize if needed
  useEffect(() => {
    if (modules.length > 0) {
      const currentValue = value || [];
      
      // Check if we need to initialize
      if (currentValue.length === 0) {
        const initialPermissions = modules.map(module => ({ module, actions: [] }));
        onChange?.(initialPermissions);
        return;
      }

      // Check for missing modules
      const currentModules = new Set(currentValue.map((p: any) => p?.module).filter(Boolean));
      const missingModules = modules.filter(m => !currentModules.has(m));
      
      if (missingModules.length > 0) {
        const updatedPermissions = [
          ...currentValue,
          ...missingModules.map(module => ({ module, actions: [] }))
        ];
        onChange?.(updatedPermissions);
      }
    }
  }, [modules.length]); // Only depend on modules length to avoid infinite loops

  const handleActionChange = (module: string, action: string, checked: boolean) => {
    const updatedPermissions = permissions.map(p => {
      if (p.module === module) {
        const currentActions = p.actions || [];
        const newActions = checked
          ? [...currentActions, action].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
          : currentActions.filter(a => a !== action);
        return { ...p, actions: newActions };
      }
      return p;
    });
    onChange?.(updatedPermissions);
  };

  const handleModuleSelectAll = (module: string, checked: boolean) => {
    const updatedPermissions = permissions.map(p => {
      if (p.module === module) {
        return { ...p, actions: checked ? [...actions] : [] };
      }
      return p;
    });
    onChange?.(updatedPermissions);
  };

  const handleGlobalSelectAll = (checked: boolean) => {
    const updatedPermissions = modules.map(module => ({
      module,
      actions: checked ? [...actions] : []
    }));
    onChange?.(updatedPermissions);
  };

  const handleGlobalRemoveAll = () => {
    const updatedPermissions = modules.map(module => ({
      module,
      actions: []
    }));
    onChange?.(updatedPermissions);
  };

  const getModuleDisplayName = (module: string) => {
    return module
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionDisplayName = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/-/g, ' ');
  };

  const isModuleAllSelected = (module: string) => {
    const permission = permissions.find(p => p.module === module);
    return permission?.actions?.length === actions.length;
  };

  const isModulePartiallySelected = (module: string) => {
    const permission = permissions.find(p => p.module === module);
    return (permission?.actions?.length || 0) > 0 && (permission?.actions?.length || 0) < actions.length;
  };

  const isGlobalAllSelected = () => {
    return permissions.every(p => p.actions?.length === actions.length);
  };

  const hasAnyPermissions = () => {
    return permissions.some(p => (p.actions?.length || 0) > 0);
  };

  return (
    <div className="space-y-4">
      {/* Global Controls */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">Global Controls:</span>
        </div>
        <Space>
          <Button
            type="default"
            icon={<CheckSquareOutlined />}
            onClick={() => handleGlobalSelectAll(true)}
            disabled={disabled || isGlobalAllSelected()}
            size="small"
          >
            Select All
          </Button>
          <Button
            type="default"
            icon={<BorderOutlined />}
            onClick={handleGlobalRemoveAll}
            disabled={disabled || !hasAnyPermissions()}
            size="small"
          >
            Remove All
          </Button>
        </Space>
      </div>

      {/* Permissions Grid */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
        {modules.map((module) => {
          const permission = permissions.find(p => p.module === module);
          const moduleActions = permission?.actions || [];
          const isAllSelected = isModuleAllSelected(module);
          const isPartiallySelected = isModulePartiallySelected(module);

          return (
            <Card
              key={module}
              size="small"
              className="mb-3 bg-white shadow-sm"
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base text-gray-800">
                    {getModuleDisplayName(module)}
                  </span>
                  <Space>
                    <Checkbox
                      indeterminate={isPartiallySelected}
                      checked={isAllSelected}
                      onChange={(e) => handleModuleSelectAll(module, e.target.checked)}
                      disabled={disabled}
                    >
                      <span className="text-sm">Select All</span>
                    </Checkbox>
                  </Space>
                </div>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mt-2">
                {actions.map((action) => {
                  const isChecked = moduleActions.includes(action);
                  return (
                    <Checkbox
                      key={action}
                      checked={isChecked}
                      onChange={(e) => handleActionChange(module, action, e.target.checked)}
                      disabled={disabled}
                      className="mb-0"
                    >
                      <span className="text-sm">{getActionDisplayName(action)}</span>
                    </Checkbox>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionMatrix;

