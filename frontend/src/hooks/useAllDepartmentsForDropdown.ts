import { useMemo } from "react";
import { useGetDepartmentsQuery } from "@/store/api/jobOpeningApi";
import { useGetStaffQuery } from "@/store/api/staffApi";

const STAFF_LIMIT = 2000;

/**
 * Returns the same department list as "Add New Staff": departments from the
 * job-openings API (Department collection) plus unique department names from
 * staff records. Use this in Assign Course, Assign Learners, and Celebration
 * so all show the full list.
 * Options have value = department _id when from API, or "name:" + name when
 * from staff only (so backend can accept by name).
 */
export function useAllDepartmentsForDropdown(open: boolean) {
  const { data: departmentsData, isLoading: deptLoading } = useGetDepartmentsQuery(undefined, {
    skip: !open,
  });
  const { data: staffData, isLoading: staffLoading } = useGetStaffQuery(
    { limit: STAFF_LIMIT, page: 1 },
    { skip: !open }
  );

  const departments = useMemo(() => {
    const fromApi = departmentsData?.data?.departments ?? [];
    const staffList = staffData?.data?.staff ?? [];
    const nameSet = new Set<string>();
    fromApi.forEach((d: { _id: string; name: string }) => {
      if (d.name) nameSet.add(d.name.trim());
    });
    staffList.forEach((s: { department?: string }) => {
      if (s.department && String(s.department).trim()) nameSet.add(String(s.department).trim());
    });
    const fromApiNames = new Set(fromApi.map((d: { name: string }) => d.name?.trim()).filter(Boolean));
    const staffOnlyNames = Array.from(nameSet).filter((n) => !fromApiNames.has(n));
    const options: { value: string; label: string; isId: boolean }[] = [];
    fromApi.forEach((d: { _id: string; name: string }) => {
      if (d.name) options.push({ value: d._id, label: d.name, isId: true });
    });
    staffOnlyNames.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    staffOnlyNames.forEach((name) => {
      options.push({ value: `name:${name}`, label: name, isId: false });
    });
    return options;
  }, [departmentsData, staffData]);

  const isLoading = deptLoading || staffLoading;
  return { departments, isLoading };
}
