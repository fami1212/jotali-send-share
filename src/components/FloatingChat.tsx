import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import TransferChat from "./TransferChat";
import { Badge } from "@/components/ui/badge";

interface FloatingChatProps {
  transferId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  unreadCount?: number;
}

const FloatingChat = ({ transferId, isOpen, onClose, onOpen, unreadCount = 0 }: FloatingChatProps) => {
  return (
    <>
      {/* Floating Button - WhatsApp style */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50"
        >
          <Button
            onClick={onOpen}
            className="h-14 w-14 rounded-full shadow-xl relative bg-emerald-500 hover:bg-emerald-600 hover:scale-105 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
            
            {/* Pulse animation for unread */}
            {unreadCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-emerald-400 -z-10"
              />
            )}
            
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      )}

      {/* Chat Window - WhatsApp style */}
      <AnimatePresence>
        {isOpen && transferId && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 md:w-[400px] h-[70vh] max-h-[600px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
          >
            <TransferChat transferId={transferId} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;