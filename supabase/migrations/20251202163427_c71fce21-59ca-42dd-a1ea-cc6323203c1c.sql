-- Make message-attachments bucket public so images and audio can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';