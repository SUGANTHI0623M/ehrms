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

// Helper function to calculate mid-point time from start and end times
const calculateMidPointTime = (startTime: string, endTime: string): string | null => {
  if (!startTime || !endTime) return null;
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight shifts
  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours for overnight shift
  }
  
  // Calculate mid-point
  const halfShiftMinutes = diffMinutes / 2;
  let midPointTotalMinutes = startTotalMinutes + halfShiftMinutes;
  
  // Handle case where mid-point might exceed 24 hours
  if (midPointTotalMinutes >= 24 * 60) {
    midPointTotalMinutes = midPointTotalMinutes % (24 * 60);
  }
  
  const midPointHours = Math.floor(midPointTotalMinutes / 60);
  const midPointMins = Math.floor(midPointTotalMinutes % 60);
  
  return `${midPointHours.toString().padStart(2, '0')}:${midPointMins.toString().padStart(2, '0')}`;
};

interface Shift {
  name: string;
  startTime: string;
  endTime: string;
  graceTime?: {
    value: number;
    unit: 'minutes' | 'hours';
  };
  halfDaySettings?: {
    enabled: boolean;
    customMidPointTime?: string | null; // e.g., "14:30"
    firstHalfEndTime?: string | null; // e.g., "14:30"
    secondHalfStartTime?: string | null; // e.g., "14:30"
    firstHalfLogoutGraceMinutes: number;
    secondHalfLoginGraceMinutes?: number; // Grace time for second half login (0 = strict)
    secondHalfStrictLogin: boolean; // Legacy field
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
    graceTime: { value: 10, unit: 'minutes' },
    halfDaySettings: {
      enabled: false,
      customMidPointTime: null,
      firstHalfEndTime: null,
      secondHalfStartTime: null,
      firstHalfLogoutGraceMinutes: 30,
      secondHalfLoginGraceMinutes: 0,
      secondHalfStrictLogin: true
    }
  });
  const [showForm, setShowForm] = useState(false);
  const initializedRef = useRef(false);

  // Only initialize once when data is first loaded
  useEffect(() => {
    if (!isLoading && business && !initializedRef.current) {
      if (shifts.length > 0) {
        // Ensure all shifts have halfDaySettings structure
        const shiftsWithDefaults = shifts.map(shift => ({
          ...shift,
          halfDaySettings: shift.halfDaySettings || {
            enabled: false,
            customMidPointTime: null,
            firstHalfEndTime: null,
            secondHalfStartTime: null,
            firstHalfLogoutGraceMinutes: 30,
            secondHalfLoginGraceMinutes: 0,
            secondHalfStrictLogin: true
          }
        }));
        setShiftList(shiftsWithDefaults);
        console.log('Initialized shifts with halfDaySettings:', JSON.stringify(shiftsWithDefaults, null, 2));
      }
      initializedRef.current = true;
    }
  }, [isLoading, business, shifts]);

  // Auto-calculate half-day timings when shift times change and half-day is enabled
  useEffect(() => {
    if (formData.startTime && formData.endTime && formData.halfDaySettings?.enabled) {
      const calculatedMidPoint = calculateMidPointTime(formData.startTime, formData.endTime);
      
      // Only auto-populate if custom timings are not set (allow user to override)
      if (calculatedMidPoint) {
        const currentMidPoint = formData.halfDaySettings.customMidPointTime;
        const currentFirstHalfEnd = formData.halfDaySettings.firstHalfEndTime;
        const currentSecondHalfStart = formData.halfDaySettings.secondHalfStartTime;
        
        // Only update if fields are empty (not customized)
        if (!currentMidPoint || !currentFirstHalfEnd || !currentSecondHalfStart) {
          setFormData(prev => ({
            ...prev,
            halfDaySettings: {
              ...prev.halfDaySettings!,
              customMidPointTime: currentMidPoint || calculatedMidPoint,
              firstHalfEndTime: currentFirstHalfEnd || calculatedMidPoint,
              secondHalfStartTime: currentSecondHalfStart || calculatedMidPoint
            }
          }));
        }
      }
    }
  }, [formData.startTime, formData.endTime, formData.halfDaySettings?.enabled]);

  const handleAddNew = () => {
    setEditingIndex(null);
    setFormData({ 
      name: "", 
      startTime: "", 
      endTime: "",
      graceTime: { value: 10, unit: 'minutes' },
      halfDaySettings: {
        enabled: false,
        customMidPointTime: null,
        firstHalfEndTime: null,
        secondHalfStartTime: null,
        firstHalfLogoutGraceMinutes: 30,
        secondHalfLoginGraceMinutes: 0,
        secondHalfStrictLogin: true
      }
    });
    setShowForm(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const shift = shiftList[index];
    setFormData({
      ...shift,
      graceTime: shift.graceTime || { value: 10, unit: 'minutes' },
      halfDaySettings: shift.halfDaySettings ? {
        enabled: shift.halfDaySettings.enabled || false,
        customMidPointTime: shift.halfDaySettings.customMidPointTime || null,
        firstHalfEndTime: shift.halfDaySettings.firstHalfEndTime || null,
        secondHalfStartTime: shift.halfDaySettings.secondHalfStartTime || null,
        firstHalfLogoutGraceMinutes: shift.halfDaySettings.firstHalfLogoutGraceMinutes || 30,
        secondHalfLoginGraceMinutes: shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
          (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0),
        secondHalfStrictLogin: (shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
          (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0)) === 0
      } : {
        enabled: false,
        customMidPointTime: null,
        firstHalfEndTime: null,
        secondHalfStartTime: null,
        firstHalfLogoutGraceMinutes: 30,
        secondHalfLoginGraceMinutes: 0,
        secondHalfStrictLogin: true
      }
    });
    setShowForm(true);
  };

  const handleDelete = (index: number) => {
    const newList = shiftList.filter((_, i) => i !== index);
    setShiftList(newList);
  };

  const handleSaveShift = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime) {
      message.error("Please fill in all fields");
      return;
    }

    // Ensure halfDaySettings is always included, even if disabled
    const shiftToSave: Shift = {
      ...formData,
      halfDaySettings: formData.halfDaySettings ? {
        ...formData.halfDaySettings,
        customMidPointTime: formData.halfDaySettings.customMidPointTime || null,
        firstHalfEndTime: formData.halfDaySettings.firstHalfEndTime || null,
        secondHalfStartTime: formData.halfDaySettings.secondHalfStartTime || null,
        firstHalfLogoutGraceMinutes: formData.halfDaySettings.firstHalfLogoutGraceMinutes || 30,
        secondHalfLoginGraceMinutes: formData.halfDaySettings.secondHalfLoginGraceMinutes ?? 
          (formData.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0),
        secondHalfStrictLogin: (formData.halfDaySettings.secondHalfLoginGraceMinutes ?? 
          (formData.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0)) === 0
      } : {
        enabled: false,
        customMidPointTime: null,
        firstHalfEndTime: null,
        secondHalfStartTime: null,
        firstHalfLogoutGraceMinutes: 30,
        secondHalfLoginGraceMinutes: 0,
        secondHalfStrictLogin: true
      }
    };

    let newList: Shift[];
    if (editingIndex !== null) {
      newList = shiftList.map((shift, index) =>
        index === editingIndex ? shiftToSave : shift
      );
    } else {
      newList = [...shiftList, shiftToSave];
    }

    // Update local state first
    setShiftList(newList);
    
    // Save to database immediately
    try {
      // Ensure all shifts have proper halfDaySettings structure
      const shiftsToSave = newList.map(shift => ({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceTime: shift.graceTime || { value: 10, unit: 'minutes' },
        halfDaySettings: shift.halfDaySettings ? {
          enabled: shift.halfDaySettings.enabled || false,
          customMidPointTime: shift.halfDaySettings.customMidPointTime || null,
          firstHalfEndTime: shift.halfDaySettings.firstHalfEndTime || null,
          secondHalfStartTime: shift.halfDaySettings.secondHalfStartTime || null,
          firstHalfLogoutGraceMinutes: shift.halfDaySettings.firstHalfLogoutGraceMinutes || 30,
          secondHalfLoginGraceMinutes: shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
            (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0),
          secondHalfStrictLogin: (shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
            (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0)) === 0
        } : {
          enabled: false,
          customMidPointTime: null,
          firstHalfEndTime: null,
          secondHalfStartTime: null,
          firstHalfLogoutGraceMinutes: 30,
          secondHalfLoginGraceMinutes: 0,
          secondHalfStrictLogin: true
        }
      }));
      
      console.log('Saving shift to database:', JSON.stringify(shiftsToSave, null, 2));
      
      await updateSettings({ shifts: shiftsToSave }).unwrap();
      message.success(editingIndex !== null ? "Shift updated successfully" : "Shift added successfully");
      
      // Reset form
      setEditingIndex(null);
      setFormData({ 
        name: "", 
        startTime: "", 
        endTime: "",
        graceTime: { value: 10, unit: 'minutes' },
        halfDaySettings: {
          enabled: false,
          customMidPointTime: null,
          firstHalfEndTime: null,
          secondHalfStartTime: null,
          firstHalfLogoutGraceMinutes: 30,
          secondHalfLoginGraceMinutes: 0,
          secondHalfStrictLogin: true
        }
      });
      setShowForm(false);
    } catch (error: any) {
      console.error('Error saving shift:', error);
      message.error(error?.data?.error?.message || "Failed to save shift");
      // Revert local state on error
      setShiftList(shiftList);
    }
  };

  const handleSaveAll = async () => {
    try {
      // Ensure all shifts have proper halfDaySettings structure
      const shiftsToSave = shiftList.map(shift => ({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceTime: shift.graceTime || { value: 10, unit: 'minutes' },
        halfDaySettings: shift.halfDaySettings ? {
          enabled: shift.halfDaySettings.enabled || false,
          customMidPointTime: shift.halfDaySettings.customMidPointTime || null,
          firstHalfEndTime: shift.halfDaySettings.firstHalfEndTime || null,
          secondHalfStartTime: shift.halfDaySettings.secondHalfStartTime || null,
          firstHalfLogoutGraceMinutes: shift.halfDaySettings.firstHalfLogoutGraceMinutes || 30,
          secondHalfLoginGraceMinutes: shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
            (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0),
          secondHalfStrictLogin: (shift.halfDaySettings.secondHalfLoginGraceMinutes ?? 
            (shift.halfDaySettings.secondHalfStrictLogin === false ? 10 : 0)) === 0
        } : {
          enabled: false,
          customMidPointTime: null,
          firstHalfEndTime: null,
          secondHalfStartTime: null,
          firstHalfLogoutGraceMinutes: 30,
          secondHalfLoginGraceMinutes: 0,
          secondHalfStrictLogin: true
        }
      }));
      
      console.log('Saving all shifts with halfDaySettings:', JSON.stringify(shiftsToSave, null, 2));
      
      await updateSettings({ shifts: shiftsToSave }).unwrap();
      message.success("All shift settings saved successfully");
      // Refetch business data to get updated shifts
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving shifts:', error);
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
              
              {/* Half-Day Settings */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="half-day-enabled" className="text-base font-semibold">Half-Day Settings</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure half-day attendance rules for this shift
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="half-day-enabled"
                      checked={formData.halfDaySettings?.enabled || false}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        // Auto-calculate timings when enabling half-day
                        let calculatedMidPoint: string | null = null;
                        if (enabled && formData.startTime && formData.endTime) {
                          calculatedMidPoint = calculateMidPointTime(formData.startTime, formData.endTime);
                        }
                        
                        setFormData({
                          ...formData,
                          halfDaySettings: {
                            ...(formData.halfDaySettings || {
                              enabled: false,
                              customMidPointTime: null,
                              firstHalfEndTime: null,
                              secondHalfStartTime: null,
                              firstHalfLogoutGraceMinutes: 30,
                              secondHalfLoginGraceMinutes: 0,
                              secondHalfStrictLogin: true
                            }),
                            enabled: enabled,
                            // Auto-populate calculated values if not already set
                            customMidPointTime: formData.halfDaySettings?.customMidPointTime || calculatedMidPoint,
                            firstHalfEndTime: formData.halfDaySettings?.firstHalfEndTime || calculatedMidPoint,
                            secondHalfStartTime: formData.halfDaySettings?.secondHalfStartTime || calculatedMidPoint
                          }
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="half-day-enabled" className="cursor-pointer">
                      Enable Half-Day
                    </Label>
                  </div>
                </div>
                
                {formData.halfDaySettings?.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    {/* Custom Timing Settings */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">Timing Configuration</Label>
                          <p className="text-xs text-muted-foreground">
                            Auto-calculated from shift times. You can customize if needed.
                          </p>
                        </div>
                        {formData.startTime && formData.endTime && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const calculatedMidPoint = calculateMidPointTime(formData.startTime, formData.endTime);
                              if (calculatedMidPoint) {
                                setFormData(prev => ({
                                  ...prev,
                                  halfDaySettings: {
                                    ...prev.halfDaySettings!,
                                    customMidPointTime: calculatedMidPoint,
                                    firstHalfEndTime: calculatedMidPoint,
                                    secondHalfStartTime: calculatedMidPoint
                                  }
                                }));
                                message.success("Timings auto-calculated and set");
                              }
                            }}
                          >
                            Auto-Calculate All
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mid-point-time" className="text-xs">Mid-Point Time</Label>
                          <Input
                            id="mid-point-time"
                            type="time"
                            value={formData.halfDaySettings?.customMidPointTime || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              halfDaySettings: {
                                ...formData.halfDaySettings!,
                                customMidPointTime: e.target.value || null
                              }
                            })}
                            placeholder={formData.startTime && formData.endTime ? calculateMidPointTime(formData.startTime, formData.endTime) || "Auto-calculated" : "Auto-calculated"}
                          />
                          <p className="text-xs text-muted-foreground">
                            Split point (e.g., 14:30). Leave empty to auto-calculate: {formData.startTime && formData.endTime ? calculateMidPointTime(formData.startTime, formData.endTime) || "N/A" : "Enter shift times"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="first-half-end" className="text-xs">First Half End Time</Label>
                          <Input
                            id="first-half-end"
                            type="time"
                            value={formData.halfDaySettings?.firstHalfEndTime || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              halfDaySettings: {
                                ...formData.halfDaySettings!,
                                firstHalfEndTime: e.target.value || null
                              }
                            })}
                            placeholder={formData.halfDaySettings?.customMidPointTime || (formData.startTime && formData.endTime ? calculateMidPointTime(formData.startTime, formData.endTime) || "Auto-calculated" : "Auto-calculated")}
                          />
                          <p className="text-xs text-muted-foreground">
                            First half end (e.g., 14:30). Leave empty to use mid-point.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="second-half-start" className="text-xs">Second Half Start Time</Label>
                          <Input
                            id="second-half-start"
                            type="time"
                            value={formData.halfDaySettings?.secondHalfStartTime || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              halfDaySettings: {
                                ...formData.halfDaySettings!,
                                secondHalfStartTime: e.target.value || null
                              }
                            })}
                            placeholder={formData.halfDaySettings?.customMidPointTime || (formData.startTime && formData.endTime ? calculateMidPointTime(formData.startTime, formData.endTime) || "Auto-calculated" : "Auto-calculated")}
                          />
                          <p className="text-xs text-muted-foreground">
                            Second half start (e.g., 14:30). Leave empty to use mid-point.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grace Time Settings */}
                    <div className="space-y-3 border-t pt-3">
                      <Label className="text-sm font-semibold">Grace Time Settings</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first-half-grace">First Half Logout Grace (minutes)</Label>
                          <Input
                            id="first-half-grace"
                            type="number"
                            min="0"
                            placeholder="e.g., 30"
                            value={formData.halfDaySettings?.firstHalfLogoutGraceMinutes || 30}
                            onChange={(e) => setFormData({
                              ...formData,
                              halfDaySettings: {
                                ...formData.halfDaySettings!,
                                firstHalfLogoutGraceMinutes: Number(e.target.value) || 30
                              }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Grace time after mid-point for first half logout (e.g., logout till 3:00 if mid-point is 2:30)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="second-half-login-grace">Second Half Login Grace (minutes)</Label>
                          <Input
                            id="second-half-login-grace"
                            type="number"
                            min="0"
                            placeholder="e.g., 0"
                            value={formData.halfDaySettings?.secondHalfLoginGraceMinutes ?? (formData.halfDaySettings?.secondHalfStrictLogin === false ? 10 : 0)}
                            onChange={(e) => {
                              const graceMinutes = Number(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                halfDaySettings: {
                                  ...formData.halfDaySettings!,
                                  secondHalfLoginGraceMinutes: graceMinutes,
                                  secondHalfStrictLogin: graceMinutes === 0 // Update legacy field for backward compatibility
                                }
                              });
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Grace time allows login BEFORE session start (e.g., 30 min = can login from 14:00 to 14:30). 0 = strict login at session start time only.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Display Calculated Timings */}
                    {formData.startTime && formData.endTime && (
                      <div className="space-y-2 border-t pt-3">
                        <Label className="text-sm font-semibold">Timings Preview</Label>
                        <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                          {(() => {
                            // Use custom timings if set, otherwise calculate
                            const calculatedMidPoint = calculateMidPointTime(formData.startTime, formData.endTime);
                            const midPoint = formData.halfDaySettings?.customMidPointTime || calculatedMidPoint || "N/A";
                            const firstHalfEnd = formData.halfDaySettings?.firstHalfEndTime || midPoint;
                            const secondHalfStart = formData.halfDaySettings?.secondHalfStartTime || midPoint;
                            
                            // Calculate logout grace time
                            const [firstHalfEndH, firstHalfEndM] = firstHalfEnd.split(':').map(Number);
                            const firstHalfEndTotal = firstHalfEndH * 60 + firstHalfEndM;
                            const logoutGrace = formData.halfDaySettings?.firstHalfLogoutGraceMinutes || 30;
                            const logoutGraceTotal = firstHalfEndTotal + logoutGrace;
                            const logoutGraceH = Math.floor((logoutGraceTotal % (24 * 60)) / 60);
                            const logoutGraceM = Math.floor((logoutGraceTotal % (24 * 60)) % 60);
                            const logoutGraceTime = `${logoutGraceH.toString().padStart(2, '0')}:${logoutGraceM.toString().padStart(2, '0')}`;

                            // Calculate login grace start time (BEFORE the session start)
                            const [secondHalfStartH, secondHalfStartM] = secondHalfStart.split(':').map(Number);
                            const secondHalfStartTotal = secondHalfStartH * 60 + secondHalfStartM;
                            const loginGrace = formData.halfDaySettings?.secondHalfLoginGraceMinutes ?? 
                              (formData.halfDaySettings?.secondHalfStrictLogin === false ? 10 : 0);
                            let loginGraceStartTotal = secondHalfStartTotal - loginGrace;
                            // Handle case where grace start might go before midnight
                            if (loginGraceStartTotal < 0) {
                              loginGraceStartTotal += 24 * 60;
                            }
                            const loginGraceStartH = Math.floor((loginGraceStartTotal % (24 * 60)) / 60);
                            const loginGraceStartM = Math.floor((loginGraceStartTotal % (24 * 60)) % 60);
                            const loginGraceStartTime = `${loginGraceStartH.toString().padStart(2, '0')}:${loginGraceStartM.toString().padStart(2, '0')}`;

                            return (
                              <>
                                <p><strong>First Half:</strong> {formData.startTime} - {firstHalfEnd} 
                                  {logoutGrace > 0 && <span className="text-muted-foreground"> (Logout grace till: {logoutGraceTime})</span>}
                                </p>
                                <p><strong>Second Half:</strong> {secondHalfStart} - {formData.endTime}
                                  {loginGrace > 0 ? (
                                    <span className="text-muted-foreground"> (Login grace: {loginGrace} min, can login from {loginGraceStartTime} to {secondHalfStart})</span>
                                  ) : (
                                    <span className="text-muted-foreground"> (Strict login at {secondHalfStart}, no grace)</span>
                                  )}
                                </p>
                                {calculatedMidPoint && !formData.halfDaySettings?.customMidPointTime && (
                                  <p className="text-xs text-primary mt-2">
                                    💡 Auto-calculated mid-point: {calculatedMidPoint} (You can customize if needed)
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setEditingIndex(null);
                  setFormData({ 
                    name: "", 
                    startTime: "", 
                    endTime: "",
                    graceTime: { value: 10, unit: 'minutes' },
                    halfDaySettings: {
                      enabled: false,
                      customMidPointTime: null,
                      firstHalfEndTime: null,
                      secondHalfStartTime: null,
                      firstHalfLogoutGraceMinutes: 30,
                      secondHalfLoginGraceMinutes: 0,
                      secondHalfStrictLogin: true
                    }
                  });
                  setShowForm(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveShift} disabled={isUpdating}>
                  {isUpdating ? "Saving..." : (editingIndex !== null ? "Update" : "Add")} Shift
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
                    {shift.halfDaySettings?.enabled && (
                      <div className="text-xs text-primary mt-1 space-y-1">
                        <p>Half-Day: Enabled</p>
                        {shift.halfDaySettings.customMidPointTime && (
                          <p>Custom Mid-Point: {shift.halfDaySettings.customMidPointTime}</p>
                        )}
                        <p>First Half Logout Grace: {shift.halfDaySettings.firstHalfLogoutGraceMinutes}min</p>
                        <p>Second Half Login Grace: {shift.halfDaySettings.secondHalfLoginGraceMinutes ?? (shift.halfDaySettings.secondHalfStrictLogin ? 0 : 10)}min</p>
                      </div>
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
