import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetBusinessUsersQuery } from "@/store/api/settingsApi";

export default function ManageUsers() {
  const [tab, setTab] = useState("business-admins");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetBusinessUsersQuery({ 
    roleType: tab,
    search: search || undefined
  });

  const users = data?.data?.users || [];

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "-") return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric" 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <MainLayout>
      <main className="p-4 space-y-6 mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Manage Users</h2>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(value) => {
          setTab(value);
          setSearch(""); // Reset search when switching tabs
        }} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex flex-nowrap gap-2 min-w-max justify-start">
              <TabsTrigger value="business-admins">Business Admins</TabsTrigger>
              <TabsTrigger value="restricted-admins">Restricted Admins</TabsTrigger>
              <TabsTrigger value="reporting-managers">Reporting Managers</TabsTrigger>
              <TabsTrigger value="attendance-supervisors">Attendance Supervisors</TabsTrigger>
            </TabsList>
          </div>

          {/* Business Admins */}
          <TabsContent value="business-admins">
            <div className="flex flex-col md:flex-row justify-end md:items-center gap-3 my-4">
              <Input 
                placeholder="Search by name or phone" 
                className="w-full md:w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button className="w-full md:w-auto">Add Business Admins</Button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-left">Phone Number</th>
                    <th className="py-2 px-3 text-left">Assigned Businesses</th>
                    <th className="py-2 px-3 text-left">Added On</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="border-b hover:bg-muted/40 transition">
                        <td className="py-2 px-3">
                          {u.name}
                          {u.role && (
                            <span className="rounded bg-purple-200 text-purple-700 px-2 text-xs ml-2">
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">{u.phone || "-"}</td>
                        <td className="py-2 px-3">All</td>
                        <td className="py-2 px-3">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading...</div>
              ) : users.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No users found</div>
              ) : (
                users.map((u) => (
                  <div key={u._id} className="border rounded-lg p-4 space-y-1 bg-white shadow-sm">
                    <p className="font-semibold">
                      {u.name}{" "}
                      {u.role && (
                        <span className="rounded bg-purple-200 text-purple-700 px-2 text-xs ml-2">
                          {u.role}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground"><strong>Phone:</strong> {u.phone || "-"}</p>
                    <p className="text-sm text-muted-foreground"><strong>Businesses:</strong> All</p>
                    <p className="text-sm text-muted-foreground"><strong>Added On:</strong> {formatDate(u.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="restricted-admins">
            <div className="flex flex-col md:flex-row justify-end md:items-center gap-3 my-4">
              <Input 
                placeholder="Search by name or phone" 
                className="w-full md:w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button className="w-full md:w-auto">Add Restricted Admins</Button>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No restricted admins added yet.</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u._id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground"><strong>Phone:</strong> {u.phone || "-"}</p>
                    <p className="text-sm text-muted-foreground"><strong>Added On:</strong> {formatDate(u.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reporting-managers">
            <div className="flex flex-col md:flex-row justify-end md:items-center gap-3 my-4">
              <Input 
                placeholder="Search by name or phone" 
                className="w-full md:w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button className="w-full md:w-auto">Add Reporting Managers</Button>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No reporting managers added yet.</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u._id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground"><strong>Phone:</strong> {u.phone || "-"}</p>
                    <p className="text-sm text-muted-foreground"><strong>Added On:</strong> {formatDate(u.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance-supervisors">
            <div className="flex flex-col md:flex-row justify-end md:items-center gap-3 my-4">
              <Input 
                placeholder="Search by name or phone" 
                className="w-full md:w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button className="w-full md:w-auto">Add Attendance Supervisors</Button>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No attendance supervisors added yet.</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u._id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground"><strong>Phone:</strong> {u.phone || "-"}</p>
                    <p className="text-sm text-muted-foreground"><strong>Added On:</strong> {formatDate(u.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </MainLayout>
  );
}
