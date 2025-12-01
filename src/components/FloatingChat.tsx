import { useState, useEffect } from "react";
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
      {/* Floating Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 md:bottom-6 right-6 z-50"
        >
          <Button
            onClick={onOpen}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg relative"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && transferId && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50 w-[90vw] md:w-[450px] max-w-[450px] shadow-2xl rounded-lg overflow-hidden"
          >
            <TransferChat transferId={transferId} onClose={onClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChat;
