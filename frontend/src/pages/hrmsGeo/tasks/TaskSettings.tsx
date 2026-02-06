import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck, List, Plus, BarChart3, Settings, HelpCircle, ChevronRight, FileText, Users, CheckCircle, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGetTaskSettingsQuery, useUpdateTaskSettingsMutation } from "@/store/api/settingsApi";

const TaskSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Load settings from backend
  const { data: settingsData, isLoading } = useGetTaskSettingsQuery();
  const [updateTaskSettings] = useUpdateTaskSettingsMutation();
  
  const [autoApprove, setAutoApprove] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [otpVerification, setOtpVerification] = useState(false);

  // Update local state when settings load
  useEffect(() => {
    if (settingsData?.data?.settings) {
      const loadedSettings = settingsData.data.settings;
      setAutoApprove(loadedSettings.autoApprove ?? false);
      setRequireApproval(loadedSettings.requireApprovalOnComplete ?? false);
      setOtpVerification(loadedSettings.enableOtpVerification ?? false);
    }
  }, [settingsData]);

  const handleAutoApproveChange = async (checked: boolean) => {
    try {
      setAutoApprove(checked);
      await updateTaskSettings({ autoApprove: checked }).unwrap();
      toast({
        title: checked ? "Auto Approve Enabled" : "Auto Approve Disabled",
        description: checked 
          ? "Tasks will be automatically approved when assigned" 
          : "Tasks will require employee approval",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update setting",
        variant: "destructive",
      });
      setAutoApprove(!checked); // Revert on error
    }
  };

  const handleRequireApprovalChange = async (checked: boolean) => {
    try {
      setRequireApproval(checked);
      await updateTaskSettings({ requireApprovalOnComplete: checked }).unwrap();
      toast({
        title: checked ? "Approval Required" : "Auto Complete Enabled",
        description: checked 
          ? "Completed tasks will require admin approval" 
          : "Completed tasks will be automatically updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update setting",
        variant: "destructive",
      });
      setRequireApproval(!checked); // Revert on error
    }
  };

  const handleOtpVerificationChange = async (checked: boolean) => {
    try {
      setOtpVerification(checked);
      await updateTaskSettings({ enableOtpVerification: checked }).unwrap();
      toast({
        title: checked ? "OTP Verification Enabled" : "OTP Verification Disabled",
        description: checked 
          ? "Employees must enter OTP from customer email to complete tasks" 
          : "OTP verification is not required",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update setting",
        variant: "destructive",
      });
      setOtpVerification(!checked); // Revert on error
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Settings</h1>
            <p className="text-muted-foreground mt-1">Access settings related to task assignment here</p>
          </div>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/tasks/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/tasks/list">Tasks List</Link>
              </TabsTrigger>
              <TabsTrigger value="assign" asChild>
                <Link to="/hrms-geo/tasks/assign">Assign Task</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/tasks/settings">Task Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Settings</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Access settings related to task assignment here</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/hrms-geo/tasks/settings/custom-fields">
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Manage Custom Fields</h3>
                            <p className="text-sm text-muted-foreground mt-1">Manage custom fields to capture additional details on tasks</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </Link>

                  <Link to="/hrms-geo/tasks/settings/staff-schedule">
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Staff who can schedule tasks</h3>
                            <p className="text-sm text-muted-foreground mt-1">Select staff who will be able to schedule tasks</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </Link>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Auto Approve Tasks</h3>
                        <p className="text-sm text-muted-foreground mt-1">When enabled, tasks assigned by admin will be auto-approved without employee acceptance</p>
                      </div>
                      <Switch checked={autoApprove} onCheckedChange={handleAutoApproveChange} disabled={isLoading} />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Require Approval on Completed Tasks</h3>
                        <p className="text-sm text-muted-foreground mt-1">When enabled, completed tasks require admin approval. When disabled, task status updates automatically from employee side</p>
                      </div>
                      <Switch checked={requireApproval} onCheckedChange={handleRequireApprovalChange} disabled={isLoading} />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Enable OTP Verification</h3>
                        <p className="text-sm text-muted-foreground mt-1">Mandatorily require your staff to complete tasks by filling in a customer-sent OTP</p>
                      </div>
                      <Switch checked={otpVerification} onCheckedChange={handleOtpVerificationChange} disabled={isLoading} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TaskSettings;
