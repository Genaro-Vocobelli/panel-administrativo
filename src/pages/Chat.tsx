import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Send, Plus, X, Paperclip } from "lucide-react";

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by: string[];
  sender?: { full_name: string; avatar_url?: string };
}

interface Chat {
  id: string;
  members: {
    user_id: string;
    profile: { full_name: string; avatar_url?: string };
  }[];
}

const Chat = () => {
  const { profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const chatFileRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const fetchChats = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("chat_members")
      .select("chat_id, chats(id), profile:profiles(id, full_name, avatar_url)")
      .eq("user_id", profile.id);

    if (!data) return;

    const chatIds = data.map((d: any) => d.chat_id);
    if (chatIds.length === 0) {
      setChats([]);
      return;
    }

    const { data: members } = await supabase
      .from("chat_members")
      .select("chat_id, user_id, profile:profiles(full_name, avatar_url)")
      .in("chat_id", chatIds)
      .neq("user_id", profile.id);

    const grouped: Record<string, any> = {};
    (members || []).forEach((m: any) => {
      if (!grouped[m.chat_id])
        grouped[m.chat_id] = { id: m.chat_id, members: [] };
      grouped[m.chat_id].members.push(m);
    });

    setChats(Object.values(grouped));
    fetchUnreadCounts(chatIds);
  };

  const fetchUnreadCounts = async (chatIds: string[]) => {
    if (!profile || chatIds.length === 0) return;
    const counts: Record<string, number> = {};
    for (const chatId of chatIds) {
      const { data } = await supabase
        .from("messages")
        .select("id, read_by")
        .eq("chat_id", chatId)
        .neq("sender_id", profile.id);
      const unread = (data || []).filter(
        (m) => !m.read_by?.includes(profile.id),
      ).length;
      counts[chatId] = unread;
    }
    setUnreadCounts(counts);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", profile?.id)
      .eq("is_active", true)
      .order("full_name");
    if (data) setUsers(data);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("messages")
      .select(
        "*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)",
      )
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    // Marcar como leídos
    if (profile) {
      const { data: unread } = await supabase
        .from("messages")
        .select("id, read_by")
        .eq("chat_id", chatId)
        .neq("sender_id", profile.id);

      for (const msg of unread || []) {
        if (!msg.read_by?.includes(profile.id)) {
          await supabase
            .from("messages")
            .update({ read_by: [...(msg.read_by || []), profile.id] })
            .eq("id", msg.id);
        }
      }
      setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
    }
  };

  useEffect(() => {
    fetchChats();
    fetchUsers();
  }, [profile]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat);

    const channel = supabase
      .channel(`chat-${selectedChat}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${selectedChat}`,
        },
        (payload: any) => {
          fetchMessages(selectedChat);
          if (payload.new.sender_id !== profile?.id) {
            playSound();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // Escuchar mensajes en chats no abiertos
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("all-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const msg = payload.new;
          if (msg.sender_id !== profile.id && msg.chat_id !== selectedChat) {
            playSound();
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.chat_id]: (prev[msg.chat_id] || 0) + 1,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startChat = async () => {
    if (!selectedUser || !profile) return;

    const { data: existing } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", profile.id);

    const myChats = (existing || []).map((c: any) => c.chat_id);

    if (myChats.length > 0) {
      const { data: shared } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", selectedUser)
        .in("chat_id", myChats);

      if (shared && shared.length > 0) {
        setSelectedChat(shared[0].chat_id);
        setShowNewChat(false);
        setSelectedUser("");
        return;
      }
    }

    const { data: newChat } = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();

    if (newChat) {
      await supabase.from("chat_members").insert([
        { chat_id: newChat.id, user_id: profile.id },
        { chat_id: newChat.id, user_id: selectedUser },
      ]);
      await fetchChats();
      setSelectedChat(newChat.id);
    }

    setShowNewChat(false);
    setSelectedUser("");
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || !profile) return;
    setSending(true);
    await supabase.from("messages").insert({
      chat_id: selectedChat,
      sender_id: profile.id,
      content: input.trim(),
      read_by: [profile.id],
    });
    setInput("");
    setSending(false);
  };

  const sendFile = async (file: File) => {
    if (!selectedChat || !profile) return;
    setUploadingFile(true);
    const ext = file.name.split(".").pop();
    const path = `chat/${selectedChat}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("archivos-tareas")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage
        .from("archivos-tareas")
        .getPublicUrl(path);
      await supabase.from("messages").insert({
        chat_id: selectedChat,
        sender_id: profile.id,
        content: `__archivo__${file.name}__url__${data.publicUrl}`,
        read_by: [profile.id],
      });
    }
    setUploadingFile(false);
  };

  const getChatName = (chat: Chat) => {
    return (
      chat.members.map((m: any) => m.profile?.full_name).join(", ") || "Chat"
    );
  };

  const getChatInitials = (chat: Chat) => {
    const name = getChatName(chat);
    return name.slice(0, 2).toUpperCase();
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-[calc(100vh-120px)] border border-border bg-card card-inset overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base">Mensajes</h1>
            {totalUnread > 0 && (
              <span className="w-5 h-5 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>

        {showNewChat && (
          <div className="p-3 border-b border-border bg-accent/20">
            <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
              Nuevo chat con
            </p>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-card border border-border px-2 py-2 text-xs font-mono outline-none mb-2"
            >
              <option value="">Seleccionar usuario...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={startChat}
                disabled={!selectedUser}
                className="flex-1 py-1.5 bg-foreground text-card text-xs font-mono hover:opacity-90 disabled:opacity-50"
              >
                Iniciar
              </button>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setSelectedUser("");
                }}
                className="p-1.5 border border-border text-muted-foreground hover:bg-accent"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                Sin conversaciones.
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Presioná + para empezar.
              </p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent transition-colors text-left ${
                  selectedChat === chat.id ? "bg-accent" : ""
                }`}
              >
                <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center text-xs font-mono shrink-0">
                  {getChatInitials(chat)}
                </div>
                <span className="text-sm font-mono truncate flex-1">
                  {getChatName(chat)}
                </span>
                {unreadCounts[chat.id] > 0 && (
                  <span className="w-5 h-5 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full shrink-0">
                    {unreadCounts[chat.id] > 9 ? "9+" : unreadCounts[chat.id]}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Area de mensajes */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm font-mono font-medium">
              {getChatName(
                chats.find((c) => c.id === selectedChat) || {
                  id: "",
                  members: [],
                },
              )}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => {
              const isMe = msg.sender_id === profile?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <div className="w-7 h-7 bg-muted border border-border flex items-center justify-center text-xs font-mono shrink-0">
                    {(msg.sender as any)?.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    className={`max-w-xs ${isMe ? "items-end" : "items-start"} flex flex-col`}
                  >
                    <div
                      className={`px-3 py-2 text-sm font-mono ${
                        isMe
                          ? "bg-foreground text-card"
                          : "bg-accent border border-border"
                      }`}
                    >
                      {msg.content.startsWith("__archivo__") ? (
                        <a
                          href={msg.content.split("__url__")[1]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 underline underline-offset-2"
                        >
                          <Paperclip size={13} strokeWidth={1.5} />
                          {
                            msg.content
                              .split("__archivo__")[1]
                              .split("__url__")[0]
                          }
                        </a>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border flex gap-3">
            <input
              type="file"
              className="hidden"
              ref={chatFileRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendFile(file);
                if (chatFileRef.current) chatFileRef.current.value = "";
              }}
            />
            <button
              onClick={() => chatFileRef.current?.click()}
              disabled={uploadingFile}
              className="p-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
            >
              {uploadingFile ? (
                "..."
              ) : (
                <Paperclip size={16} strokeWidth={1.5} />
              )}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder="Escribí un mensaje..."
              className="flex-1 bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 bg-foreground text-card hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm font-mono text-muted-foreground">
            Seleccioná una conversación.
          </p>
        </div>
      )}
    </div>
  );
};

export default Chat;
