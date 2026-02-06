import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function SalarySettings() {
  const items = [
    { name: "Salary Calculation Logic", description: "Configure Salary Logic" },
    { name: "Salary Components", description: "Earnings & deductions" },
    { name: "Salary Template Builder", description: "Build templates" },
    { name: "Salary Details Access to Staff", description: "Enable/Disable" },
    { name: "Payslip Customization", description: "Customize payslip", badge: "New" }
  ];
  const navigate = useNavigate();


  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Salary Settings</h2>
        <Card className="">
          <CardContent className="p-6">


            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.name === "Salary Template Builder") navigate("/salary/template-builder");
                    else if (item.name === "Salary Calculation Logic") navigate("/salary/calculation-logic");
                    else if (item.name === "Salary Components") navigate("/salary/components");
                    else if (item.name === "Salary Details Access to Staff") navigate("/salary/details-access");
                    else if (item.name === "Payslip Customization") navigate("/salary/payslip-customization");
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
