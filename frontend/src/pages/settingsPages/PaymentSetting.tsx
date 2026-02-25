import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function PaymentSettings() {
    const items = [
        { name: "Business Name in Bank Statement", description: "Not Added" },
        { name: "Business Bank Account", description: "Add Account" },
    ];
    const navigate = useNavigate();

    return (
        <MainLayout>
            <main className="p-4">
                <h2 className="text-2xl font-bold mb-4">Payment Settings</h2>
                <Card className="">
                    <CardContent className="p-6">


                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        if (item.name === "Business Name in Bank Statement") navigate("/payment/business-name");
                                        else if (item.name === "Business Bank Account") navigate("/payment/business-account");
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
