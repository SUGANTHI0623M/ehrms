import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { useEffect } from "react";
import socketService from "./services/socket.service";
import { ConfigProvider } from "antd";
import type { ThemeConfig } from "antd";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ProtectedRouteWithRole from "./components/ProtectedRouteWithRole";
import AdminDashboard from "./pages/AdminDashboard";
import PublicCandidateForm from "./pages/candidate/PublicCandidateForm";

// Super Admin Imports
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import ManageCompanies from "./pages/superAdmin/ManageCompanies";
import SuperAdminSettings from "./pages/superAdmin/SuperAdminSettings";

// Staff Imports
import Staff from "./pages/staffPages/Staff";
import StaffProfile from "./pages/staffPages/StaffProfile";
import StaffSalaryOverview from "./pages/staffPages/SalaryOverview"; // Renamed to avoid collision
import SalaryStructure from "./pages/SalaryStructure";
import SalaryStructureView from "./pages/staffPages/SalaryStructureView";
import LeavesPendingApproval from "./pages/staffPages/LeavesPendingApproval";
import Loans from "./pages/staffPages/Loans";
import ExpenseClaim from "./pages/staffPages/ExpenseClaim";
import PayslipRequests from "./pages/staffPages/PayslipRequests";
import AdminAttendance from "./pages/staffPages/AdminAttendance";

// Employee Imports
import EmployeeDashboard from "./pages/employeePages/EmployeeDashboard";
import EmployeeRequests from "./pages/employeePages/EmployeeRequests";
import EmployeeSalaryOverview from "./pages/employeePages/EmployeeSalaryOverview";
import EmployeeHolidays from "./pages/employeePages/EmployeeHolidays";
import EmployeeAttendance from "./pages/employeePages/EmployeeAttendance";
import EmployeeAssets from "./pages/employeePages/EmployeeAssets";
import EmployeeTasks from "./pages/employeePages/EmployeeTasks";
import EmployeePerformanceOverview from "./pages/employeePages/EmployeePerformanceOverview";
import EmployeePerformanceReviews from "./pages/employeePages/EmployeePerformanceReviews";
import EmployeePerformanceReviewDetail from "./pages/employeePages/EmployeePerformanceReviewDetail";
import EmployeeSelfAssessment from "./pages/employeePages/EmployeeSelfAssessment";

// Performance & PMS Imports
import MyGoals from "./pages/pmsPages/MyGoals";
import GoalProgress from "./pages/pmsPages/GoalProgress";
import GoalApproval from "./pages/pmsPages/GoalApproval";
import GoalsManagement from "./pages/pmsPages/GoalsManagement";
import GoalDetail from "./pages/pmsPages/GoalDetail";
import SelfReview from "./pages/pmsPages/SelfReview";
import ManagerReview from "./pages/pmsPages/ManagerReview";
import HRReview from "./pages/pmsPages/HRReview";
import PMSReports from "./pages/pmsPages/PMSReports";
import PMSSettings from "./pages/pmsPages/PMSSettings";
import KRAKPI from "./pages/performancePages/KRAKPI";
import Performance from "./pages/performancePages/Performance";
import PerformanceAnalytics from "./pages/performancePages/PerformanceAnalytics";
import PerformanceReviewsManagement from "./pages/performancePages/PerformanceReviewsManagement";
import AdminPerformanceReviewDetail from "./pages/performancePages/AdminPerformanceReviewDetail";
import EditPerformanceReview from "./pages/performancePages/EditPerformanceReview";
import ReviewCycleManagement from "./pages/performancePages/ReviewCycleManagement";
import Compliance from "./pages/performancePages/Compliance";
import SOP from "./pages/performancePages/SOP";

// Payroll Imports
import PayrollHub from "./pages/PayrollHub";
import Payroll from "./pages/payrollPages/Payroll";
import PayrollPreview from "./pages/payrollPages/PayrollPreview";
import PayrollAttendance from "./pages/payrollPages/Attendance";
import Reimbursements from "./pages/payrollPages/Reimbursements";

// Company Imports
import CompanyPolicies from "./pages/CompanyPolicies";

// LMS Imports
import CourseLibrary from "./pages/lms/CourseLibrary";
import LiveSession from "./pages/lms/LiveSession";
import QuestionGenerator from "./pages/lms/QuestionGenerator";
import Quiz from "./pages/lms/Quiz";
import Analytics from "./pages/lms/Analytics";

// Assets Imports
import Assets from "./pages/assetsPages/Assets";
import AssetTypes from "./pages/assetsPages/AssetTypes";

