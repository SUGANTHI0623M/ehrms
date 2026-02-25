import React, { useState, useEffect } from "react";
import { Modal, Form, Select, Button, Typography, message } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { lmsService } from "@/services/lmsService";
import { useAllDepartmentsForDropdown } from "@/hooks/useAllDepartmentsForDropdown";

const { Text } = Typography;
const { Option } = Select;

export type AssignResourceType = "course" | "liveSession" | "assessment";

export interface AssignLearnersDialogProps {
  type: AssignResourceType;
  resourceId: string;
  resourceTitle?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Optional custom assign handler (e.g. for live session / assessment). When provided, used instead of built-in course assign. */
  onAssign?: (payload: {
    assignedTo: "Department" | "Individual";
    targetIds: string[];
    mandatory?: boolean;
    dueDate?: string;
  }) => Promise<void>;
}

const LABELS: Record<AssignResourceType, string> = {
  course: "Assign Course",
  liveSession: "Assign Live Session",
  assessment: "Assign Assessment",
};

export const AssignLearnersDialog: React.FC<AssignLearnersDialogProps> = ({
  type,
  resourceId,
  resourceTitle,
  open,
  onClose,
  onSuccess,
  onAssign,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  const { departments: departmentOptions, isLoading: departmentsLoading } = useAllDepartmentsForDropdown(open);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setEmployees([]);
    setFetchingEmployees(true);
    lmsService
      .getEmployees()
      .then((empRes) => {
        setEmployees(empRes?.data?.staff ?? []);
      })
      .catch(() => message.error("Failed to load employees"))
      .finally(() => setFetchingEmployees(false));
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const isByDept = values.assignmentType === "By Department";
      let targetIds: string[] = [];
      let departmentNames: string[] = [];
      if (isByDept) {
        const raw = (values.departments || []).map(String);
        targetIds = raw.filter((v: string) => !v.startsWith("name:"));
        departmentNames = raw.filter((v: string) => v.startsWith("name:")).map((v: string) => v.replace(/^name:/, ""));
      } else {
        targetIds = (values.employees || []).map(String);
      }
      if (isByDept && targetIds.length === 0 && departmentNames.length === 0) {
        message.warning("Select at least one department");
        return;
      }
      if (!isByDept && !targetIds.length) {
        message.warning("Select at least one employee");
        return;
      }

      setSubmitting(true);
      if (onAssign) {
        await onAssign({
          assignedTo: isByDept ? "Department" : "Individual",
          targetIds,
          mandatory: values.mandatory,
          dueDate: values.dueDate?.toISOString?.() ?? undefined,
        });
      } else if (type === "course") {
        await lmsService.assignCourse(resourceId, {
          assignedTo: isByDept ? "Department" : "Individual",
          targetIds,
          ...(isByDept && departmentNames.length > 0 ? { departmentNames } : {}),
          mandatory: false,
          dueDate: undefined,
        });
      } else {
        message.info(
          `Assignment for ${type} can be configured in the ${type} settings.`
        );
        onClose();
        return;
      }
      message.success(`${LABELS[type]} completed successfully`);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(
        err?.response?.data?.error?.message ?? `Failed to assign ${type}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title = resourceTitle
    ? `${LABELS[type]}: ${resourceTitle}`
    : LABELS[type];

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ assignmentType: "By Department" }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="assignmentType"
          label={<Text strong>{LABELS[type]}</Text>}
        >
          <Select
            size="large"
            placeholder="Select target audience"
            onChange={(val) => {
              if (val === "By Department")
                form.setFieldsValue({ employees: undefined });
              else form.setFieldsValue({ departments: undefined });
            }}
          >
            <Option value="By Department">By Department</Option>
            <Option value="To Individuals">By individual employees</Option>
          </Select>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) =>
            prev.assignmentType !== curr.assignmentType
          }
        >
          {({ getFieldValue }) => {
            const assignmentType = getFieldValue("assignmentType");
            if (assignmentType === "By Department") {
              return (
                <Form.Item
                  name="departments"
                  label="Select departments"
                  rules={[
                    {
                      required: true,
                      message: "Select at least one department",
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Search departments..."
                    loading={departmentsLoading}
                    optionFilterProp="label"
                    listHeight={400}
                    dropdownStyle={{ maxHeight: 400, overflowY: "auto" }}
                    options={departmentOptions.map((d) => ({ value: d.value, label: d.label }))}
                  />
                </Form.Item>
              );
            }
            if (assignmentType === "To Individuals") {
              return (
                <Form.Item
                  name="employees"
                  label="Select employees"
                  rules={[
                    {
                      required: true,
                      message: "Select at least one employee",
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Search employees..."
                    loading={fetchingEmployees}
                    optionFilterProp="children"
                  >
                    {employees.map((e) => (
                      <Option key={e._id} value={e._id}>
                        {e.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<UserAddOutlined />}
          >
            Assign
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AssignLearnersDialog;
