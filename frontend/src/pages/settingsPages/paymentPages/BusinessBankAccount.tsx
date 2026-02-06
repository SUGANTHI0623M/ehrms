import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function BusinessBankAccount() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4  space-y-6">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Business Bank Account</h2>
        </div>

        <Card className="w-full max-w-xl mx-auto shadow-md">
          <div className="flex justify-between items-center p-4 pb-0">
            <CardTitle className="text-lg font-bold">Bank Account Details</CardTitle>
            {/* <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5" />
            </Button> */}
          </div>

          <CardContent className="p-4 space-y-5">
            <div>
              <label className="text-sm font-medium">Account Holder Name</label>
              <Input placeholder="Enter Account Holder Name" />
            </div>

            <div>
              <label className="text-sm font-medium">Account Number</label>
              <Input placeholder="Account Number" />
            </div>

            <div>
              <label className="text-sm font-medium">Confirm Account Number</label>
              <Input placeholder="Account Number" />
            </div>

            <div>
              <label className="text-sm font-medium">
                IFSC Code (Of Provided Bank Account)
              </label>
              <Input placeholder="Enter IFSC Code" />
            </div>

            <Button className="w-full mt-3">Save</Button>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
