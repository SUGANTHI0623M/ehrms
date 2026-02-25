import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetRolesQuery } from "@/store/api/settingsApi";

export default function RolesPermissions() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetRolesQuery();
  const roles = data?.data?.roles || [];

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        
        <div className="flex items-center gap-3">
          <Button
            size="icon"
 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Roles & Permissions</h2>
        </div>

        <p className="text-sm text-muted-foreground -mt-4 mb-8 ml-[52px]">
          Configure privileges and assign roles to your staff
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <img
              src="https://cdn-icons-png.flaticon.com/512/892/892781.png"
              alt="roles"
              className="h-28 opacity-90 mb-6"
            />
            <p className="text-muted-foreground mb-4">No roles found</p>
            <Button size="lg">+ New Role</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role._id} className="border rounded-lg p-4 hover:bg-muted/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    )}
                    {role.isSystemRole && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        System Role
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    {!role.isSystemRole && (
                      <Button variant="outline" size="sm">Delete</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button>+ New Role</Button>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
