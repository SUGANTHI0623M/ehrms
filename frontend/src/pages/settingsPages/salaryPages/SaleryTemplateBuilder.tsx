import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MoreVertical } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function SalaryTemplateBuilder() {
  const navigate = useNavigate();

  const salaryTemplates = [
    { id: 1, name: "AE 01", type: "REGULAR" },
    { id: 2, name: "SALARY TEMPLATE", type: "REGULAR" },
    { id: 3, name: "TEMP", type: "REGULAR" },
    { id: 4, name: "Default (Hourly)", type: "CONTRACTUAL | Default template for contractual hourly employees" },
    { id: 5, name: "Default (Daily)", type: "CONTRACTUAL | Default template for contractual daily employees" },
    { id: 6, name: "Default (Monthly)", type: "CONTRACTUAL | Default template for contractual monthly employees" },
  ];

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
          <h2 className="text-xl md:text-2xl font-bold">Salary Template Builder</h2>
        </div>

        <p className="text-sm text-muted-foreground mt-[-6px] md:ml-[52px]">
          Create & manage salary templates for your organisation
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div></div>
          <Button className="shadow-md w-full sm:w-auto">+ Add New Template</Button>
        </div>

        <div className="space-y-4">
          {salaryTemplates.map((item) => (
            <Card
              key={item.id}
              className="p-5 flex justify-between items-center hover:bg-muted/40 transition cursor-pointer"
            >
              <div className="flex gap-4 items-center">
                <div className="min-w-8 h-8 flex items-center justify-center rounded-full border text-green-600 font-semibold">
                  {item.id}
                </div>
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
              </div>
              <MoreVertical className="text-gray-500 cursor-pointer" />
            </Card>
          ))}
        </div>
      </main>
    </MainLayout>
  );
}
