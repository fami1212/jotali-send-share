import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Download, X, Zap, Check, CheckCheck, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  transfer_id: string;
  sender_id: string;
  is_admin: boolean;
  message: string | null;
  file_url: string | null;
  created_at: string;
  read: boolean;
}

interface TransferChatProps {
  transferId: string;
  onClose?: () => void;
  isAdmin?: boolean;
  embedded?: boolean;
}

const TransferChat = ({ transferId, onClose, isAdmin: isAdminProp, embedded = false }: TransferChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (isAdminProp !== undefined) {
        setIsAdmin(isAdminProp);
        return;
      }
      if (!user) return;
      const { data } = await supabase.rpc('is_admin', { user_id_input: user.id });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user, isAdminProp]);

  useEffect(() => {
    if (transferId) {
      loadMessages();
      markMessagesAsRead();
      
      const channel = supabase
        .channel(`messages:${transferId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `transfer_id=eq.${transferId}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            // Avoid duplicates - check if message already exists
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user?.id) {
              markMessagesAsRead();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `transfer_id=eq.${transferId}`
          },
          (payload) => {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [transferId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('transfer_id', transferId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const markMessagesAsRead = async () => {
    if (!user?.id) return;
    
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('transfer_id', transferId)
      .neq('sender_id', user.id)
      .eq('read', false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!user?.id) return;

    const messageText = newMessage.trim();
    const fileToUpload = selectedFile;
    
    // Clear input immediately for better UX
    setNewMessage("");
    setSelectedFile(null);
    setIsUploading(true);

    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      transfer_id: transferId,
      sender_id: user.id,
      is_admin: isAdmin,
      message: messageText || null,
      file_url: null,
      created_at: new Date().toISOString(),
      read: false
    };

    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      let fileUrl = null;

      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          transfer_id: transferId,
          sender_id: user.id,
          is_admin: isAdmin,
          message: messageText || null,
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === optimisticId ? insertedMessage : m
      ));

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error("Erreur lors de l'envoi");
      // Restore the message text
      setNewMessage(messageText);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 10 Mo");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setQuickReplyOpen(false);
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Aujourd'hui";
    if (isYesterday(d)) return "Hier";
    return format(d, 'dd MMMM yyyy', { locale: fr });
  };

  const formatTime = (date: string) => {
    return format(new Date(date), 'HH:mm', { locale: fr });
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const quickReplies = [
    { emoji: "📸", text: "Veuillez nous fournir une preuve de paiement pour votre transfert." },
    { emoji: "✅", text: "Votre transfert a été validé et sera traité rapidement." },
    { emoji: "🔢", text: "Voici le numéro d'envoi pour votre retrait : " },
    { emoji: "⏳", text: "Votre preuve de paiement est en cours de vérification." },
    { emoji: "ℹ️", text: "Nous avons besoin d'informations complémentaires." },
    { emoji: "💰", text: "Le montant a été envoyé. Vous pouvez le retirer." }
  ];

  return (
    <Card className={`flex flex-col ${embedded ? 'h-full border-0 shadow-none bg-transparent' : 'h-[500px] md:h-[600px]'}`}>
      {/* WhatsApp-style Header */}
      {!embedded && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg font-bold">{isAdmin ? 'C' : 'J'}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{isAdmin ? 'Client' : 'Jotali Support'}</h3>
            <p className="text-xs text-emerald-100">En ligne</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#ece5dd'
        }}
        ref={scrollRef}
      >
        <div className="space-y-2">
          {Object.entries(messageGroups).map(([dateKey, msgs]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="px-4 py-1 bg-white/80 rounded-full text-xs text-slate-600 shadow-sm">
                  {formatMessageDate(msgs[0].created_at)}
                </span>
              </div>
              
              {/* Messages */}
              <AnimatePresence>
                {msgs.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const isOptimistic = msg.id.startsWith('temp-');
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                          isMe
                            ? 'bg-emerald-100 rounded-tr-none'
                            : 'bg-white rounded-tl-none'
                        }`}
                      >
                        {/* Tail */}
                        <div 
                          className={`absolute top-0 w-3 h-3 ${
                            isMe 
                              ? 'right-0 -mr-1.5 bg-emerald-100' 
                              : 'left-0 -ml-1.5 bg-white'
                          }`}
                          style={{
                            clipPath: isMe 
                              ? 'polygon(0 0, 100% 0, 0 100%)' 
                              : 'polygon(100% 0, 0 0, 100% 100%)'
                          }}
                        />
                        
                        {/* Image preview */}
                        {msg.file_url && isImageFile(msg.file_url) && (
                          <img 
                            src={msg.file_url} 
                            alt="attachment" 
                            className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(msg.file_url!, '_blank')}
                          />
                        )}
                        
                        {/* File download */}
                        {msg.file_url && !isImageFile(msg.file_url) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start mb-1 bg-slate-100 hover:bg-slate-200"
                            onClick={() => window.open(msg.file_url!, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Fichier joint
                          </Button>
                        )}
                        
                        {/* Message text */}
                        {msg.message && (
                          <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        )}
                        
                        {/* Time and read status */}
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-500">
                            {formatTime(msg.created_at)}
                          </span>
                          {isMe && !isOptimistic && (
                            msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                            )
                          )}
                          {isMe && isOptimistic && (
                            <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-slate-600 text-center">
                Démarrez une conversation<br/>
                <span className="text-sm text-slate-400">Les messages sont chiffrés</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="p-3 bg-slate-100 shrink-0 space-y-2">
        {/* Selected file preview */}
        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 bg-white rounded-lg"
          >
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            <span className="text-sm flex-1 truncate text-slate-600">{selectedFile.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Quick replies for admin */}
        {isAdmin && (
          <Popover open={quickReplyOpen} onOpenChange={setQuickReplyOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full bg-white">
                <Zap className="w-4 h-4 mr-2 text-amber-500" />
                Réponses rapides
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start" side="top">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2 text-slate-700">Sélectionner un message :</p>
                {quickReplies.map((item, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 text-sm hover:bg-emerald-50"
                    onClick={() => handleQuickReply(item.text)}
                  >
                    <span className="mr-2">{item.emoji}</span>
                    <span className="truncate">{item.text}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="w-5 h-5 text-slate-500" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="pr-4 rounded-full border-0 bg-white h-10 shadow-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isUploading}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={isUploading || (!newMessage.trim() && !selectedFile)}
            size="icon"
            className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TransferChat;