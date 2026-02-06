import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function BusinessNameBankStatement() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4  flex flex-col items-center space-y-6">
        <div className="flex items-center gap-3 self-start">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">
            Business Name in Bank Statement
          </h2>
        </div>

        <Card className="w-full max-w-xl shadow-md">
          <CardHeader className="flex justify-between items-center pb-0">
            <CardTitle className="text-lg font-bold">
              Business Name in Bank Statement
            </CardTitle>
            {/* <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5" />
            </Button> */}
          </CardHeader>

          <CardContent className="mt-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              Your staff will see the provided business name in their bank statement
              against the credited salary.
            </p>

            <div>
              <label className="text-sm font-medium">Business Name</label>
              <Input placeholder="Enter business name" maxLength={25} />
              <p className="text-xs text-muted-foreground mt-1">
                Only alphabets • Character limit: 25
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
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
