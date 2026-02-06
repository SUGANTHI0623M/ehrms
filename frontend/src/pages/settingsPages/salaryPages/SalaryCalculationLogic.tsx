import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function SalaryCalculationLogic() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: "calendar", title: "Calendar Month", desc: "Ex: March will have 31 payable days, April will have 30 payable days etc." },
    { id: "30", title: "Every Month 30 Days", desc: "Ex: Every month will have 30 payable days" },
    { id: "28", title: "Every Month 28 Days", desc: "Ex: Every month will have 28 payable days" },
    { id: "26", title: "Every Month 26 Days", desc: "Ex: Every month will have 26 payable days" },
  ];

  return (
    <MainLayout>
      <main className="p-4 space-y-6 ">
        
        <div className="flex items-center gap-3">
          <Button
            size="icon"

            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Payable Days & Work Hours</h2>
        </div>

        <p className="text-sm text-muted-foreground mt-[-8px] md:ml-[52px] mb-4">
          What is the effective payable days per month, work hours per day in your organization?
          We will calculate based on your selection salary / payable days, hourly wage rate =
          daily wage rate / number of work hours for salary calculation.
        </p>

        <div className="space-y-4">
          {options.map((item) => (
            <Card
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`p-5 cursor-pointer flex gap-4 items-start shadow-sm transition 
                ${selected === item.id ? "border-blue-600 bg-blue-50" : ""}
              `}
            >
              <input
                type="radio"
                checked={selected === item.id}
                onChange={() => setSelected(item.id)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          <Button className="shadow-md w-full sm:w-auto">Save</Button>
        </div>
      </main>
    </MainLayout>
  );
}
