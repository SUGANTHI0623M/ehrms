import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, DollarSign, CheckCircle, Clock, ChevronRight } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetReimbursementsQuery, useApproveReimbursementMutation, useRejectReimbursementMutation } from "@/store/api/reimbursementApi";
import { message } from "antd";

const Reimbursements = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: reimbursementsData, isLoading } = useGetReimbursementsQuery({
    status: activeTab === "dashboard" ? undefined : activeTab === "pending" ? "Pending" : activeTab === "approved" ? "Approved" : "Paid",
    page: 1,
    limit: 50
  });
  const [approveReimbursement] = useApproveReimbursementMutation();
  const [rejectReimbursement] = useRejectReimbursementMutation();

  const reimbursements = reimbursementsData?.data?.reimbursements || [];

  // Calculate stats from data
  const paid = reimbursements.filter(r => r.status === "Paid");
  const approved = reimbursements.filter(r => r.status === "Approved");
  const pending = reimbursements.filter(r => r.status === "Pending");

  const stats = [
    {
      title: "Reimbursements Paid",
      amount: `₹${paid.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}`,
      claims: `${paid.length} Claims`,
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Reimbursements Approved",
      amount: `₹${approved.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}`,
      claims: `${approved.length} Claims`,
      icon: CheckCircle,
      color: "text-primary",
    },
    {
      title: "Reimbursements Pending",
      amount: `₹${pending.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}`,
      claims: `${pending.length} Claims`,
      icon: Clock,
      color: "text-warning",
    },
  ];

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Reimbursements</h1>

            <Button className="w-full sm:w-auto">New Claim</Button>
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="flex-1 sm:flex-none">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 sm:flex-none">
                Settings
              </TabsTrigger>
            </TabsList>

            {/* DASHBOARD TAB */}
            <TabsContent value="dashboard" className="space-y-6">

              {/* METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>

                    <CardContent>
                      <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>
                        {stat.amount}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{stat.claims}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* TABLE */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle>Reimbursement Claims</CardTitle>

                    <div className="relative w-full sm:w-80 md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search by Claim ID, Staff Name or Staff ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Type</TableHead>
                        <TableHead>Claim ID</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Staff ID</TableHead>
                        <TableHead>Expense Date</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">Loading reimbursements...</TableCell>
                        </TableRow>
                      ) : reimbursements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">No reimbursements found</TableCell>
                        </TableRow>
                      ) : (
                        reimbursements
                          .filter((item) => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return (
                              item.employeeId?.name?.toLowerCase().includes(query) ||
                              item.employeeId?.employeeId?.toLowerCase().includes(query) ||
                              item._id.toLowerCase().includes(query)
                            );
                          })
                          .map((item) => (
                            <TableRow key={item._id}>
                              <TableCell>{item.type}</TableCell>
                              <TableCell>{item._id.slice(-6).toUpperCase()}</TableCell>
                              <TableCell>{item.employeeId?.name}</TableCell>
                              <TableCell>{item.employeeId?.employeeId}</TableCell>
                              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                              <TableCell>₹{item.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                {item.status === "Approved" || item.status === "Paid"
                                  ? `₹${item.amount.toLocaleString()}`
                                  : "-"}
                              </TableCell>
                              <TableCell>{item.approvedBy?.name || "-"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.status === "Approved" || item.status === "Paid" ? "default" : "secondary"}
                                  className={item.status === "Approved" || item.status === "Paid" ? "bg-success" : ""}
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Reimbursement Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Access reimbursement based settings here.
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Reimbursement Templates</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure reimbursement templates and assign to staff.
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Approval Setting</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose admins who will approve reimbursement requests.
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </MainLayout>
  );
};

export default Reimbursements;