// HRMS Geo Imports
import HRMSGeoDashboard from "./pages/hrmsGeo/Dashboard";
import LiveTracking from "./pages/hrmsGeo/tracking/LiveTracking";
import Timeline from "./pages/hrmsGeo/tracking/Timeline";
import TrackingDashboard from "./pages/hrmsGeo/tracking/TrackingDashboard";
import TrackingReports from "./pages/hrmsGeo/tracking/TrackingReports";
import TrackingSettings from "./pages/hrmsGeo/tracking/TrackingSettings";
import FormResponses from "./pages/hrmsGeo/forms/FormResponses";
import FormTemplates from "./pages/hrmsGeo/forms/FormTemplates";
import FormReports from "./pages/hrmsGeo/forms/FormReports";
import TasksDashboard from "./pages/hrmsGeo/tasks/TasksDashboard";
import TasksList from "./pages/hrmsGeo/tasks/TasksList";
import AssignTask from "./pages/hrmsGeo/tasks/AssignTask";
import TaskSettings from "./pages/hrmsGeo/tasks/TaskSettings";
import TaskCustomFields from "./pages/hrmsGeo/tasks/TaskCustomFields";
import StaffScheduleTasks from "./pages/hrmsGeo/tasks/StaffScheduleTasks";
import CustomersDashboard from "./pages/hrmsGeo/customers/CustomersDashboard";
import CustomersList from "./pages/hrmsGeo/customers/CustomersList";
import CustomersSettings from "./pages/hrmsGeo/customers/CustomersSettings";
import CustomerDataFields from "./pages/hrmsGeo/customers/CustomerDataFields";
// import HelpOutage from "./pages/hrmsGeo/help/HelpOutage";
// import HelpVideos from "./pages/hrmsGeo/help/HelpVideos";
// import HelpFAQs from "./pages/hrmsGeo/help/HelpFAQs";
import StaffLocationAccess from "./pages/hrmsGeo/settings/StaffLocationAccess";
import LocationSettings from "./pages/hrmsGeo/settings/LocationSettings";
import HRMSGeoSettings from "./pages/hrmsGeo/settings/HRMSGeoSettings";
import EmployeeTracking from "./pages/hrmsGeo/employee/EmployeeTracking";

// Settings Imports
import UserManagement from "./pages/settingsPages/UserManagement";
import RoleManagement from "./pages/settingsPages/RoleManagement";
import AttendanceSetting from "./pages/settingsPages/AttendanceSetting";
import BusinessSetting from "./pages/settingsPages/BussinessSetting";
import SalarySetting from "./pages/settingsPages/SalarySetting";
import PayrollSetting from "./pages/settingsPages/PayrollSetting";
import PayrollProcessingRules from "./pages/settingsPages/payrollPages/PayrollProcessingRules";
import AttendanceCalculation from "./pages/settingsPages/payrollPages/AttendanceCalculation";
import PayrollCycle from "./pages/settingsPages/payrollPages/PayrollCycle";
import DeductionRules from "./pages/settingsPages/payrollPages/DeductionRules";
import FineCalculation from "./pages/settingsPages/payrollPages/FineCalculation";
import ReimbursementIntegration from "./pages/settingsPages/payrollPages/ReimbursementIntegration";
import BusinessInfo from "./pages/settingsPages/BusinessInfo";
import OthersSetting from "./pages/settingsPages/Others";
import OnboardingDocumentRequirements from "./pages/settingsPages/OnboardingDocumentRequirements";
import AttendanceTemplates from "./pages/settingsPages/attendancepages/AttendanceTemplates";
import AttendanceGeofence from "./pages/settingsPages/attendancepages/AttendanceGeofence";
import ShiftSettings from "./pages/settingsPages/attendancepages/ShiftSettings";
import AutomationRules from "./pages/settingsPages/attendancepages/AutomationRules";
import LeaveTemplates from "./pages/settingsPages/bussinessPages.tsx/LeaveTemplates";
import LeaveTemplateForm from "./pages/settingsPages/bussinessPages.tsx/LeaveTemplateForm";
import ManageUsers from "./pages/settingsPages/bussinessPages.tsx/ManageUsers";
import Celebrations from "./pages/settingsPages/bussinessPages.tsx/Celebrations";
import WeeklyHolidays from "./pages/settingsPages/bussinessPages.tsx/WeeklyHolidays";
import RolesPermissions from "./pages/settingsPages/bussinessPages.tsx/RolesPermissions";
import BusinessFunctions from "./pages/settingsPages/bussinessPages.tsx/BusinessFunctions";
import StaffDetails from "./pages/settingsPages/bussinessPages.tsx/StaffDetails";
import SalaryCalculationLogic from "./pages/settingsPages/salaryPages/SalaryCalculationLogic";
import SaleryComponents from "./pages/settingsPages/salaryPages/SaleryComponents";
import SaleryTemplateBuilder from "./pages/settingsPages/salaryPages/SaleryTemplateBuilder";
import SalaryDetailsAccess from "./pages/settingsPages/salaryPages/SalaryDetailsAccess";
import PayslipCustomization from "./pages/settingsPages/salaryPages/PayslipCustomization";
import EditBusinessName from "./pages/settingsPages/bussinessInfoPages/EditBusinessName";
import EditStateCity from "./pages/settingsPages/bussinessInfoPages/EditStateCity";
import EditBusinessAddress from "./pages/settingsPages/bussinessInfoPages/EditBusinessAddress";
import EditBusinessLogo from "./pages/settingsPages/bussinessInfoPages/EditBusinessLogo";
// Integration Imports
import Integration from "./pages/integrationPages/Integration";
import SendPulseConfig from "./pages/integrationPages/configPages/SendPulseConfig";
import EmailConfig from "./pages/integrationPages/configPages/EmailConfig";
import ExotelConfig from "./pages/integrationPages/configPages/ExotelConfig";
import GoogleCalendarConfig from "./pages/integrationPages/configPages/GoogleCalendarConfig";
import RCSConfig from "./pages/integrationPages/configPages/RCSConfig";
import SendGridConfig from "./pages/integrationPages/configPages/SendGridConfig";
import SMSConfig from "./pages/integrationPages/configPages/SMSConfig";
import VoiceConfig from "./pages/integrationPages/configPages/VoiceConfig";

