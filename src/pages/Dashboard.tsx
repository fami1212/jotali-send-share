import ModernDashboard from '@/components/ModernDashboard';
import Navbar from '@/components/Navbar';

const Dashboard = () => {
  return (
    <div>
      <div className="hidden md:block">
        <Navbar />
      </div>
      <ModernDashboard />
    </div>
  );
};

export default Dashboard;