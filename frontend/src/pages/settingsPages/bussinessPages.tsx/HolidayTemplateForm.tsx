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
  useGetHolidayTemplateByIdQuery,
  useCreateHolidayTemplateMutation,
  useUpdateHolidayTemplateMutation
} from "@/store/api/settingsApi";
import { message } from "antd";

interface Holiday {
  name: string;
  date: string;
  type: 'National' | 'Regional' | 'Company';
}

export default function HolidayTemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data: templateData, isLoading } = useGetHolidayTemplateByIdQuery(id || '', { skip: !isEditMode });
  const [createTemplate, { isLoading: isCreating }] = useCreateHolidayTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateHolidayTemplateMutation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    holidays: [] as Holiday[]
  });

  useEffect(() => {
    if (isEditMode && templateData?.data?.template) {
      const template = templateData.data.template;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        holidays: template.holidays?.map((h: any) => ({
          name: h.name,
          date: h.date ? new Date(h.date).toISOString().split('T')[0] : '',
          type: h.type || 'National'
        })) || []
      });
    }
  }, [isEditMode, templateData]);

  const handleAddHoliday = () => {
    setFormData({
      ...formData,
      holidays: [...formData.holidays, { name: '', date: '', type: 'National' }]
    });
  };

  const handleRemoveHoliday = (index: number) => {
    setFormData({
      ...formData,
      holidays: formData.holidays.filter((_, i) => i !== index)
    });
  };

  const handleHolidayChange = (index: number, field: keyof Holiday, value: string) => {
    const updatedHolidays = [...formData.holidays];
    updatedHolidays[index] = { ...updatedHolidays[index], [field]: value };
    setFormData({ ...formData, holidays: updatedHolidays });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      message.error('Template name is required');
      return;
    }

    if (formData.holidays.length === 0) {
      message.error('At least one holiday is required');
      return;
    }

    // Validate all holidays
    for (let i = 0; i < formData.holidays.length; i++) {
      const holiday = formData.holidays[i];
      if (!holiday.name.trim()) {
        message.error(`Holiday ${i + 1}: Name is required`);
        return;
      }
      if (!holiday.date) {
        message.error(`Holiday ${i + 1}: Date is required`);
        return;
      }
    }

    try {
      const holidays = formData.holidays.map(h => ({
        name: h.name.trim(),
        date: new Date(h.date),
        type: h.type
      }));

      if (isEditMode && id) {
        await updateTemplate({
          id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim(),
            holidays
          }
        }).unwrap();
        message.success('Holiday template updated successfully');
      } else {
        await createTemplate({
          name: formData.name.trim(),
          description: formData.description.trim(),
          holidays
        }).unwrap();
        message.success('Holiday template created successfully');
      }
      navigate('/business/holiday-templates');
    } catch (error: any) {
      message.error(error?.data?.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} holiday template`);
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
            {isEditMode ? 'Edit Holiday Template' : 'Create Holiday Template'}
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
                  placeholder="e.g., 2024 Holiday Calendar"
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
                  <Label>Holidays *</Label>
                  <Button type="button" onClick={handleAddHoliday} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>

                {formData.holidays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No holidays added yet. Click "Add Holiday" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.holidays.map((holiday, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Holiday Name *</Label>
                            <Input
                              value={holiday.name}
                              onChange={(e) => handleHolidayChange(index, 'name', e.target.value)}
                              placeholder="e.g., New Year"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input
                              type="date"
                              value={holiday.date}
                              onChange={(e) => handleHolidayChange(index, 'date', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type *</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={holiday.type}
                              onChange={(e) => handleHolidayChange(index, 'type', e.target.value as Holiday['type'])}
                              required
                            >
                              <option value="National">National</option>
                              <option value="Regional">Regional</option>
                              <option value="Company">Company</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveHoliday(index)}
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

