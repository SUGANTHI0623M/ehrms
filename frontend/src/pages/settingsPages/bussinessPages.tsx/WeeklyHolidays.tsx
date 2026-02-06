import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Edit, Eye } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetBusinessQuery, useUpdateWeeklyHolidaysMutation } from "@/store/api/settingsApi";
import { message } from "antd";
import { Badge } from "@/components/ui/badge";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function WeeklyHolidays() {
  const navigate = useNavigate();
  const { data: businessData, isLoading } = useGetBusinessQuery();
  const [updateWeeklyHolidays, { isLoading: isUpdating }] = useUpdateWeeklyHolidaysMutation();

  const business = businessData?.data?.business;
  const weeklyHolidays = business?.settings?.business?.weeklyHolidays || [];
  const weeklyOffPattern = business?.settings?.business?.weeklyOffPattern || 'standard';
  const allowAttendanceOnWeeklyOff = business?.settings?.business?.allowAttendanceOnWeeklyOff || false;

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [pattern, setPattern] = useState<'standard' | 'oddEvenSaturday'>(weeklyOffPattern);
  const [allowAttendance, setAllowAttendance] = useState(allowAttendanceOnWeeklyOff);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (weeklyHolidays.length > 0) {
      setSelectedDays(weeklyHolidays.map((h: any) => h.day));
    }
    setPattern(weeklyOffPattern);
    setAllowAttendance(allowAttendanceOnWeeklyOff);
    // Reset editing mode when data changes
    setIsEditing(false);
  }, [weeklyHolidays, weeklyOffPattern, allowAttendanceOnWeeklyOff]);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    try {
      const holidays = selectedDays.map((day) => ({
        day,
        name: DAYS_OF_WEEK.find((d) => d.value === day)?.label || "",
      }));

      await updateWeeklyHolidays({
        weeklyHolidays: holidays,
        weeklyOffPattern: pattern,
        allowAttendanceOnWeeklyOff: allowAttendance,
      }).unwrap();

      message.success("Weekly holidays settings saved successfully");
      setIsEditing(false);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save weekly holidays");
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
        <div className="flex items-center gap-3">
          <Button size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Weekly Holidays</h2>
        </div>

        <Tabs defaultValue="weekly-off" className="w-full">
          <TabsList className="bg-transparent gap-4 mb-4">
            <TabsTrigger value="weekly-off" className="rounded-md data-[state=active]:bg-gray-200">
              Weekly Off
            </TabsTrigger>
            <TabsTrigger value="attendance-off" className="rounded-md data-[state=active]:bg-gray-200">
              Attendance On Weekly Off
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly-off">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Weekly Off Pattern</h3>
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? "Choose how weekly offs are calculated for your business" : "Current weekly off configuration"}
                    </p>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {!isEditing ? (
                  /* View Mode - Show Current Configuration */
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Current Pattern:</span>
                        <Badge variant={pattern === 'oddEvenSaturday' ? 'default' : 'secondary'}>
                          {pattern === 'oddEvenSaturday' ? 'Odd/Even Saturday Pattern' : 'Standard Pattern'}
                        </Badge>
                      </div>

                      {pattern === 'oddEvenSaturday' ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Pattern Details:</p>
                          <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                            <li>Odd Saturdays (1st, 3rd, 5th, etc.) are <strong className="text-green-600">working days</strong></li>
                            <li>Even Saturdays (2nd, 4th, 6th, etc.) are <strong className="text-red-600">weekly off</strong></li>
                            <li>All Sundays are <strong className="text-red-600">weekly off</strong></li>
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {weeklyHolidays.length > 0 ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-2">Weekly Off Days:</p>
                              <div className="flex flex-wrap gap-2">
                                {weeklyHolidays.map((holiday: any) => (
                                  <Badge key={holiday.day} variant="outline" className="text-sm">
                                    {DAYS_OF_WEEK.find((d) => d.value === holiday.day)?.label || `Day ${holiday.day}`}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No weekly off days configured</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <>
                    <RadioGroup value={pattern} onValueChange={(value) => setPattern(value as 'standard' | 'oddEvenSaturday')}>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/40 transition">
                          <RadioGroupItem value="standard" id="pattern-standard" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="pattern-standard" className="text-base font-medium cursor-pointer">
                              Standard Pattern
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Select specific days of the week as weekly offs
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/40 transition">
                          <RadioGroupItem value="oddEvenSaturday" id="pattern-odd-even" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="pattern-odd-even" className="text-base font-medium cursor-pointer">
                              Odd/Even Saturday Pattern
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Odd Saturdays are working days, Even Saturdays are off. All Sundays are off.
                            </p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>

                    {pattern === 'standard' && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <h4 className="text-base font-semibold mb-2">Select Weekly Off Days</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Choose the days when your business will be closed
                          </p>
                        </div>

                        <div className="space-y-3">
                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={day.value}
                              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/40 transition"
                            >
                              <Checkbox
                                id={`day-${day.value}`}
                                checked={selectedDays.includes(day.value)}
                                onCheckedChange={() => handleDayToggle(day.value)}
                              />
                              <Label
                                htmlFor={`day-${day.value}`}
                                className="text-base font-medium cursor-pointer flex-1"
                              >
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>

                        {selectedDays.length > 0 && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <p className="text-sm font-medium">
                              Selected: {selectedDays.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label).join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {pattern === 'oddEvenSaturday' && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm font-medium mb-2">Pattern Details:</p>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Odd Saturdays (1st, 3rd, 5th, etc.) are <strong>working days</strong></li>
                          <li>Even Saturdays (2nd, 4th, 6th, etc.) are <strong>weekly off</strong></li>
                          <li>All Sundays are <strong>weekly off</strong></li>
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="attendance-off">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Attendance During Weekly Off</h3>
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? "Enable attendance rules for weekly off days" : "Current attendance settings for weekly off days"}
                    </p>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {!isEditing ? (
                  /* View Mode */
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-semibold">
                          Record Attendance on Weekly Offs
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {allowAttendance 
                            ? "Attendance punches are allowed on weekly off days" 
                            : "Attendance punches are not allowed on weekly off days"}
                        </p>
                      </div>
                      <Badge variant={allowAttendance ? "default" : "secondary"}>
                        {allowAttendance ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="allow-attendance" className="text-base font-semibold">
                        Record Attendance on Weekly Offs
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allow attendance punches even if the day is marked as weekly off
                      </p>
                    </div>
                    <Switch
                      id="allow-attendance"
                      checked={allowAttendance}
                      onCheckedChange={setAllowAttendance}
                    />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                // Reset to saved values
                if (weeklyHolidays.length > 0) {
                  setSelectedDays(weeklyHolidays.map((h: any) => h.day));
                }
                setPattern(weeklyOffPattern);
                setAllowAttendance(allowAttendanceOnWeeklyOff);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? "Saving..." : "Save Settings"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          )}
        </div>
      </main>
    </MainLayout>
  );
}
