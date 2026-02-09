import PrivacyPolicy from "./pages/PrivacyPolicy";
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Performance & PMS Imports
import MyGoals from "./pages/pmsPages/MyGoals";
import GoalProgress from "./pages/pmsPages/GoalProgress";
import GoalApproval from "./pages/pmsPages/GoalApproval";
import SelfReview from "./pages/pmsPages/SelfReview";
import ManagerReview from "./pages/pmsPages/ManagerReview";
import HRReview from "./pages/pmsPages/HRReview";
import PMSReports from "./pages/pmsPages/PMSReports";
import PMSSettings from "./pages/pmsPages/PMSSettings";
import KRAKPI from "./pages/performancePages/KRAKPI";
import Performance from "./pages/performancePages/Performance";
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
import CourseLibrary from './pages/lms/CourseLibrary';
import LMSDashboard from '@/pages/lms/LMSDashboard';
import CoursePage from '@/pages/lms/CoursePage';
import EmployeeLMSDashboard from '@/pages/lms/EmployeeLMSDashboard';
import EmployeeCoursePage from './pages/lms/EmployeeCoursePage';
import AIQuizAttempt from '@/pages/lms/AIQuizAttempt';

import Assessment from '@/pages/lms/Assessment';
import AssessmentManagement from './pages/lms/admin/AssessmentManagement';
import LearningEngineDashboard from './pages/lms/LearningEngineDashboard';

// Assets Imports
import Assets from "./pages/assetsPages/Assets";
import AssetTypes from "./pages/assetsPages/AssetTypes";

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
import EmployeeProfile from "./pages/employeePages/EmployeeProfile";
import Settings from "./pages/Settings";
import SubscriptionManagement from "./pages/superAdmin/SubscriptionManagement";
import HRInterviewScreen from "./pages/InterviewPages/HRInterviewScreen";
import ManagerInterviewScreen from "./pages/InterviewPages/ManagerInterviewScreen";
import JobInterviewFlowManagement from "./pages/InterviewPages/JobInterviewFlowManagement";
import { InterviewSession } from "./pages/InterviewPages/InterviewSession";
import ChannelPartnerID from "./pages/ChannelPartnerID";
import SalaryOverview from "./pages/SalaryOverview";
import { useParams } from "react-router-dom";
import CourseDetail from "@/pages/lms/admin/CourseDetail";
import LiveSessionManager from "@/pages/lms/admin/LiveSessionManager";
import CourseDetailModern from "@/pages/lms/admin/CourseDetailModern";
import EmployeeLiveSessions from "@/pages/lms/EmployeeLiveSessions";
import LiveRoom from "@/pages/lms/LiveSession";
import LearnersList from "@/pages/lms/admin/LearnersList";
import LearnerDetail from "@/pages/lms/admin/LearnerDetail";
import ScoresAnalytics from "@/pages/lms/admin/ScoresAnalytics";

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

const queryClient = new QueryClient();

