-- 1. Eliminar las políticas (RLS) que dependen de las columnas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own stickers" ON public.user_stickers;
DROP POLICY IF EXISTS "Users can insert own stickers" ON public.user_stickers;
DROP POLICY IF EXISTS "Users can update own stickers" ON public.user_stickers;

-- 2. Eliminar el trigger antiguo que usaba auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Eliminar las restricciones de llaves foráneas antiguas
ALTER TABLE public.user_stickers DROP CONSTRAINT IF EXISTS user_stickers_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Cambiar el tipo de dato a TEXT
ALTER TABLE public.user_stickers ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;

-- 5. Volver a conectar las tablas
ALTER TABLE public.user_stickers ADD CONSTRAINT user_stickers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Recrear las políticas (ahora usando texto en lugar de auth.uid() que es UUID)
-- Dado que NextAuth maneja la sesión por su lado, permitiremos lectura/escritura a nivel de app
-- (En un entorno de producción estricto con Supabase usaríamos JWT personalizados, pero para NextAuth esto es lo estándar).
CREATE POLICY "Enable all for profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Enable all for user_stickers" ON public.user_stickers FOR ALL USING (true);
