import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, X, Calendar, Wallet, FileText, Receipt, Download, Upload, Trash2, XCircle, ChevronDown, ChevronRight, DollarSign, Clock, CheckCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useSearchParams } from "react-router-dom";
import { message } from "antd";
import {
  useGetLeavesQuery,
  useCreateLeaveMutation,
  useCancelLeaveMutation,
  Leave,
} from "@/store/api/leaveApi";
import {
  useGetLoansQuery,
  useCreateLoanMutation,
} from "@/store/api/loanApi";
import {
  useGetReimbursementsQuery,
  useCreateReimbursementMutation,
} from "@/store/api/reimbursementApi";
import {
  useGetPayslipRequestsQuery,
  useCreatePayslipRequestMutation,
} from "@/store/api/payslipRequestApi";
import { useLazyViewPayslipQuery, useGetPayrollsQuery } from "@/store/api/payrollApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetLeaveTemplateByIdQuery, useGetBusinessQuery } from "@/store/api/settingsApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import EmployeeLeaveDashboard, {
  type LeaveSummaryRow,
  type TotalRequestsSummary,
} from "@/components/leave/EmployeeLeaveDashboard";
import EmployeeRequestsDashboard from "@/components/requests/EmployeeRequestsDashboard";
import RequestSummaryCards from "@/components/requests/RequestSummaryCards";
import EmployeeLoanDashboard from "@/components/loan/EmployeeLoanDashboard";
import EmployeeExpenseDashboard from "@/components/expense/EmployeeExpenseDashboard";
import EmployeePayslipDashboard from "@/components/payslip/EmployeePayslipDashboard";
import { WalletOutlined, FileTextOutlined } from "@ant-design/icons";

const EmployeeRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "leave";

  // Leave state
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leavePage, setLeavePage] = useState(1);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: "" as any,
    startDate: "",
    endDate: "",
    reason: "",
    halfDayType: "" as "First Half Day" | "Second Half Day" | "", // For Half Day leave
  });

  // Loan state
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [loanPage, setLoanPage] = useState(1);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [loanFormData, setLoanFormData] = useState({
    loanType: "Personal" as const,
    amount: "",
    purpose: "",
    tenure: "",
    interestRate: "0",
  });

  // Expense/Reimbursement state
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [expensePage, setExpensePage] = useState(1);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    type: "Travel" as const,
    amount: "",
    description: "",
    date: "",
  });
  const [expenseProofFiles, setExpenseProofFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payslip Request state
  const [payslipSearch, setPayslipSearch] = useState("");
  const [payslipStatusFilter, setPayslipStatusFilter] = useState("all");
  const [payslipPage, setPayslipPage] = useState(1);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [payslipFormData, setPayslipFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    reason: "",
  });

  // Debounce refs
  const leaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loanDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const expenseDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const payslipDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [debouncedLeaveSearch, setDebouncedLeaveSearch] = useState("");
  const [debouncedLoanSearch, setDebouncedLoanSearch] = useState("");
  const [debouncedExpenseSearch, setDebouncedExpenseSearch] = useState("");
  const [debouncedPayslipSearch, setDebouncedPayslipSearch] = useState("");

  // Debounce functions
  useEffect(() => {
    if (leaveDebounceRef.current) clearTimeout(leaveDebounceRef.current);
    leaveDebounceRef.current = setTimeout(() => {
      setDebouncedLeaveSearch(leaveSearch);
      setLeavePage(1);
    }, 500);
    return () => {
      if (leaveDebounceRef.current) clearTimeout(leaveDebounceRef.current);
    };
  }, [leaveSearch]);

  useEffect(() => {
    if (loanDebounceRef.current) clearTimeout(loanDebounceRef.current);
    loanDebounceRef.current = setTimeout(() => {
      setDebouncedLoanSearch(loanSearch);
      setLoanPage(1);
    }, 500);
    return () => {
      if (loanDebounceRef.current) clearTimeout(loanDebounceRef.current);
    };
  }, [loanSearch]);

  useEffect(() => {
    if (expenseDebounceRef.current) clearTimeout(expenseDebounceRef.current);
    expenseDebounceRef.current = setTimeout(() => {
      setDebouncedExpenseSearch(expenseSearch);
      setExpensePage(1);
    }, 500);
    return () => {
      if (expenseDebounceRef.current) clearTimeout(expenseDebounceRef.current);
    };
  }, [expenseSearch]);

  useEffect(() => {
    if (payslipDebounceRef.current) clearTimeout(payslipDebounceRef.current);
    payslipDebounceRef.current = setTimeout(() => {
      setDebouncedPayslipSearch(payslipSearch);
      setPayslipPage(1);
    }, 500);
    return () => {
      if (payslipDebounceRef.current) clearTimeout(payslipDebounceRef.current);
    };
  }, [payslipSearch]);

  // API Queries - Only fetch when respective tab is active (lazy loading)
  const { data: allLeavesForDashboard } = useGetLeavesQuery(
    { page: 1, limit: 500 },
    { skip: activeTab !== "leave" }
  );
  const { data: leavesData, isLoading: isLoadingLeaves } = useGetLeavesQuery({
    status: leaveStatusFilter !== "all" ? leaveStatusFilter : undefined,
    search: debouncedLeaveSearch || undefined,
    page: leavePage,
    limit: 10,
  }, {
    skip: activeTab !== "leave"
  });

  const { data: loansData, isLoading: isLoadingLoans } = useGetLoansQuery({
    status: loanStatusFilter !== "all" ? loanStatusFilter : undefined,
    search: debouncedLoanSearch || undefined,
    page: loanPage,
    limit: 10,
  }, {
    skip: activeTab !== "loan"
  });
  const { data: allLoansForDashboard } = useGetLoansQuery(
    { page: 1, limit: 500 },
    { skip: activeTab !== "loan" }
  );

  const { data: expensesData, isLoading: isLoadingExpenses } = useGetReimbursementsQuery({
    status: expenseStatusFilter !== "all" ? expenseStatusFilter : undefined,
    search: debouncedExpenseSearch || undefined,
    page: expensePage,
    limit: 10,
  }, {
    skip: activeTab !== "expense"
  });
  const { data: allExpensesForDashboard } = useGetReimbursementsQuery(
    { page: 1, limit: 500 },
    { skip: activeTab !== "expense" }
  );

  const { data: payslipRequestsData, isLoading: isLoadingPayslips } = useGetPayslipRequestsQuery({
    status: payslipStatusFilter !== "all" ? payslipStatusFilter : undefined,
    search: debouncedPayslipSearch || undefined,
    page: payslipPage,
    limit: 10,
  }, {
    skip: activeTab !== "payslip"
  });
  const { data: allPayslipsForDashboard } = useGetPayslipRequestsQuery(
    { page: 1, limit: 500 },
    { skip: activeTab !== "payslip" }
  );

  // Mutations
  const [createLeave, { isLoading: isCreatingLeave }] = useCreateLeaveMutation();
  const [cancelLeave, { isLoading: isCancellingLeave }] = useCancelLeaveMutation();
  const [createLoan, { isLoading: isCreatingLoan }] = useCreateLoanMutation();
  const [createExpense, { isLoading: isCreatingExpense }] = useCreateReimbursementMutation();
  const [createPayslipRequest, { isLoading: isCreatingPayslip }] = useCreatePayslipRequestMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();

  // Fetch employee profile to get leave template
  const { data: employeeProfileData } = useGetEmployeeProfileQuery(undefined, {
    skip: activeTab !== "leave"
  });
  
  const leaveTemplateId = employeeProfileData?.data?.staffData?.leaveTemplateId;
  const leaveTemplateIdStr = typeof leaveTemplateId === 'string' 
    ? leaveTemplateId 
    : (leaveTemplateId && typeof leaveTemplateId === 'object' && '_id' in leaveTemplateId)
      ? leaveTemplateId._id
      : '';
  
  // Fetch leave template details
  const { data: leaveTemplateData } = useGetLeaveTemplateByIdQuery(leaveTemplateIdStr, {
    skip: !leaveTemplateIdStr || activeTab !== "leave"
  });

  // Fetch holidays for current year (for Holidays row — same as This Month Attendance on dashboard)
  const { data: holidaysData } = useGetEmployeeHolidaysQuery(
    { year: new Date().getFullYear(), limit: 50, page: 1 },
    { skip: activeTab !== "leave" }
  );

  // Get weekly holiday settings from staff template or business settings
  const { data: businessData } = useGetBusinessQuery(undefined, { skip: activeTab !== "leave" });
  
  // Check if staff has a weekly holiday template assigned
  const staffData = employeeProfileData?.data?.staffData;
  const weeklyHolidayTemplate = (staffData as any)?.weeklyHolidayTemplateId;
  const isWeeklyHolidayTemplatePopulated = weeklyHolidayTemplate && 
    typeof weeklyHolidayTemplate === 'object' && 
    (weeklyHolidayTemplate as any).settings;
  
  // Extract weekly holiday settings - priority: staff template > business settings
  const weeklyHolidaySettings = useMemo(() => {
    if (isWeeklyHolidayTemplatePopulated) {
      // Use staff's weekly holiday template (if isActive is not present, assume it's active)
      const template = weeklyHolidayTemplate as any;
      const isActive = template.isActive !== undefined ? template.isActive : true;
      
      if (isActive && template.settings) {
        return {
          weeklyOffPattern: template.settings?.weeklyOffPattern || "standard",
          weeklyHolidays: template.settings?.weeklyHolidays || [],
          allowAttendanceOnWeeklyOff: template.settings?.allowAttendanceOnWeeklyOff || false
        };
      }
    }
    
    // Fall back to business settings
    return {
      weeklyOffPattern: businessData?.data?.business?.settings?.business?.weeklyOffPattern || "standard",
      weeklyHolidays: businessData?.data?.business?.settings?.business?.weeklyHolidays || [],
      allowAttendanceOnWeeklyOff: businessData?.data?.business?.settings?.business?.allowAttendanceOnWeeklyOff || false
    };
  }, [weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, businessData, staffData]);
  
  const weeklyOffPattern = weeklyHolidaySettings.weeklyOffPattern;
  const weeklyHolidays = weeklyHolidaySettings.weeklyHolidays;
  
  // Get available leave types from template
  const availableLeaveTypes = leaveTemplateData?.data?.template?.leaveTypes || [];

  const leaves = leavesData?.data?.leaves || [];
  const loans = loansData?.data?.loans || [];
  const expenses = expensesData?.data?.reimbursements || [];
  const payslipRequests = payslipRequestsData?.data?.requests || [];

  // Fetch payrolls to get loan EMI payment information
  const { data: payrollsData } = useGetPayrollsQuery(
    { limit: 1000 },
    { skip: activeTab !== "loan" }
  );
  const payrolls = payrollsData?.data?.payrolls || [];

  // Create a map to track which payroll month/year each loan EMI was paid in
  const loanEMIPaymentMap = useMemo(() => {
    const map = new Map<string, Map<string, { month: number; year: number }>>();
    
    payrolls.forEach((payroll: any) => {
      if (!payroll.components || !Array.isArray(payroll.components)) return;
      
      payroll.components.forEach((component: any) => {
        // Check if this component is a loan EMI deduction
        if (component.type === 'deduction' && component.name?.includes('Loan EMI')) {
          const loanId = component.loanId;
          const installmentDueDate = component.installmentDueDate;
          
          if (loanId && installmentDueDate) {
            // Convert due date to string key (YYYY-MM-DD format)
            const dueDateStr = new Date(installmentDueDate).toISOString().split('T')[0];
            
            if (!map.has(loanId)) {
              map.set(loanId, new Map());
            }
            
            const loanMap = map.get(loanId)!;
            loanMap.set(dueDateStr, {
              month: payroll.month,
              year: payroll.year
            });
          }
        }
      });
    });
    
    return map;
  }, [payrolls]);

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
  };

  /** Days of a leave (start..end) that fall in the given month. */
  const getLeaveDaysInMonth = (startDate: string, endDate: string, year: number, month: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const overlapStart = start < monthStart ? monthStart : start;
    const overlapEnd = end > monthEnd ? monthEnd : end;
    if (overlapStart > overlapEnd) return 0;
    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  };

  // Dashboard data for Leave tab: leave summary rows + total requests this month (all from props / API)
  const leaveDashboardData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allLeaves = allLeavesForDashboard?.data?.leaves ?? [];
    const template = leaveTemplateData?.data?.template;
    const leaveTypes = template?.leaveTypes ?? [];

    const casualConfig = leaveTypes.find((lt: any) => lt.type === "Casual Leave");
    const casualTotal = casualConfig?.days ?? 0;
    const casualCompleted = allLeaves
      .filter((l: any) => l.status === "Approved" && l.leaveType === "Casual Leave")
      .reduce((sum: number, l: any) => sum + getLeaveDaysInMonth(l.startDate, l.endDate, currentYear, currentMonth), 0);
    const casualAvailable = Math.max(0, casualTotal - casualCompleted);

    // Half Day: fixed total of 2 per month; completed = half days used (from backend leaves), available = 2 - completed
    const HALF_DAY_TOTAL = 2;
    const halfDayCompleted = allLeaves
      .filter((l: any) => l.status === "Approved" && l.leaveType === "Half Day")
      .reduce((sum: number, l: any) => {
        const inMonth = getLeaveDaysInMonth(l.startDate, l.endDate, currentYear, currentMonth) > 0;
        return sum + (inMonth ? (l.days ?? 0.5) : 0);
      }, 0);
    const halfDayAvailable = Math.max(0, HALF_DAY_TOTAL - halfDayCompleted);

    // Holidays: from employee's holiday template (same API as This Month Attendance on dashboard) — count for current month
    const holidays = holidaysData?.data?.holidays ?? [];
    const holidaysInMonth = holidays.filter(
      (h: { date: string }) =>
        new Date(h.date).getFullYear() === currentYear &&
        new Date(h.date).getMonth() + 1 === currentMonth
    ).length;

    // Week-end: from business mapped template (weeklyOffPattern / weeklyHolidays — same as This Month Attendance)
    const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
    const totalDaysInMonth = getDaysInMonth(currentYear, currentMonth);
    let weekendCount = 0;
    if (weeklyOffPattern === "oddEvenSaturday") {
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) weekendCount++;
        else if (dayOfWeek === 6 && day % 2 === 0) weekendCount++;
      }
    } else {
      if (weeklyHolidays.length > 0) {
        const offDays = new Set(weeklyHolidays.map((h: { day: number }) => h.day));
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const date = new Date(currentYear, currentMonth - 1, day);
          if (offDays.has(date.getDay())) weekendCount++;
        }
      } else {
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const date = new Date(currentYear, currentMonth - 1, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++;
        }
      }
    }

    const leaveSummaryRows: LeaveSummaryRow[] = [
      { type: "Week-end", total: weekendCount, completed: 0, available: weekendCount },
      { type: "Casual Leave", total: casualTotal, completed: casualCompleted, available: casualAvailable },
      { type: "Half Day", total: HALF_DAY_TOTAL, completed: halfDayCompleted, available: halfDayAvailable },
      { type: "Holidays", total: holidaysInMonth, completed: 0, available: holidaysInMonth },
    ];
    const totalLeaveCount = leaveSummaryRows.reduce((s, r) => s + r.total, 0);

    const leavesThisMonth = allLeaves.filter((l: any) => {
      const d = new Date(l.startDate);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    });
    const approvedCount = leavesThisMonth.filter((l: any) => l.status === "Approved").length;
    const rejectedCount = leavesThisMonth.filter((l: any) => l.status === "Rejected").length;
    const pendingCount = leavesThisMonth.filter((l: any) => l.status === "Pending").length;
    const totalRequestsSummary: TotalRequestsSummary = {
      totalRequests: leavesThisMonth.length,
      approvedCount,
      rejectedCount,
      pendingCount,
    };

    return { leaveSummaryRows, totalLeaveCount, totalRequestsSummary };
  }, [allLeavesForDashboard?.data?.leaves, leaveTemplateData?.data?.template, holidaysData?.data?.holidays, weeklyOffPattern, weeklyHolidays]);

  // Loan dashboard: monthly + all-time for RequestSummaryCards
  const loanSummaryData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allLoans = allLoansForDashboard?.data?.loans ?? [];
    const loansThisMonth = allLoans.filter((l: any) => {
      const created = l.createdAt ? new Date(l.createdAt) : null;
      if (!created) return false;
      return created.getFullYear() === currentYear && created.getMonth() + 1 === currentMonth;
    });
    const monthlyAmount = loansThisMonth.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
    return {
      monthly: {
        totalAmount: monthlyAmount,
        totalRequests: loansThisMonth.length,
        approved: loansThisMonth.filter((l: any) => l.status === "Approved").length,
        pending: loansThisMonth.filter((l: any) => l.status === "Pending").length,
        rejected: loansThisMonth.filter((l: any) => l.status === "Rejected").length,
        active: loansThisMonth.filter((l: any) => l.status === "Active").length,
      },
      allTime: {
        totalRequests: allLoans.length,
        approved: allLoans.filter((l: any) => l.status === "Approved").length,
        pending: allLoans.filter((l: any) => l.status === "Pending").length,
        rejected: allLoans.filter((l: any) => l.status === "Rejected").length,
        active: allLoans.filter((l: any) => l.status === "Active").length,
      },
    };
  }, [allLoansForDashboard?.data?.loans]);

  // Expense dashboard: monthly + all-time for RequestSummaryCards
  const expenseSummaryData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allExpenses = allExpensesForDashboard?.data?.reimbursements ?? [];
    const expensesThisMonth = allExpenses.filter((e: any) => {
      const d = e.date ? new Date(e.date) : null;
      if (!d) return false;
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    });
    const monthlyAmount = expensesThisMonth.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const paidCount = (arr: any[]) => arr.filter((e: any) => e.status === "Paid" || e.status === "Processed").length;
    return {
      monthly: {
        totalAmount: monthlyAmount,
        totalRequests: expensesThisMonth.length,
        approved: expensesThisMonth.filter((e: any) => e.status === "Approved").length,
        pending: expensesThisMonth.filter((e: any) => e.status === "Pending").length,
        rejected: expensesThisMonth.filter((e: any) => e.status === "Rejected").length,
        paid: paidCount(expensesThisMonth),
      },
      allTime: {
        totalRequests: allExpenses.length,
        approved: allExpenses.filter((e: any) => e.status === "Approved").length,
        pending: allExpenses.filter((e: any) => e.status === "Pending").length,
        rejected: allExpenses.filter((e: any) => e.status === "Rejected").length,
        paid: paidCount(allExpenses),
      },
    };
  }, [allExpensesForDashboard?.data?.reimbursements]);

  // Payslip dashboard: this month's requests (by request month/year) and status breakdown
  const payslipDashboardData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allPayslips = allPayslipsForDashboard?.data?.requests ?? [];
    const payslipsThisMonth = allPayslips.filter((r: any) => r.year === currentYear && r.month === currentMonth);
    return {
      totalRequests: payslipsThisMonth.length,
      approvedCount: payslipsThisMonth.filter((r: any) => r.status === "Approved").length,
      rejectedCount: payslipsThisMonth.filter((r: any) => r.status === "Rejected").length,
      pendingCount: payslipsThisMonth.filter((r: any) => r.status === "Pending").length,
    };
  }, [allPayslipsForDashboard?.data?.requests]);

  // Set default leave type from template if available (first one from template)
  useEffect(() => {
    if (availableLeaveTypes.length > 0) {
      const firstLeaveType = availableLeaveTypes[0].type;
      if (!leaveFormData.leaveType || leaveFormData.leaveType === "") {
        setLeaveFormData(prev => ({
          ...prev,
          leaveType: firstLeaveType as any
        }));
      } else {
        // Validate that selected leave type is still in template
        const isValidType = availableLeaveTypes.some(lt => lt.type === leaveFormData.leaveType);
        if (!isValidType) {
          setLeaveFormData(prev => ({
            ...prev,
            leaveType: firstLeaveType as any
          }));
        }
      }
    }
  }, [availableLeaveTypes]);

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const style: Record<string, string> = {
      Approved: "bg-[#fef3c7] text-[#b45309] hover:bg-[#fef3c7] border-0",
      Pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0",
      Rejected: "bg-red-100 text-red-800 hover:bg-red-100 border-0",
      Cancelled: "bg-gray-100 text-gray-600 hover:bg-gray-100 border-0",
    };
    return (
      <Badge variant="outline" className={style[status] || ""}>
        {status}
      </Badge>
    );
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateEMI = (amount: number, tenure: number, interestRate: number) => {
    if (interestRate === 0) return amount / tenure;
    const monthlyRate = interestRate / 100 / 12;
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1);
  };

  const handleCreateLeave = async () => {
    try {
      // Validate leave type
      if (!leaveFormData.leaveType) {
        message.error("Please select a leave type");
        return;
      }

      // For Half Day, validate halfDayType
      if (leaveFormData.leaveType === "Half Day" && !leaveFormData.halfDayType) {
        message.error("Please select Half Day Type (First Half Day or Second Half Day)");
        return;
      }

      // Validate dates
      if (!leaveFormData.startDate || !leaveFormData.endDate) {
        message.error("Please select both start and end dates");
        return;
      }

      const startDate = new Date(leaveFormData.startDate);
      const endDate = new Date(leaveFormData.endDate);
      
      if (endDate < startDate) {
        message.error("End date cannot be before start date");
        return;
      }

      // For Half Day, start and end date should be the same
      if (leaveFormData.leaveType === "Half Day" && leaveFormData.startDate !== leaveFormData.endDate) {
        message.error("For Half Day leave, start date and end date must be the same");
        return;
      }

      // Calculate days - Half Day is always 0.5 days
      const days = leaveFormData.leaveType === "Half Day" ? 0.5 : calculateDays(leaveFormData.startDate, leaveFormData.endDate);
      
      // Validate against available leave types from template (skip for Unpaid Leave and Half Day)
      if (leaveFormData.leaveType !== "Unpaid Leave" && leaveFormData.leaveType !== "Half Day" && availableLeaveTypes.length > 0) {
        const selectedLeaveType = availableLeaveTypes.find(
          (lt: any) => lt.type === leaveFormData.leaveType
        );
        
        if (selectedLeaveType) {
          // All leave types are validated per month
          if (days > selectedLeaveType.days) {
            message.error(
              `${leaveFormData.leaveType} leave request exceeds monthly limit. Monthly limit: ${selectedLeaveType.days} days, Requested: ${days} days`
            );
            return;
          }
        }
      }

      const leaveData: Partial<Leave> = {
        leaveType: leaveFormData.leaveType,
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        reason: leaveFormData.reason,
        days,
      };
      
      if (leaveFormData.leaveType === "Half Day" && leaveFormData.halfDayType) {
        leaveData.halfDayType = leaveFormData.halfDayType as 'First Half Day' | 'Second Half Day';
      }

      await createLeave(leaveData).unwrap();
      message.success("Leave request submitted successfully!");
      setIsLeaveDialogOpen(false);
      setLeaveFormData({
        leaveType: availableLeaveTypes.length > 0 ? availableLeaveTypes[0].type : "",
        startDate: "",
        endDate: "",
        reason: "",
        halfDayType: "",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit leave request");
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      await cancelLeave(id).unwrap();
      message.success("Leave request cancelled");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to cancel leave");
    }
  };

  // Available balance for selected leave type (yearly allocated - approved used this year)
  const leaveTypeAvailableBalance = (() => {
    if (!leaveFormData.leaveType || leaveFormData.leaveType === "Unpaid Leave" || leaveFormData.leaveType === "Half Day") return null;
    const lt = availableLeaveTypes.find((t: any) => t.type === leaveFormData.leaveType);
    if (!lt) return null;
    const yearly = lt.days * 12;
    const currentYear = new Date().getFullYear();
    const used = (allLeavesForDashboard?.data?.leaves ?? [])
      .filter((l: any) => l.leaveType === leaveFormData.leaveType && l.status === "Approved" && new Date(l.startDate).getFullYear() === currentYear)
      .reduce((s: number, l: any) => s + (l.days ?? 0), 0);
    return { yearly, used, available: Math.max(0, yearly - used) };
  })();

  const leaveModalDateError = leaveFormData.startDate && leaveFormData.endDate && new Date(leaveFormData.endDate) < new Date(leaveFormData.startDate)
    ? "End date cannot be before start date"
    : leaveFormData.leaveType === "Half Day" && leaveFormData.startDate && leaveFormData.endDate && leaveFormData.startDate !== leaveFormData.endDate
    ? "For Half Day, start and end date must be the same"
    : null;

  const handleCreateLoan = async () => {
    try {
      const amount = Number(loanFormData.amount);
      if (!amount || amount <= 0) {
        message.error("Loan amount must be a positive number");
        return;
      }
      const emi = calculateEMI(
        amount,
        Number(loanFormData.tenure),
        Number(loanFormData.interestRate)
      );
      await createLoan({
        ...loanFormData,
        amount: amount,
        tenure: Number(loanFormData.tenure),
        interestRate: Number(loanFormData.interestRate),
        emi: Math.round(emi),
        remainingAmount: amount,
      }).unwrap();
      message.success("Loan request submitted successfully!");
      setIsLoanDialogOpen(false);
      setLoanFormData({
        loanType: "Personal",
        amount: "",
        purpose: "",
        tenure: "",
        interestRate: "0",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit loan request");
    }
  };

  // Get API URL using same logic as apiSlice
  // This ensures local uses localhost:9000/api and production uses VITE_API_URL
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Check if hostname is local (localhost, 127.0.0.1, or any local IP)
      const isLocal = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname === '0.0.0.0' ||
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.startsWith('172.16.') ||
                     hostname === '[::1]';
      
      if (isLocal) {
        // Use localhost for local development
        return 'http://localhost:7001/api';
      }
    }
    
    // For production/non-local environments, use VITE_API_URL from environment
    if (import.meta.env.VITE_API_URL) {
      let apiUrl = import.meta.env.VITE_API_URL.trim();
      // Remove trailing slash if present
      if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1);
      }
      // Fix double /api/api issue - normalize to single /api
      if (apiUrl.endsWith('/api/api')) {
        apiUrl = apiUrl.replace(/\/api\/api$/, '/api');
      } else if (!apiUrl.endsWith('/api')) {
        // If it doesn't end with /api, add it
        apiUrl = apiUrl + '/api';
      }
      return apiUrl;
    }
    
    // Fallback: if no VITE_API_URL is set and not local, use current origin
    if (typeof window !== 'undefined') {
      return window.location.origin + '/api';
    }
    
    // Default fallback for SSR or other cases
    return 'http://localhost:7001/api';
  };

  const handleCreateExpense = async () => {
    try {
      const amount = Number(expenseFormData.amount);
      if (!amount || amount <= 0) {
        message.error("Please enter a valid expense amount (positive number).");
        return;
      }

      const description = (expenseFormData.description || "").trim();
      if (!description) {
        message.error("Please enter a description for your expense claim. This helps approvers understand the purpose of the claim.");
        return;
      }

      if (!expenseFormData.date || !expenseFormData.date.trim()) {
        message.error("Please select the date of the expense.");
        return;
      }

      // Validate proof documents are required
      if (expenseProofFiles.length === 0) {
        message.error("Please upload at least one proof document (receipt or bill) to submit your expense claim.");
        return;
      }

      // Upload proof files
      let proofFileUrls: string[] = [];
      message.loading("Uploading proof files...", 0);
      try {
        const uploadPromises = expenseProofFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const token = localStorage.getItem('token');
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/reimbursements/upload-proof`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.error?.message || 'Upload failed');
          }
          return data.data.url;
        });
        proofFileUrls = await Promise.all(uploadPromises);
        message.destroy();
      } catch (uploadError: any) {
        message.destroy();
        message.error(uploadError.message || "Failed to upload proof files");
        return;
      }

      // Create reimbursement with proof file URLs
      await createExpense({
        ...expenseFormData,
        description: description,
        amount: amount,
        proofFiles: proofFileUrls,
      }).unwrap();
      message.success("Expense claim submitted successfully!");
      setIsExpenseDialogOpen(false);
      setExpenseFormData({
        type: "Travel",
        amount: "",
        description: "",
        date: "",
      });
      setExpenseProofFiles([]);
    } catch (error: any) {
      const errMsg = error?.data?.error?.message || "";
      if (errMsg.includes("description") && (errMsg.includes("required") || errMsg.includes("Path"))) {
        message.error("Please enter a description for your expense claim. This helps approvers understand the purpose of the claim.");
      } else if (errMsg.includes("date") && (errMsg.includes("required") || errMsg.includes("Path"))) {
        message.error("Please select the date of the expense.");
      } else if (errMsg.includes("amount") && (errMsg.includes("required") || errMsg.includes("Path"))) {
        message.error("Please enter a valid expense amount.");
      } else {
        message.error(errMsg || "Unable to submit expense claim. Please check all required fields and try again.");
      }
    }
  };

  const handleCreatePayslipRequest = async () => {
    try {
      await createPayslipRequest({
        month: payslipFormData.month,
        year: payslipFormData.year,
        reason: payslipFormData.reason,
      }).unwrap();
      message.success("Payslip request submitted successfully!");
      setIsPayslipDialogOpen(false);
      setPayslipFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        reason: "",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit payslip request");
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Requests</h1>
            <p className="text-muted-foreground mt-1">Manage your leave, loan, expense, and payslip requests</p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setSearchParams({ tab: value }, { replace: true });
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leave">
                <Calendar className="w-4 h-4 mr-2" />
                Leave
              </TabsTrigger>
              <TabsTrigger value="loan">
                <Wallet className="w-4 h-4 mr-2" />
                Loan
              </TabsTrigger>
              <TabsTrigger value="expense">
                <FileText className="w-4 h-4 mr-2" />
                Expense
              </TabsTrigger>
              <TabsTrigger value="payslip">
                <Receipt className="w-4 h-4 mr-2" />
                Payslip
              </TabsTrigger>
            </TabsList>

            {/* Leave Requests Tab */}
            <TabsContent value="leave" className="space-y-4">
              <EmployeeLeaveDashboard
                leaveSummaryRows={leaveDashboardData.leaveSummaryRows}
                totalLeaveCount={leaveDashboardData.totalLeaveCount}
                totalRequestsSummary={leaveDashboardData.totalRequestsSummary}
              />
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Leave Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={leaveSearch}
                          onChange={(e) => setLeaveSearch(e.target.value)}
                        />
                        {leaveSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setLeaveSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={leaveStatusFilter}
                        onValueChange={(value) => {
                          setLeaveStatusFilter(value);
                          setLeavePage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Apply Leave
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Apply for Leave</DialogTitle>
                            <DialogDescription>Submit a new leave request</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Leave Type</Label>
                              <Select
                                value={leaveFormData.leaveType || ""}
                                onValueChange={(value: any) => {
                                  setLeaveFormData({ 
                                    ...leaveFormData, 
                                    leaveType: value,
                                    halfDayType: value === "Half Day" ? leaveFormData.halfDayType || "" : ""
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select leave type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Default leave types - always available */}
                                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                                  <SelectItem value="Half Day">Half Day</SelectItem>
                                  {/* Template-based leave types */}
                                  {availableLeaveTypes.map((leaveType: any) => (
                                    <SelectItem key={leaveType.type} value={leaveType.type}>
                                      {leaveType.type} - {leaveType.days} {leaveType.days === 1 ? 'day' : 'days'} per month
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Half Day Type Selection - only show when Half Day is selected */}
                            {leaveFormData.leaveType === "Half Day" && (
                              <div>
                                <Label>Half Day Type</Label>
                                <Select
                                  value={leaveFormData.halfDayType || ""}
                                  onValueChange={(value: any) =>
                                    setLeaveFormData({ ...leaveFormData, halfDayType: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select half day type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="First Half Day">First Half Day</SelectItem>
                                    <SelectItem value="Second Half Day">Second Half Day</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label>Start Date</Label>
                              <Input
                                type="date"
                                value={leaveFormData.startDate}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, startDate: e.target.value })
                                }
                                required
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={leaveFormData.endDate}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, endDate: e.target.value })
                                }
                                required
                                min={leaveFormData.startDate || new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            {leaveModalDateError && (
                              <div className="text-sm    font-medium">{leaveModalDateError}</div>
                            )}
                            {(leaveFormData.startDate && leaveFormData.endDate) && (
                              <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">
                                  Total Days: {leaveFormData.leaveType === "Half Day" ? "0.5" : calculateDays(leaveFormData.startDate, leaveFormData.endDate)}
                                </div>
                                {leaveTypeAvailableBalance != null && (
                                  <div className="text-xs text-muted-foreground">
                                    Available balance: <span className="font-semibold text-foreground">{leaveTypeAvailableBalance.available.toFixed(1)}</span> days (used {leaveTypeAvailableBalance.used.toFixed(1)} of {leaveTypeAvailableBalance.yearly} this year)
                                  </div>
                                )}
                                {/* Only show monthly limit for template-based leave types, not for Unpaid Leave or Half Day */}
                                {leaveFormData.leaveType !== "Unpaid Leave" && leaveFormData.leaveType !== "Half Day" && availableLeaveTypes.length > 0 && (() => {
                                  const selectedLeaveType = availableLeaveTypes.find(
                                    (lt: any) => lt.type === leaveFormData.leaveType
                                  );
                                  const days = leaveFormData.leaveType === "Half Day" ? 0.5 : calculateDays(leaveFormData.startDate, leaveFormData.endDate);
                                  if (selectedLeaveType) {
                                    const limit = selectedLeaveType.days;
                                    const remaining = limit - days;
                                    return (
                                      <div className={`text-xs ${days > limit ? '   font-semibold' : remaining < 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                        Monthly limit: {limit} days
                                        {days > limit && ` (Exceeds limit by ${(days - limit).toFixed(1)} days)`}
                                        {days <= limit && ` (${remaining.toFixed(1)} days remaining this month)`}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {/* Show info for Half Day */}
                                {leaveFormData.leaveType === "Half Day" && !leaveFormData.halfDayType && (
                                  <div className="text-xs text-yellow-600">
                                    Please select Half Day Type (First Half Day or Second Half Day)
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <Label>Reason</Label>
                              <Textarea
                                value={leaveFormData.reason}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, reason: e.target.value })
                                }
                                placeholder="Enter reason for leave"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsLeaveDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreateLeave}
                              disabled={isCreatingLeave || !!leaveModalDateError}
                            >
                              {isCreatingLeave ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLeaves ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : leaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No leave requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaves.map((leave: any) => (
                          <TableRow key={leave._id}>
                            <TableCell>{leave.leaveType}</TableCell>
                            <TableCell>{formatDate(leave.startDate)}</TableCell>
                            <TableCell>{formatDate(leave.endDate)}</TableCell>
                            <TableCell>{leave.days}</TableCell>
                            <TableCell>{getStatusBadge(leave.status)}</TableCell>
                            <TableCell>
                              {leave.status === "Rejected" && leave.rejectionReason ? (
                                <div className="max-w-xs">
                                  <span className="text-sm   ">{leave.rejectionReason}</span>
                                </div>
                              ) : leave.status === "Approved" ? (
                                <span className="text-sm text-muted-foreground">-</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {leave.status === "Pending" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => handleCancelLeave(leave._id)}
                                  disabled={isCancellingLeave}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                              ) : leave.status === "Approved" && leave.approvedBy ? (
                                <div>
                                  <div className="font-medium text-sm text-[#efaa1f]">Approved by: {leave.approvedBy.name || 'N/A'}</div>
                                  {leave.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(leave.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : leave.status === "Rejected" && leave.rejectedBy ? (
                                <div>
                                  <div className="font-medium text-sm   ">Rejected by: {leave.rejectedBy.name || 'N/A'}</div>
                                  {leave.rejectedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(leave.rejectedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {leavesData?.data?.pagination && leavesData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {leavesData.data.pagination.page} of {leavesData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                          disabled={leavePage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setLeavePage((p) =>
                              Math.min(leavesData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={leavePage === leavesData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Loan Requests Tab */}
            <TabsContent value="loan" className="space-y-4">
              <EmployeeLoanDashboard loans={allLoansForDashboard?.data?.loans ?? []} />
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Loan Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={loanSearch}
                          onChange={(e) => setLoanSearch(e.target.value)}
                        />
                        {loanSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setLoanSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={loanStatusFilter}
                        onValueChange={(value) => {
                          setLoanStatusFilter(value);
                          setLoanPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Request Loan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Loan</DialogTitle>
                            <DialogDescription>Submit a new loan request</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Loan Type</Label>
                              <Select
                                value={loanFormData.loanType}
                                onValueChange={(value: any) =>
                                  setLoanFormData({ ...loanFormData, loanType: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Personal">Personal</SelectItem>
                                  <SelectItem value="Advance">Advance</SelectItem>
                                  <SelectItem value="Emergency">Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                value={loanFormData.amount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow positive numbers
                                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                    setLoanFormData({ ...loanFormData, amount: value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Prevent negative sign, 'e', 'E', '+'
                                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="Enter loan amount"
                                required
                                min="0"
                              />
                            </div>
                            <div>
                              <Label>Tenure (Months)</Label>
                              <Input
                                type="number"
                                value={loanFormData.tenure}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow positive numbers
                                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                    setLoanFormData({ ...loanFormData, tenure: value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Prevent negative sign, 'e', 'E', '+'
                                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="Enter tenure in months"
                                required
                                min="0"
                              />
                            </div>
                            <div>
                              <Label>Interest Rate (%)</Label>
                              <Input
                                type="number"
                                value={loanFormData.interestRate}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow positive numbers
                                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                    setLoanFormData({ ...loanFormData, interestRate: value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Prevent negative sign, 'e', 'E', '+'
                                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="Enter interest rate"
                                step="0.1"
                                min="0"
                              />
                            </div>
                            {loanFormData.amount &&
                              loanFormData.tenure &&
                              Number(loanFormData.amount) > 0 &&
                              Number(loanFormData.tenure) > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Estimated EMI: ₹
                                  {Math.round(
                                    calculateEMI(
                                      Number(loanFormData.amount),
                                      Number(loanFormData.tenure),
                                      Number(loanFormData.interestRate)
                                    )
                                  )}
                                </div>
                              )}
                            <div>
                              <Label>Purpose</Label>
                              <Textarea
                                value={loanFormData.purpose}
                                onChange={(e) =>
                                  setLoanFormData({ ...loanFormData, purpose: e.target.value })
                                }
                                placeholder="Enter purpose of loan"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsLoanDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateLoan} disabled={isCreatingLoan}>
                              {isCreatingLoan ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>EMI</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLoans ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : loans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            No loan requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        loans.map((loan: any) => {
                          const paidInstallments = loan.installments?.filter((inst: any) => inst.paid) || [];
                          const unpaidInstallments = loan.installments?.filter((inst: any) => !inst.paid) || [];
                          const totalInstallments = loan.installments?.length || 0;
                          const isExpanded = expandedLoanId === loan._id;
                          const isActiveLoan = loan.status === "Active" || loan.status === "Approved";
                          
                          return (
                            <>
                              <TableRow key={loan._id} className={isActiveLoan ? "cursor-pointer" : ""} onClick={() => isActiveLoan && setExpandedLoanId(isExpanded ? null : loan._id)}>
                                <TableCell>
                                  {isActiveLoan && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                                </TableCell>
                                <TableCell>{loan.loanType}</TableCell>
                                <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                                <TableCell>{loan.tenure} months</TableCell>
                                <TableCell>₹{loan.emi.toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {getStatusBadge(loan.status)}
                                    {isActiveLoan && (
                                      <span className="text-xs text-muted-foreground">
                                        {paidInstallments.length}/{totalInstallments} EMIs paid
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {loan.status === "Rejected" && loan.rejectionReason ? (
                                    <div className="max-w-xs">
                                      <span className="text-sm   ">{loan.rejectionReason}</span>
                                    </div>
                                  ) : loan.status === "Approved" || loan.status === "Active" ? (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {loan.status === "Approved" && loan.approvedBy ? (
                                    <div>
                                      <div className="font-medium text-sm text-[#efaa1f]">Approved by: {loan.approvedBy.name || 'N/A'}</div>
                                      {loan.approvedAt && (
                                        <div className="text-xs text-muted-foreground">
                                          {formatDate(loan.approvedAt)}
                                        </div>
                                      )}
                                    </div>
                                  ) : loan.status === "Rejected" && loan.rejectedBy ? (
                                    <div>
                                      <div className="font-medium text-sm   ">Rejected by: {loan.rejectedBy.name || 'N/A'}</div>
                                      {loan.rejectedAt && (
                                        <div className="text-xs text-muted-foreground">
                                          {formatDate(loan.rejectedAt)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                              {isExpanded && isActiveLoan && (
                                <TableRow>
                                  <TableCell colSpan={8} className="bg-muted/30">
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 border rounded-lg">
                                          <div className="text-xs text-muted-foreground">Total EMIs</div>
                                          <div className="text-lg font-semibold">{totalInstallments}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                                          <div className="text-xs text-muted-foreground">Paid EMIs</div>
                                          <div className="text-lg font-semibold  ">{paidInstallments.length}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                                          <div className="text-xs text-muted-foreground">Remaining EMIs</div>
                                          <div className="text-lg font-semibold text-yellow-600">{unpaidInstallments.length}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                                          <div className="text-xs text-muted-foreground">Remaining Amount</div>
                                          <div className="text-lg font-semibold text-blue-600">₹{loan.remainingAmount?.toLocaleString() || '0'}</div>
                                        </div>
                                      </div>
                                      
                                      {paidInstallments.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4  " />
                                            Payment History
                                          </h4>
                                          <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {paidInstallments.map((inst: any, idx: number) => {
                                              const dueDateStr = new Date(inst.dueDate).toISOString().split('T')[0];
                                              const paymentInfo = loanEMIPaymentMap.get(loan._id)?.get(dueDateStr);
                                              const paymentMonthYear = paymentInfo 
                                                ? `${getMonthName(paymentInfo.month)} ${paymentInfo.year}`
                                                : inst.paidAt 
                                                  ? `${getMonthName(new Date(inst.paidAt).getMonth() + 1)} ${new Date(inst.paidAt).getFullYear()}`
                                                  : 'N/A';
                                              
                                              return (
                                                <div key={idx} className="flex items-center justify-between p-2 border rounded bg-green-50 dark:bg-green-950">
                                                  <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                                      <span className="text-sm font-medium">
                                                        Due: {formatDate(inst.dueDate)}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-6">
                                                      <span className="text-xs text-muted-foreground">
                                                        Paid in: <span className="font-semibold ">{paymentMonthYear}</span> Payroll
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4  " />
                                                    <span className="font-semibold  ">₹{(inst.amount || loan.emi).toLocaleString()}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {unpaidInstallments.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-yellow-600" />
                                            Upcoming EMIs
                                          </h4>
                                          <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {unpaidInstallments.slice(0, 5).map((inst: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2">
                                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                                  <span className="text-sm">
                                                    Due: {formatDate(inst.dueDate)}
                                                  </span>
                                                </div>
                                                <span className="font-semibold">₹{(inst.amount || loan.emi).toLocaleString()}</span>
                                              </div>
                                            ))}
                                            {unpaidInstallments.length > 5 && (
                                              <div className="text-xs text-muted-foreground text-center py-2">
                                                +{unpaidInstallments.length - 5} more EMIs remaining
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {loansData?.data?.pagination && loansData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {loansData.data.pagination.page} of {loansData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLoanPage((p) => Math.max(1, p - 1))}
                          disabled={loanPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setLoanPage((p) =>
                              Math.min(loansData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={loanPage === loansData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expense Claims Tab */}
            <TabsContent value="expense" className="space-y-4">
              <EmployeeExpenseDashboard expenses={allExpensesForDashboard?.data?.reimbursements ?? []} />
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Expense Claims</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={expenseSearch}
                          onChange={(e) => setExpenseSearch(e.target.value)}
                        />
                        {expenseSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setExpenseSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={expenseStatusFilter}
                        onValueChange={(value) => {
                          setExpenseStatusFilter(value);
                          setExpensePage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Claim Expense
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Claim Expense</DialogTitle>
                            <DialogDescription>Submit a new expense claim</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Expense Type</Label>
                              <Select
                                value={expenseFormData.type}
                                onValueChange={(value: any) =>
                                  setExpenseFormData({ ...expenseFormData, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Travel">Travel</SelectItem>
                                  <SelectItem value="Meal">Meal</SelectItem>
                                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                value={expenseFormData.amount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow positive numbers
                                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                    setExpenseFormData({ ...expenseFormData, amount: value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Prevent negative sign, 'e', 'E', '+'
                                  if (['-', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="Enter expense amount"
                                required
                                min="0"
                              />
                            </div>
                            <div>
                              <Label>Date <span className="text-red-500">*</span></Label>
                              <Input
                                type="date"
                                value={expenseFormData.date}
                                onChange={(e) =>
                                  setExpenseFormData({ ...expenseFormData, date: e.target.value })
                                }
                                required
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <Label>Description <span className="text-red-500">*</span></Label>
                              <Textarea
                                value={expenseFormData.description}
                                onChange={(e) =>
                                  setExpenseFormData({
                                    ...expenseFormData,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="e.g., Client meeting travel, Team lunch, Conference accommodation"
                                required
                              />
                              <p className="text-xs text-muted-foreground mt-1">Briefly describe the expense so approvers can verify your claim.</p>
                            </div>
                            <div>
                              <Label>
                                Proof Documents <span className="text-red-500">*</span>
                              </Label>
                              <div className="space-y-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setExpenseProofFiles((prev) => [...prev, ...files]);
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-full"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Proof Files
                                </Button>
                                {expenseProofFiles.length > 0 && (
                                  <div className="space-y-1">
                                    {expenseProofFiles.map((file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-muted rounded"
                                      >
                                        <span className="text-sm truncate flex-1">{file.name}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setExpenseProofFiles((prev) =>
                                              prev.filter((_, i) => i !== index)
                                            );
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Upload receipts, bills, or other proof documents (PDF, Images, Word). Required for submission.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsExpenseDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateExpense} disabled={isCreatingExpense}>
                              {isCreatingExpense ? "Submitting..." : "Submit Claim"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Proof Files</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingExpenses ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : expenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No expense claims found
                          </TableCell>
                        </TableRow>
                      ) : (
                        expenses.map((expense: any) => (
                          <TableRow key={expense._id}>
                            <TableCell>{expense.type}</TableCell>
                            <TableCell>₹{expense.amount.toLocaleString()}</TableCell>
                            <TableCell>{formatDate(expense.date)}</TableCell>
                            <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell>
                              {expense.proofFiles && expense.proofFiles.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {expense.proofFiles.map((fileUrl: string, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      View Proof {idx + 1}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No files</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(expense.status)}</TableCell>
                            <TableCell>
                              {expense.status === "Rejected" && expense.rejectionReason ? (
                                <div className="max-w-xs">
                                  <span className="text-sm   ">{expense.rejectionReason}</span>
                                </div>
                              ) : expense.status === "Approved" || expense.status === "Paid" || expense.status === "Processed" ? (
                                <span className="text-sm text-muted-foreground">-</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {expense.status === "Approved" && expense.approvedBy ? (
                                <div>
                                  <div className="font-medium text-sm text-[#efaa1f]">Approved by: {expense.approvedBy.name || 'N/A'}</div>
                                  {expense.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(expense.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : expense.status === "Rejected" && expense.rejectedBy ? (
                                <div>
                                  <div className="font-medium text-sm   ">Rejected by: {expense.rejectedBy.name || 'N/A'}</div>
                                  {expense.rejectedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(expense.rejectedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {expensesData?.data?.pagination && expensesData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {expensesData.data.pagination.page} of {expensesData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                          disabled={expensePage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpensePage((p) =>
                              Math.min(expensesData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={expensePage === expensesData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payslip Requests Tab */}
            <TabsContent value="payslip" className="space-y-4">
              <EmployeePayslipDashboard requests={allPayslipsForDashboard?.data?.requests ?? []} />
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Payslip Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={payslipSearch}
                          onChange={(e) => setPayslipSearch(e.target.value)}
                        />
                        {payslipSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setPayslipSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={payslipStatusFilter}
                        onValueChange={(value) => {
                          setPayslipStatusFilter(value);
                          setPayslipPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Request Payslip
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Payslip</DialogTitle>
                            <DialogDescription>Request a payslip for a specific month</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Month</Label>
                              <Select
                                value={payslipFormData.month.toString()}
                                onValueChange={(value) =>
                                  setPayslipFormData({
                                    ...payslipFormData,
                                    month: Number(value),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                    <SelectItem key={month} value={month.toString()}>
                                      {new Date(2000, month - 1).toLocaleString("default", {
                                        month: "long",
                                      })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Year</Label>
                              <Input
                                type="number"
                                value={payslipFormData.year}
                                onChange={(e) =>
                                  setPayslipFormData({
                                    ...payslipFormData,
                                    year: Number(e.target.value),
                                  })
                                }
                                min={2020}
                                max={2100}
                                required
                              />
                            </div>
                            <div>
                              <Label>Reason (Optional)</Label>
                              <Textarea
                                value={payslipFormData.reason}
                                onChange={(e) =>
                                  setPayslipFormData({ ...payslipFormData, reason: e.target.value })
                                }
                                placeholder="Enter reason for payslip request"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsPayslipDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreatePayslipRequest}
                              disabled={isCreatingPayslip}
                            >
                              {isCreatingPayslip ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Request Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rejection Reason</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingPayslips ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : payslipRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No payslip requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        payslipRequests.map((request: any) => (
                          <TableRow key={request._id}>
                            <TableCell>
                              {new Date(2000, request.month - 1).toLocaleString("default", {
                                month: "long",
                              })}{" "}
                              {request.year}
                            </TableCell>
                            <TableCell>{request.reason || "N/A"}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              {request.status === "Rejected" && request.rejectionReason ? (
                                <div className="max-w-xs">
                                  <span className="text-sm   ">{request.rejectionReason}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {request.status === "Approved" && request.approvedBy ? (
                                <div>
                                  <div className="font-medium text-sm text-[#efaa1f]">Approved by: {request.approvedBy.name || 'N/A'}</div>
                                  {request.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(request.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : request.status === "Rejected" && request.rejectedBy ? (
                                <div>
                                  <div className="font-medium text-sm   ">Rejected by: {request.rejectedBy.name || 'N/A'}</div>
                                  {request.rejectedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(request.rejectedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {request.status === "Approved" &&
                                request.payrollId?.payslipUrl &&
                                request.payrollId?._id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const blob = await viewPayslip(request.payrollId._id).unwrap();
                                        const url = window.URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                        setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                      } catch (error: any) {
                                        message.error(error?.data?.error?.message || "Failed to view payslip");
                                      }
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {payslipRequestsData?.data?.pagination &&
                    payslipRequestsData.data.pagination.pages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          Page {payslipRequestsData.data.pagination.page} of{" "}
                          {payslipRequestsData.data.pagination.pages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayslipPage((p) => Math.max(1, p - 1))}
                            disabled={payslipPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPayslipPage((p) =>
                                Math.min(payslipRequestsData.data.pagination.pages, p + 1)
                              )
                            }
                            disabled={payslipPage === payslipRequestsData.data.pagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeRequests;

