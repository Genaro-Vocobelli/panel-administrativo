import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = string;

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  skills: string[];
  estado: 'disponible' | 'ocupado' | 'desconectado';
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';
  priority: 'baja' | 'media' | 'alta';
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  due_date: string | null;
  monto: number | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  assigned_user?: AppUser;
  creator?: AppUser;
}