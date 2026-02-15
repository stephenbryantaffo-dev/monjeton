import { ReactNode } from "react";
import LimelightNav from "@/components/LimelightNav";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen gradient-bg pb-24">
      {title && (
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </header>
      )}
      <main className="px-5">{children}</main>
      <LimelightNav />
    </div>
  );
};

export default DashboardLayout;
