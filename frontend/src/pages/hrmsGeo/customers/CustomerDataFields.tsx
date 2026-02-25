import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  useGetCustomerDataFieldsQuery,
  useCreateCustomerDataFieldMutation,
  useUpdateCustomerDataFieldMutation,
  useDeleteCustomerDataFieldMutation,
} from "@/store/api/settingsApi";
import { message } from "antd";

const CustomerDataFields = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: "", // Comma-separated for dropdown
  });

  const {
    data: fieldsData,
    isLoading,
    refetch,
  } = useGetCustomerDataFieldsQuery();
  const [createField, { isLoading: isCreating }] =
    useCreateCustomerDataFieldMutation();
  const [updateField, { isLoading: isUpdating }] =
    useUpdateCustomerDataFieldMutation();
  const [deleteField, { isLoading: isDeleting }] =
    useDeleteCustomerDataFieldMutation();
  const [deleteConfirmField, setDeleteConfirmField] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const handleOpenModal = (field?: any) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder || "",
        options: field.options?.join(", ") || "",
      });
    } else {
      setEditingField(null);
      setFormData({
        name: "",
        label: "",
        type: "text",
        required: false,
        placeholder: "",
        options: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.label) {
      message.error("Name and Label are required");
      return;
    }

    const payload = {
      ...formData,
      options:
        formData.type === "dropdown"
          ? formData.options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    };

    try {
      if (editingField) {
        await updateField({ id: editingField._id, ...payload }).unwrap();
        message.success("Field updated successfully");
      } else {
        await createField(payload).unwrap();
        message.success("Field created successfully");
      }
      setIsModalOpen(false);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Operation failed");
    }
  };

  const handleDeleteClick = (field: { _id: string; label: string }) => {
    setDeleteConfirmField({ id: field._id, label: field.label });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmField) return;
    try {
      await deleteField(deleteConfirmField.id).unwrap();
      message.success("Field deleted successfully");
      setDeleteConfirmField(null);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Delete failed");
    }
  };

  const fields = fieldsData?.data?.fields || [];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/hrms-geo/customers/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Customer Data Fields
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Configure custom fields for your customer database
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Field
          </Button>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Manage Fields</CardTitle>
            <CardDescription>
              These fields will appear in the "Add Customer" and "Edit Customer"
              forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto border-t sm:border-t-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 sm:bg-transparent border-b text-muted-foreground">
                    <th className="text-left p-3 font-medium">Label</th>
                    <th className="text-left p-3 font-medium">Name (ID)</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Required</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Loading fields...
                      </td>
                    </tr>
                  ) : fields.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No custom fields defined yet.
                      </td>
                    </tr>
                  ) : (
                    fields.map((field: any) => (
                      <tr
                        key={field._id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-medium">{field.label}</td>
                        <td className="p-3 text-muted-foreground">
                          {field.name}
                        </td>
                        <td className="p-3 capitalize">{field.type}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              field.required
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {field.required ? "Required" : "Optional"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-500"
                              onClick={() => handleOpenModal(field)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeleteClick(field)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Field" : "Add New custom field"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field Label (Display Name)</Label>
              <Input
                placeholder="e.g. Account Manager"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Field Name (Technical ID)</Label>
              <Input
                placeholder="e.g. account_manager"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={!!editingField}
              />
              <p className="text-[10px] text-muted-foreground">
                This should be alphanumeric with underscores (no spaces). Once
                created, it cannot be changed.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="textarea">Long Text</SelectItem>
                  <SelectItem value="dropdown">Dropdown (Select)</SelectItem>
                  <SelectItem value="boolean">Yes/No (Boolean)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "dropdown" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label>Dropdown Options</Label>
                <Textarea
                  placeholder="Option 1, Option 2, Option 3"
                  value={formData.options}
                  onChange={(e) =>
                    setFormData({ ...formData, options: e.target.value })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Separate options with commas.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Placeholder Text</Label>
              <Input
                placeholder="Hint for the user"
                value={formData.placeholder}
                onChange={(e) =>
                  setFormData({ ...formData, placeholder: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Required Field</Label>
                <p className="text-xs text-muted-foreground">
                  Make this field mandatory in forms
                </p>
              </div>
              <Switch
                checked={formData.required}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, required: val })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
              className="w-full sm:w-auto"
            >
              {isCreating || isUpdating ? "Saving..." : "Save Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirmField}
        onOpenChange={(open) => !open && setDeleteConfirmField(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete field?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete the field{" "}
            <span className="font-medium text-foreground">
              &quot;{deleteConfirmField?.label}&quot;
            </span>
            ? This cannot be undone.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmField(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CustomerDataFields;
