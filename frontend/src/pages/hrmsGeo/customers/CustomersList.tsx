import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle2, List, Settings, HelpCircle, Plus, Search, Filter, Download, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const CustomersList = () => {
  const customers = [
    { name: "Sowjanya", phone: "+91 9940255566", address: "9, Grand Southern Tr...", email: "-", city: "St. Thomas Mount", pincode: "600016", addedBy: "Laxmanan" },
    { name: "Malathy", phone: "+91 9962700400", address: "24 boganram appartme...", email: "-", city: "Chennai", pincode: "600035", addedBy: "Laxmanan" },
    { name: "Ganesan", phone: "+91 7704077030", address: "New No:3, Vedammal A...", email: "-", city: "Chennai", pincode: "600024", addedBy: "Laxmanan" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Access your customer details, or add more from this page</p>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/customers/settings">Customers Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Customers List</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        Customers Template
                      </Button>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input placeholder="Search by customer name or phone" className="pl-10" />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Customer Name</th>
                          <th className="text-left p-3 text-sm font-medium">Customer Number</th>
                          <th className="text-left p-3 text-sm font-medium">Address</th>
                          <th className="text-left p-3 text-sm font-medium">Email ID</th>
                          <th className="text-left p-3 text-sm font-medium">City</th>
                          <th className="text-left p-3 text-sm font-medium">Pincode</th>
                          <th className="text-left p-3 text-sm font-medium">Added by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <span className="text-blue-600 cursor-pointer">{customer.name}</span>
                            </td>
                            <td className="p-3 text-sm">{customer.phone}</td>
                            <td className="p-3 text-sm">{customer.address}</td>
                            <td className="p-3 text-sm">{customer.email}</td>
                            <td className="p-3 text-sm">{customer.city}</td>
                            <td className="p-3 text-sm">{customer.pincode}</td>
                            <td className="p-3 text-sm">{customer.addedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CustomersList;
