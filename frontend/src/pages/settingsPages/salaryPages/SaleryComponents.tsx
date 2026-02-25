import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function SalaryCalculationLogic() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">
            Configure Your Employee’s Salary Structure
          </h2>
        </div>

        <p className="text-sm text-muted-foreground mb-2 md:ml-[52px]">
          Configure Your Employee’s Salary Structure
        </p>

        <Tabs defaultValue="earnings" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex flex-nowrap gap-2 min-w-max justify-start">
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="deduction">Deduction</TabsTrigger>
              <TabsTrigger value="statutory">Statutory</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="earnings">
            <div className="text-right my-4">
              <Button>+ Add Component</Button>
            </div>

            <Card className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Earning Type</th>
                    <th className="p-3 text-left">Calculation Type</th>
                    <th className="p-3 text-left">Considered For EPF</th>
                    <th className="p-3 text-left">Considered For ESI</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(18)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium text-blue-600 cursor-pointer">Sample Component {i+1}</td>
                      <td className="p-3">Basic</td>
                      <td className="p-3">Fixed</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3">Yes</td>
                      <td className="p-3 text-center flex gap-3 justify-center">
                        <Pencil className="h-4 w-4 cursor-pointer" />
                        <Trash2 className="h-4 w-4 cursor-pointer text-destructive" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="deduction">
            <div className="text-right my-4">
              <Button>+ Add Component</Button>
            </div>

            <Card className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Deduction Type</th>
                    <th className="p-3 text-left">Calculation Type</th>
                    <th className="p-3 text-left">Tax Implication</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium text-blue-600 cursor-pointer">Deduction {i+1}</td>
                      <td className="p-3">System Fine</td>
                      <td className="p-3">Variable</td>
                      <td className="p-3">pre-tax</td>
                      <td className="p-3 text-center flex gap-3 justify-center">
                        <Pencil className="h-4 w-4 cursor-pointer" />
                        <Trash2 className="h-4 w-4 cursor-pointer text-destructive" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="statutory">
            <div className="space-y-4">
              {[
                "Employee Provident Fund",
                "Employees State Insurance",
                "Professional Tax",
                "Labour Welfare Fund",
              ].map((item, i) => (
                <Card key={i} className="p-4 flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{item}</p>
                    <p className="text-xs text-muted-foreground">
                      Description line here…
                    </p>
                  </div>
                  <div className="flex gap-6 items-center">
                    <p className="font-semibold whitespace-nowrap">Monthly</p>
                    <Button variant="link">Edit Details</Button>
                    <input type="checkbox" className="h-5 w-5 accent-primary" />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </MainLayout>
  );
}
