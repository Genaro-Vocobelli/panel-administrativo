import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import Notifications from "./Notifications";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

const AppLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      ctx.resume();
    } catch (e) {}
  };

  useEffect(() => {
    const init = () => {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
    };
    document.addEventListener("click", init, { once: true });
    return () => document.removeEventListener("click", init);
  }, []);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('global-chat-sound')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        const msg = payload.new;
        // Solo sonar si el mensaje no es mío y no estoy en el chat
        if (msg.sender_id !== profile.id && !location.pathname.includes('/chat')) {
          playSound();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, location.pathname]);

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end px-8 pt-4">
          <Notifications />
        </div>
        <main className="flex-1 px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;