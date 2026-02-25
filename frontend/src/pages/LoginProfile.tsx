interface LoginProfileProps {
  email: string;
  role: string;
}

const LoginProfile = ({ email, role }: LoginProfileProps) => {
  return (
    <div className="p-6 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="text-lg font-semibold">{email}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Role</p>
        <p className="text-lg font-semibold">{role}</p>
      </div>
    </div>
  );
};

export default LoginProfile;
