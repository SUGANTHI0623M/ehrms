import { Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Receipt, ArrowRight } from "lucide-react";

const PayrollHub = () => {
  const modules = [
    {
      title: "Payroll Hub",
      description: "Overview and quick access to payroll management",
      icon: Home,
      path: "/payroll",
      color: "from-primary/10 to-primary/5",
      iconColor: "text-primary"
    },
    {
      title: "Payroll Management",
      description: "Process payroll, manage employee salaries, deductions, and generate payslips",
      icon: Receipt,
      path: "/payroll/management",
      color: "from-success/10 to-success/5",
      iconColor: "text-success"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-64 mt-16 p-8">
        <div className=" mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module, index) => (
              <Link to={module.path} key={index}>
                <Card className={`bg-gradient-to-br ${module.color} border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer h-full`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-lg bg-background flex items-center justify-center ${module.iconColor}`}>
                        <module.icon className="w-6 h-6" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
                  <p className="text-2xl font-bold text-foreground">66</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Payroll</p>
                  <p className="text-2xl font-bold text-primary">₹45.2L</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Present Today</p>
                  <p className="text-2xl font-bold text-success">26</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Pending Claims</p>
                  <p className="text-2xl font-bold text-warning">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PayrollHub;