// Interview/Recruitment Imports
import Candidates from "./pages/InterviewPages/Candidates";
import InterviewCandidateProfile from "./pages/InterviewPages/CandidateProfile";
import Hiring from "./pages/Hiring";
import BackgroundVerification from "./pages/InterviewPages/BackgroundVerification";
import BackgroundVerificationDetail from "./pages/InterviewPages/BackgroundVerificationDetail";
import InterviewAppointments from "./pages/InterviewPages/InterviewAppointments";
import Onboarding from "./pages/InterviewPages/Onboarding";
import InterviewSelection from "./pages/InterviewPages/InterviewSelection";
import InterviewRoundScreen from "./pages/InterviewPages/InterviewRoundScreen";
import InterviewProgress from "./pages/InterviewPages/InterviewProgress";
import InterviewLayout from "./components/InterviewLayout";
import InterviewTemplateManagement from "./pages/InterviewPages/InterviewTemplateManagement";
import JobOpeningForm from "./pages/InterviewPages/JobOpeningForm";
import JobOpeningsList from "./pages/InterviewPages/JobOpeningsList";
import OfferLetterList from "./pages/InterviewPages/OfferLetterList";
import OfferLetterForm from "./pages/InterviewPages/OfferLetterForm";
import OfferLetterTemplateList from "./pages/InterviewPages/OfferLetterTemplateList";
import OfferLetterTemplateForm from "./pages/InterviewPages/OfferLetterTemplateForm";
import ReferCandidate from "./pages/InterviewPages/ReferCandidate";
import PublicReferralForm from "./pages/InterviewPages/PublicReferralForm";
import OfferLetterPreview from "./pages/InterviewPages/OfferLetterPreview";

// Candidate Imports
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import JobVacancies from "./pages/candidate/JobVacancies";
import CandidateJobDetail from "./pages/candidate/CandidateJobDetail";
import ApplicationStatus from "./pages/candidate/ApplicationStatus";
import CandidateProfile from "./pages/candidate/CandidateProfile";
import OnboardingDocuments from "./pages/candidate/OnboardingDocuments";
import CandidateOfferView from "./pages/candidate/CandidateOfferView";
import CandidateOffersList from "./pages/candidate/CandidateOffersList";
import BackgroundVerificationUpload from "./pages/candidate/BackgroundVerificationUpload";

// Profile Route
import ProfileRoute from "./components/ProfileRoute";
import Profile from "./pages/Profile";


import SocketInitializer from "./components/SocketInitializer";
import AskevaConfig from "./pages/integrationPages/configPages/AskevaConfig";
import HolidayTemplates from "./pages/settingsPages/bussinessPages.tsx/HolidayTemplates";
import HolidayTemplateForm from "./pages/settingsPages/bussinessPages.tsx/HolidayTemplateForm";

// Missing Component Imports
import AccessDenied from "./pages/AccessDenied";
import AlertsNotifications from "./pages/AlertsNotifications";
import AttendanceDetail from "./pages/AttendanceDetail";
import CourseView from "./pages/CourseView";
import EmployeeProfile from "./pages/employeePages/EmployeeProfile";
import Settings from "./pages/Settings";
import SubscriptionManagement from "./pages/superAdmin/SubscriptionManagement";
import UploadVideo from "./pages/lms/UploadVideo";
import HRInterviewScreen from "./pages/InterviewPages/HRInterviewScreen";
import ManagerInterviewScreen from "./pages/InterviewPages/ManagerInterviewScreen";
import JobInterviewFlowManagement from "./pages/InterviewPages/JobInterviewFlowManagement";
import { InterviewSession } from "./pages/InterviewPages/InterviewSession";
import SalaryOverview from "./pages/SalaryOverview";
import ChannelPartnerID from "./pages/ChannelPartnerID";
import { useParams } from "react-router-dom";

// Wrapper component for InterviewSession
const InterviewSessionWrapper = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  if (!interviewId) {
    return <div>Interview ID is required</div>;
  }
  return <InterviewSession interviewId={interviewId} />;
};

// Ant Design theme configuration with green primary color
// Primary color: HSL(142, 70%, 38%) = rgb(31, 168, 85) = #1fa855
const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1fa855", // Green color matching --primary: 142 70% 38%
  },
};

