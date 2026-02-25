import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { 
  useGetBusinessFunctionsQuery, 
  useCreateBusinessFunctionMutation, 
  useDeleteBusinessFunctionMutation 
} from "@/store/api/settingsApi";
import { message } from "antd";

export default function BusinessFunctions() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetBusinessFunctionsQuery();
  const [createFunction] = useCreateBusinessFunctionMutation();
  const [deleteFunction] = useDeleteBusinessFunctionMutation();

  const [enabled, setEnabled] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState("");

  useEffect(() => {
    if (data?.data?.functions) {
      setList(data.data.functions.map(f => f.name));
    }
  }, [data]);

  const handleAddFunction = async () => {
    if (!newFunctionName.trim()) {
      message.warning("Please enter a function name");
      return;
    }

    try {
      await createFunction({
        name: newFunctionName.trim(),
        type: "Department"
      }).unwrap();
      setNewFunctionName("");
      setShowAddInput(false);
      message.success("Function added successfully");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to add function");
    }
  };

  const removeItem = async (index: number) => {
    const functionName = list[index];
    const func = data?.data?.functions?.find(f => f.name === functionName);
    
    if (func) {
      try {
        await deleteFunction(func._id).unwrap();
        message.success("Function removed successfully");
      } catch (error: any) {
        message.error(error?.data?.error?.message || "Failed to remove function");
      }
    }
  };

  return (
    <MainLayout>
      <main className="p-4 space-y-6  ">
        <div className="flex items-center gap-3">
          <Button

            size="icon"
           
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h2 className="text-xl md:text-2xl font-bold">Business Functions</h2>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <p className="font-semibold text-lg">Department</p>
          </div>

          <div className="border border-dashed rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  {list.map((item, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm"
                    >
                      {item}
                      <X className="h-4 w-4 cursor-pointer hover:text-red-600" onClick={() => removeItem(i)} />
                    </span>
                  ))}
                  {showAddInput ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newFunctionName}
                        onChange={(e) => setNewFunctionName(e.target.value)}
                        placeholder="Enter function name"
                        className="w-48"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddFunction();
                          if (e.key === "Escape") {
                            setShowAddInput(false);
                            setNewFunctionName("");
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddFunction}>Add</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowAddInput(false);
                        setNewFunctionName("");
                      }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full px-5"
                      onClick={() => setShowAddInput(true)}
                    >
                      Add Value
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <Button 
            variant="outline" 
            className="rounded-lg px-5"
            onClick={() => setShowAddInput(true)}
          >
            + Add Function
          </Button>
        </Card>
      </main>
    </MainLayout>
  );
}