const App = () => {
  console.log("App with Full Module Routes executing..."); // Force Refresh
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ConfigProvider theme={antdTheme}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SocketInitializer />
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <Routes>
                  {/* Public & Core */}
                  <Route path="/" element={<Login />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/candidate/apply/:token" element={<PublicCandidateForm />} />
                  <Route path="/refer-candidate/:token" element={<PublicReferralForm />} />
                  <Route path="/Privacypolicy" element={<PrivacyPolicy />} />
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
                  <Route path="/staff/attendance" element={<ProtectedRouteWithRole><AdminAttendance /></ProtectedRouteWithRole>} />
                  <Route path="/staff/leaves-pending-approval" element={<ProtectedRouteWithRole><LeavesPendingApproval /></ProtectedRouteWithRole>} />
                  <Route path="/staff/loans" element={<ProtectedRouteWithRole><Loans /></ProtectedRouteWithRole>} />
                  <Route path="/staff/expense-claims" element={<ProtectedRouteWithRole><ExpenseClaim /></ProtectedRouteWithRole>} />
                  <Route path="/staff/payslip-requests" element={<ProtectedRouteWithRole><PayslipRequests /></ProtectedRouteWithRole>} />

                  {/* Employee Module */}
                  <Route path="/employee/dashboard" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeDashboard /></ProtectedRouteWithRole>} />
                  <Route path="/employee/requests" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeRequests /></ProtectedRouteWithRole>} />
                  <Route path="/employee/salary" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeSalaryOverview /></ProtectedRouteWithRole>} />
                  <Route path="/employee/holidays" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeHolidays /></ProtectedRouteWithRole>} />
                  <Route path="/employee/attendance" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeAttendance /></ProtectedRouteWithRole>} />
                  <Route path="/employee/assets" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeAssets /></ProtectedRouteWithRole>} />
                  <Route path="/employee/profile" element={<ProtectedRouteWithRole allowedRoles={["Employee", "EmployeeAdmin"]}><EmployeeProfile /></ProtectedRouteWithRole>} />

                  {/* Performance & PMS Module */}
                  <Route path="/pms/my-goals" element={<ProtectedRouteWithRole><MyGoals /></ProtectedRouteWithRole>} />
                  <Route path="/pms/goal-progress" element={<ProtectedRouteWithRole><GoalProgress /></ProtectedRouteWithRole>} />
                  <Route path="/pms/goal-approval" element={<ProtectedRouteWithRole><GoalApproval /></ProtectedRouteWithRole>} />
                  <Route path="/pms/self-review" element={<ProtectedRouteWithRole><SelfReview /></ProtectedRouteWithRole>} />
                  <Route path="/pms/manager-review" element={<ProtectedRouteWithRole><ManagerReview /></ProtectedRouteWithRole>} />
                  <Route path="/pms/hr-review" element={<ProtectedRouteWithRole><HRReview /></ProtectedRouteWithRole>} />
                  <Route path="/pms/reports" element={<ProtectedRouteWithRole><PMSReports /></ProtectedRouteWithRole>} />
                  <Route path="/pms/settings" element={<ProtectedRouteWithRole><PMSSettings /></ProtectedRouteWithRole>} />
                  <Route path="/kra" element={<ProtectedRouteWithRole><KRAKPI /></ProtectedRouteWithRole>} />
                  <Route path="/performance" element={<ProtectedRouteWithRole><Performance /></ProtectedRouteWithRole>} />
                  <Route path="/compliance" element={<ProtectedRouteWithRole><Compliance /></ProtectedRouteWithRole>} />
                  <Route path="/sop" element={<ProtectedRouteWithRole><SOP /></ProtectedRouteWithRole>} />

                  {/* Payroll Module */}
                  <Route path="/payroll" element={<ProtectedRouteWithRole><PayrollHub /></ProtectedRouteWithRole>} />
                  <Route path="/payroll/management" element={<ProtectedRouteWithRole><Payroll /></ProtectedRouteWithRole>} />
                  <Route path="/payroll/preview" element={<ProtectedRouteWithRole><PayrollPreview /></ProtectedRouteWithRole>} />
                  <Route path="/payroll/attendance" element={<ProtectedRouteWithRole><PayrollAttendance /></ProtectedRouteWithRole>} />
                  <Route path="/payroll/attendance/:id" element={<ProtectedRouteWithRole><AttendanceDetail /></ProtectedRouteWithRole>} />
                  <Route path="/payroll/reimbursements" element={<ProtectedRouteWithRole><Reimbursements /></ProtectedRouteWithRole>} />
                  <Route path="/salary-overview" element={<ProtectedRouteWithRole><SalaryOverview /></ProtectedRouteWithRole>} />

                  {/* Company Policy */}
                  <Route path="/company" element={<ProtectedRouteWithRole><CompanyPolicies /></ProtectedRouteWithRole>} />

                  {/* LMS Module */}
                  <Route path="/lms-dashboard" element={<ProtectedRouteWithRole><LMSDashboard /></ProtectedRouteWithRole>} />
                  <Route path="/course-library" element={<ProtectedRouteWithRole><CourseLibrary /></ProtectedRouteWithRole>} />
                  <Route path="/lms/course/:id" element={<ProtectedRouteWithRole><CoursePage /></ProtectedRouteWithRole>} />
                  <Route path="/lms" element={<ProtectedRouteWithRole><CourseLibrary /></ProtectedRouteWithRole>} />
                  <Route path="/lms/employee/dashboard" element={<ProtectedRouteWithRole><EmployeeLMSDashboard /></ProtectedRouteWithRole>} />
                  <Route path="/lms/learning-engine" element={<ProtectedRouteWithRole><LearningEngineDashboard /></ProtectedRouteWithRole>} />
                  <Route path="/lms/employee/course/:id" element={<ProtectedRouteWithRole><EmployeeCoursePage /></ProtectedRouteWithRole>} />
                  <Route path="/lms/ai-quiz/attempt/:quizId" element={<ProtectedRouteWithRole><AIQuizAttempt /></ProtectedRouteWithRole>} />
                  <Route path="/lms/live-sessions" element={<ProtectedRouteWithRole allowedRoles={['Admin', 'Manager', 'Super Admin']}><LiveSessionManager /></ProtectedRouteWithRole>} />
                  <Route path="/lms/employee/live-sessions" element={<ProtectedRouteWithRole><EmployeeLiveSessions /></ProtectedRouteWithRole>} />
                  <Route path="/lms/live/:sessionId" element={<ProtectedRouteWithRole><LiveRoom /></ProtectedRouteWithRole>} />
                  <Route path="/lms/admin/course/:courseId" element={<ProtectedRouteWithRole><CourseDetail /></ProtectedRouteWithRole>} />
                  <Route path="/lms/admin/course-modern/:courseId" element={<ProtectedRouteWithRole><CourseDetailModern /></ProtectedRouteWithRole>} />
                  <Route path="/lms/assessment/:courseId" element={<ProtectedRouteWithRole><Assessment /></ProtectedRouteWithRole>} />
                  <Route path="/assessment" element={<ProtectedRouteWithRole allowedRoles={['Admin', 'Manager', 'Super Admin']}><AssessmentManagement /></ProtectedRouteWithRole>} />

                  {/* Learners & Analytics */}
                  <Route path="/lms/learners" element={<ProtectedRouteWithRole allowedRoles={['Admin', 'Manager', 'Super Admin']}><LearnersList /></ProtectedRouteWithRole>} />
                  <Route path="/lms/learners/:id" element={<ProtectedRouteWithRole allowedRoles={['Admin', 'Manager', 'Super Admin']}><LearnerDetail /></ProtectedRouteWithRole>} />
                  <Route path="/lms/scores-analytics" element={<ProtectedRouteWithRole allowedRoles={['Admin', 'Manager', 'Super Admin']}><ScoresAnalytics /></ProtectedRouteWithRole>} />

                  {/* Assets Module */}
                  <Route path="/assets" element={<ProtectedRouteWithRole><Assets /></ProtectedRouteWithRole>} />
                  <Route path="/assets-type" element={<ProtectedRouteWithRole><AssetTypes /></ProtectedRouteWithRole>} />

                  {/* Settings Module */}
                  <Route path="/settings" element={<ProtectedRouteWithRole><Settings /></ProtectedRouteWithRole>} />
                  <Route path="/user-management" element={<ProtectedRouteWithRole><UserManagement /></ProtectedRouteWithRole>} />
                  <Route path="/role-management" element={<ProtectedRouteWithRole requireRole="Admin"><RoleManagement /></ProtectedRouteWithRole>} />

                  {/* Attendance Settings */}
                  <Route path="/attendance-setting" element={<ProtectedRouteWithRole><AttendanceSetting /></ProtectedRouteWithRole>} />
                  <Route path="/attendance-templates" element={<ProtectedRouteWithRole><AttendanceTemplates /></ProtectedRouteWithRole>} />
                  <Route path="/attendance-geofence" element={<ProtectedRouteWithRole><AttendanceGeofence /></ProtectedRouteWithRole>} />
                  <Route path="/attendance-shifts" element={<ProtectedRouteWithRole><ShiftSettings /></ProtectedRouteWithRole>} />
                  <Route path="/attendance-automation-rules" element={<ProtectedRouteWithRole><AutomationRules /></ProtectedRouteWithRole>} />

                  {/* Business Settings */}
                  <Route path="/business-setting" element={<ProtectedRouteWithRole><BusinessSetting /></ProtectedRouteWithRole>} />
                  <Route path="/business/holiday-templates" element={<ProtectedRouteWithRole><HolidayTemplates /></ProtectedRouteWithRole>} />
                  <Route path="/business/holiday-templates/new" element={<ProtectedRouteWithRole><HolidayTemplateForm /></ProtectedRouteWithRole>} />
                  <Route path="/business/holiday-templates/:id/edit" element={<ProtectedRouteWithRole><HolidayTemplateForm /></ProtectedRouteWithRole>} />
                  <Route path="/business/leave-templates" element={<ProtectedRouteWithRole><LeaveTemplates /></ProtectedRouteWithRole>} />
                  <Route path="/business/leave-templates/new" element={<ProtectedRouteWithRole><LeaveTemplateForm /></ProtectedRouteWithRole>} />
                  <Route path="/business/leave-templates/:id/edit" element={<ProtectedRouteWithRole><LeaveTemplateForm /></ProtectedRouteWithRole>} />
                  <Route path="/business/manage-users" element={<ProtectedRouteWithRole><ManageUsers /></ProtectedRouteWithRole>} />
                  <Route path="/business/celebrations" element={<ProtectedRouteWithRole><Celebrations /></ProtectedRouteWithRole>} />
                  <Route path="/business/weekly-holidays" element={<ProtectedRouteWithRole><WeeklyHolidays /></ProtectedRouteWithRole>} />
                  <Route path="/business/roles-permissions" element={<ProtectedRouteWithRole><RolesPermissions /></ProtectedRouteWithRole>} />
                  <Route path="/business/business-functions" element={<ProtectedRouteWithRole><BusinessFunctions /></ProtectedRouteWithRole>} />
                  <Route path="/business/staff-details" element={<ProtectedRouteWithRole><StaffDetails /></ProtectedRouteWithRole>} />

                  {/* Salary Settings */}
                  {/* <Route path="/salary-setting" element={<ProtectedRouteWithRole><SalarySetting /></ProtectedRouteWithRole>} /> */}
                  {/* Payroll Settings */}
                  <Route path="/payroll-setting" element={<ProtectedRouteWithRole><PayrollSetting /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/processing-rules" element={<ProtectedRouteWithRole><PayrollProcessingRules /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/attendance-calculation" element={<ProtectedRouteWithRole><AttendanceCalculation /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/cycle" element={<ProtectedRouteWithRole><PayrollCycle /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/deductions" element={<ProtectedRouteWithRole><DeductionRules /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/fine-calculation" element={<ProtectedRouteWithRole><FineCalculation /></ProtectedRouteWithRole>} />
                  <Route path="/settings/payroll/reimbursement" element={<ProtectedRouteWithRole><ReimbursementIntegration /></ProtectedRouteWithRole>} />
                  <Route path="/salary/calculation-logic" element={<ProtectedRouteWithRole><SalaryCalculationLogic /></ProtectedRouteWithRole>} />
                  <Route path="/salary/components" element={<ProtectedRouteWithRole><SaleryComponents /></ProtectedRouteWithRole>} />
                  <Route path="/salary/template-builder" element={<ProtectedRouteWithRole><SaleryTemplateBuilder /></ProtectedRouteWithRole>} />
                  <Route path="/salary/details-access" element={<ProtectedRouteWithRole><SalaryDetailsAccess /></ProtectedRouteWithRole>} />
                  <Route path="/salary/payslip-customization" element={<ProtectedRouteWithRole><PayslipCustomization /></ProtectedRouteWithRole>} />

                  {/* Business Info Settings */}
                  <Route path="/businessinfo-setting" element={<ProtectedRouteWithRole><BusinessInfo /></ProtectedRouteWithRole>} />
                  <Route path="/business-info/edit-business-name" element={<ProtectedRouteWithRole><EditBusinessName /></ProtectedRouteWithRole>} />
                  <Route path="/business-info/edit-state-city" element={<ProtectedRouteWithRole><EditStateCity /></ProtectedRouteWithRole>} />
                  <Route path="/business-info/edit-business-address" element={<ProtectedRouteWithRole><EditBusinessAddress /></ProtectedRouteWithRole>} />
                  <Route path="/business-info/edit-business-logo" element={<ProtectedRouteWithRole><EditBusinessLogo /></ProtectedRouteWithRole>} />

                  {/* Other Settings */}
                  <Route path="/others-setting" element={<ProtectedRouteWithRole><OthersSetting /></ProtectedRouteWithRole>} />
                  <Route path="/onboarding-document-requirements" element={<ProtectedRouteWithRole requireRole="Admin"><OnboardingDocumentRequirements /></ProtectedRouteWithRole>} />
                  <Route path="/alerts-notifications" element={<ProtectedRouteWithRole><AlertsNotifications /></ProtectedRouteWithRole>} />
                  <Route path="/others/alerts-notifications" element={<ProtectedRouteWithRole><AlertsNotifications /></ProtectedRouteWithRole>} />
                  <Route path="/channel-partner-id" element={<ProtectedRouteWithRole><ChannelPartnerID /></ProtectedRouteWithRole>} />
                  <Route path="/others/channel-partner-id" element={<ProtectedRouteWithRole><ChannelPartnerID /></ProtectedRouteWithRole>} />

                  {/* Integrations Module */}
                  <Route path="/integrations" element={<ProtectedRouteWithRole requireRole="Admin"><Integration /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/sendpulse" element={<ProtectedRouteWithRole requireRole="Admin"><SendPulseConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/askeva" element={<ProtectedRouteWithRole requireRole="Admin"><AskevaConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/email" element={<ProtectedRouteWithRole requireRole="Admin"><EmailConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/exotel" element={<ProtectedRouteWithRole requireRole="Admin"><ExotelConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/google-calendar" element={<ProtectedRouteWithRole requireRole="Admin"><GoogleCalendarConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/rcs" element={<ProtectedRouteWithRole requireRole="Admin"><RCSConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/sendgrid" element={<ProtectedRouteWithRole requireRole="Admin"><SendGridConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/sms" element={<ProtectedRouteWithRole requireRole="Admin"><SMSConfig /></ProtectedRouteWithRole>} />
                  <Route path="/integrations/voice" element={<ProtectedRouteWithRole requireRole="Admin"><VoiceConfig /></ProtectedRouteWithRole>} />

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
                    <Route path="templates" element={<ProtectedRouteWithRole requireRole="Admin"><InterviewTemplateManagement /></ProtectedRouteWithRole>} />
                    <Route path="round/1" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={1} /></ProtectedRouteWithRole>} />
                    <Route path="round/2" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={2} /></ProtectedRouteWithRole>} />
                    <Route path="round/3" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={3} /></ProtectedRouteWithRole>} />
                    <Route path="round/final" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={4} /></ProtectedRouteWithRole>} />
                    <Route path="selected" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="selected" /></ProtectedRouteWithRole>} />
                    <Route path="candidate/progress" element={<ProtectedRouteWithRole path="/candidates"><InterviewSelection type="progress" /></ProtectedRouteWithRole>} />
                    <Route path="round/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Manager", "Recruiter"]}><InterviewRoundScreen /></ProtectedRouteWithRole>} />
                    <Route path="candidate/:candidateId/progress" element={<ProtectedRouteWithRole path="/candidates"><InterviewProgress /></ProtectedRouteWithRole>} />
                    <Route path="hr/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter"]}><HRInterviewScreen /></ProtectedRouteWithRole>} />
                    <Route path="manager/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><ManagerInterviewScreen /></ProtectedRouteWithRole>} />
                    <Route path="session/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSessionWrapper /></ProtectedRouteWithRole>} />
                  </Route>

                  {/* Access Denied Route */}
                  {/* LMS Routes */}
                  <Route path="/lms" element={<ProtectedRouteWithRole><CourseLibrary /></ProtectedRouteWithRole>} />

                  <Route path="/access-denied" element={<AccessDenied />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </QueryClientProvider>
          </TooltipProvider>
        </ConfigProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
