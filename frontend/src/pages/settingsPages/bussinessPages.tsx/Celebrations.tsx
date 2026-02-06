import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetCelebrationSettingsQuery, useUpdateCelebrationSettingsMutation } from "@/store/api/settingsApi";
import { message } from "antd";

export default function Celebrations() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("birthdays");
  const { data, isLoading } = useGetCelebrationSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateCelebrationSettingsMutation();

  const [birthdaySettings, setBirthdaySettings] = useState({
    setReminder: false,
    sendWishesToEmployees: false,
    remindersOnLens: true
  });

  const [anniversarySettings, setAnniversarySettings] = useState({
    sendWishesToEmployees: false,
    remindersOnLens: true
  });

  useEffect(() => {
    if (data?.data?.settings) {
      setBirthdaySettings(data.data.settings.birthdays);
      setAnniversarySettings(data.data.settings.anniversaries);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateSettings({
        birthdays: birthdaySettings,
        anniversaries: anniversarySettings
      }).unwrap();
      message.success("Settings saved successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save settings");
    }
  };

  return (
    <MainLayout>
      <main className="p-4 space-y-6 ">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl md:text-2xl font-bold">Celebrations</h2>
          </div>
          <Button variant="outline" className="w-full sm:w-auto">👁 View List</Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col md:flex-row gap-6 my-3">
          
          <div className="overflow-x-auto md:overflow-visible">
            <TabsList className="flex md:flex-col gap-2 w-full md:w-48 min-w-max">
              <TabsTrigger value="birthdays" className="justify-start w-full">
                Birthdays
              </TabsTrigger>
              <TabsTrigger value="anniversaries" className="justify-start w-full">
                Work Anniversaries
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="birthdays" className="space-y-2">
              <h3 className="font-semibold text-lg mb-4">Birthday Settings</h3>

              <Card className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">Set Reminder</p>
                  <p className="text-sm text-muted-foreground">
                    Set reminder for yourself and get notified over mail
                  </p>
                </div>
                <Switch 
                  checked={birthdaySettings.setReminder}
                  onCheckedChange={(checked) => 
                    setBirthdaySettings({ ...birthdaySettings, setReminder: checked })
                  }
                  disabled={isLoading}
                />
              </Card>

              <Card className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">Send Wishes to Employees</p>
                  <p className="text-sm text-muted-foreground">Send wishes to all your employees over mail</p>
                </div>
                <Switch 
                  checked={birthdaySettings.sendWishesToEmployees}
                  onCheckedChange={(checked) => 
                    setBirthdaySettings({ ...birthdaySettings, sendWishesToEmployees: checked })
                  }
                  disabled={isLoading}
                />
              </Card>

              <Card className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">Birthday Reminders on Lens</p>
                  <p className="text-sm text-muted-foreground">Enable birthday reminders on Lens</p>
                </div>
                <Switch 
                  checked={birthdaySettings.remindersOnLens}
                  onCheckedChange={(checked) => 
                    setBirthdaySettings({ ...birthdaySettings, remindersOnLens: checked })
                  }
                  disabled={isLoading}
                />
              </Card>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isUpdating || isLoading}>
                  {isUpdating ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="anniversaries" className="space-y-2">
              <h3 className="font-semibold text-lg mb-4">Anniversary Settings</h3>

              <Card className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">Send Wishes to Employees</p>
                  <p className="text-sm text-muted-foreground">Send wishes to all your employees over mail</p>
                </div>
                <Switch 
                  checked={anniversarySettings.sendWishesToEmployees}
                  onCheckedChange={(checked) => 
                    setAnniversarySettings({ ...anniversarySettings, sendWishesToEmployees: checked })
                  }
                  disabled={isLoading}
                />
              </Card>

              <Card className="p-5 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">Anniversary Reminders on Lens</p>
                  <p className="text-sm text-muted-foreground">Enable anniversary reminders on Lens</p>
                </div>
                <Switch 
                  checked={anniversarySettings.remindersOnLens}
                  onCheckedChange={(checked) => 
                    setAnniversarySettings({ ...anniversarySettings, remindersOnLens: checked })
                  }
                  disabled={isLoading}
                />
              </Card>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} disabled={isUpdating || isLoading}>
                  {isUpdating ? "Saving..." : "Save"}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </MainLayout>
  );
}
