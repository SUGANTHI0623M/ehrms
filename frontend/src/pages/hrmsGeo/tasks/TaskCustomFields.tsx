import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";

import { useGetTaskCustomFieldsQuery, useCreateTaskCustomFieldMutation, useUpdateTaskCustomFieldMutation, useDeleteTaskCustomFieldMutation, TaskCustomField } from "@/store/api/settingsApi";

const TaskCustomFields = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<TaskCustomField | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    type: "text" as TaskDataField['type'],
    placeholder: "",
    required: false,
    options: [] as string[],
    order: 0
  });
  const [optionsInput, setOptionsInput] = useState("");
  
  const { data: fieldsData, isLoading, refetch } = useGetTaskCustomFieldsQuery();
  const [createField] = useCreateTaskCustomFieldMutation();
  const [updateField] = useUpdateTaskCustomFieldMutation();
  const [deleteField] = useDeleteTaskCustomFieldMutation();
  
  const fields = fieldsData?.data?.fields || [];

  const handleOpenModal = (field?: TaskCustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder || "",
        required: field.required,
        options: field.options || [],
        order: field.order
      });
      setOptionsInput((field.options || []).join(", "));
    } else {
      setEditingField(null);
    setFormData({
      name: "",
      label: "",
      type: "text" as TaskCustomField['type'],
      placeholder: "",
      required: false,
      options: [],
      order: fields.length
    });
      setOptionsInput("");
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
    setFormData({
      name: "",
      label: "",
      type: "text",
      placeholder: "",
      required: false,
      options: [],
      order: 0
    });
    setOptionsInput("");
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.label.trim()) {
      message.error("Name and Label are required");
      return;
    }

    if (formData.type === 'dropdown' && formData.options.length === 0) {
      message.error("Please provide at least one option for dropdown field");
      return;
    }

    try {
      const fieldData = {
        ...formData,
        name: formData.name.trim().toLowerCase().replace(/\s+/g, '_'),
        label: formData.label.trim(),
        placeholder: formData.placeholder.trim() || undefined,
        options: formData.type === 'dropdown' ? formData.options : undefined
      };
      if (editingField) {
        await updateField({ id: editingField._id, data: fieldData }).unwrap();
        message.success("Field updated successfully");
      } else {
        await createField(fieldData).unwrap();
        message.success("Field created successfully");
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save field");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    try {
      await deleteField(id).unwrap();
      message.success("Field deleted successfully");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to delete field");
    }
  };

  const handleOptionsChange = (value: string) => {
    setOptionsInput(value);
    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    setFormData(prev => ({ ...prev, options }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/hrms-geo/tasks/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Task Custom Fields</h1>
              <p className="text-muted-foreground mt-1">Manage custom fields for task data collection</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Custom Fields</CardTitle>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No custom fields configured. Click "Add Field" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field._id} className="p-4 border rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{field.label}</h3>
                          <span className="text-xs px-2 py-1 bg-muted rounded">{field.type}</span>
                          {field.required && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Required</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Field Name: {field.name}
                          {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                          {field.type === 'dropdown' && field.options && (
                            ` • Options: ${field.options.join(", ")}`
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(field)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(field._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add/Edit Field Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">
                Field Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Task Priority"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Field Name (Auto-generated) <span className="text-muted-foreground text-xs">(lowercase, underscores)</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., task_priority"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Field Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as TaskCustomField['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                placeholder="e.g., Enter task priority"
              />
            </div>

            {formData.type === 'dropdown' && (
              <div className="space-y-2">
                <Label htmlFor="options">
                  Options <span className="text-red-500">*</span> <span className="text-muted-foreground text-xs">(comma-separated)</span>
                </Label>
                <Input
                  id="options"
                  value={optionsInput}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  placeholder="e.g., High, Medium, Low"
                />
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.options.map((opt, idx) => (
                      <span key={idx} className="px-2 py-1 bg-muted rounded text-sm">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
              />
              <Label htmlFor="required">Required Field</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingField ? "Update" : "Create"} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCustomFields;
