import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function EditBusinessAddress() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4 max-w-5xl mx-auto flex flex-col items-center space-y-6">
        <div className="flex items-center gap-3 self-start">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Business Address</h2>
        </div>

        <Card className="w-full max-w-xl shadow-md">
          <CardHeader className="flex justify-between items-center pb-0">
            <CardTitle className="text-lg font-bold">Business Address</CardTitle>
            {/* <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5" />
            </Button> */}
          </CardHeader>

          <CardContent className="mt-4 space-y-4">
            <Input placeholder="Address Line 1" />
            <Input placeholder="Address Line 2" />
            <Input placeholder="City" />
            <Input placeholder="State" />
            <Input placeholder="Pincode" />

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button className="w-full sm:w-auto">Save</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
