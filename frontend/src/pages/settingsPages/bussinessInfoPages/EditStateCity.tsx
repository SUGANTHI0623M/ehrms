import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function EditStateCity() {
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
          <h2 className="text-xl md:text-2xl font-bold">Business State & City</h2>
        </div>

        <Card className="w-full max-w-xl shadow-md">
          <CardHeader className="flex justify-between items-center pb-0">
            <CardTitle className="text-lg font-bold">Business State & City</CardTitle>
            {/* <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5" />
            </Button> */}
          </CardHeader>

          <CardContent className="mt-4 space-y-6">
            <div>
              <label className="text-sm font-medium">State</label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tamilnadu">Tamil Nadu</SelectItem>
                  <SelectItem value="karnataka">Karnataka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">City</label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosur">Hosur</SelectItem>
                  <SelectItem value="chennai">Chennai</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
