-- Ajouter contrainte UNIQUE sur profiles.user_id pour permettre ON CONFLICT
-- Supprimer d'abord les doublons potentiels
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.id > b.id AND a.user_id = b.user_id;

-- Ajouter la contrainte UNIQUE
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Vérifier que la fonction handle_new_user est correcte
-- (Elle utilise ON CONFLICT qui nécessite cette contrainte UNIQUE)