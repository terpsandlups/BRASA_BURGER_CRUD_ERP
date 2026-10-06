-- Ponto escolhido pelo gerente para lojas sem imóvel numerado na base gratuita.
-- A política de edição existente continua limitando a Administrador/Gerente da unidade.
ALTER TABLE public.configuracoes_entrega
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_entrega_ponto_valido'
    AND conrelid = 'public.configuracoes_entrega'::regclass) THEN
    ALTER TABLE public.configuracoes_entrega
      ADD CONSTRAINT configuracoes_entrega_ponto_valido CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude IS NOT NULL AND longitude IS NOT NULL AND
          latitude BETWEEN -34 AND 6 AND longitude BETWEEN -74 AND -34)
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
