import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Download, X, Zap, Check, CheckCheck, Image as ImageIcon, Play, Pause, Mic, Square, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

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
    if (!transferId || !user?.id) return;

    const channel = supabase.channel(`typing:${transferId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== user.id) {
          setIsOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload.user_id !== user.id) {
          setIsOtherTyping(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [transferId, user?.id]);

  useEffect(() => {
    if (transferId) {
      loadMessages();
      markMessagesAsRead();
      
      const channel = supabase
        .channel(`messages:${transferId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `transfer_id=eq.${transferId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                const optimisticIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id);
                if (optimisticIndex !== -1) {
                  const updated = [...prev];
                  updated[optimisticIndex] = newMsg;
                  return updated;
                }
                return [...prev, newMsg];
              });
              if (newMsg.sender_id !== user?.id) markMessagesAsRead();
            } else if (payload.eventType === 'UPDATE') {
              setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [transferId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping]);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('transfer_id', transferId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
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

  const sendTypingIndicator = async () => {
    if (!transferId || !user?.id) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;
    const channel = supabase.channel(`typing:${transferId}`);
    await channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } });
  };

  const sendStopTyping = async () => {
    if (!transferId || !user?.id) return;
    const channel = supabase.channel(`typing:${transferId}`);
    await channel.send({ type: 'broadcast', event: 'stop_typing', payload: { user_id: user.id } });
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success("Message supprimé");
    }
  };

  const handleSendMessage = async (audioBlob?: Blob) => {
    if (!newMessage.trim() && !selectedFile && !audioBlob) return;
    if (!user?.id) return;

    const messageText = newMessage.trim();
    const fileToUpload = selectedFile || (audioBlob ? new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }) : null);
    
    setNewMessage("");
    setSelectedFile(null);
    sendStopTyping();
    setIsUploading(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      transfer_id: transferId,
      sender_id: user.id,
      is_admin: isAdmin,
      message: messageText || (audioBlob ? '🎤 Message vocal' : null),
      file_url: null,
      created_at: new Date().toISOString(),
      read: false
    };

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

      setMessages(prev => prev.map(m => m.id === optimisticId ? insertedMessage : m));
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error("Erreur lors de l'envoi");
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
    console.log("Quick reply selected:", text);
    setNewMessage(text);
    setQuickReplyOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value) sendTypingIndicator();
    else sendStopTyping();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleSendMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Aujourd'hui";
    if (isYesterday(d)) return "Hier";
    return format(d, 'dd MMMM yyyy', { locale: fr });
  };

  const formatTime = (date: string) => format(new Date(date), 'HH:mm', { locale: fr });

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
  const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url) || url.includes('image');
  const isAudioFile = (url: string) => /\.(webm|mp3|wav|ogg|m4a|aac)$/i.test(url);

  const toggleAudioPlayback = (messageId: string, audioUrl: string) => {
    console.log("Toggle audio:", messageId, audioUrl);
    
    if (playingAudio === messageId) {
      if (audioRefs.current[messageId]) {
        audioRefs.current[messageId].pause();
        audioRefs.current[messageId].currentTime = 0;
      }
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
        audioRefs.current[playingAudio].currentTime = 0;
      }
      
      // Create new audio element if it doesn't exist
      if (!audioRefs.current[messageId]) {
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setPlayingAudio(null);
        };
        audio.onerror = (e) => {
          console.error("Audio error:", e);
          toast.error("Erreur lors de la lecture audio");
          setPlayingAudio(null);
        };
        audioRefs.current[messageId] = audio;
      }
      
      audioRefs.current[messageId].play()
        .then(() => setPlayingAudio(messageId))
        .catch(err => {
          console.error("Play error:", err);
          toast.error("Erreur lors de la lecture");
        });
    }
  };

  const quickReplies = [
    { emoji: "📸", text: "Veuillez nous fournir une preuve de paiement pour votre transfert." },
    { emoji: "✅", text: "Votre transfert a été validé et sera traité rapidement." },
    { emoji: "🔢", text: "Voici le numéro d'envoi pour votre retrait : " },
    { emoji: "⏳", text: "Votre preuve de paiement est en cours de vérification." },
    { emoji: "ℹ️", text: "Nous avons besoin d'informations complémentaires." },
    { emoji: "💰", text: "Le montant a été envoyé. Vous pouvez le retirer." }
  ];

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender_id === user?.id;
    const isOptimistic = msg.id.startsWith('temp-');
    const canDelete = isMe || isAdmin;
    
    const messageContent = (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${isMe ? 'bg-emerald-100 rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
          <div 
            className={`absolute top-0 w-3 h-3 ${isMe ? 'right-0 -mr-1.5 bg-emerald-100' : 'left-0 -ml-1.5 bg-white'}`}
            style={{ clipPath: isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}
          />
          
          {/* Image */}
          {msg.file_url && isImageFile(msg.file_url) && (
            <div className="mb-2">
              <img 
                src={msg.file_url} 
                alt="attachment" 
                className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                onClick={() => setPreviewImage(msg.file_url)}
                onError={(e) => {
                  console.error("Image load error:", msg.file_url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Audio */}
          {msg.file_url && isAudioFile(msg.file_url) && (
            <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg mb-1 min-w-[150px]">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAudioPlayback(msg.id, msg.file_url!);
                }}
              >
                {playingAudio === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <div className="h-1 bg-slate-300 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: playingAudio === msg.id ? '100%' : '0%' }}
                    transition={{ duration: 5 }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-500">🎤</span>
            </div>
          )}
          
          {/* Other files */}
          {msg.file_url && !isImageFile(msg.file_url) && !isAudioFile(msg.file_url) && (
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
          
          {/* Text */}
          {msg.message && <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">{msg.message}</p>}
          
          {/* Time and status */}
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-slate-500">{formatTime(msg.created_at)}</span>
            {isMe && !isOptimistic && (msg.read ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5 text-slate-400" />)}
            {isMe && isOptimistic && <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>
      </motion.div>
    );

    if (canDelete && !isOptimistic) {
      return (
        <ContextMenu key={msg.id}>
          <ContextMenuTrigger>{messageContent}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem 
              className="text-red-600 focus:text-red-600"
              onClick={() => handleDeleteMessage(msg.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    return messageContent;
  };

  return (
    <>
      <Card className={`flex flex-col ${embedded ? 'h-full border-0 shadow-none bg-transparent' : 'h-[500px] md:h-[600px]'}`}>
        {!embedded && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-bold">{isAdmin ? 'C' : 'J'}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{isAdmin ? 'Client' : 'Jotali Support'}</h3>
              <p className="text-xs text-emerald-100">
                {isOtherTyping ? 'En train d\'écrire...' : 'En ligne'}
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

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
                <div className="flex justify-center my-4">
                  <span className="px-4 py-1 bg-white/80 rounded-full text-xs text-slate-600 shadow-sm">
                    {formatMessageDate(msgs[0].created_at)}
                  </span>
                </div>
                
                <AnimatePresence>
                  {msgs.map(renderMessage)}
                </AnimatePresence>
              </div>
            ))}

            <AnimatePresence>
              {isOtherTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-start mb-1">
                  <div className="bg-white rounded-lg rounded-tl-none px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-1">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {messages.length === 0 && !isOtherTyping && (
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

        <div className="p-3 bg-slate-100 shrink-0 space-y-2">
          {selectedFile && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 bg-white rounded-lg">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              <span className="text-sm flex-1 truncate text-slate-600">{selectedFile.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {isAdmin && (
            <Popover open={quickReplyOpen} onOpenChange={setQuickReplyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full bg-white" type="button">
                  <Zap className="w-4 h-4 mr-2 text-amber-500" />
                  Réponses rapides
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="start" side="top" sideOffset={5}>
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-2 text-slate-700 px-2">Sélectionner un message :</p>
                  {quickReplies.map((item, i) => (
                    <div
                      key={i}
                      className="w-full flex items-center justify-start text-left h-auto py-2 px-2 text-sm hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                      onClick={() => {
                        handleQuickReply(item.text);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="mr-2 shrink-0">{item.emoji}</span>
                      <span className="line-clamp-2">{item.text}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" />
            
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isRecording} type="button">
              <Paperclip className="w-5 h-5 text-slate-500" />
            </Button>

            {isRecording ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full flex-1">
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm text-red-600 font-medium">{formatRecordingTime(recordingTime)}</span>
                </div>
                <Button type="button" size="icon" variant="destructive" className="h-10 w-10 rounded-full" onClick={stopRecording}>
                  <Square className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shrink-0" onClick={startRecording} disabled={isUploading} type="button">
                  <Mic className="w-5 h-5 text-slate-500" />
                </Button>

                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Message..."
                    className="pr-4 rounded-full border-0 bg-white h-10 shadow-sm"
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    onBlur={() => sendStopTyping()}
                    disabled={isUploading}
                  />
                </div>

                <Button onClick={() => handleSendMessage()} disabled={isUploading || (!newMessage.trim() && !selectedFile)} size="icon" className="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 shrink-0" type="button">
                  <Send className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => window.open(previewImage!, '_blank')}>
                <Download className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setPreviewImage(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            {previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransferChat;
