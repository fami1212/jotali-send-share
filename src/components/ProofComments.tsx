import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";

interface Comment {
  id: string;
  transfer_id: string;
  user_id: string;
  comment: string;
  is_admin: boolean;
  created_at: string;
}

interface ProofCommentsProps {
  transferId: string;
  isAdmin: boolean;
}

export const ProofComments = ({ transferId, isAdmin }: ProofCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();

    // Subscribe to realtime comments
    const channel = supabase
      .channel(`comments-${transferId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proof_comments',
          filter: `transfer_id=eq.${transferId}`
        },
        (payload) => {
          setComments(prev => [...prev, payload.new as Comment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transferId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('proof_comments')
        .select('*')
        .eq('transfer_id', transferId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commentaires",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('proof_comments')
        .insert({
          transfer_id: transferId,
          user_id: user.id,
          comment: newComment.trim(),
          is_admin: isAdmin
        });

      if (error) throw error;

      setNewComment("");
      toast({
        title: "Succès",
        description: "Commentaire ajouté avec succès"
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Commentaires</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun commentaire pour le moment</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-3">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={comment.is_admin ? "bg-primary" : "bg-secondary"}>
                    {comment.is_admin ? "A" : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {comment.is_admin ? "Administrateur" : "Utilisateur"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Ajouter un commentaire..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1"
          rows={3}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          size="icon"
          className="self-end"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
