import { useAppSelector } from "@/store/hooks";
import Profile from "@/pages/Profile";
import CandidateProfile from "@/pages/candidate/CandidateProfile";
import EmployeeProfile from "@/pages/employeePages/EmployeeProfile";

/**
 * ProfileRoute component that conditionally renders the appropriate profile page
 * - For Candidate role: renders CandidateProfile (unified profile)
 * - For Employee/EmployeeAdmin role: renders EmployeeProfile (employee profile)
 * - For other roles: renders Profile (generic profile)
 */
const ProfileRoute = () => {
  const currentUser = useAppSelector((state) => state.auth.user);

  // If user is a Candidate, show the unified CandidateProfile
  if (currentUser?.role === "Candidate") {
    return <CandidateProfile />;
  }

  // If user is an Employee or EmployeeAdmin, show the EmployeeProfile
  if (currentUser?.role === "Employee" || currentUser?.role === "EmployeeAdmin") {
    return <EmployeeProfile />;
  }

  // For all other roles, show the generic Profile page
  return <Profile />;
};

export default ProfileRoute;

