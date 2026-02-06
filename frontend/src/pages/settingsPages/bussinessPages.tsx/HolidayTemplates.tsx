import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { 
  useGetHolidayTemplatesQuery, 
  useDeleteHolidayTemplateMutation 
} from "@/store/api/settingsApi";
import { message } from "antd";

export default function HolidayTemplates() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetHolidayTemplatesQuery();
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteHolidayTemplateMutation();

  const templates = data?.data?.templates || [];

  const handleCreateNew = () => {
    navigate("/business/holiday-templates/new");
  };

  const handleEdit = (templateId: string) => {
    navigate(`/business/holiday-templates/${templateId}/edit`);
  };

  const handleDelete = async (templateId: string) => {
    message.confirm({
      title: 'Delete Holiday Template',
      content: 'Are you sure you want to delete this holiday template?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteTemplate(templateId).unwrap();
          message.success('Holiday template deleted successfully');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.error?.message || 'Failed to delete holiday template');
        }
      }
    });
  };

  const handleViewStaff = (templateId: string) => {
    navigate(`/business/holiday-templates/${templateId}/staff`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4 space-y-6">
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
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Holiday Templates</h2>
              <p className="text-sm text-muted-foreground">
                Manage year-based holiday lists and assign them to your staff.
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
                <p>No holiday templates found. Click "New Template" to create one.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="border p-4 rounded-lg hover:bg-muted/40 transition flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">
                      {template.name}
                      <Badge variant="outline">Active</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of Holidays: {template.holidays?.length || 0}
                    </p>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p
                      className="text-sm font-semibold cursor-pointer underline hover:text-primary"
                      onClick={() => handleViewStaff(template._id)}
                    >
                      Assigned Staff: {template.assignedStaffCount || 0}
                    </p>
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
                      onClick={() => handleDelete(template._id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
