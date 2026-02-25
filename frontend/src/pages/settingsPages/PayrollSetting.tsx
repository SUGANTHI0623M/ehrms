import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function PayrollSettings() {
  const items = [
    { name: "Payroll Processing Rules", description: "Configure payroll processing rules and settings" },
    { name: "Attendance-Based Calculation", description: "Configure how attendance affects payroll" },
    { name: "Payroll Cycle Configuration", description: "Set payroll processing dates and cycles" },
    { name: "Deduction Rules", description: "Configure automatic deductions" },
    { name: "Fine Calculation", description: "Configure attendance-based fine calculation and rules" },
    { name: "Reimbursement Integration", description: "Configure expense claim processing in payroll" }
  ];
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Payroll Settings</h2>
        <Card className="">
          <CardContent className="p-6">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    // Navigate to respective settings pages
                    if (item.name === "Payroll Processing Rules") navigate("/settings/payroll/processing-rules");
                    else if (item.name === "Attendance-Based Calculation") navigate("/settings/payroll/attendance-calculation");
                    else if (item.name === "Payroll Cycle Configuration") navigate("/settings/payroll/cycle");
                    else if (item.name === "Deduction Rules") navigate("/settings/payroll/deductions");
                    else if (item.name === "Fine Calculation") navigate("/settings/payroll/fine-calculation");
                    else if (item.name === "Reimbursement Integration") navigate("/settings/payroll/reimbursement");
                  }}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}

