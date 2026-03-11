import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Users, LogOut, Settings, CheckSquare, FileText, MessageSquare, Instagram } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AppSidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isAdminOrSupervisor = isAdmin || isSupervisor;

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const fetchUnread = async () => {
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', profile.id);
      const chatIds = (memberships || []).map((m: any) => m.chat_id);
      if (chatIds.length === 0) { setUnreadMessages(0); return; }
      const { data } = await supabase
        .from('messages')
        .select('id, read_by')
        .in('chat_id', chatIds)
        .neq('sender_id', profile.id);
      const unread = (data || []).filter(m => !m.read_by?.includes(profile.id)).length;
      setUnreadMessages(unread);
    };
    fetchUnread();

    const channel = supabase
      .channel('sidebar-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

const navItems: { to: string; label: string; icon: any; adminOnly: boolean; supervisorOk?: boolean; userOnly?: boolean; badge?: number }[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true, supervisorOk: true },
    { to: '/consultas', label: 'Consultas', icon: List, adminOnly: true, supervisorOk: true },
    { to: '/tareas', label: 'Tareas', icon: CheckSquare, adminOnly: false },
    { to: '/mis-consultas', label: 'Mis Consultas', icon: FileText, adminOnly: false, userOnly: true },
    { to: '/disenadores', label: 'Diseñadores', icon: Users, adminOnly: false },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Settings, adminOnly: true },
    { to: '/chat', label: 'Chat', icon: MessageSquare, adminOnly: false, badge: unreadMessages },
    { to: '/instagram', label: 'Instagram', icon: Instagram, adminOnly: false },
  ].filter(item => {
    if (item.adminOnly) return isAdmin || (isSupervisor && item.supervisorOk);
    if (item.userOnly) return !isAdminOrSupervisor;
    return true;
  });

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    editor_video: 'Editor de Video',
    disenador_grafico: 'Diseñador Gráfico',
    programador: 'Programador',
  };

  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col justify-between">
      <div>
        <div className="p-6 pb-8">
          <h2 className="font-display text-lg tracking-tight">Panel Administrativo</h2>
          {isAdmin && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wider">
              Admin
            </span>
          )}
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto w-5 h-5 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <NavLink to="/perfil" className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 object-cover border border-border" />
          ) : (
            <div className="w-8 h-8 bg-muted flex items-center justify-center text-xs font-mono font-medium border border-border">
              {profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-medium font-mono truncate">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {profile ? (roleLabels[profile.role] || profile.role) : ''}
            </p>
          </div>
        </NavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-mono w-full"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Salir
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;