import { motion } from 'framer-motion';
import jotaliLogo from '@/assets/jotali-logo.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-gradient-to-br from-primary via-primary/95 to-primary/80 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${300 + i * 150}px`,
              height: `${300 + i * 150}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1, 0.8], 
              opacity: [0, 0.3, 0],
            }}
            transition={{ 
              duration: 2.5, 
              delay: i * 0.3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Logo Container */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.5, 
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
      >
        {/* Logo with soft glow */}
        <motion.div
          className="relative"
          animate={{ 
            y: [0, -8, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full" />
          
          {/* Logo image */}
          <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/30">
            <motion.img
              src={jotaliLogo}
              alt="Jotali Services"
              className="w-full h-full object-cover"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Brand name with typing effect */}
        <motion.h1
          className="mt-6 text-3xl md:text-4xl font-bold text-white tracking-wide drop-shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Jotali Services
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-2 text-white/90 text-sm md:text-base font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Transferts rapides & sécurisés
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          className="mt-10 flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-white rounded-full"
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 0.6, 
                repeat: Infinity,
                delay: i * 0.15
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Auto-complete after animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2.2 }}
        onAnimationComplete={onComplete}
      />
    </motion.div>
  );
};

export default SplashScreen;
