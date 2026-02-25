import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function PayslipCustomization() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Payslip Presets</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div></div>
          <Button className="w-full sm:w-auto shadow-md">+ New Template</Button>
        </div>

        <Card className="p-5 flex justify-between items-center cursor-pointer hover:bg-muted transition">
          <div>
            <p className="font-semibold text-lg">
              Default Salary Slip Template
              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-[2px] rounded">
                Employee
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Business Details, Staff Details, Attendance Details
            </p>
          </div>
          <div className="h-6 w-6 rounded-full bg-muted" />
        </Card>
      </main>
    </MainLayout>
  );
}
