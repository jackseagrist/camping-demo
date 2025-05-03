// pages/dashboard.js
import SidebarLayout from '@/components/SidebarLayout';

export default function Dashboard() {
  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-[#111827]">Welcome to BaseLodge</h1>
        <p className="text-[#4B5563] mt-2">Start exploring or plan your next trip.</p>
      </div>
    </SidebarLayout>
  );
}