import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Shield, 
  Clock, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  CheckCircle2
} from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Bienvenue sur Jotali",
    description: "Votre service de transfert d'argent entre le CFA et le Dirham marocain. Rapide, sécurisé et fiable.",
    color: "from-emerald-500 to-teal-500"
  },
  {
    icon: Send,
    title: "Envoyez facilement",
    description: "Transférez de l'argent vers le Sénégal ou recevez des fonds du Maroc en quelques clics.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Shield,
    title: "100% Sécurisé",
    description: "Vos transactions sont protégées avec les dernières technologies de sécurité bancaire.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Clock,
    title: "Rapide et Efficace",
    description: "Recevez une confirmation en temps réel et suivez vos transferts à chaque étape.",
    color: "from-orange-500 to-amber-500"
  },
  {
    icon: Users,
    title: "Gérez vos bénéficiaires",
    description: "Enregistrez vos contacts pour des transferts encore plus rapides la prochaine fois.",
    color: "from-rose-500 to-red-500"
  }
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Passer
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-28 h-28 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center mb-8 shadow-2xl`}
            >
              <Icon className="w-14 h-14 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-foreground mb-4"
            >
              {step.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-base leading-relaxed"
            >
              {step.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-16">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? "w-8 bg-primary" 
                  : index < currentStep
                  ? "w-2 bg-primary/60"
                  : "w-2 bg-muted"
              }`}
              animate={{ scale: index === currentStep ? 1.1 : 1 }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            className={`flex-1 bg-gradient-to-r ${step.color} hover:opacity-90 text-white border-0`}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Commencer
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Onboarding;
