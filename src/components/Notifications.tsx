import { useEffect, useState, useRef } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

const playSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(520, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      ctx.resume();
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  useEffect(() => {
    const init = () => {
      if (!audioCtx.current) {
        audioCtx.current = new AudioContext();
      }
    };
    document.addEventListener("click", init, { once: true });
    return () => document.removeEventListener("click", init);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile?.id}`,
        },
        () => {
          fetchNotifications();
          playSound();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) markAllRead();
        }}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border border-border shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">
              Notificaciones
            </span>
            {notifications.length > 0 && (
              <button
                onClick={() => notifications.forEach((n) => deleteNotification(n.id))}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-mono text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 ${
                    !n.read ? "bg-accent/30" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium mb-0.5">{n.title}</p>
                    {n.message && (
                      <p className="text-xs font-mono text-muted-foreground">{n.message}</p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("es-AR")}{" "}
                      {new Date(n.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;