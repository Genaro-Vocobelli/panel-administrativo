import { useState } from "react";
import { Instagram as InstagramIcon, Send, Paperclip, Search } from "lucide-react";

const MOCK_CONVERSATIONS = [
  {
    id: "1",
    username: "diseño.creativo",
    name: "Diseño Creativo",
    avatar: "DC",
    lastMessage: "Hola! Me interesa el servicio de edición",
    time: "10:32",
    unread: 2,
    online: true,
    messages: [
      { id: "1", from: "them", text: "Hola! Me interesa el servicio de edición de video", time: "10:30" },
      { id: "2", from: "them", text: "¿Cuánto cobran por un video de 2 minutos?", time: "10:31" },
      { id: "3", from: "them", text: "Hola! Me interesa el servicio de edición", time: "10:32" },
    ],
  },
  {
    id: "2",
    username: "maria.lopez",
    name: "María López",
    avatar: "ML",
    lastMessage: "Perfecto, cuando pueden empezar?",
    time: "09:15",
    unread: 0,
    online: true,
    messages: [
      { id: "1", from: "us", text: "Buenos días María! Ya revisamos tu proyecto", time: "09:10" },
      { id: "2", from: "them", text: "Perfecto, cuando pueden empezar?", time: "09:15" },
    ],
  },
  {
    id: "3",
    username: "tech.startup.ar",
    name: "Tech Startup AR",
    avatar: "TS",
    lastMessage: "Gracias por la cotización",
    time: "Ayer",
    unread: 0,
    online: false,
    messages: [
      { id: "1", from: "them", text: "Necesitamos un logo urgente", time: "Ayer" },
      { id: "2", from: "us", text: "Claro, te mandamos la cotización", time: "Ayer" },
      { id: "3", from: "them", text: "Gracias por la cotización", time: "Ayer" },
    ],
  },
  {
    id: "4",
    username: "emprendedor.ok",
    name: "Emprendedor OK",
    avatar: "EO",
    lastMessage: "Les mando el brief ahora",
    time: "Lun",
    unread: 1,
    online: false,
    messages: [
      { id: "1", from: "them", text: "Hola, quiero hacer una página web", time: "Lun" },
      { id: "2", from: "us", text: "Contanos más sobre el proyecto!", time: "Lun" },
      { id: "3", from: "them", text: "Les mando el brief ahora", time: "Lun" },
    ],
  },
  {
    id: "5",
    username: "studio.visual",
    name: "Studio Visual",
    avatar: "SV",
    lastMessage: "Ok, esperamos el feedback",
    time: "Dom",
    unread: 0,
    online: false,
    messages: [
      { id: "1", from: "us", text: "Te mandamos el primer borrador", time: "Dom" },
      { id: "2", from: "them", text: "Ok, esperamos el feedback", time: "Dom" },
    ],
  },
];

const InstagramPage = () => {
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<typeof MOCK_CONVERSATIONS>([]);
  

  const filtered = conversations.filter(c =>
    search === "" ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const current = conversations.find(c => c.id === selectedConv);

  const sendMessage = () => {
    if (!input.trim() || !selectedConv) return;
    setConversations(prev => prev.map(c => {
      if (c.id !== selectedConv) return c;
      return {
        ...c,
        lastMessage: input.trim(),
        time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        messages: [...c.messages, { id: Date.now().toString(), from: "us", text: input.trim(), time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) }],
      };
    }));
    setInput("");
  };

  const handleSelect = (id: string) => {
    setSelectedConv(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  return (
    <div className="flex h-[calc(100vh-120px)] border border-border bg-card card-inset overflow-hidden">

      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <InstagramIcon size={16} strokeWidth={1.5} />
            <h1 className="font-display text-base">Instagram</h1>
            {totalUnread > 0 && (
              <span className="w-5 h-5 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 border border-border">
            Sin conectar
          </span>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2 bg-accent/30 border border-border">
            <Search size={13} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="bg-transparent text-xs font-mono outline-none flex-1 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Lista conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent transition-colors text-left ${
                selectedConv === conv.id ? "bg-accent" : ""
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-xs font-mono text-white font-medium">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-card rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-mono font-medium truncate">@{conv.username}</span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0 ml-1">{conv.time}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>

              {conv.unread > 0 && (
                <span className="w-5 h-5 bg-destructive text-card text-xs font-mono flex items-center justify-center rounded-full shrink-0">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Area de chat */}
      {current ? (
        <div className="flex-1 flex flex-col">
          {/* Header del chat */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-xs font-mono text-white font-medium">
                {current.avatar}
              </div>
              {current.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success border-2 border-card rounded-full" />
              )}
            </div>
            <div>
              <p className="text-sm font-mono font-medium">@{current.username}</p>
              <p className="text-xs font-mono text-muted-foreground">
                {current.online ? "En línea" : "Desconectado"}
              </p>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {current.messages.map(msg => {
              const isUs = msg.from === "us";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUs ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 flex items-center justify-center text-xs font-mono shrink-0 ${
                    isUs ? "bg-muted border border-border" : "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white"
                  }`}>
                    {isUs ? "Yo" : current.avatar.slice(0, 1)}
                  </div>
                  <div className={`flex flex-col ${isUs ? "items-end" : "items-start"}`}>
                    <div className={`max-w-xs px-3 py-2 text-sm font-mono ${
                      isUs ? "bg-foreground text-card" : "bg-accent border border-border"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground mt-1">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border flex gap-3 items-center">
            <button className="p-2.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
              <Paperclip size={16} strokeWidth={1.5} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Escribí un mensaje..."
              className="flex-1 bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-4 py-2.5 bg-foreground text-card hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border border-border flex items-center justify-center text-muted-foreground">
            <InstagramIcon size={28} strokeWidth={1} />
          </div>
          <div className="text-center">
            <p className="text-sm font-mono font-medium mb-1">Instagram DMs</p>
            <p className="text-xs font-mono text-muted-foreground">Seleccioná una conversación para empezar.</p>
            <p className="text-xs font-mono text-muted-foreground mt-3 px-2 py-1 border border-dashed border-border inline-block">
              Integración pendiente de conectar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramPage;