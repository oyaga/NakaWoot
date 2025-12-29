-- Criar bucket para armazenar mídias (imagens, vídeos, áudios, documentos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mensager-media',
  'mensager-media',
  true, -- Bucket público para acesso direto às mídias
  52428800, -- 50MB limit por arquivo
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'audio/ogg',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso público para leitura (GET)
CREATE POLICY "Public Access for Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'mensager-media');

-- Política para permitir upload autenticado (INSERT)
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mensager-media'
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização autenticada (UPDATE)
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mensager-media'
  AND auth.role() = 'authenticated'
);

-- Política para permitir deleção autenticada (DELETE)
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mensager-media'
  AND auth.role() = 'authenticated'
);

-- Política adicional para service_role (sem restrições)
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'mensager-media'
  AND auth.role() = 'service_role'
);
