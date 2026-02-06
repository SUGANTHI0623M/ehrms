import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, Save } from "lucide-react";
import {
  useGetAttendanceTemplatesQuery,
  useCreateAttendanceTemplateMutation,
  useUpdateAttendanceTemplateMutation,
  useDeleteAttendanceTemplateMutation,
  AttendanceTemplate,
} from "@/store/api/settingsApi";
import { message, Modal } from "antd";

interface TemplateFormData {
  name: string;
  description: string;
  settings: {
    requireGeolocation: boolean;
    requireSelfie: boolean;
    allowAttendanceOnHolidays: boolean;
    allowAttendanceOnWeeklyOff: boolean;
    lateEntryAllowed: boolean;
    earlyExitAllowed: boolean;
    overtimeAllowed: boolean;
  };
  isActive: boolean;
}

const defaultFormData: TemplateFormData = {
  name: "",
  description: "",
  settings: {
    requireGeolocation: false,
    requireSelfie: false,
    allowAttendanceOnHolidays: false,
    allowAttendanceOnWeeklyOff: false,
    lateEntryAllowed: true,
    earlyExitAllowed: true,
    overtimeAllowed: true,
  },
  isActive: true,
};

export default function AttendanceTemplates() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetAttendanceTemplatesQuery();
  const [createTemplate, { isLoading: isCreating }] = useCreateAttendanceTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateAttendanceTemplateMutation();
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteAttendanceTemplateMutation();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AttendanceTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);

  const templates = data?.data?.templates || [];

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setFormModalOpen(true);
  };

  const handleEdit = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId);
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        settings: {
          requireGeolocation: template.settings.requireGeolocation,
          requireSelfie: template.settings.requireSelfie,
          allowAttendanceOnHolidays: template.settings.allowAttendanceOnHolidays,
          allowAttendanceOnWeeklyOff: template.settings.allowAttendanceOnWeeklyOff,
          lateEntryAllowed: template.settings.lateEntryAllowed,
          earlyExitAllowed: template.settings.earlyExitAllowed,
          overtimeAllowed: template.settings.overtimeAllowed,
        },
        isActive: template.isActive,
      });
      setFormModalOpen(true);
    }
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate(templateToDelete).unwrap();
      message.success("Attendance template deleted successfully");
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to delete template");
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      message.error("Template name is required");
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate._id,
          data: formData,
        }).unwrap();
        message.success("Attendance template updated successfully");
      } else {
        await createTemplate(formData).unwrap();
        message.success("Attendance template created successfully");
      }
      setFormModalOpen(false);
      setEditingTemplate(null);
      setFormData(defaultFormData);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save template");
    }
  };

  const handleCancel = () => {
    setFormModalOpen(false);
    setEditingTemplate(null);
    setFormData(defaultFormData);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4 space-y-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <p>Loading attendance templates...</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Attendance Templates</h2>
              <p className="text-sm text-muted-foreground">
                Configure attendance modes, attendance on holidays, and more
              </p>
            </div>
          </div>
          <Button className="w-full md:w-auto" onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No attendance templates found. Click "New Template" to create one.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="p-4 border rounded-lg hover:bg-muted/40 transition flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{template.name}</p>
                      {template.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-1">{template.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Created By: {template.createdBy?.name || "Unknown"} | Assigned Staff:{" "}
                      {template.assignedStaffCount || 0} Staffs
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {template.settings.requireGeolocation && (
                        <Badge variant="secondary" className="text-xs">
                          Geolocation
                        </Badge>
                      )}
                      {template.settings.requireSelfie && (
                        <Badge variant="secondary" className="text-xs">
                          Selfie
                        </Badge>
                      )}
                      {template.settings.allowAttendanceOnHolidays && (
                        <Badge variant="secondary" className="text-xs">
                          Holidays Allowed
                        </Badge>
                      )}
                      {template.settings.allowAttendanceOnWeeklyOff && (
                        <Badge variant="secondary" className="text-xs">
                          Weekly Off Allowed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template._id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(template._id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Template Modal */}
        <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Attendance Template" : "Create Attendance Template"}
              </DialogTitle>
              <DialogDescription>
                Configure attendance template settings and requirements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Standard Attendance, Selfie & Location"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe this attendance template..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="template-active">Active Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only active templates can be assigned to staff
                    </p>
                  </div>
                  <Switch
                    id="template-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>

              {/* Attendance Requirements */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Attendance Requirements</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="require-geolocation" className="font-medium">
                        Require Geolocation
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Employees must provide location when marking attendance
                      </p>
                    </div>
                    <Switch
                      id="require-geolocation"
                      checked={formData.settings.requireGeolocation}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, requireGeolocation: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="require-selfie" className="font-medium">
                        Require Selfie
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Employees must take a selfie when marking attendance
                      </p>
                    </div>
                    <Switch
                      id="require-selfie"
                      checked={formData.settings.requireSelfie}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, requireSelfie: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Attendance Rules */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Attendance Rules</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="allow-holidays" className="font-medium">
                        Allow Attendance on Holidays
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow employees to mark attendance on holiday days
                      </p>
                    </div>
                    <Switch
                      id="allow-holidays"
                      checked={formData.settings.allowAttendanceOnHolidays}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, allowAttendanceOnHolidays: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="allow-weekly-off" className="font-medium">
                        Allow Attendance on Weekly Off
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow employees to mark attendance on weekly off days
                      </p>
                    </div>
                    <Switch
                      id="allow-weekly-off"
                      checked={formData.settings.allowAttendanceOnWeeklyOff}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, allowAttendanceOnWeeklyOff: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="late-entry" className="font-medium">
                        Allow Late Entry
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow employees to mark attendance after shift start time
                      </p>
                    </div>
                    <Switch
                      id="late-entry"
                      checked={formData.settings.lateEntryAllowed}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, lateEntryAllowed: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="early-exit" className="font-medium">
                        Allow Early Exit
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow employees to mark exit before shift end time
                      </p>
                    </div>
                    <Switch
                      id="early-exit"
                      checked={formData.settings.earlyExitAllowed}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, earlyExitAllowed: checked },
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="overtime" className="font-medium">
                        Allow Overtime
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow employees to work beyond shift end time
                      </p>
                    </div>
                    <Switch
                      id="overtime"
                      checked={formData.settings.overtimeAllowed}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, overtimeAllowed: checked },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingTemplate ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Delete Attendance Template"
          open={deleteModalOpen}
          onOk={handleDeleteConfirm}
          onCancel={() => {
            setDeleteModalOpen(false);
            setTemplateToDelete(null);
          }}
          okText="Delete"
          okButtonProps={{ danger: true, loading: isDeleting }}
          cancelText="Cancel"
        >
          <p>Are you sure you want to delete this attendance template? This action cannot be undone.</p>
        </Modal>
      </main>
    </MainLayout>
  );
}
