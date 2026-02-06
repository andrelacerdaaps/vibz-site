"use client";
import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";

function PlayerContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const modo = searchParams.get("modo") || "horizontal";
  const isVertical = modo === "vertical";

  const [playlist, setPlaylist] = useState<any[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [usuario, setUsuario] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null); // Ref para o fundo desfocado
  
  // Função para alternar Tela Cheia (NO DOCUMENTO INTEIRO)
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar ativar tela cheia: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 1. BUSCA DADOS
  useEffect(() => {
    if (!userId) return;

    const carregarDados = async () => {
      try {
        const resUser = await fetch('/api/me', { 
            method: "POST", 
            body: JSON.stringify({ userId }) 
        });
        const dataUser = await resUser.json();
        if (dataUser.id) setUsuario(dataUser);
      } catch (e) { console.error("Erro user TV:", e); }
      buscarStories(userId);
    };

    carregarDados();
    
    // Robô: atualiza a cada 20s
    const intervalo = setInterval(() => buscarStories(userId), 20000);
    return () => clearInterval(intervalo);
  }, [userId]);

  async function buscarStories(uid: string) {
    try {
      const res = await fetch(`/api/midia?userId=${uid}`, { cache: "no-store" });
      const dados = await res.json();
      
      if (Array.isArray(dados) && dados.length > 0) {
        setPlaylist((antiga) => {
           const idsAntigos = antiga.map(m => m.id);
           const idsNovos = dados.map(m => m.id);
           if (JSON.stringify(idsAntigos) === JSON.stringify(idsNovos)) return antiga;
           return dados;
        });
      }
    } catch (e) { console.error(e); }
  }

  // 2. CONTROLE DO CARROSSEL
  useEffect(() => {
    if (playlist.length === 0) return;
    
    const midia = playlist[indiceAtual];
    const duracaoMs = midia.tipo === 'VIDEO' ? (midia.duracao * 1000) : 10000; 

    // Play no vídeo principal
    if (midia.tipo === 'VIDEO' && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
    }
    // Play no vídeo de fundo (efeito vidro)
    if (midia.tipo === 'VIDEO' && bgVideoRef.current) {
        bgVideoRef.current.currentTime = 0;
        bgVideoRef.current.muted = true;
        bgVideoRef.current.play().catch(() => {});
    }

    const timer = setTimeout(() => {
      setIndiceAtual((prev) => (prev + 1) % playlist.length);
    }, duracaoMs);
    
    return () => clearTimeout(timer);
  }, [indiceAtual, playlist]);

  if (playlist.length === 0 || !usuario) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse">
          VIBZ TV
        </h1>
      </div>
    );
  }

  const midia = playlist[indiceAtual];
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://instagram.com/${usuario.instagramUser}&color=000000&bgcolor=ffffff&margin=10`;

  const styleContainer: React.CSSProperties = isVertical
    ? { 
        width: "100vh", height: "100vw", 
        transform: "rotate(-90deg)", transformOrigin: "top left", 
        position: "absolute", top: "100%", left: "0" 
      }
    : { width: "100vw", height: "100vh" };

  // Lógica de ajuste de imagem:
  // Se Vertical: 'cover' (preenche tudo). Se Horizontal: 'contain' (não corta).
  const objectFitClass = isVertical ? "object-cover" : "object-contain";

  return (
    <div 
        className="bg-black overflow-hidden relative font-sans group cursor-pointer"
        style={styleContainer}
        onDoubleClick={toggleFullScreen}
    >
      
      {/* Botão de Tela Cheia */}
      <button 
        onClick={toggleFullScreen}
        className="absolute top-4 right-4 z-[60] bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        title="Tela Cheia"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </button>

      {/* === CAMADA 0: FUNDO AMBIENTE (VIDRO/DESFOCADO) === */}
      {/* Adicionado para preencher laterais na horizontal */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {midia.tipo === "VIDEO" ? (
             <video
                ref={bgVideoRef}
                key={`bg-${midia.id}`} 
                src={midia.url}
                autoPlay muted playsInline loop={false}
                className="w-full h-full object-cover blur-2xl opacity-50 scale-110 brightness-75"
             />
        ) : (
             <img 
                key={`bg-${midia.id}`} 
                src={midia.url} 
                className="w-full h-full object-cover blur-2xl opacity-50 scale-110 brightness-75" 
                alt="Background Blur" 
             />
        )}
      </div>

      {/* === CAMADA 1: MÍDIA PRINCIPAL === */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {midia.tipo === "VIDEO" ? (
          <video
            ref={videoRef} key={midia.id} src={midia.url}
            autoPlay muted playsInline loop={false}
            // Usa objectFitClass para alternar entre cover/contain
            className={`w-full h-full ${objectFitClass} shadow-2xl transition-all duration-500`}
            onCanPlay={(e) => e.currentTarget.classList.remove('blur-sm')}
          />
        ) : (
          <img 
            key={midia.id} src={midia.url} 
            className={`w-full h-full ${objectFitClass} animate-slow-zoom shadow-2xl`} 
            alt="Story" 
          />
        )}
      </div>

      {/* === CAMADA 2: DEGRADÊS === */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-20 pointer-events-none"></div>


      {/* === CAMADA 3: INFO DO DONO DO STORY === */}
      <div className="absolute bottom-10 left-8 flex items-end gap-3 z-30 animate-fade-in-up">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-lg">
            <img 
                src={midia.avatar || usuario.logoUrl || "https://i.pravatar.cc/150"} 
                className="w-12 h-12 rounded-full border-2 border-black object-cover" 
            />
          </div>
          <div className="mb-0.5">
              <h2 className="font-bold text-lg text-white drop-shadow-md">
                 {midia.autor ? `@${midia.autor}` : `@${usuario.instagramUser}`}
              </h2>
              <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-[10px] text-green-400 font-bold tracking-widest uppercase drop-shadow-sm">
                     Ao Vivo
                  </p>
              </div>
          </div>
      </div>

      {/* === CAMADA 4: BLOCO QR CODE (MANTIDO NA LATERAL CENTRO) === */}
      <div className="absolute top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 animate-fade-in-up delay-100">
          
          {/* 1. TEXTO */}
          <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shadow-lg text-center transform hover:scale-105 transition-transform">
             <p className="text-white font-bold text-[10px] uppercase tracking-wider">
                 Nos marque
             </p>
             <p className="text-yellow-400 font-black text-[10px] uppercase">
                 para aparecer!
             </p>
          </div>

          {/* 2. QR CODE */}
          <div className="bg-white p-1.5 rounded-xl shadow-2xl border-2 border-white/20">
             <img 
                 src={qrCodeUrl} 
                 className="w-24 h-24 rounded-lg" 
                 alt="QR Code Instagram" 
             />
          </div>

          {/* 3. ARROBA */}
          <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
             <p className="text-white font-bold text-xs tracking-wide">
                @{usuario.instagramUser}
             </p>
          </div>

      </div>

      {/* === CAMADA 5: BARRINHA DE PROGRESSO (MANTIDA NO TOPO Z-999) === */}
      <div className="absolute top-0 left-0 w-full h-2 z-[999] bg-white/20 pointer-events-none">
        <div
          key={midia.id}
          className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_15px_rgba(236,72,153,0.8)]"
          style={{
            width: '100%',
            animation: `progress ${midia.tipo === 'VIDEO' ? (midia.duracao || 10) : 10}s linear`
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.05); } }
        .animate-fade-in-up { animation: fadeUp 0.8s ease-out backwards; }
        .animate-slow-zoom { animation: slowZoom 10s ease-out infinite alternate; }
        .delay-100 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
}

export default function TVPlayer() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen"></div>}>
      <PlayerContent />
    </Suspense>
  );
}