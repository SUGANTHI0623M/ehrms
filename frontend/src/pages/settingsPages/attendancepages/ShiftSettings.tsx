import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/MainLayout";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useGetBusinessQuery, useUpdateAttendanceSettingsMutation } from "@/store/api/settingsApi";
import { message } from "antd";

interface Shift {
  name: string;
  startTime: string;
  endTime: string;
  graceTime?: {
    value: number;
    unit: 'minutes' | 'hours';
  };
}

export default function ShiftSettings() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateAttendanceSettingsMutation();

  const business = businessData?.data?.business;
  const shifts = business?.settings?.attendance?.shifts || [];

  const [shiftList, setShiftList] = useState<Shift[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Shift>({ 
    name: "", 
    startTime: "", 
    endTime: "",
    graceTime: { value: 10, unit: 'minutes' }
  });
  const [showForm, setShowForm] = useState(false);
  const initializedRef = useRef(false);

  // Only initialize once when data is first loaded
  useEffect(() => {
    if (!isLoading && business && !initializedRef.current) {
      if (shifts.length > 0) {
        setShiftList(shifts);
      }
      initializedRef.current = true;
    }
  }, [isLoading, business, shifts]);

  const handleAddNew = () => {
    setEditingIndex(null);
    setFormData({ 
      name: "", 
      startTime: "", 
      endTime: "",
      graceTime: { value: 10, unit: 'minutes' }
    });
    setShowForm(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const shift = shiftList[index];
    setFormData({
      ...shift,
      graceTime: shift.graceTime || { value: 10, unit: 'minutes' }
    });
    setShowForm(true);
  };

  const handleDelete = (index: number) => {
    const newList = shiftList.filter((_, i) => i !== index);
    setShiftList(newList);
  };

  const handleSaveShift = () => {
    if (!formData.name || !formData.startTime || !formData.endTime) {
      message.error("Please fill in all fields");
      return;
    }

    let newList: Shift[];
    if (editingIndex !== null) {
      newList = shiftList.map((shift, index) =>
        index === editingIndex ? formData : shift
      );
    } else {
      newList = [...shiftList, formData];
    }

    setShiftList(newList);
    setEditingIndex(null);
    setFormData({ 
      name: "", 
      startTime: "", 
      endTime: "",
      graceTime: { value: 10, unit: 'minutes' }
    });
    setShowForm(false);
  };

  const handleSaveAll = async () => {
    try {
      await updateSettings({ shifts: shiftList }).unwrap();
      message.success("Shift settings saved successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save shift settings");
    }
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
              <h2 className="text-xl md:text-2xl font-bold">Shift Templates</h2>
              <p className="text-sm text-muted-foreground">
                Manage employee shift timings and assigned staff.
              </p>
            </div>
          </div>
          <Button onClick={handleAddNew} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">
                {editingIndex !== null ? "Edit Shift" : "Add New Shift"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift-name">Shift Name</Label>
                  <Input
                    id="shift-name"
                    placeholder="e.g., General 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grace-time-value">Grace Time</Label>
                  <Input
                    id="grace-time-value"
                    type="number"
                    min="0"
                    placeholder="e.g., 10"
                    value={formData.graceTime?.value || 10}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      graceTime: { 
                        value: Number(e.target.value) || 0, 
                        unit: formData.graceTime?.unit || 'minutes' 
                      } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grace-time-unit">Unit</Label>
                  <Select
                    value={formData.graceTime?.unit || 'minutes'}
                    onValueChange={(value: 'minutes' | 'hours') => setFormData({ 
                      ...formData, 
                      graceTime: { 
                        value: formData.graceTime?.value || 10, 
                        unit: value 
                      } 
                    })}
                  >
                    <SelectTrigger id="grace-time-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setEditingIndex(null);
                  setFormData({ 
                    name: "", 
                    startTime: "", 
                    endTime: "",
                    graceTime: { value: 10, unit: 'minutes' }
                  });
                  setShowForm(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveShift}>
                  {editingIndex !== null ? "Update" : "Add"} Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-4">
            {shiftList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No shifts configured. Click "New Template" to add one.</p>
              </div>
            ) : (
              shiftList.map((shift, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/40 transition flex flex-col md:flex-row justify-between md:items-center gap-4"
                >
                  <div>
                    <p className="font-semibold">{shift.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Time: {shift.startTime} - {shift.endTime}
                    </p>
                    {shift.graceTime && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Grace Time: {shift.graceTime.value} {shift.graceTime.unit}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {shiftList.length > 0 && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll} disabled={isUpdating}>
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? "Saving..." : "Save All Shifts"}
            </Button>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
