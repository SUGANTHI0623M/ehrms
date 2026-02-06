import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function AlertsNotifications() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4 space-y-8">

        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">
            Alerts & Notifications
          </h2>
        </div>

        {/* Daily Attendance Summary */}
        <Card className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Daily Attendance Summary</p>
              <p className="text-sm text-muted-foreground">
                Get daily attendance summary via WhatsApp
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div>
            <p className="text-sm mb-1">Notification Timing</p>
            <Input type="time" defaultValue="20:00" className="w-full sm:w-40" />
          </div>
        </Card>

        {/* Absentee Report */}
        <Card className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Absentee Report</p>
              <p className="text-sm text-muted-foreground">
                Get notified on WhatsApp when staff are absent for specified number of days below.
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm mb-1">Notification Timing</p>
              <Input type="time" defaultValue="11:00" className="w-full sm:w-40" />
            </div>
            <div>
              <p className="text-sm mb-1">Absent count</p>
              <Input defaultValue="2" className="w-full sm:w-32" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Enabled for</p>

            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span className="text-sm">MOHAMMAD ESHAN BABUJOHN (Owner)</span>
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span className="text-sm">GEETHA</span>
            </label>
          </div>
        </Card>

        {/* Geo Notifications */}
        <Card className="p-6 space-y-2">
          <p className="font-semibold text-lg">Geo Notifications</p>
          <p className="text-sm text-muted-foreground">
            Get PagarBook Geo based notifications on WhatsApp
          </p>
        </Card>
      </main>
    </MainLayout>
  );
}
