-- Esegui dopo la migration create_salon_services.
-- Sostituisci l'UUID qui sotto con l'ID del tuo utente Auth del progetto Supabase.
do $$
declare
  salon_owner_id uuid := 'INSERISCI-QUI-UUID-UTENTE-AUTH'::uuid;
begin
  insert into public.salon_services (owner_id, name, position)
  values
    (salon_owner_id, 'Taglio donna', 0),
    (salon_owner_id, 'Taglio uomo', 1),
    (salon_owner_id, 'Piega', 2),
    (salon_owner_id, 'Taglio e piega', 3),
    (salon_owner_id, 'Colore ricrescita', 4),
    (salon_owner_id, 'Colore completo', 5),
    (salon_owner_id, 'Tonalizzante', 6),
    (salon_owner_id, 'Mèches', 7),
    (salon_owner_id, 'Balayage', 8),
    (salon_owner_id, 'Trattamento ristrutturante', 9),
    (salon_owner_id, 'Acconciatura cerimonia', 10)
  on conflict (owner_id, name) do nothing;
end $$;
