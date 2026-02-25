import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Plus, X } from "lucide-react";
import { 
  useGetLeaveTemplateByIdQuery,
  useCreateLeaveTemplateMutation,
  useUpdateLeaveTemplateMutation
} from "@/store/api/settingsApi";
import { message } from "antd";

interface LeaveType {
  type: string;
  days: number | '';
  carryForward: boolean;
  maxCarryForward?: number;
}

export default function LeaveTemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data: templateData, isLoading } = useGetLeaveTemplateByIdQuery(id || '', { skip: !isEditMode });
  const [createTemplate, { isLoading: isCreating }] = useCreateLeaveTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateLeaveTemplateMutation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaveTypes: [] as LeaveType[]
  });

  useEffect(() => {
    if (isEditMode && templateData?.data?.template) {
      const template = templateData.data.template;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        leaveTypes: template.leaveTypes?.map((lt: any) => ({
          type: lt.type || '',
          days: lt.days !== undefined && lt.days !== null ? lt.days : '',
          carryForward: lt.carryForward || false,
          maxCarryForward: lt.maxCarryForward
        })) || []
      });
    }
  }, [isEditMode, templateData]);

  const handleAddLeaveType = () => {
    setFormData({
      ...formData,
      leaveTypes: [...formData.leaveTypes, { type: '', days: '', carryForward: false }]
    });
  };

  const handleRemoveLeaveType = (index: number) => {
    setFormData({
      ...formData,
      leaveTypes: formData.leaveTypes.filter((_, i) => i !== index)
    });
  };

  const handleLeaveTypeChange = (index: number, field: keyof LeaveType, value: string | number | boolean) => {
    const updatedLeaveTypes = [...formData.leaveTypes];
    updatedLeaveTypes[index] = { ...updatedLeaveTypes[index], [field]: value };
    setFormData({ ...formData, leaveTypes: updatedLeaveTypes });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      message.error('Template name is required');
      return;
    }

    if (formData.leaveTypes.length === 0) {
      message.error('At least one leave type is required');
      return;
    }

    // Validate all leave types
    for (let i = 0; i < formData.leaveTypes.length; i++) {
      const leaveType = formData.leaveTypes[i];
      if (!leaveType.type.trim()) {
        message.error(`Leave Type ${i + 1}: Type name is required`);
        return;
      }
      if (leaveType.days === '' || leaveType.days === undefined || leaveType.days === null) {
        message.error(`Leave Type ${i + 1}: Number of Days is required`);
        return;
      }
      if (typeof leaveType.days === 'number' && leaveType.days < 0) {
        message.error(`Leave Type ${i + 1}: Days must be 0 or greater`);
        return;
      }
      if (leaveType.carryForward && leaveType.maxCarryForward !== undefined && leaveType.maxCarryForward < 0) {
        message.error(`Leave Type ${i + 1}: Max carry forward must be 0 or greater`);
        return;
      }
    }

    try {
      const leaveTypes = formData.leaveTypes.map(lt => ({
        type: lt.type.trim(),
        days: typeof lt.days === 'number' ? lt.days : (lt.days === '' ? 0 : Number(lt.days) || 0),
        carryForward: lt.carryForward,
        maxCarryForward: lt.carryForward && lt.maxCarryForward !== undefined ? lt.maxCarryForward : undefined
      }));

      if (isEditMode && id) {
        await updateTemplate({
          id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim(),
            leaveTypes
          }
        }).unwrap();
        message.success('Leave template updated successfully');
      } else {
        await createTemplate({
          name: formData.name.trim(),
          description: formData.description.trim(),
          leaveTypes
        }).unwrap();
        message.success('Leave template created successfully');
      }
      navigate('/business/leave-templates');
    } catch (error: any) {
      message.error(error?.data?.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} leave template`);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">
            {isEditMode ? 'Edit Leave Template' : 'Create Leave Template'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Leave Policy 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this template"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Leave Types *</Label>
                  <Button type="button" onClick={handleAddLeaveType} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Leave Type
                  </Button>
                </div>

                {formData.leaveTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No leave types added yet. Click "Add Leave Type" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.leaveTypes.map((leaveType, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Leave Type Name *</Label>
                            <Input
                              value={leaveType.type}
                              onChange={(e) => handleLeaveTypeChange(index, 'type', e.target.value)}
                              placeholder="e.g., Annual Leave, Sick Leave"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Number of Days *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={leaveType.days === '' ? '' : leaveType.days}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  handleLeaveTypeChange(index, 'days', '');
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    handleLeaveTypeChange(index, 'days', numValue);
                                  }
                                }
                              }}
                              placeholder="Enter number of days"
                              required
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`carryForward-${index}`}
                              checked={leaveType.carryForward}
                              onChange={(e) => handleLeaveTypeChange(index, 'carryForward', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`carryForward-${index}`} className="cursor-pointer">
                              Allow Carry Forward
                            </Label>
                          </div>
                          {leaveType.carryForward && (
                            <div className="space-y-2">
                              <Label>Max Carry Forward Days</Label>
                              <Input
                                type="number"
                                min="0"
                                value={leaveType.maxCarryForward || ''}
                                onChange={(e) => handleLeaveTypeChange(index, 'maxCarryForward', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="Optional"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveLeaveType(index)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isCreating || isUpdating ? 'Saving...' : isEditMode ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </MainLayout>
  );
}

