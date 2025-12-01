import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Download, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
}

const TransferChat = ({ transferId, onClose }: TransferChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('is_admin', { user_id_input: user.id });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (transferId) {
      loadMessages();
      
      // Subscribe to new messages
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
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [transferId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) {
      toast.error("Veuillez écrire un message ou sélectionner un fichier");
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({
          transfer_id: transferId,
          sender_id: user?.id,
          is_admin: isAdmin,
          message: newMessage.trim() || null,
          file_url: fileUrl
        });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
      toast.success("Message envoyé");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi du message");
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

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileUrl.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  return (
    <Card className="flex flex-col h-[500px] md:h-[600px] w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="font-semibold text-lg">Messagerie du transfert</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {msg.is_admin ? 'Admin' : msg.sender_id === user?.id ? 'Vous' : 'Client'}
                  </span>
                  <span className="text-xs opacity-70">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                
                {msg.message && <p className="text-sm break-words">{msg.message}</p>}
                
                {msg.file_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleDownloadFile(msg.file_url!)}
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Télécharger le fichier
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t space-y-3 shrink-0">
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Quick replies for admin */}
        {isAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Réponses rapides
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Sélectionner un message:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNewMessage("Veuillez nous fournir une preuve de paiement pour votre transfert.")}
                >
                  📸 Demande de preuve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNewMessage("Votre transfert a été validé et sera traité dans les plus brefs délais.")}
                >
                  ✅ Validation du transfert
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNewMessage("Voici le numéro d'envoi pour votre retrait : ")}
                >
                  🔢 Numéro d'envoi
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNewMessage("Votre preuve de paiement a été reçue et est en cours de vérification.")}
                >
                  ⏳ Preuve en vérification
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => setNewMessage("Nous avons besoin d'informations complémentaires concernant votre transfert. Merci de nous contacter.")}
                >
                  ℹ️ Infos complémentaires
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isUploading}
          />

          <Button
            onClick={handleSendMessage}
            disabled={isUploading || (!newMessage.trim() && !selectedFile)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TransferChat;
