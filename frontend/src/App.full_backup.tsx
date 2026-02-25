import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedRouteWithRole from "./components/ProtectedRouteWithRole";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Candidates from "./pages/InterviewPages/Candidates";
import Staff from "./pages/staffPages/Staff";
import Hiring from "./pages/Hiring";
import BackgroundVerification from "./pages/InterviewPages/BackgroundVerification";
import BackgroundVerificationDetail from "./pages/InterviewPages/BackgroundVerificationDetail";
import BackgroundVerificationUpload from "./pages/candidate/BackgroundVerificationUpload";
import InterviewAppointments from "./pages/InterviewPages/InterviewAppointments";
import Onboarding from "./pages/InterviewPages/Onboarding";
import InterviewTemplateManagement from "./pages/InterviewPages/InterviewTemplateManagement";
import HRInterviewScreen from "./pages/InterviewPages/HRInterviewScreen";
import ManagerInterviewScreen from "./pages/InterviewPages/ManagerInterviewScreen";
import InterviewRoundScreen from "./pages/InterviewPages/InterviewRoundScreen";
import InterviewProgress from "./pages/InterviewPages/InterviewProgress";
import JobInterviewFlowManagement from "./pages/InterviewPages/JobInterviewFlowManagement";
import InterviewLayout from "./components/InterviewLayout";
import InterviewSelection from "./pages/InterviewPages/InterviewSelection";
import StaffProfile from "./pages/staffPages/StaffProfile";
import SOP from "./pages/performancePages/SOP";
import KRAKPI from "./pages/performancePages/KRAKPI";
import Performance from "./pages/performancePages/Performance";
import PayrollHub from "./pages/PayrollHub";
import Payroll from "./pages/payrollPages/Payroll";
import Attendance from "./pages/payrollPages/Attendance";
import AttendanceDetail from "./pages/AttendanceDetail";
import Reimbursements from "./pages/payrollPages/Reimbursements";
import Compliance from "./pages/performancePages/Compliance";
import ReferCandidate from "./pages/InterviewPages/ReferCandidate";
import Applications from "./pages/InterviewPages/Applications";
import GenerateOfferLetter from "./pages/InterviewPages/GenerateOfferLetter";
import OfferLetterList from "./pages/InterviewPages/OfferLetterList";
import OfferLetterForm from "./pages/InterviewPages/OfferLetterForm";
import OfferLetterPreview from "./pages/InterviewPages/OfferLetterPreview";

