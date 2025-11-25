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
      <ModernDashboard />
      <BottomNavigation />
    </div>
  );
};

export default Dashboard;