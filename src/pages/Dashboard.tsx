import ModernDashboard from '@/components/ModernDashboard';
import Navbar from '@/components/Navbar';
import { UserStats } from '@/components/UserStats';

const Dashboard = () => {
  return (
    <div>
      <div className="hidden md:block">
        <Navbar />
      </div>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <UserStats />
      </div>
      <ModernDashboard />
    </div>
  );
};

export default Dashboard;