import ModernTransferForm from '@/components/ModernTransferForm';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';

const Transfer = () => {
  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <ModernTransferForm />
      <BottomNavigation />
    </div>
  );
};

export default Transfer;