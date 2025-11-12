import ModernDashboard from '@/components/ModernDashboard';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { UserStats } from '@/components/UserStats';

const Dashboard = () => {
  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <div className="container mx-auto px-4 py-6 max-w-7xl pb-24 md:pb-6">
        <UserStats />
      </div>
      <ModernDashboard />
      <BottomNavigation />
    </div>
  );
};

export default Dashboard;