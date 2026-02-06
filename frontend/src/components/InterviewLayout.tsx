import { useLocation, Outlet } from "react-router-dom";
import MainLayout from "./MainLayout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const InterviewLayout = () => {
  const location = useLocation();

  // Generate breadcrumbs based on current route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs: Array<{ label: string; path?: string }> = [
      { label: "Interview", path: "/interview" },
    ];

    if (path.includes("/interview/templates")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Interview Flows" });
    } else if (path.includes("/interview/round/1")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Round 1 (First Round)" });
    } else if (path.includes("/interview/round/2")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Round 2 (Second Round)" });
    } else if (path.includes("/interview/round/3")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Round 3" });
    } else if (path.includes("/interview/round/final")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Final Round" });
    } else if (path.includes("/interview/round/")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Interview Round" });
    } else if (path.includes("/interview/candidate") && path.includes("/progress")) {
      crumbs.push({ label: "Interview Process" });
      crumbs.push({ label: "Interview Progress" });
    } else if (path.includes("/interview")) {
      crumbs.push({ label: "Interview Process" });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <div className="px-4 pt-4">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator />}
                  {crumb.path && index < breadcrumbs.length - 1 ? (
                    <BreadcrumbItem>
                      <BreadcrumbLink href={crumb.path}>
                        {crumb.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page Content */}
        <Outlet />
      </div>
    </MainLayout>
  );
};

export default InterviewLayout;

