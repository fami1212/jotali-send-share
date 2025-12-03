import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TransferSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  amount: string;
  currency: string;
  reference: string;
}

const Confetti = ({ delay }: { delay: number }) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomX = Math.random() * 100;
  const randomRotation = Math.random() * 360;
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: randomColor,
        left: `${randomX}%`,
        top: '-10px'
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ 
        y: '100vh', 
        rotate: randomRotation + 720,
        opacity: [1, 1, 0]
      }}
      transition={{ 
        duration: 2.5 + Math.random(), 
        delay: delay,
        ease: "easeIn"
      }}
    />
  );
};

const TransferSuccessAnimation = ({ 
  isVisible, 
  onComplete, 
  amount, 
  currency,
  reference 
}: TransferSuccessAnimationProps) => {
  const [confetti, setConfetti] = useState<number[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate confetti
      setConfetti(Array.from({ length: 50 }, (_, i) => i));
      
      // Auto-complete after animation
      const timer = setTimeout(onComplete, 3500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Confetti */}
      {confetti.map((i) => (
        <Confetti key={i} delay={i * 0.03} />
      ))}

      {/* Success content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        {/* Animated check circle */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          {/* Glow rings */}
          <motion.div
            className="absolute inset-0 bg-green-500/20 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 bg-green-500/10 rounded-full"
            animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          
          {/* Check icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Check className="w-12 h-12 text-white stroke-[3]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Sparkles */}
        <motion.div
          className="absolute top-1/4 left-1/4"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-1/4"
          animate={{ rotate: -360, scale: [1, 1.3, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5 text-blue-400" />
        </motion.div>

        {/* Success text */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold text-white mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Transfert réussi !
        </motion.h1>

        <motion.p
          className="text-slate-300 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Votre transfert a été créé avec succès
        </motion.p>

        {/* Amount display */}
        <motion.div
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-slate-400 text-sm mb-1">Montant envoyé</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            {amount} {currency}
          </p>
          <p className="text-slate-400 text-sm mt-3">Référence: {reference}</p>
        </motion.div>

        {/* Loading indicator */}
        <motion.p
          className="mt-8 text-slate-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Redirection en cours...
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default TransferSuccessAnimation;
