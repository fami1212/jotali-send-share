import MoneyTransferHero from "@/components/MoneyTransferHero";
import TransferForm from "@/components/TransferForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <MoneyTransferHero />
      
      {/* Transfer Form Section */}
      <section className="py-16 px-4">
        <TransferForm />
      </section>
    </div>
  );
};

export default Index;
