import { useLocation, Outlet } from "react-router-dom";
import MainLayout from "./MainLayout";

const InterviewLayout = () => {
  const location = useLocation();

  return (
    <MainLayout>
      {/* Single centered column: equal left/right spacing, matches Dashboard/other modules */}
      <div className="w-full min-w-0 flex justify-center px-4 sm:px-6 md:px-8 pt-4 pb-6">
        <div className="w-full max-w-7xl space-y-4">
          <Outlet />
        </div>
      </div>
    </MainLayout>
  );
};

export default InterviewLayout;