import OfferLetterTemplateList from "./pages/InterviewPages/OfferLetterTemplateList";
import OfferLetterTemplateForm from "./pages/InterviewPages/OfferLetterTemplateForm";
import JobOpeningsList from "./pages/InterviewPages/JobOpeningsList";
import JobOpeningForm from "./pages/InterviewPages/JobOpeningForm";
import SalaryOverview from "./pages/SalaryOverview";
import SalaryStructure from "./pages/SalaryStructure";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import ProfileRoute from "./components/ProfileRoute";
import InterviewCandidateProfile from "./pages/InterviewPages/CandidateProfile";
import AccountSettings from "./pages/settingsPages/AccountSetting";
import AttendanceSettings from "./pages/settingsPages/AttendanceSetting";
import BusinessInfo from "./pages/settingsPages/BusinessInfo";
import BusinessSettings from "./pages/settingsPages/BussinessSetting";
import SalarySettings from "./pages/settingsPages/SalarySetting";
import OtherSettings from "./pages/settingsPages/Others";
import PaymentSettings from "./pages/settingsPages/PaymentSetting";
import BusinessNameBankStatement from "./pages/settingsPages/paymentPages/BusinessNameBankStatement";
import BusinessBankAccount from "./pages/settingsPages/paymentPages/BusinessBankAccount";
import AttendanceTemplates from "./pages/settingsPages/attendancepages/AttendanceTemplates";
import AttendanceGeofence from "./pages/settingsPages/attendancepages/AttendanceGeofence";
import ShiftSettings from "./pages/settingsPages/attendancepages/ShiftSettings";
import AutomationRules from "./pages/settingsPages/attendancepages/AutomationRules";
import HolidayTemplates from "./pages/settingsPages/bussinessPages.tsx/HolidayTemplates";
import LeaveTemplates from "./pages/settingsPages/bussinessPages.tsx/LeaveTemplates";
import ManageUsers from "./pages/settingsPages/bussinessPages.tsx/ManageUsers";
import Celebrations from "./pages/settingsPages/bussinessPages.tsx/Celebrations";
import WeeklyHolidays from "./pages/settingsPages/bussinessPages.tsx/WeeklyHolidays";
import StaffDetails from "./pages/settingsPages/bussinessPages.tsx/StaffDetails";
import RolesPermissions from "./pages/settingsPages/bussinessPages.tsx/RolesPermissions";
import BusinessFunctions from "./pages/settingsPages/bussinessPages.tsx/BusinessFunctions";
import SalaryCalculationLogic from "./pages/settingsPages/salaryPages/SalaryCalculationLogic";
import SalaryDetailsAccess from "./pages/settingsPages/salaryPages/SalaryDetailsAccess";
import PayslipCustomization from "./pages/settingsPages/salaryPages/PayslipCustomization";
import SaleryComponents from "./pages/settingsPages/salaryPages/SaleryComponents";
import SaleryTemplateBuilder from "./pages/settingsPages/salaryPages/SaleryTemplateBuilder";
import ChannelPartnerID from "./pages/ChannelPartnerID";
import AlertsNotifications from "./pages/AlertsNotifications";
import EditBusinessName from "./pages/settingsPages/bussinessInfoPages/EditBusinessName";
import EditStateCity from "./pages/settingsPages/bussinessInfoPages/EditStateCity";
import EditBusinessAddress from "./pages/settingsPages/bussinessInfoPages/EditBusinessAddress";
import EditBusinessLogo from "./pages/settingsPages/bussinessInfoPages/EditBusinessLogo";
import EditName from "./pages/settingsPages/accountPages/EditName";
import EditPhoneNumber from "./pages/settingsPages/accountPages/EditPhoneNumber";
import EditEmail from "./pages/settingsPages/accountPages/EditEmail";
import BusinessList from "./pages/settingsPages/accountPages/BusinessList";
import AssetTypes from "./pages/assetsPages/AssetTypes";
import Assets from "./pages/assetsPages/Assets";
import CompanyPolicies from "./pages/CompanyPolicies";
import VideoLibrary from "./pages/lms/CourseLibrary";
import QuestionGenerator from "./pages/lms/QuestionGenerator";
import Quiz from "./pages/lms/Quiz";
import Analytics from "./pages/lms/Analytics";
import CourseView from "./pages/CourseView";
import LiveSession from "./pages/lms/LiveSession";
import UserManagement from "./pages/settingsPages/UserManagement";
import RoleManagement from "./pages/settingsPages/RoleManagement";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import JobVacancies from "./pages/candidate/JobVacancies";
import ApplicationStatus from "./pages/candidate/ApplicationStatus";
import CandidateProfile from "./pages/candidate/CandidateProfile";
import PublicCandidateForm from "./pages/candidate/PublicCandidateForm";
import PublicReferralForm from "./pages/InterviewPages/PublicReferralForm";

// Super Admin Pages
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import ManageCompanies from "./pages/superAdmin/ManageCompanies";
import SuperAdminSettings from "./pages/superAdmin/SuperAdminSettings";
import SubscriptionManagement from "./pages/superAdmin/SubscriptionManagement";
import SuperAdminRoute from "./components/SuperAdminRoute";

// PMS Pages
import PMSSettings from "./pages/pmsPages/PMSSettings";
import MyGoals from "./pages/pmsPages/MyGoals";
import GoalApproval from "./pages/pmsPages/GoalApproval";
import GoalProgress from "./pages/pmsPages/GoalProgress";
import SelfReview from "./pages/pmsPages/SelfReview";
import ManagerReview from "./pages/pmsPages/ManagerReview";
import HRReview from "./pages/pmsPages/HRReview";
import PMSReports from "./pages/pmsPages/PMSReports";

// Integration Pages
import Integration from "./pages/integrationPages/Integration";
import ExotelConfig from "./pages/integrationPages/configPages/ExotelConfig";
import EmailConfig from "./pages/integrationPages/configPages/EmailConfig";
import GoogleCalendarConfig from "./pages/integrationPages/configPages/GoogleCalendarConfig";
import SMSConfig from "./pages/integrationPages/configPages/SMSConfig";
import RCSConfig from "./pages/integrationPages/configPages/RCSConfig";
import VoiceConfig from "./pages/integrationPages/configPages/VoiceConfig";
import AskevaConfig from "./pages/integrationPages/configPages/AskevaConfig";
import SendGridConfig from "./pages/integrationPages/configPages/SendGridConfig";

