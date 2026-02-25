import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const SalaryOverview = () => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>("september");
  const navigate = useNavigate();


  const months = [
    {
      id: "november",
      name: "November 2025",
      duration: "01 November 2025 - 30 November 2025",
      dueAmount: "₹ 10,226.39"
    },
    {
      id: "october",
      name: "October 2025",
      duration: "01 October 2025 - 31 October 2025",
      dueAmount: "₹ 30,726.24"
    },
    {
      id: "september",
      name: "September 2025",
      duration: "01 September 2025 - 30 September 2025",
      dueAmount: "₹ 13,689.30"
    }
  ];

  const earnings = [
    { label: "BASIC", full: "₹ 19,765", actual: "₹ 8,052.41" },
    { label: "HRA", full: "₹ 3,953", actual: "₹ 1,610.48" },
    { label: "DA", full: "₹ 9,882.50", actual: "₹ 4,026.20" },
    { label: "Special Allowance", full: "₹ 0.50", actual: "₹ 0.20" }
  ];

  const toggleMonth = (monthId: string) => {
    setExpandedMonth(expandedMonth === monthId ? null : monthId);
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className=" mx-auto space-y-6">
          <div className="flex items-center gap-4 justify-end">
            <Button onClick={() => navigate("/staff")}>
              staff
            </Button>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-xl">AA</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">AARTHI B</h2>
                    <p className="text-muted-foreground">ID ASKEVA/MDU-106 | REGULAR (Monthly Regular)</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Edit Details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-6">
            <div className="w-64 space-y-2">
              <Button variant="ghost" className="w-full justify-start">Profile</Button>
              <Button variant="ghost" className="w-full justify-start">Attendance</Button>
              <Button variant="default" className="w-full justify-start">Salary Overview</Button>
              <Button variant="ghost" className="w-full justify-start">YTD Statement</Button>
              <Button variant="ghost" className="w-full justify-start">Salary Structure</Button>
              <Button variant="ghost" className="w-full justify-start">Loans</Button>
              <Button variant="ghost" className="w-full justify-start">Leave(s)</Button>
              <Button variant="ghost" className="w-full justify-start">Tax Declaration</Button>
              <Button variant="ghost" className="w-full justify-start">Pol Submission</Button>
              <Button variant="ghost" className="w-full justify-start">FBP Declaration</Button>
              <Button variant="ghost" className="w-full justify-start">FBP claims</Button>
              <Button variant="ghost" className="w-full justify-start">Expense Claims</Button>
              <Button variant="ghost" className="w-full justify-start">Document Centre</Button>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Salary Overview</h2>
                <div className="flex gap-2">
                  <Button variant="outline">Actions</Button>
                  <Button variant="outline">Add Previous Month</Button>
                  <Button>Generate Salary Slip</Button>
                </div>
              </div>

              <div className="space-y-4">
                {months.map((month) => (
                  <Card key={month.id}>
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleMonth(month.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{month.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{month.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Due Amount</p>
                            <p className="text-xl font-bold">{month.dueAmount}</p>
                          </div>
                          {expandedMonth === month.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedMonth === month.id && (
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <h3 className="font-semibold mb-4">Earnings</h3>
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 text-sm font-semibold text-muted-foreground">
                                <div></div>
                                <div className="text-right">Full</div>
                                <div className="text-right">Actual</div>
                              </div>
                              {earnings.map((earning, index) => (
                                <div key={index} className="grid grid-cols-3 text-sm">
                                  <div>{earning.label}</div>
                                  <div className="text-right">{earning.full}</div>
                                  <div className="text-right">{earning.actual}</div>
                                </div>
                              ))}
                              <div className="grid grid-cols-3 pt-2 border-t font-semibold">
                                <div>Gross Earnings</div>
                                <div className="text-right"></div>
                                <div className="text-right">₹ 13,689.30</div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-4">Deductions</h3>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 text-sm font-semibold text-muted-foreground">
                                <div></div>
                                <div className="text-right">Actual</div>
                              </div>
                              <div className="grid grid-cols-2 pt-2 border-t font-semibold">
                                <div>Total Deductions</div>
                                <div className="text-right">₹ 0</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-semibold">Net Payable Amount (Gross Earnings - Total Deductions)</span>
                            <span className="font-semibold">11 Payable Days</span>
                            <span className="font-bold text-lg">₹ 13,689.30</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Adjustments</span>
                            <span>₹ 0</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Advance Payments</span>
                            <span>₹ 0</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Due Amount: ₹ 13,689.30</span>
                            <Button variant="destructive" size="sm">Delete Month</Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SalaryOverview;
