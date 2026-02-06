import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function BusinessInfo() {
  const items = [
    { name: "Business Name", description: "AbhiRushi Coders LLP" },
    { name: "Business State & City", description: "Tamil Nadu / Sivasi" },
    { name: "Business Address", description: "R.A. IT Services, Sivasi, Tamil Nadu 626189, IN" },
    { name: "Business Logo", description: "Logo Added" }
  ];
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Business Info</h2>
        <Card className="">
          <CardContent className="p-6">


            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.name === "Business Name") navigate("/business-info/edit-business-name");
                    else if (item.name === "Business State & City") navigate("/business-info/edit-state-city");
                    else if (item.name === "Business Address") navigate("/business-info/edit-business-address");
                    else if (item.name === "Business Logo") navigate("/business-info/edit-business-logo");
                  }}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
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
