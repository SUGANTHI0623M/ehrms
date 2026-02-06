import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import MainLayout from "@/components/MainLayout";

const Applications = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filters = [
    "Posting Title", "Assessment Name", "Application Status", "Rating",
    "First Name", "Last Name", "Application Stage", "Application ID",
    "Job Opening ID", "Lock Status", "To-Dos", "Notes",
    "Attachment Category", "Account Manager", "Application Owner",
    "Application Source", "Assigned Recruiter(s)", "Associated Tags",
    "Created By", "Created Time", "Date Hired", "Department Name",
    "Email", "Facebook", "Is Attachment Present", "Is Locked",
    "Is Unqualified", "Last Activity Time", "Last emailed", "LinkedIn",
    "Mobile", "Modified By", "Modified Time", "Origin", "Phone",
    "Salutation", "Skill Set", "Twitter"
  ];

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">APPLICATIONS</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          
            <div className="col-span-1 lg:col-span-1 order-1 lg:order-1">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">FILTER APPLICATIONS BY</h3>
                  <ScrollArea className="h-[400px] lg:h-[600px]">
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox id={`filter-${index}`} />
                          <Label htmlFor={`filter-${index}`} className="text-sm cursor-pointer">
                            {filter}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

  
            <div className="col-span-1 lg:col-span-4 order-2 lg:order-2">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Input
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md w-full"
                  />

                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rating</TableHead>
                          <TableHead>Application Name</TableHead>
                          <TableHead>Application Stage</TableHead>
                          <TableHead>Application Status</TableHead>
                          <TableHead>Application ID</TableHead>
                          <TableHead>Posting Title</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No Applications found
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <p className="text-sm text-muted-foreground">10 Records per page</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

        </div>
      </main>
    </MainLayout>

  );
};

export default Applications;
