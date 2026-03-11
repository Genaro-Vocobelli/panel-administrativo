# 🚀 NEUZ Studio Panel — Guía de Setup

## Paso 1: Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratuita
2. Crear nuevo proyecto → poné un nombre y contraseña
3. Esperá que se inicialice (~2 min)

## Paso 2: Configurar la base de datos

1. En tu proyecto Supabase → **SQL Editor**
2. Pegá y ejecutá todo el contenido de `supabase_setup.sql`
3. Verificá que no haya errores

## Paso 3: Crear el usuario Admin

1. Ir a **Authentication > Users > Add User**
2. Email: el tuyo (ej: `admin@neuz.studio`)
3. Password: una contraseña segura
4. Luego en **SQL Editor** ejecutá:
```sql
UPDATE public.profiles 
SET role = 'admin', full_name = 'Tu Nombre' 
WHERE email = 'tu@email.com';
```

## Paso 4: Configurar variables de entorno

1. En Supabase → **Project Settings > API**
2. Copiá `Project URL` y `anon public key`
3. Creá un archivo `.env` en la raíz del proyecto:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

## Paso 5: Instalar y correr

```bash
npm install
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173) — te va a pedir login.

---

## Usuarios y Roles

| Rol | Puede hacer |
|-----|------------|
| **Admin** | Todo: crear/editar/eliminar usuarios y tareas, asignar trabajo |
| **Editor de Video** | Ver sus tareas, editar su perfil y habilidades |
| **Diseñador Gráfico** | Ver sus tareas, editar su perfil y habilidades |
| **Programador** | Ver sus tareas, editar su perfil y habilidades |

## Para crear nuevos usuarios (desde el panel Admin)

El Admin puede ir a **Usuarios** en el sidebar y crear usuarios directamente desde la interfaz.

> ⚠️ Para que funcione la creación de usuarios desde el panel, necesitás crear una **Edge Function** en Supabase llamada `create-user`. Ver documentación de Supabase Functions.
> 
> **Alternativa simple:** El Admin puede crear usuarios directamente desde Supabase Dashboard > Authentication > Users, y luego editar su perfil desde el panel.
