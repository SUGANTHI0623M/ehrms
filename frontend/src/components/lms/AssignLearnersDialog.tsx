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
  /** Optional: employee IDs to exclude from the "By individual employees" dropdown (e.g. already assigned to this course). */
  excludeEmployeeIds?: string[];
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
  excludeEmployeeIds = [],
  onAssign,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [staffApiNotFound, setStaffApiNotFound] = useState(false);

  const { departments: departmentOptions, isLoading: departmentsLoading } = useAllDepartmentsForDropdown(open);

  /** Exclude already-assigned so user can only select learners not yet assigned (for course, liveSession, assessment). */
  const assignableEmployees = React.useMemo(() => {
    if (!excludeEmployeeIds?.length) return employees;
    const excludeSet = new Set(
      excludeEmployeeIds
        .map((id) => (id != null && typeof id === 'object' ? String((id as any)._id ?? (id as any).id ?? id) : String(id)))
        .filter((s) => /^[a-fA-F0-9]{24}$/.test(s))
    );
    return employees.filter((e) => {
      const id = e?._id != null ? String(e._id) : '';
      return !id || !excludeSet.has(id);
    });
  }, [employees, excludeEmployeeIds]);

  const excludeSet = React.useMemo(() => {
    if (!excludeEmployeeIds?.length) return new Set<string>();
    return new Set(
      excludeEmployeeIds
        .map((id) => (id != null && typeof id === 'object' ? String((id as any)._id ?? (id as any).id ?? id) : String(id)))
        .filter((s) => /^[a-fA-F0-9]{24}$/.test(s))
    );
  }, [excludeEmployeeIds]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setEmployees([]);
    setStaffApiNotFound(false);
    setFetchingEmployees(true);
    const courseIdForStaff = type === "course" && resourceId && String(resourceId).trim() ? String(resourceId).trim() : undefined;

    const finish = () => setFetchingEmployees(false);

    lmsService
      .getStaffForLmsAssign(courseIdForStaff)
      .then((empRes) => {
        const notFound = (empRes as any)?.notFound === true;
        setStaffApiNotFound(notFound);
        const list = empRes?.data?.staff;
        if (Array.isArray(list) && list.length > 0) {
          setEmployees(list);
          finish();
          return;
        }
        if (notFound && type === "course") {
          return lmsService.getEmployees().then((fallback) => {
            const fallbackList = fallback?.data?.staff;
            setEmployees(Array.isArray(fallbackList) ? fallbackList : []);
            setStaffApiNotFound(false);
          }).finally(finish);
        }
        setEmployees(Array.isArray(list) ? list : []);
        finish();
      })
      .catch((err: any) => {
        const is404 = err?.response?.status === 404;
        setStaffApiNotFound(is404);
        if (is404 && type === "course") {
          lmsService
            .getEmployees()
            .then((fallback) => {
              const fallbackList = fallback?.data?.staff;
              setEmployees(Array.isArray(fallbackList) ? fallbackList : []);
              setStaffApiNotFound(false);
            })
            .catch(() => {
              message.warning("Assign-by-employee list is not available. Deploy the latest backend (GET /api/lms/staff-for-assign) or use \"By Department\" to assign.");
            })
            .finally(finish);
        } else {
          if (!is404) message.error("Failed to load employees");
          finish();
        }
      });
  }, [open, form, type, resourceId]);

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
        const res = await lmsService.assignCourse(resourceId, {
          assignedTo: isByDept ? "Department" : "Individual",
          targetIds,
          ...(isByDept && departmentNames.length > 0 ? { departmentNames } : {}),
          mandatory: false,
          dueDate: undefined,
        });
        if (res?.data?.alreadyAssigned) {
          message.info(res.message || "All selected learners are already assigned to this course.");
        } else {
          message.success(`${LABELS[type]} completed successfully`);
        }
        onClose();
        onSuccess?.();
        return;
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
      destroyOnHidden
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
              const isEmpty = assignableEmployees.length === 0;
              const isAllExcluded = type !== "course" && employees.length > 0 && assignableEmployees.length === 0;
              const placeholder = fetchingEmployees
                ? "Loading employees..."
                : staffApiNotFound
                  ? "Backend update required: staff list endpoint not found. Use \"By Department\" or deploy latest API."
                  : isAllExcluded
                    ? "No employees left to assign (all are already assigned)"
                    : isEmpty && type === "course"
                      ? "No employees found for this course's organization. Add staff in Staff module or check course organization."
                      : isEmpty
                        ? "No assignable employees"
                        : "Search by name or email...";
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
                    placeholder={placeholder}
                    loading={fetchingEmployees}
                    optionFilterProp="label"
                    disabled={assignableEmployees.length === 0}
                  >
                    {assignableEmployees.map((e) => {
                      const id = e?._id != null ? String(e._id) : '';
                      const displayName = (e.name || e.email || e.employeeId || "Unknown").trim();
                      const alreadyAssigned = type === "course" && id && excludeSet.has(id);
                      const label = alreadyAssigned
                        ? `${displayName} • ${e.email || ""} (already assigned)`.trim()
                        : [displayName, e.email].filter(Boolean).join(" • ");
                      return (
                        <Option key={id || displayName} value={id} label={label}>
                          {label}
                        </Option>
                      );
                    })}
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
