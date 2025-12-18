import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedElementProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}

const directionVariants = {
  up: { y: 30, x: 0 },
  down: { y: -30, x: 0 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
};

const AnimatedElement = ({ 
  children, 
  delay = 0, 
  className = "",
  direction = "up"
}: AnimatedElementProps) => {
  const initialPosition = directionVariants[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...initialPosition }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: delay * 0.1,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedElement;