const App = () => {
  console.log("App with Full Module Routes executing...");
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ConfigProvider theme={antdTheme}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SocketInitializer />
            <BrowserRouter>
            <Routes>
              {/* Public & Core */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/candidate/apply/:token" element={<PublicCandidateForm />} />
              <Route path="/refer-candidate/:token" element={<PublicReferralForm />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRouteWithRole requireRole="Admin"><AdminDashboard /></ProtectedRouteWithRole>} />
              
              {/* Profile Route - handles role-based profile routing */}
              <Route path="/profile" element={<ProtectedRoute><ProfileRoute /></ProtectedRoute>} />

              {/* Candidate Routes */}
              <Route path="/candidate/dashboard" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateDashboard /></ProtectedRouteWithRole>} />
              <Route path="/candidate/job-vacancies" element={<ProtectedRouteWithRole requireRole="Candidate"><JobVacancies /></ProtectedRouteWithRole>} />
              <Route path="/candidate/job-detail/:id" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateJobDetail /></ProtectedRouteWithRole>} />
              <Route path="/candidate/applications" element={<ProtectedRouteWithRole requireRole="Candidate"><ApplicationStatus /></ProtectedRouteWithRole>} />
              <Route path="/candidate/profile" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/candidate/resume" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/candidate/onboarding-documents" element={<ProtectedRouteWithRole requireRole="Candidate"><OnboardingDocuments /></ProtectedRouteWithRole>} />
              <Route path="/candidate/offers" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateOffersList /></ProtectedRouteWithRole>} />
              <Route path="/candidate/offer/:id" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateOfferView /></ProtectedRouteWithRole>} />
              <Route path="/candidate/background-verification" element={<ProtectedRouteWithRole requireRole="Candidate"><BackgroundVerificationUpload /></ProtectedRouteWithRole>} />

              {/* Super Admin Routes */}
              <Route path="/super-admin/dashboard" element={<ProtectedRouteWithRole requireRole="Super Admin"><SuperAdminDashboard /></ProtectedRouteWithRole>} />
              <Route path="/super-admin/companies" element={<ProtectedRouteWithRole requireRole="Super Admin"><ManageCompanies /></ProtectedRouteWithRole>} />
              <Route path="/super-admin/settings" element={<ProtectedRouteWithRole requireRole="Super Admin"><SuperAdminSettings /></ProtectedRouteWithRole>} />
              <Route path="/super-admin/subscription-management" element={<ProtectedRouteWithRole requireRole="Super Admin"><SubscriptionManagement /></ProtectedRouteWithRole>} />

              {/* Staff Module */}
              <Route path="/staff" element={<ProtectedRouteWithRole path="/staff"><Staff /></ProtectedRouteWithRole>} />
              <Route path="/staff-profile/:id?" element={<ProtectedRouteWithRole path="/staff-profile"><StaffProfile /></ProtectedRouteWithRole>} />
              <Route path="/staff-overview/:id?" element={<ProtectedRouteWithRole path="/staff-overview"><StaffSalaryOverview /></ProtectedRouteWithRole>} />
              <Route path="/salary-structure/:id?" element={<ProtectedRouteWithRole path="/salary-structure"><SalaryStructure /></ProtectedRouteWithRole>} />
              <Route path="/staff/attendance" element={<ProtectedRouteWithRole path="/staff/attendance"><AdminAttendance /></ProtectedRouteWithRole>} />
              <Route path="/staff/leaves-pending-approval" element={<ProtectedRouteWithRole path="/staff/leaves-pending-approval"><LeavesPendingApproval /></ProtectedRouteWithRole>} />
              <Route path="/staff/loans" element={<ProtectedRouteWithRole path="/staff/loans"><Loans /></ProtectedRouteWithRole>} />
              <Route path="/staff/expense-claims" element={<ProtectedRouteWithRole path="/staff/expense-claims"><ExpenseClaim /></ProtectedRouteWithRole>} />
              <Route path="/staff/payslip-requests" element={<ProtectedRouteWithRole path="/staff/payslip-requests"><PayslipRequests /></ProtectedRouteWithRole>} />

              {/* Employee Module */}
              <Route path="/employee/dashboard" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeDashboard /></ProtectedRouteWithRole>} />
              <Route path="/employee/requests" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeRequests /></ProtectedRouteWithRole>} />
              <Route path="/employee/salary" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeSalaryOverview /></ProtectedRouteWithRole>} />
              <Route path="/employee/holidays" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeHolidays /></ProtectedRouteWithRole>} />
              <Route path="/employee/attendance" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeAttendance /></ProtectedRouteWithRole>} />
              <Route path="/employee/assets" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeAssets /></ProtectedRouteWithRole>} />
              <Route path="/employee/tasks" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeTasks /></ProtectedRouteWithRole>} />
              <Route path="/employee/profile" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeProfile /></ProtectedRouteWithRole>} />

              {/* Employee Performance Routes */}
              <Route path="/employee/performance/overview" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeePerformanceOverview /></ProtectedRouteWithRole>} />
              <Route path="/employee/performance/reviews" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeePerformanceReviews /></ProtectedRouteWithRole>} />
              <Route path="/employee/performance/review/:id" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeePerformanceReviewDetail /></ProtectedRouteWithRole>} />
              <Route path="/employee/performance/self-assessment" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeSelfAssessment /></ProtectedRouteWithRole>} />
              <Route path="/employee/performance/self-assessment/:id" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeSelfAssessment /></ProtectedRouteWithRole>} />
              <Route path="/employee/performance/my-goals" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><MyGoals /></ProtectedRouteWithRole>} />

              {/* Performance & PMS Module */}
              <Route path="/pms/goals" element={<ProtectedRouteWithRole path="/pms/goals"><GoalsManagement /></ProtectedRouteWithRole>} />
              <Route path="/pms/goals/:id" element={<ProtectedRouteWithRole path="/pms/goals"><GoalDetail /></ProtectedRouteWithRole>} />
              <Route path="/pms/my-goals" element={<ProtectedRouteWithRole path="/pms/my-goals"><MyGoals /></ProtectedRouteWithRole>} />
              <Route path="/pms/goal-progress" element={<ProtectedRouteWithRole path="/pms/goal-progress"><GoalProgress /></ProtectedRouteWithRole>} />
              <Route path="/pms/goal-approval" element={<ProtectedRouteWithRole path="/pms/goal-approval"><GoalApproval /></ProtectedRouteWithRole>} />
              <Route path="/pms/self-review" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><SelfReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/manager-review" element={<ProtectedRouteWithRole path="/pms/manager-review"><ManagerReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/hr-review" element={<ProtectedRouteWithRole path="/pms/hr-review"><HRReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/reports" element={<ProtectedRouteWithRole path="/pms/reports"><PMSReports /></ProtectedRouteWithRole>} />
              <Route path="/pms/settings" element={<ProtectedRouteWithRole path="/pms/settings"><PMSSettings /></ProtectedRouteWithRole>} />
              <Route path="/kra" element={<ProtectedRouteWithRole path="/kra"><KRAKPI /></ProtectedRouteWithRole>} />
              <Route path="/performance" element={<ProtectedRouteWithRole path="/performance"><Performance /></ProtectedRouteWithRole>} />
              <Route path="/performance/analytics" element={<ProtectedRouteWithRole path="/performance/analytics"><PerformanceAnalytics /></ProtectedRouteWithRole>} />
              <Route path="/performance/reviews" element={<ProtectedRouteWithRole path="/performance/reviews"><PerformanceReviewsManagement /></ProtectedRouteWithRole>} />
              <Route path="/performance/reviews/:id" element={<ProtectedRouteWithRole path="/performance/reviews"><AdminPerformanceReviewDetail /></ProtectedRouteWithRole>} />
              <Route path="/performance/reviews/:id/edit" element={<ProtectedRouteWithRole path="/performance/reviews"><EditPerformanceReview /></ProtectedRouteWithRole>} />
              <Route path="/performance/cycles" element={<ProtectedRouteWithRole path="/performance/cycles"><ReviewCycleManagement /></ProtectedRouteWithRole>} />
              <Route path="/compliance" element={<ProtectedRouteWithRole path="/compliance"><Compliance /></ProtectedRouteWithRole>} />
              <Route path="/sop" element={<ProtectedRouteWithRole path="/sop"><SOP /></ProtectedRouteWithRole>} />

              {/* Payroll Module */}
              <Route path="/payroll" element={<ProtectedRouteWithRole path="/payroll"><PayrollHub /></ProtectedRouteWithRole>} />
              <Route path="/payroll/management" element={<ProtectedRouteWithRole path="/payroll/management"><Payroll /></ProtectedRouteWithRole>} />
              <Route path="/payroll/preview" element={<ProtectedRouteWithRole path="/payroll/preview"><PayrollPreview /></ProtectedRouteWithRole>} />
              <Route path="/payroll/attendance" element={<ProtectedRouteWithRole path="/payroll/attendance"><PayrollAttendance /></ProtectedRouteWithRole>} />
              <Route path="/payroll/attendance/:id" element={<ProtectedRouteWithRole path="/payroll/attendance"><AttendanceDetail /></ProtectedRouteWithRole>} />
              <Route path="/payroll/reimbursements" element={<ProtectedRouteWithRole path="/payroll/reimbursements"><Reimbursements /></ProtectedRouteWithRole>} />
              <Route path="/salary-overview" element={<ProtectedRouteWithRole path="/salary-overview"><SalaryOverview /></ProtectedRouteWithRole>} />

              {/* Company Policy */}
              <Route path="/company" element={<ProtectedRouteWithRole path="/company"><CompanyPolicies /></ProtectedRouteWithRole>} />

              {/* LMS Module */}
              <Route path="/course-library" element={<ProtectedRouteWithRole path="/course-library"><CourseLibrary /></ProtectedRouteWithRole>} />
              <Route path="/course/:courseName" element={<ProtectedRouteWithRole path="/course"><CourseView /></ProtectedRouteWithRole>} />
              <Route path="/live-session" element={<ProtectedRouteWithRole path="/live-session"><LiveSession /></ProtectedRouteWithRole>} />
              <Route path="/quiz-generator" element={<ProtectedRouteWithRole path="/quiz-generator"><QuestionGenerator /></ProtectedRouteWithRole>} />
              <Route path="/assessment" element={<ProtectedRouteWithRole path="/assessment"><Quiz /></ProtectedRouteWithRole>} />
              <Route path="/score" element={<ProtectedRouteWithRole path="/score"><Analytics /></ProtectedRouteWithRole>} />
              <Route path="/lms/upload-video" element={<ProtectedRouteWithRole path="/lms/upload-video"><UploadVideo /></ProtectedRouteWithRole>} />

              {/* Assets Module */}
              <Route path="/assets" element={<ProtectedRouteWithRole path="/assets"><Assets /></ProtectedRouteWithRole>} />
              <Route path="/assets-type" element={<ProtectedRouteWithRole path="/assets-type"><AssetTypes /></ProtectedRouteWithRole>} />

              {/* HRMS Geo Module - Admin */}
              <Route path="/hrms-geo/dashboard" element={<ProtectedRouteWithRole path="/hrms-geo/dashboard"><HRMSGeoDashboard /></ProtectedRouteWithRole>} />
              
              {/* Tracking Routes */}
              <Route path="/hrms-geo/tracking/live" element={<ProtectedRouteWithRole path="/hrms-geo/tracking"><LiveTracking /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tracking/timeline" element={<ProtectedRouteWithRole path="/hrms-geo/tracking"><Timeline /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tracking/dashboard" element={<ProtectedRouteWithRole path="/hrms-geo/tracking"><TrackingDashboard /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tracking/reports" element={<ProtectedRouteWithRole path="/hrms-geo/tracking"><TrackingReports /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tracking/settings" element={<ProtectedRouteWithRole path="/hrms-geo/tracking"><TrackingSettings /></ProtectedRouteWithRole>} />
              
              {/* Forms Routes */}
              <Route path="/hrms-geo/forms/responses" element={<ProtectedRouteWithRole path="/hrms-geo/forms"><FormResponses /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/forms/templates" element={<ProtectedRouteWithRole path="/hrms-geo/forms"><FormTemplates /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/forms/reports" element={<ProtectedRouteWithRole path="/hrms-geo/forms"><FormReports /></ProtectedRouteWithRole>} />
              
              {/* Tasks Routes */}
              <Route path="/hrms-geo/tasks/dashboard" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><TasksDashboard /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tasks/list" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><TasksList /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tasks/assign" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><AssignTask /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tasks/settings" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><TaskSettings /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tasks/settings/custom-fields" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><TaskCustomFields /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/tasks/settings/staff-schedule" element={<ProtectedRouteWithRole path="/hrms-geo/tasks"><StaffScheduleTasks /></ProtectedRouteWithRole>} />
              
              {/* Customers Routes */}
              <Route path="/hrms-geo/customers/dashboard" element={<ProtectedRouteWithRole path="/hrms-geo/customers"><CustomersDashboard /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/customers/list" element={<ProtectedRouteWithRole path="/hrms-geo/customers"><CustomersList /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/customers/settings" element={<ProtectedRouteWithRole path="/hrms-geo/customers"><CustomersSettings /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/customers/data-fields" element={<ProtectedRouteWithRole path="/hrms-geo/customers"><CustomerDataFields /></ProtectedRouteWithRole>} />
              
              {/* Help Routes - Hidden */}
              {/* <Route path="/hrms-geo/help/outage" element={<ProtectedRouteWithRole path="/hrms-geo/help"><HelpOutage /></ProtectedRouteWithRole>} /> */}
              {/* <Route path="/hrms-geo/help/videos" element={<ProtectedRouteWithRole path="/hrms-geo/help"><HelpVideos /></ProtectedRouteWithRole>} /> */}
              {/* <Route path="/hrms-geo/help/faqs" element={<ProtectedRouteWithRole path="/hrms-geo/help"><HelpFAQs /></ProtectedRouteWithRole>} /> */}
              
              {/* HRMS Geo Settings */}
              <Route path="/hrms-geo/settings" element={<ProtectedRouteWithRole path="/hrms-geo/settings"><HRMSGeoSettings /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/settings/staff-location-access" element={<ProtectedRouteWithRole path="/hrms-geo/settings"><StaffLocationAccess /></ProtectedRouteWithRole>} />
              <Route path="/hrms-geo/settings/location" element={<ProtectedRouteWithRole path="/hrms-geo/settings"><LocationSettings /></ProtectedRouteWithRole>} />

              {/* HRMS Geo Module - Employee */}
              <Route path="/employee/hrms-geo" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeTracking /></ProtectedRouteWithRole>} />

              {/* Settings Module */}
              <Route path="/settings" element={<ProtectedRouteWithRole path="/settings"><Settings /></ProtectedRouteWithRole>} />
              <Route path="/user-management" element={<ProtectedRouteWithRole path="/user-management"><UserManagement /></ProtectedRouteWithRole>} />
              <Route path="/role-management" element={<ProtectedRouteWithRole path="/role-management"><RoleManagement /></ProtectedRouteWithRole>} />
              
              {/* Attendance Settings */}
              <Route path="/attendance-setting" element={<ProtectedRouteWithRole path="/attendance-setting"><AttendanceSetting /></ProtectedRouteWithRole>} />
              <Route path="/attendance-templates" element={<ProtectedRouteWithRole path="/attendance-templates"><AttendanceTemplates /></ProtectedRouteWithRole>} />
              <Route path="/attendance-geofence" element={<ProtectedRouteWithRole path="/attendance-geofence"><AttendanceGeofence /></ProtectedRouteWithRole>} />
              <Route path="/attendance-shifts" element={<ProtectedRouteWithRole path="/attendance-shifts"><ShiftSettings /></ProtectedRouteWithRole>} />
              <Route path="/attendance-automation-rules" element={<ProtectedRouteWithRole path="/attendance-automation-rules"><AutomationRules /></ProtectedRouteWithRole>} />
              
              {/* Business Settings */}
              <Route path="/business-setting" element={<ProtectedRouteWithRole path="/business-setting"><BusinessSetting /></ProtectedRouteWithRole>} />
              <Route path="/business/holiday-templates" element={<ProtectedRouteWithRole path="/business"><HolidayTemplates /></ProtectedRouteWithRole>} />
              <Route path="/business/holiday-templates/new" element={<ProtectedRouteWithRole path="/business"><HolidayTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/business/holiday-templates/:id/edit" element={<ProtectedRouteWithRole path="/business"><HolidayTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/business/leave-templates" element={<ProtectedRouteWithRole path="/business"><LeaveTemplates /></ProtectedRouteWithRole>} />
              <Route path="/business/leave-templates/new" element={<ProtectedRouteWithRole path="/business"><LeaveTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/business/leave-templates/:id/edit" element={<ProtectedRouteWithRole path="/business"><LeaveTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/business/manage-users" element={<ProtectedRouteWithRole path="/business"><ManageUsers /></ProtectedRouteWithRole>} />
              <Route path="/business/celebrations" element={<ProtectedRouteWithRole path="/business"><Celebrations /></ProtectedRouteWithRole>} />
              <Route path="/business/weekly-holidays" element={<ProtectedRouteWithRole path="/business"><WeeklyHolidays /></ProtectedRouteWithRole>} />
              <Route path="/business/roles-permissions" element={<ProtectedRouteWithRole path="/business"><RolesPermissions /></ProtectedRouteWithRole>} />
              <Route path="/business/business-functions" element={<ProtectedRouteWithRole path="/business"><BusinessFunctions /></ProtectedRouteWithRole>} />
              <Route path="/business/staff-details" element={<ProtectedRouteWithRole path="/business"><StaffDetails /></ProtectedRouteWithRole>} />
              
              {/* Salary Settings */}
              {/* <Route path="/salary-setting" element={<ProtectedRouteWithRole path="/salary-setting"><SalarySetting /></ProtectedRouteWithRole>} /> */}
              {/* Payroll Settings */}
              <Route path="/payroll-setting" element={<ProtectedRouteWithRole path="/payroll-setting"><PayrollSetting /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/processing-rules" element={<ProtectedRouteWithRole path="/settings/payroll"><PayrollProcessingRules /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/attendance-calculation" element={<ProtectedRouteWithRole path="/settings/payroll"><AttendanceCalculation /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/cycle" element={<ProtectedRouteWithRole path="/settings/payroll"><PayrollCycle /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/deductions" element={<ProtectedRouteWithRole path="/settings/payroll"><DeductionRules /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/fine-calculation" element={<ProtectedRouteWithRole path="/settings/payroll"><FineCalculation /></ProtectedRouteWithRole>} />
              <Route path="/settings/payroll/reimbursement" element={<ProtectedRouteWithRole path="/settings/payroll"><ReimbursementIntegration /></ProtectedRouteWithRole>} />
              <Route path="/salary/calculation-logic" element={<ProtectedRouteWithRole path="/salary"><SalaryCalculationLogic /></ProtectedRouteWithRole>} />
              <Route path="/salary/components" element={<ProtectedRouteWithRole path="/salary"><SaleryComponents /></ProtectedRouteWithRole>} />
              <Route path="/salary/template-builder" element={<ProtectedRouteWithRole path="/salary"><SaleryTemplateBuilder /></ProtectedRouteWithRole>} />
              <Route path="/salary/details-access" element={<ProtectedRouteWithRole path="/salary"><SalaryDetailsAccess /></ProtectedRouteWithRole>} />
              <Route path="/salary/payslip-customization" element={<ProtectedRouteWithRole path="/salary"><PayslipCustomization /></ProtectedRouteWithRole>} />
              
              {/* Business Info Settings */}
              <Route path="/businessinfo-setting" element={<ProtectedRouteWithRole path="/businessinfo-setting"><BusinessInfo /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-business-name" element={<ProtectedRouteWithRole path="/business-info"><EditBusinessName /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-state-city" element={<ProtectedRouteWithRole path="/business-info"><EditStateCity /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-business-address" element={<ProtectedRouteWithRole path="/business-info"><EditBusinessAddress /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-business-logo" element={<ProtectedRouteWithRole path="/business-info"><EditBusinessLogo /></ProtectedRouteWithRole>} />
              
              {/* Other Settings */}
              <Route path="/others-setting" element={<ProtectedRouteWithRole path="/others-setting"><OthersSetting /></ProtectedRouteWithRole>} />
              <Route path="/onboarding-document-requirements" element={<ProtectedRouteWithRole path="/onboarding-document-requirements"><OnboardingDocumentRequirements /></ProtectedRouteWithRole>} />
              <Route path="/alerts-notifications" element={<ProtectedRouteWithRole path="/alerts-notifications"><AlertsNotifications /></ProtectedRouteWithRole>} />
              <Route path="/others/alerts-notifications" element={<ProtectedRouteWithRole path="/others"><AlertsNotifications /></ProtectedRouteWithRole>} />
              <Route path="/channel-partner-id" element={<ProtectedRouteWithRole path="/channel-partner-id"><ChannelPartnerID /></ProtectedRouteWithRole>} />
              <Route path="/others/channel-partner-id" element={<ProtectedRouteWithRole path="/others"><ChannelPartnerID /></ProtectedRouteWithRole>} />

              {/* Integrations Module */}
              <Route path="/integrations" element={<ProtectedRouteWithRole path="/integrations"><Integration /></ProtectedRouteWithRole>} />
              <Route path="/integrations/sendpulse" element={<ProtectedRouteWithRole path="/integrations/sendpulse"><SendPulseConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/askeva" element={<ProtectedRouteWithRole path="/integrations/askeva"><AskevaConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/email" element={<ProtectedRouteWithRole path="/integrations/email"><EmailConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/exotel" element={<ProtectedRouteWithRole path="/integrations/exotel"><ExotelConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/google-calendar" element={<ProtectedRouteWithRole path="/integrations/google-calendar"><GoogleCalendarConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/rcs" element={<ProtectedRouteWithRole path="/integrations/rcs"><RCSConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/sendgrid" element={<ProtectedRouteWithRole path="/integrations/sendgrid"><SendGridConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/sms" element={<ProtectedRouteWithRole path="/integrations/sms"><SMSConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/voice" element={<ProtectedRouteWithRole path="/integrations/voice"><VoiceConfig /></ProtectedRouteWithRole>} />

              {/* Interview/Recruitment Routes */}
              <Route path="/job-openings" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><JobOpeningsList /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/create" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:id/edit" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:id/view" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:id/interview-flow" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><JobInterviewFlowManagement /></ProtectedRouteWithRole>} />
              <Route path="/candidates" element={<ProtectedRouteWithRole path="/candidates"><Candidates /></ProtectedRouteWithRole>} />
              <Route path="/candidate/:id" element={<ProtectedRouteWithRole path="/candidates"><InterviewCandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/hiring" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Hiring /></ProtectedRouteWithRole>} />
              <Route path="/refer-candidate" element={<ProtectedRouteWithRole><ReferCandidate /></ProtectedRouteWithRole>} />


              {/* Offer Letter Routes - Order matters: specific routes before parameterized ones */}
              <Route path="/offer-letter/templates/create" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR"]}><OfferLetterTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates/edit/:id" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR"]}><OfferLetterTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates/:id/edit" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR"]}><OfferLetterTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR"]}><OfferLetterTemplateList /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/create" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/edit" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/view" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/preview" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><OfferLetterPreview /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><OfferLetterList /></ProtectedRouteWithRole>} />


              <Route path="/interview/background-verification" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><BackgroundVerification /></ProtectedRouteWithRole>} />
              <Route path="/interview/background-verification/:candidateId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><BackgroundVerificationDetail /></ProtectedRouteWithRole>} />

              <Route path="/interview-appointments" element={<ProtectedRouteWithRole path="/candidates"><InterviewAppointments /></ProtectedRouteWithRole>} />
              <Route path="/onboarding" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Onboarding /></ProtectedRouteWithRole>} />

              {/* Interview Module - Nested Routes */}
              <Route path="/interview" element={<InterviewLayout />}>
                <Route path="templates" element={<ProtectedRouteWithRole path="/interview/templates"><InterviewTemplateManagement /></ProtectedRouteWithRole>} />
                <Route path="round/1" element={<ProtectedRouteWithRole path="/interview/round/1"><InterviewSelection type="round" roundNumber={1} /></ProtectedRouteWithRole>} />
                <Route path="round/2" element={<ProtectedRouteWithRole path="/interview/round/2"><InterviewSelection type="round" roundNumber={2} /></ProtectedRouteWithRole>} />
                <Route path="round/3" element={<ProtectedRouteWithRole path="/interview/round/3"><InterviewSelection type="round" roundNumber={3} /></ProtectedRouteWithRole>} />
                <Route path="round/final" element={<ProtectedRouteWithRole path="/interview/round/final"><InterviewSelection type="round" roundNumber={4} /></ProtectedRouteWithRole>} />
                <Route path="selected" element={<ProtectedRouteWithRole path="/interview/selected"><InterviewSelection type="selected" /></ProtectedRouteWithRole>} />
                <Route path="candidate/progress" element={<ProtectedRouteWithRole path="/interview/candidate/progress"><InterviewSelection type="progress" /></ProtectedRouteWithRole>} />
                <Route path="round/:interviewId" element={<ProtectedRouteWithRole path="/interview"><InterviewRoundScreen /></ProtectedRouteWithRole>} />
                <Route path="candidate/:candidateId/progress" element={<ProtectedRouteWithRole path="/interview/candidate/progress"><InterviewProgress /></ProtectedRouteWithRole>} />
                <Route path="hr/:interviewId" element={<ProtectedRouteWithRole path="/interview"><HRInterviewScreen /></ProtectedRouteWithRole>} />
                <Route path="manager/:interviewId" element={<ProtectedRouteWithRole path="/interview"><ManagerInterviewScreen /></ProtectedRouteWithRole>} />
                <Route path="session/:interviewId" element={<ProtectedRouteWithRole path="/interview"><InterviewSessionWrapper /></ProtectedRouteWithRole>} />
              </Route>

              {/* Access Denied Route */}
              <Route path="/access-denied" element={<AccessDenied />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ConfigProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
