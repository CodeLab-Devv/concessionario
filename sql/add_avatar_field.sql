-- Aggiunge il campo avatar alla tabella users
-- Questo campo conterrà l'URL dell'immagine avatar dell'utente

ALTER TABLE users 
ADD COLUMN avatar_url TEXT;

-- Aggiunge un commento per documentare il campo
COMMENT ON COLUMN users.avatar_url IS 'URL dell''immagine avatar dell''utente';

-- Opzionale: aggiorna la policy per permettere l'aggiornamento del campo avatar
-- Gli utenti possono aggiornare il proprio avatar
CREATE POLICY "Users can update own avatar" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);