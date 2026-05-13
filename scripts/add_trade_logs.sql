-- Crear tabla de logs de intercambios
CREATE TABLE IF NOT EXISTS public.trade_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trader_name TEXT,
    given_ids TEXT[],
    received_ids TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.trade_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own trade logs" ON public.trade_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade logs" ON public.trade_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
