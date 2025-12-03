import { motion } from 'framer-motion';
import jotaliLogo from '@/assets/jotali-logo.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-primary via-primary/90 to-purple-600 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated circles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: `${50 - (100 + i * 50) / 2}%`,
              top: `${50 - (100 + i * 50) / 2}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 0.1,
            }}
            transition={{ 
              duration: 0.8, 
              delay: i * 0.1,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* Logo Container */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.6, 
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
      >
        {/* Logo with glow effect */}
        <motion.div
          className="relative"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full scale-110" />
          <motion.img
            src={jotaliLogo}
            alt="Jotali Services"
            className="w-32 h-32 md:w-40 md:h-40 rounded-3xl shadow-2xl relative z-10 object-cover"
            initial={{ rotateY: 180 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.h1
          className="mt-6 text-3xl md:text-4xl font-bold text-white tracking-wide"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Jotali Services
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-2 text-white/80 text-sm md:text-base"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Transferts rapides & sécurisés
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          className="mt-8 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Auto-complete after animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2.5 }}
        onAnimationComplete={onComplete}
      />
    </motion.div>
  );
};

export default SplashScreen;
