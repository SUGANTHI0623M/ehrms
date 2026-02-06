import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ClipboardList, BarChart3, Plus, Edit, ToggleLeft, ToggleRight, ArrowLeft, GripVertical, Trash2, Check, X, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useGetFormTemplatesQuery, useCreateFormTemplateMutation, useUpdateFormTemplateMutation, useDeleteFormTemplateMutation, type FormTemplate, type FormTemplateField } from "@/store/api/formApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

const FormTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState<FormTemplateField[]>([]);
  const [showTemplateNameActions, setShowTemplateNameActions] = useState(false);

  const { data: templatesData, isLoading, refetch } = useGetFormTemplatesQuery();
  const [createTemplate, { isLoading: isCreating }] = useCreateFormTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateFormTemplateMutation();
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteFormTemplateMutation();

  // Fetch staff for assignment
  const { data: staffData } = useGetStaffQuery({ limit: 1000, status: "Active" });
  const staffList = staffData?.data?.staff || [];

  const templates = templatesData?.data?.templates || [];

  // State for assigned to popup
  const [assignedToModalOpen, setAssignedToModalOpen] = useState(false);
  const [selectedTemplateForAssign, setSelectedTemplateForAssign] = useState<FormTemplate | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setFields([]);
    setShowTemplateNameActions(false);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (template: FormTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.templateName);
    setFields(template.fields.map(f => ({ ...f })));
    setShowTemplateNameActions(false);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
    setTemplateName("");
    setFields([]);
    setShowTemplateNameActions(false);
  };

  const handleTemplateNameChange = (value: string) => {
    setTemplateName(value);
    setShowTemplateNameActions(value.trim().length > 0);
  };

  const handleConfirmTemplateName = () => {
    if (templateName.trim()) {
      setShowTemplateNameActions(false);
    }
  };

  const handleCancelTemplateName = () => {
    if (editingTemplate) {
      setTemplateName(editingTemplate.templateName);
    } else {
      setTemplateName("");
    }
    setShowTemplateNameActions(false);
  };

  const handleAddField = () => {
    const newField: FormTemplateField = {
      name: "",
      type: "Text",
      mandatory: false,
      cameraOnly: false,
      options: [],
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const handleFieldChange = (index: number, updates: Partial<FormTemplateField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    // Update order
    updatedFields.forEach((field, i) => {
      field.order = i;
    });
    setFields(updatedFields);
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;

    const updatedFields = [...fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    // Update order
    updatedFields.forEach((field, i) => {
      field.order = i;
    });
    
    setFields(updatedFields);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one field",
        variant: "destructive",
      });
      return;
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.name.trim()) {
        toast({
          title: "Validation Error",
          description: `Field ${i + 1} name is required`,
          variant: "destructive",
        });
        return;
      }
      if (field.type === "Dropdown" && (!field.options || field.options.length === 0)) {
        toast({
          title: "Validation Error",
          description: `Field "${field.name}" requires at least one option for Dropdown type`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const templateData = {
        templateName: templateName.trim(),
        fields: fields.map((field, index) => ({
          name: field.name.trim(),
          type: field.type,
          mandatory: field.mandatory,
          cameraOnly: field.type === "Image" ? field.cameraOnly : undefined,
          options: field.type === "Dropdown" ? field.options : undefined,
          order: index,
        })),
      };

      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate._id, data: templateData }).unwrap();
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        await createTemplate(templateData).unwrap();
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(id).unwrap();
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleAddDropdownOption = (fieldIndex: number, option: string) => {
    if (!option.trim()) return;
    const field = fields[fieldIndex];
    if (!field.options) field.options = [];
    if (!field.options.includes(option.trim())) {
      field.options.push(option.trim());
      handleFieldChange(fieldIndex, { options: [...field.options] });
    }
  };

  const handleRemoveDropdownOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    if (field.options) {
      field.options.splice(optionIndex, 1);
      handleFieldChange(fieldIndex, { options: [...field.options] });
    }
  };

  const handleToggleActive = async (template: FormTemplate) => {
    try {
      await updateTemplate({
        id: template._id,
        data: { isActive: !template.isActive },
      }).unwrap();
      toast({
        title: "Success",
        description: `Template ${!template.isActive ? "activated" : "deactivated"} successfully`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update template status",
        variant: "destructive",
      });
    }
  };

  const handleOpenAssignModal = (template: FormTemplate) => {
    setSelectedTemplateForAssign(template);
    const currentAssigned = Array.isArray(template.assignedTo)
      ? template.assignedTo.map((s: any) => (typeof s === "string" ? s : s._id))
      : [];
    setSelectedStaffIds(currentAssigned);
    setAssignedToModalOpen(true);
  };

  const handleSaveAssignedStaff = async () => {
    if (!selectedTemplateForAssign) return;

    try {
      await updateTemplate({
        id: selectedTemplateForAssign._id,
        data: { assignedTo: selectedStaffIds },
      }).unwrap();
      toast({
        title: "Success",
        description: "Staff assignment updated successfully",
      });
      setAssignedToModalOpen(false);
      setSelectedTemplateForAssign(null);
      setSelectedStaffIds([]);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update staff assignment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-1">Create and manage form templates</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="templates" className="w-full">
            <TabsList>
              <TabsTrigger value="responses" asChild>
                <Link to="/hrms-geo/forms/responses">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Responses
                </Link>
              </TabsTrigger>
              <TabsTrigger value="templates" asChild>
                <Link to="/hrms-geo/forms/templates">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Link>
              </TabsTrigger>
              <TabsTrigger value="reports" asChild>
                <Link to="/hrms-geo/forms/reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Templates</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create and manage form templates for data collection
                      </p>
                    </div>
                    <Button onClick={handleCreateNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No templates found. Create your first template.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">
                              <div>Template Name</div>
                              <div className="text-xs font-normal text-muted-foreground mt-1">Assigned To</div>
                            </th>
                            <th className="text-left p-3 text-sm font-medium">Created on</th>
                            <th className="text-left p-3 text-sm font-medium">Created by</th>
                            <th className="text-left p-3 text-sm font-medium">
                              <div>Deactivated at</div>
                              <div className="text-xs font-normal text-muted-foreground mt-1">Active/Inactive</div>
                            </th>
                            <th className="text-left p-3 text-sm font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.map((template) => {
                            const createdBy = typeof template.createdBy === "object" ? template.createdBy.name : "Unknown";
                            const createdOn = template.createdAt ? format(new Date(template.createdAt), "dd MMM yyyy") : "-";
                            const deactivatedAt = template.deactivatedAt ? format(new Date(template.deactivatedAt), "dd MMM yyyy") : "-";
                            const assignedToCount = template.assignedToCount || (Array.isArray(template.assignedTo) ? template.assignedTo.length : 0);

                            return (
                              <tr key={template._id} className="border-b hover:bg-muted/50">
                                <td className="p-3">
                                  <div className="text-sm font-medium">{template.templateName}</div>
                                  <div className="mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenAssignModal(template)}
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <Users className="w-3 h-3" />
                                      {assignedToCount} staff
                                    </Button>
                                  </div>
                                </td>
                                <td className="p-3 text-sm">{createdOn}</td>
                                <td className="p-3 text-sm">{createdBy}</td>
                                <td className="p-3">
                                  {template.isActive ? (
                                    <div className="text-sm text-muted-foreground">-</div>
                                  ) : (
                                    <div className="text-sm">{deactivatedAt}</div>
                                  )}
                                  <div className="mt-2">
                                    <Switch
                                      checked={template.isActive}
                                      onCheckedChange={() => handleToggleActive(template)}
                                      className={template.isActive ? "" : "data-[state=unchecked]:bg-red-500 data-[state=unchecked]:border-red-500"}
                                    />
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template._id)} disabled={isDeleting}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create/Edit Template Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Configure your form template with custom fields
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label>Template Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => handleTemplateNameChange(e.target.value)}
                  placeholder="Enter template name"
                  className="flex-1"
                />
                {showTemplateNameActions && (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleConfirmTemplateName}>
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelTemplateName}>
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Field Properties */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Field Properties</h3>
              <div className="space-y-4 border rounded-lg p-4">
                {fields.map((field, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                    </div>

                    {/* Field Name */}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                        placeholder="Field name"
                        className="w-full"
                      />

                      {/* Field Type */}
                      <Select
                        value={field.type}
                        onValueChange={(value: FormTemplateField['type']) => {
                          const updates: Partial<FormTemplateField> = { type: value };
                          if (value !== "Image") {
                            updates.cameraOnly = false;
                          }
                          if (value !== "Dropdown") {
                            updates.options = [];
                          }
                          handleFieldChange(index, updates);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Text">Text</SelectItem>
                          <SelectItem value="Image">Image</SelectItem>
                          <SelectItem value="Dropdown">Dropdown</SelectItem>
                          <SelectItem value="Number">Number</SelectItem>
                          <SelectItem value="Date">Date</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="Textarea">Textarea</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Dropdown Options */}
                      {field.type === "Dropdown" && (
                        <div className="space-y-2">
                          <Label className="text-sm">Dropdown Options</Label>
                          <div className="flex flex-wrap gap-2">
                            {field.options?.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                                <span className="text-sm">{option}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => handleRemoveDropdownOption(index, optIndex)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add option"
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddDropdownOption(index, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                if (input) {
                                  handleAddDropdownOption(index, input.value);
                                  input.value = "";
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Checkboxes */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`mandatory-${index}`}
                            checked={field.mandatory}
                            onCheckedChange={(checked) => handleFieldChange(index, { mandatory: checked as boolean })}
                          />
                          <Label htmlFor={`mandatory-${index}`} className="text-sm font-normal cursor-pointer">
                            Mandatory Field
                          </Label>
                        </div>
                        {field.type === "Image" && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`camera-${index}`}
                              checked={field.cameraOnly || false}
                              onCheckedChange={(checked) => handleFieldChange(index, { cameraOnly: checked as boolean })}
                            />
                            <Label htmlFor={`camera-${index}`} className="text-sm font-normal cursor-pointer">
                              Camera Only
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteField(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No fields added yet. Click "Add Fields" to get started.
                  </div>
                )}

                <Button variant="outline" onClick={handleAddField} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Fields
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assigned To Modal */}
      <Dialog open={assignedToModalOpen} onOpenChange={setAssignedToModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Staff to Template</DialogTitle>
            <DialogDescription>
              Select staff members to assign to this template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {staffList.map((staff: any) => {
              const isSelected = selectedStaffIds.includes(staff._id);
              return (
                <div key={staff._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`staff-${staff._id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStaffIds([...selectedStaffIds, staff._id]);
                      } else {
                        setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff._id));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`staff-${staff._id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {staff.name} {staff.employeeId ? `(${staff.employeeId})` : ""}
                  </Label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAssignedToModalOpen(false);
              setSelectedTemplateForAssign(null);
              setSelectedStaffIds([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignedStaff}>
              Save ({selectedStaffIds.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormTemplates;