const App = () => {
  console.log("App component rendering...");
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              {/* Profile route - renders CandidateProfile for Candidates, Profile for others */}
              <Route path="/profile" element={<ProtectedRoute><ProfileRoute /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRouteWithRole requireRole="Admin"><AdminDashboard /></ProtectedRouteWithRole>} />

              {/* Candidate Routes */}
              <Route path="/candidate/dashboard" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateDashboard /></ProtectedRouteWithRole>} />
              <Route path="/candidate/job-vacancies" element={<ProtectedRouteWithRole requireRole="Candidate"><JobVacancies /></ProtectedRouteWithRole>} />
              <Route path="/candidate/applications" element={<ProtectedRouteWithRole requireRole="Candidate"><ApplicationStatus /></ProtectedRouteWithRole>} />
              <Route path="/candidate/profile" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/candidate/resume" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateProfile /></ProtectedRouteWithRole>} />
              {/* Unified Profile route - both /profile and /candidate/history render CandidateProfile for Candidates */}
              <Route path="/candidate/history" element={<ProtectedRouteWithRole requireRole="Candidate"><CandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/candidate/background-verification" element={<ProtectedRouteWithRole requireRole="Candidate"><BackgroundVerificationUpload /></ProtectedRouteWithRole>} />

              {/* Public Candidate Form (No authentication required) */}
              <Route path="/candidate/apply/:token" element={<PublicCandidateForm />} />
              {/* Public Referral Form (No authentication required) */}
              <Route path="/refer-candidate/:token" element={<PublicReferralForm />} />
              {/* Interview/Recruitment Routes */}
              <Route path="/candidates" element={<ProtectedRouteWithRole path="/candidates"><Candidates /></ProtectedRouteWithRole>} />
              <Route path="/candidate/:id" element={<ProtectedRouteWithRole path="/candidates"><InterviewCandidateProfile /></ProtectedRouteWithRole>} />
              <Route path="/hiring" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Hiring /></ProtectedRouteWithRole>} />
              <Route path="/interview/background-verification" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><BackgroundVerification /></ProtectedRouteWithRole>} />
              <Route path="/interview/background-verification/:candidateId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><BackgroundVerificationDetail /></ProtectedRouteWithRole>} />
              <Route path="/interview-appointments" element={<ProtectedRouteWithRole path="/candidates"><InterviewAppointments /></ProtectedRouteWithRole>} />
              <Route path="/onboarding" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Onboarding /></ProtectedRouteWithRole>} />

              {/* Interview Module - Nested Routes */}
              <Route path="/interview" element={<InterviewLayout />}>
                {/* Interview Flows (formerly Templates) - Admin Only */}
                <Route path="templates" element={<ProtectedRouteWithRole requireRole="Admin"><InterviewTemplateManagement /></ProtectedRouteWithRole>} />

                {/* Round-Based Interview Selection Pages - These are for listing candidates, NOT for conducting interviews */}
                {/* These routes handle /interview/round/1, /interview/round/2, etc. for candidate selection */}
                {/* IMPORTANT: These literal routes MUST come BEFORE the parameter route in React Router */}
                <Route path="round/1" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={1} /></ProtectedRouteWithRole>} />
                <Route path="round/2" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={2} /></ProtectedRouteWithRole>} />
                <Route path="round/3" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={3} /></ProtectedRouteWithRole>} />
                <Route path="round/final" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="round" roundNumber={4} /></ProtectedRouteWithRole>} />
                <Route path="selected" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR", "Recruiter", "Manager"]}><InterviewSelection type="selected" /></ProtectedRouteWithRole>} />

                {/* Candidate Progress Selection */}
                <Route path="candidate/progress" element={<ProtectedRouteWithRole path="/candidates"><InterviewSelection type="progress" /></ProtectedRouteWithRole>} />

                {/* Unified Round-Based Interview Screen - This handles /interview/round/{interviewId} where interviewId is a MongoDB ObjectId */}
                {/* This route comes AFTER literal routes so "1", "2", "3", "final" match the literal routes above */}
                <Route path="round/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Manager", "Recruiter"]}><InterviewRoundScreen /></ProtectedRouteWithRole>} />

                {/* Interview Progress */}
                <Route path="candidate/:candidateId/progress" element={<ProtectedRouteWithRole path="/candidates"><InterviewProgress /></ProtectedRouteWithRole>} />
              </Route>

              {/* Legacy routes - redirect to new structure */}
              <Route path="/interview-templates" element={<ProtectedRouteWithRole requireRole="Admin"><InterviewTemplateManagement /></ProtectedRouteWithRole>} />
              <Route path="/interviews/hr/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "HR", "Senior HR"]}><InterviewRoundScreen /></ProtectedRouteWithRole>} />
              <Route path="/interviews/manager/:interviewId" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><InterviewRoundScreen /></ProtectedRouteWithRole>} />
              <Route path="/candidate/:candidateId/interview-progress" element={<ProtectedRouteWithRole path="/candidates"><InterviewProgress /></ProtectedRouteWithRole>} />
              <Route path="/refer-candidate" element={<ProtectedRouteWithRole path="/candidates"><ReferCandidate /></ProtectedRouteWithRole>} />
              <Route path="/create-interview" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Applications /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterList /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/create" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/edit" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/view" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/:id/preview" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterPreview /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterTemplateList /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates/create" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/offer-letter/templates/edit/:id" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><OfferLetterTemplateForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings" element={<ProtectedRouteWithRole path="/candidates"><JobOpeningsList /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/create" element={<ProtectedRouteWithRole path="/candidates"><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:id/view" element={<ProtectedRouteWithRole path="/candidates"><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:id/edit" element={<ProtectedRouteWithRole path="/candidates"><JobOpeningForm /></ProtectedRouteWithRole>} />
              <Route path="/job-openings/:jobId/interview-flow" element={<ProtectedRouteWithRole requireRole="Admin"><JobInterviewFlowManagement /></ProtectedRouteWithRole>} />

              {/* Staff Routes */}
              <Route path="/staff" element={<ProtectedRouteWithRole path="/staff"><Staff /></ProtectedRouteWithRole>} />
              <Route path="/staff-profile" element={<ProtectedRouteWithRole path="/staff"><StaffProfile /></ProtectedRouteWithRole>} />
              <Route path="/staff-profile/:id" element={<ProtectedRouteWithRole path="/staff"><StaffProfile /></ProtectedRouteWithRole>} />
              {/* Performance Routes */}
              <Route path="/sop" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><SOP /></ProtectedRouteWithRole>} />
              <Route path="/kra" element={<ProtectedRouteWithRole path="/performance"><KRAKPI /></ProtectedRouteWithRole>} />
              <Route path="/kpi" element={<ProtectedRouteWithRole path="/performance"><KRAKPI /></ProtectedRouteWithRole>} />
              <Route path="/performance" element={<ProtectedRouteWithRole path="/performance"><Performance /></ProtectedRouteWithRole>} />
              <Route path="/compliance" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Compliance /></ProtectedRouteWithRole>} />
              {/* Payroll Routes */}
              <Route path="/payroll" element={<ProtectedRouteWithRole path="/payroll"><PayrollHub /></ProtectedRouteWithRole>} />
              <Route path="/payroll/management" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><Payroll /></ProtectedRouteWithRole>} />
              <Route path="/payroll-attendance" element={<ProtectedRouteWithRole path="/payroll"><Attendance /></ProtectedRouteWithRole>} />
              <Route path="/payroll/attendance/:employeeId" element={<ProtectedRouteWithRole path="/payroll"><AttendanceDetail /></ProtectedRouteWithRole>} />
              <Route path="/reimbursement" element={<ProtectedRouteWithRole path="/payroll"><Reimbursements /></ProtectedRouteWithRole>} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/staff-overview" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><SalaryOverview /></ProtectedRouteWithRole>} />
              <Route path="/salary-structure" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><SalaryStructure /></ProtectedRouteWithRole>} />
              <Route path="/settings" element={<ProtectedRouteWithRole path="/settings"><Settings /></ProtectedRouteWithRole>} />

              {/* User Management - Admin Only */}
              <Route path="/user-management" element={<ProtectedRouteWithRole requireRole="Admin"><UserManagement /></ProtectedRouteWithRole>} />
              <Route path="/role-management" element={<ProtectedRouteWithRole requireRole="Admin"><RoleManagement /></ProtectedRouteWithRole>} />

              {/* Settings Routes - Admin Only */}
              <Route path="/attendance-setting" element={<ProtectedRouteWithRole requireRole="Admin"><AttendanceSettings /></ProtectedRouteWithRole>} />
              <Route path="/business-setting" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessSettings /></ProtectedRouteWithRole>} />
              <Route path="/salary-setting" element={<ProtectedRouteWithRole requireRole="Admin"><SalarySettings /></ProtectedRouteWithRole>} />
              <Route path="/payment-setting" element={<ProtectedRouteWithRole requireRole="Admin"><PaymentSettings /></ProtectedRouteWithRole>} />
              <Route path="/businessinfo-setting" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessInfo /></ProtectedRouteWithRole>} />
              <Route path="/account-setting" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
              <Route path="/others-setting" element={<ProtectedRouteWithRole requireRole="Admin"><OtherSettings /></ProtectedRouteWithRole>} />

              {/* Settings Sub-Routes - Admin Only */}
              <Route path="/payment/business-name" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessNameBankStatement /></ProtectedRouteWithRole>} />
              <Route path="/payment/business-account" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessBankAccount /></ProtectedRouteWithRole>} />

              <Route path="/attendance-templates" element={<ProtectedRouteWithRole requireRole="Admin"><AttendanceTemplates /></ProtectedRouteWithRole>} />
              <Route path="/attendance-geofence" element={<ProtectedRouteWithRole requireRole="Admin"><AttendanceGeofence /></ProtectedRouteWithRole>} />
              <Route path="/attendance-shifts" element={<ProtectedRouteWithRole requireRole="Admin"><ShiftSettings /></ProtectedRouteWithRole>} />
              <Route path="/attendance-automation-rules" element={<ProtectedRouteWithRole requireRole="Admin"><AutomationRules /></ProtectedRouteWithRole>} />

              <Route path="/business/holiday-templates" element={<ProtectedRouteWithRole requireRole="Admin"><HolidayTemplates /></ProtectedRouteWithRole>} />
              <Route path="/business/leave-templates" element={<ProtectedRouteWithRole requireRole="Admin"><LeaveTemplates /></ProtectedRouteWithRole>} />
              <Route path="/business/manage-users" element={<ProtectedRouteWithRole requireRole="Admin"><ManageUsers /></ProtectedRouteWithRole>} />
              <Route path="/business/celebrations" element={<ProtectedRouteWithRole requireRole="Admin"><Celebrations /></ProtectedRouteWithRole>} />
              <Route path="/business/staff-details" element={<ProtectedRouteWithRole requireRole="Admin"><StaffDetails /></ProtectedRouteWithRole>} />
              <Route path="/business/weekly-holidays" element={<ProtectedRouteWithRole requireRole="Admin"><WeeklyHolidays /></ProtectedRouteWithRole>} />
              <Route path="/business/roles-permissions" element={<ProtectedRouteWithRole requireRole="Admin"><RolesPermissions /></ProtectedRouteWithRole>} />
              <Route path="/business/business-functions" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessFunctions /></ProtectedRouteWithRole>} />

              <Route path="/salary/calculation-logic" element={<ProtectedRouteWithRole requireRole="Admin"><SalaryCalculationLogic /></ProtectedRouteWithRole>} />
              <Route path="/salary/components" element={<ProtectedRouteWithRole requireRole="Admin"><SaleryComponents /></ProtectedRouteWithRole>} />
              <Route path="/salary/details-access" element={<ProtectedRouteWithRole requireRole="Admin"><SalaryDetailsAccess /></ProtectedRouteWithRole>} />
              <Route path="/salary/payslip-customization" element={<ProtectedRouteWithRole requireRole="Admin"><PayslipCustomization /></ProtectedRouteWithRole>} />
              <Route path="/salary/template-builder" element={<ProtectedRouteWithRole requireRole="Admin"><SaleryTemplateBuilder /></ProtectedRouteWithRole>} />

              <Route path="/others/channel-partner-id" element={<ProtectedRouteWithRole requireRole="Admin"><ChannelPartnerID /></ProtectedRouteWithRole>} />
              <Route path="/others/alerts-notifications" element={<ProtectedRouteWithRole requireRole="Admin"><AlertsNotifications /></ProtectedRouteWithRole>} />

              <Route path="/business-info/edit-business-name" element={<ProtectedRouteWithRole requireRole="Admin"><EditBusinessName /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-state-city" element={<ProtectedRouteWithRole requireRole="Admin"><EditStateCity /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-business-address" element={<ProtectedRouteWithRole requireRole="Admin"><EditBusinessAddress /></ProtectedRouteWithRole>} />
              <Route path="/business-info/edit-business-logo" element={<ProtectedRouteWithRole requireRole="Admin"><EditBusinessLogo /></ProtectedRouteWithRole>} />

              {/* Account Settings - All authenticated users */}
              <Route path="/account/edit-name" element={<ProtectedRoute><EditName /></ProtectedRoute>} />
              <Route path="/account/edit-phone-number" element={<ProtectedRoute><EditPhoneNumber /></ProtectedRoute>} />
              <Route path="/account/edit-email" element={<ProtectedRoute><EditEmail /></ProtectedRoute>} />
              <Route path="/account/business-list" element={<ProtectedRouteWithRole requireRole="Admin"><BusinessList /></ProtectedRouteWithRole>} />

              {/* Asset Management Routes */}
              <Route path="/assets-type" element={<ProtectedRouteWithRole requireRole="Admin"><AssetTypes /></ProtectedRouteWithRole>} />
              <Route path="/assets" element={<ProtectedRouteWithRole requireRole="Admin"><Assets /></ProtectedRouteWithRole>} />

              {/* Company Policy */}
              <Route path="/company" element={<ProtectedRouteWithRole requireRole="Admin"><CompanyPolicies /></ProtectedRouteWithRole>} />

              {/* LMS Routes */}
              <Route path="/course-library" element={<ProtectedRouteWithRole path="/lms"><VideoLibrary /></ProtectedRouteWithRole>} />
              <Route path="/live-session" element={<ProtectedRouteWithRole path="/lms"><LiveSession /></ProtectedRouteWithRole>} />
              <Route path="/quiz-generator" element={<ProtectedRouteWithRole requireRole="Admin"><QuestionGenerator /></ProtectedRouteWithRole>} />
              <Route path="/assessment" element={<ProtectedRouteWithRole path="/lms"><Quiz /></ProtectedRouteWithRole>} />
              <Route path="/score" element={<ProtectedRouteWithRole path="/lms"><Analytics /></ProtectedRouteWithRole>} />
              <Route path="/course/:courseName" element={<ProtectedRouteWithRole path="/lms"><CourseView /></ProtectedRouteWithRole>} />

              {/* PMS Routes */}
              <Route path="/pms/settings" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><PMSSettings /></ProtectedRouteWithRole>} />
              <Route path="/pms/my-goals" element={<ProtectedRouteWithRole path="/performance"><MyGoals /></ProtectedRouteWithRole>} />
              <Route path="/pms/goal-approval" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><GoalApproval /></ProtectedRouteWithRole>} />
              <Route path="/pms/goal-progress" element={<ProtectedRouteWithRole path="/performance"><GoalProgress /></ProtectedRouteWithRole>} />
              <Route path="/pms/self-review" element={<ProtectedRouteWithRole path="/performance"><SelfReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/manager-review" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><ManagerReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/hr-review" element={<ProtectedRouteWithRole requireRole="Admin"><HRReview /></ProtectedRouteWithRole>} />
              <Route path="/pms/reports" element={<ProtectedRouteWithRole allowedRoles={["Admin", "Manager"]}><PMSReports /></ProtectedRouteWithRole>} />

              {/* Integration Routes - Admin Only */}
              <Route path="/integrations" element={<ProtectedRouteWithRole requireRole="Admin"><Integration /></ProtectedRouteWithRole>} />
              <Route path="/integrations/exotel" element={<ProtectedRouteWithRole requireRole="Admin"><ExotelConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/email" element={<ProtectedRouteWithRole requireRole="Admin"><EmailConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/google-calendar" element={<ProtectedRouteWithRole requireRole="Admin"><GoogleCalendarConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/sms" element={<ProtectedRouteWithRole requireRole="Admin"><SMSConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/rcs" element={<ProtectedRouteWithRole requireRole="Admin"><RCSConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/voice" element={<ProtectedRouteWithRole requireRole="Admin"><VoiceConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/askeva" element={<ProtectedRouteWithRole requireRole="Admin"><AskevaConfig /></ProtectedRouteWithRole>} />
              <Route path="/integrations/sendgrid" element={<ProtectedRouteWithRole requireRole="Admin"><SendGridConfig /></ProtectedRouteWithRole>} />

              {/* Super Admin Routes - Protected */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <SuperAdminRoute>
                    <ManageCompanies />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/settings"
                element={
                  <SuperAdminRoute>
                    <SuperAdminSettings />
                  </SuperAdminRoute>
                }
              />
              <Route
                path="/super-admin/subscriptions"
                element={
                  <SuperAdminRoute>
                    <SubscriptionManagement />
                  </SuperAdminRoute>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
