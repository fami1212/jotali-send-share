import ModernTransferForm from '@/components/ModernTransferForm';
import Navbar from '@/components/Navbar';

const Transfer = () => {
  return (
    <div>
      <div className="hidden md:block">
        <Navbar />
      </div>
      <ModernTransferForm />
    </div>
  );
};

export default Transfer;