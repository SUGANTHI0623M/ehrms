import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  TrendingUp, 
  Download,
  Search,
  Calendar,
  BarChart3,
  UserCheck,
  UserX,
  LogIn,
  LogOut
} from "lucide-react";
import { useState } from "react";

const HRMSGeoDashboard = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [timeFrame, setTimeFrame] = useState("last7days");
  const [dateRange, setDateRange] = useState("22 Jan '26 - 28 Jan '26");

  // Mock data - replace with actual API calls
  const totalEmployees = 1;
  const notStarted = 0;
  const punchedIn = 1;
  const punchedOut = 1;

  const totalTasks = 0;
  const notYetStarted = 0;
  const delayedTasks = 0;
  const inProgress = 0;
  const completedTasks = 0;

  const customersAddedToday = 0;
  const customersServedToday = 0;

  const distanceData = [
    { date: "22 Jan", distance: 0.5 },
    { date: "23 Jan", distance: 0.3 },
    { date: "24 Jan", distance: 0 },
    { date: "25 Jan", distance: 0 },
    { date: "26 Jan", distance: 0 },
    { date: "27 Jan", distance: 0.2 },
    { date: "28 Jan", distance: 16.5 },
  ];

  const businessOverviewData = [
    {
      name: "Harsha Varthannan",
      staffId: "ASKEVA/MDU-96",
      punchedInAt: "10:30 am",
      punchedOutAt: "07:23 pm",
      totalTasksCompleted: 0,
      totalFormsAdded: 0,
      average: "0 min"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor workforce activity, customer engagement, and task completion rates</p>
          </div>

          {/* Employee Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold mt-1">{totalEmployees}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Not Started</p>
                    <p className="text-2xl font-bold mt-1">{notStarted}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Punched In</p>
                    <p className="text-2xl font-bold mt-1">{punchedIn}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Punched Out</p>
                    <p className="text-2xl font-bold mt-1">{punchedOut}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <LogOut className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-xl font-bold">{totalTasks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Not yet Started</p>
                    <p className="text-xl font-bold">{notYetStarted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delayed Tasks</p>
                    <p className="text-xl font-bold">{delayedTasks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">In progress</p>
                    <p className="text-xl font-bold">{inProgress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-green-500 rounded"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Tasks</p>
                    <p className="text-xl font-bold">{completedTasks}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customers Added Today</p>
                    <p className="text-3xl font-bold mt-1">{customersAddedToday}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  0 no change since yesterday
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customers Served Today</p>
                    <p className="text-3xl font-bold mt-1">{customersServedToday}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  0 no change since yesterday
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Distance Travelled */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Distance Travelled</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    See the distance travelled by your employees for the selected time frame
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="harsha">Harsha Varthannan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeFrame} onValueChange={setTimeFrame}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Time Frame" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last7days">Last 7 days</SelectItem>
                      <SelectItem value="last30days">Last 30 days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{dateRange}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {distanceData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-pink-300 rounded-t hover:bg-pink-400 transition-colors"
                      style={{ height: `${(item.distance / 20) * 100}%`, minHeight: item.distance > 0 ? '4px' : '0' }}
                    ></div>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                <span>0 Km</span>
                <span>5 Km</span>
                <span>10 Km</span>
                <span>15 Km</span>
                <span>20 Km</span>
              </div>
            </CardContent>
          </Card>

          {/* Business Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Business Overview</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    See staff punch-in / punch-out times, number of tasks done, and average task duration
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by name or staff ID"
                      className="pl-10 w-[250px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">29 Jan '26</span>
                  </div>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Staff ID</th>
                      <th className="text-left p-3 text-sm font-medium">Punched In At</th>
                      <th className="text-left p-3 text-sm font-medium">Punched Out At</th>
                      <th className="text-left p-3 text-sm font-medium">Total Tasks Completed</th>
                      <th className="text-left p-3 text-sm font-medium">Total Forms Added</th>
                      <th className="text-left p-3 text-sm font-medium">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessOverviewData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-blue-600 cursor-pointer">{row.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{row.staffId}</td>
                        <td className="p-3 text-sm">{row.punchedInAt}</td>
                        <td className="p-3 text-sm">{row.punchedOutAt}</td>
                        <td className="p-3 text-sm">{row.totalTasksCompleted}</td>
                        <td className="p-3 text-sm">{row.totalFormsAdded}</td>
                        <td className="p-3 text-sm">{row.average}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HRMSGeoDashboard;
