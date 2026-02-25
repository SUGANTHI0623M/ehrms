import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function SalaryDetailsAccess() {
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
            Salary Details Access to Staff
          </h2>
        </div>

        <p className="text-sm text-muted-foreground md:ml-[52px] -mt-3">
          Staff with salary details access can see their salary slips and payment details in their Staff App
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="w-full sm:w-auto">All</Button>
          <Button variant="outline" className="w-full sm:w-auto">None</Button>
          <Button variant="default" className="w-full sm:w-auto">Selected Staff</Button>
           <Input
          placeholder="Search by name or staff ID"
          className="w-full sm:w-80"
        />
        </div>

       

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3"></th>
                <th className="p-3 text-left whitespace-nowrap">Name</th>
                <th className="p-3 text-left whitespace-nowrap">Staff ID</th>
                <th className="p-3 text-left whitespace-nowrap">Phone Number</th>
                <th className="p-3 text-center whitespace-nowrap">Allow Current Cycle Salary Access</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 text-center">
                    <input type="checkbox" />
                  </td>
                  <td className="p-3 font-medium">Staff {i + 1}</td>
                  <td className="p-3 text-blue-600 cursor-pointer whitespace-nowrap">
                    #ASKEVA/MDU-10{i}
                  </td>
                  <td className="p-3 whitespace-nowrap">+91 987654321{i}</td>
                  <td className="p-3 text-center">
                    <input type="checkbox" className="h-5 w-5 accent-primary" defaultChecked />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
          <Button className="w-full sm:w-auto">Confirm</Button>
        </div>
      </main>
    </MainLayout>
  );
}
