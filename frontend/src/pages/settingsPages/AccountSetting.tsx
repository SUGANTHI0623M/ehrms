import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function AccountSettings() {
  const items = [
    { name: "Name", description: "AbhiRushiCoders Pvt. LTD Sivasi" },
    { name: "Phone Number", description: "+918122592..." },
    { name: "Email Address", description: "Prod.rasgems.com | Email Verified" },
    { name: "Add/Delete Business", description: "1 Active Business" }
  ];
  const navigate = useNavigate();
  const handleNavigation = (title: string) => {
    if (title === "Name") navigate("/account/edit-name");
    else if (title === "Phone Number") navigate("/account/edit-phone-number");
    else if (title === "Email Address") navigate("/account/edit-email");
    else if (title === "Add/Delete Business") navigate("/account/business-list");
  };

  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Account Settings</h2>

        <Card className="">
          <CardContent className="p-6">

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
                  onClick={() => handleNavigation(item.name)}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
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
