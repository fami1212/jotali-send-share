import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationSound } from "./useNotificationSound";

export const useTransferNotifications = (userId: string | undefined) => {
  const { notify } = useNotificationSound();

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up transfer notifications for user:", userId);

    const channel = supabase
      .channel('transfer-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transfers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Transfer updated:', payload);
          const transfer = payload.new as any;
          const oldTransfer = payload.old as any;

          // Only notify if status changed
          if (transfer.status !== oldTransfer.status) {
            notify();
            
            const statusMessages: Record<string, { title: string; message: string; type: 'success' | 'info' | 'warning' }> = {
              'processing': {
                title: '⏳ Transfert en cours',
                message: `Votre transfert #${transfer.reference_number} est en cours de traitement`,
                type: 'info'
              },
              'completed': {
                title: '✅ Transfert terminé',
                message: `Votre transfert #${transfer.reference_number} a été complété avec succès`,
                type: 'success'
              },
              'awaiting_admin': {
                title: '📋 En attente de validation',
                message: `Votre preuve pour le transfert #${transfer.reference_number} est en cours de vérification`,
                type: 'info'
              },
              'rejected': {
                title: '❌ Transfert rejeté',
                message: `Votre transfert #${transfer.reference_number} a été rejeté. Vérifiez les détails`,
                type: 'warning'
              }
            };

            const notification = statusMessages[transfer.status];
            if (notification) {
              toast[notification.type === 'warning' ? 'error' : notification.type === 'success' ? 'success' : 'info'](
                notification.title,
                { description: notification.message, duration: 8000 }
              );
            }
          }

          // Notify if proof was verified
          if (transfer.proof_verified !== oldTransfer.proof_verified && transfer.proof_verified !== null) {
            notify();
            if (transfer.proof_verified) {
              toast.success("✅ Preuve validée", {
                description: `La preuve du transfert #${transfer.reference_number} a été acceptée`,
                duration: 8000
              });
            } else {
              toast.error("❌ Preuve rejetée", {
                description: transfer.proof_admin_comment || "Votre preuve a été rejetée. Veuillez en soumettre une nouvelle",
                duration: 10000
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Transfer notification subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notify]);
};
