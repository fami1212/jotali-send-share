-- Réparer les preuves uploadées qui n'ont pas été enregistrées dans la base de données
UPDATE public.transfers 
SET proof_image_url = '7f209300-b9a6-4e8c-9eb2-6706a320520b/5f0f2ec3-b96e-485f-ae50-12db294178a1.png',
    status = 'awaiting_admin'
WHERE id = '5f0f2ec3-b96e-485f-ae50-12db294178a1' AND proof_image_url IS NULL;

UPDATE public.transfers 
SET proof_image_url = '7f209300-b9a6-4e8c-9eb2-6706a320520b/cc9f915c-06df-4e57-9bdf-5e232c3690f9.png',
    status = 'awaiting_admin'
WHERE id = 'cc9f915c-06df-4e57-9bdf-5e232c3690f9' AND proof_image_url IS NULL;

UPDATE public.transfers 
SET proof_image_url = '7f209300-b9a6-4e8c-9eb2-6706a320520b/d2bb5ead-1eed-4c92-8636-d9a758f2a170.jpg',
    status = 'awaiting_admin'
WHERE id = 'd2bb5ead-1eed-4c92-8636-d9a758f2a170' AND proof_image_url IS NULL;