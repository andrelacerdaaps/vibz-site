"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- COMPONENTE: GERENCIADOR DE MÍDIA ---
function PlaylistManager({ userId }: { userId: string }) {
  const [midias, setMidias] = useState<any[]>([]);

  useEffect(() => { 
    carregarMidias(); 
    const intervalo = setInterval(carregarMidias, 5000);
    return () => clearInterval(intervalo);
  }, [userId]);

  async function carregarMidias() {
    try {
        const res = await fetch(`/api/midia?userId=${userId}`);
        const dados = await res.json();
        if(Array.isArray(dados)) setMidias(dados);
    } catch(e) { console.error("Erro mídia"); }
  }

  const apagarMidia = async (id: string) => {
    if(!confirm("Remover esta mídia?")) return;
    await fetch(`/api/midia?id=${id}`, { method: 'DELETE' });
    setMidias(midias.filter(m => m.id !== id));
  };

  if (midias.length === 0) {
    return (
      <div className="p-10 bg-white/5 rounded-3xl border border-white/10 text-center text-gray-500 mt-8">
        Nenhum story na TV. O sistema buscará novos stories automaticamente...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
      {midias.map((midia) => (
        <div key={midia.id} className="relative group aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden border border-white/10 hover:border-red-500 transition-colors shadow-lg">
          {midia.tipo === 'VIDEO' ? (
              <video src={midia.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
          ) : (
              <img src={midia.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          )}
          
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <img src={midia.avatar || "https://i.pravatar.cc/150"} className="w-4 h-4 rounded-full" />
              <span className="text-[10px] text-white truncate max-w-[60px]">{midia.autor}</span>
          </div>
          <button onClick={() => apagarMidia(midia.id)} className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
            <span className="text-3xl mb-2">🗑️</span>
            <span className="font-bold text-white text-xs uppercase tracking-widest">Remover</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarOpcoesTV, setMostrarOpcoesTV] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSinc, setUltimaSinc] = useState<string>("");
  
  const [instaInput, setInstaInput] = useState("");
  const [salvandoInsta, setSalvandoInsta] = useState(false);
  const [sucessoConexao, setSucessoConexao] = useState(false);

  // 1. CARREGAMENTO BLINDADO (Com Timeout de Segurança)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
        setLoading(false);
    }, 1000);

    const carregarTudo = async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("conexao") === "sucesso") {
            setSucessoConexao(true);
            window.history.replaceState(null, "", "/");
        }

        const dadosSalvos = localStorage.getItem("usuarioVibz");
        if (dadosSalvos) {
            try {
                const user = JSON.parse(dadosSalvos);
                setUsuario(user);
                setInstaInput(user.instagramUser || "");
                
                sincronizarAutomatico(user.id);
                const timerSync = setInterval(() => sincronizarAutomatico(user.id), 120000);
                
                clearTimeout(safetyTimer);
                setLoading(false);
                
                return () => clearInterval(timerSync);
            } catch (e) {
                console.error("Dados corrompidos, limpando...", e);
                localStorage.removeItem("usuarioVibz");
            }
        }
        setLoading(false);
    };

    carregarTudo();
    return () => clearTimeout(safetyTimer);
  }, []);

  const sincronizarAutomatico = async (uid: string) => {
    try {
        const res = await fetch("/api/sync-stories", {
            method: "POST",
            body: JSON.stringify({ userId: uid })
        });
        if (res.ok) setUltimaSinc(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
  };

  const sair = () => {
    localStorage.removeItem("usuarioVibz");
    setUsuario(null);
    window.location.href = "/login";
  };

  const conectarInstagramMeta = () => {
    if (!usuario?.id) return alert("Erro de sessão.");
    window.location.href = `/api/auth/meta/login?userId=${usuario.id}`;
  };

  const salvarConfiguracoes = async () => {
    if (!instaInput) return alert("Digite o usuário.");
    setSalvandoInsta(true);
    const handleLimpo = instaInput.replace("@", "").trim();
    try {
        const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: usuario.id, instagramUser: handleLimpo }),
        });
        if (res.ok) {
            const novoEstado = { ...usuario, instagramUser: handleLimpo };
            setUsuario(novoEstado);
            localStorage.setItem("usuarioVibz", JSON.stringify(novoEstado));
            alert("Salvo!");
        }
    } catch (e) { alert("Erro ao salvar."); }
    finally { setSalvandoInsta(false); }
  };

  const sincronizarStories = async () => {
    if (!usuario?.id) return alert("Erro de sessão.");
    setSincronizando(true);
    try {
        const res = await fetch("/api/sync-stories", { method: "POST", body: JSON.stringify({ userId: usuario.id }) });
        const dados = await res.json();
        if (res.ok) {
            alert(`✅ ${dados.mensagem || "Stories atualizados!"}`);
            setUltimaSinc(new Date().toLocaleTimeString());
        } else {
            alert("Aviso: " + (dados.erro || "Erro desconhecido"));
        }
    } catch (error) { alert("Erro de conexão."); } 
    finally { setSincronizando(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <div className="animate-pulse text-2xl font-black">CARREGANDO VIBZ...</div>
        <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="text-xs text-red-500 underline hover:text-red-400 mt-4 cursor-pointer"
        >
            Travou? Clique aqui para Resetar
        </button>
    </div>
  );

  if (usuario) {
    const dataValidade = usuario.validadePlano ? new Date(usuario.validadePlano) : new Date();
    const diasRestantes = Math.ceil((dataValidade.getTime() - new Date().getTime()) / (86400000));
    const isAtivo = usuario.statusConta === "ATIVO" && diasRestantes >= 0;

    // --- LÓGICA DE CORES PLATINA / DIAMANTE ---
    const nomePlano = usuario.planoAtivo?.toUpperCase() || "PADRÃO";
    const isDiamante = nomePlano.includes("DIAMANTE") || nomePlano.includes("GOLD");
    const isPlatina = nomePlano.includes("PLATINA") || nomePlano.includes("PRATA");

    const corBorda = isDiamante ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]" : 
                     isPlatina ? "border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]" : 
                     isAtivo ? "border-green-500/30" : "border-red-500/30";

    const bgCard = isDiamante ? "bg-gradient-to-br from-yellow-900/20 to-black" :
                   isPlatina ? "bg-gradient-to-br from-blue-900/20 to-black" :
                   isAtivo ? "bg-green-900/10" : "bg-red-900/10";

    const instagramUrl = `https://instagram.com/${usuario.instagramUser || "instagram"}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(instagramUrl)}&color=000000&bgcolor=ffffff`;

    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
        <nav className="w-full max-w-7xl mx-auto p-6 flex justify-between items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">VIBZ.</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <img src={usuario.logoUrl || "https://i.pravatar.cc/150"} className="w-8 h-8 rounded-full border border-white/20" />
                <span className="text-sm hidden md:block text-gray-400">Olá, <b className="text-white">{usuario.nomeEmpresa}</b></span>
             </div>
             <button onClick={sair} className="px-4 py-2 text-xs font-bold border border-red-500/30 text-red-400 rounded-full hover:bg-red-900/10">SAIR</button>
          </div>
        </nav>

        {sucessoConexao && (
            <div className="max-w-7xl mx-auto px-6 mt-4">
                <div className="bg-green-500/20 border border-green-500 text-green-400 p-4 rounded-xl flex justify-between items-center">
                    <span>✅ Conexão com Instagram realizada!</span>
                    <button onClick={() => setSucessoConexao(false)} className="font-bold">X</button>
                </div>
            </div>
        )}

        <main className="max-w-7xl mx-auto px-6 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-500 to-orange-500 p-[2px]">
                    <img src={usuario.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg"} className="w-full h-full rounded-2xl object-cover bg-black" />
                </div>
                <div>
                    <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest font-bold">Painel</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white">Visão Geral</h2>
                    {ultimaSinc && <p className="text-xs text-green-500 mt-2 animate-pulse">● Atualizado: {ultimaSinc}</p>}
                </div>
            </div>
            
            {isAtivo && (
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={sincronizarStories} disabled={sincronizando} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-full hover:scale-105 shadow-lg shadow-purple-900/20 transition-all text-sm disabled:opacity-50">
                  {sincronizando ? "🔄 Buscando..." : "✨ Buscar Stories"}
                </button>
                <div className="relative">
                  <button onClick={() => setMostrarOpcoesTV(!mostrarOpcoesTV)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 text-sm">
                    📺 Player TV {mostrarOpcoesTV ? '▲' : '▼'}
                  </button>
                  {mostrarOpcoesTV && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-gray-700 rounded-xl shadow-xl z-50 flex flex-col">
                      <button onClick={() => window.open(`/tv?userId=${usuario.id}&modo=horizontal`, '_blank')} className="p-3 text-left hover:bg-white/10 text-sm text-gray-200">🖥️ Horizontal</button>
                      <button onClick={() => window.open(`/tv?userId=${usuario.id}&modo=vertical`, '_blank')} className="p-3 text-left hover:bg-white/10 text-sm text-gray-200 border-t border-gray-700">📱 Vertical</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 backdrop-blur-xl flex flex-col items-center text-center">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Seu QR Code</h3>
                <div className="bg-white p-2 rounded-xl mb-4 shadow-lg shadow-white/5">
                    <img src={qrCodeUrl} className="w-32 h-32" />
                </div>
                <p className="text-sm font-bold text-white mb-1">@{usuario.instagramUser}</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-blue-500/20 backdrop-blur-xl flex flex-col justify-between shadow-2xl">
                <div>
                   <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Conexão</h3>
                   <button onClick={conectarInstagramMeta} className="w-full mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 text-white font-black py-3 rounded-xl transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
                    📸 Reconectar Oficial
                   </button>
                   <div className="relative mb-4">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 font-black">@</span>
                      <input value={instaInput} onChange={(e) => setInstaInput(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 pl-10 outline-none focus:border-pink-500 font-bold text-sm text-white" placeholder="manual" />
                   </div>
                </div>
                <button onClick={salvarConfiguracoes} disabled={salvandoInsta} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition-all text-xs uppercase tracking-widest">
                  {salvandoInsta ? "Salvando..." : "Atualizar Manual"}
                </button>
            </div>

            {/* --- CARD DE STATUS DINÂMICO --- */}
            <div className={`p-8 rounded-3xl border backdrop-blur-xl flex flex-col justify-between transition-all duration-700 ${bgCard} ${corBorda}`}>
                <div>
                  <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Plano Atual</h3>
                  <div className="flex items-center gap-3 mt-2">
                      <span className={`w-3 h-3 rounded-full ${isAtivo ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                      <p className={`text-3xl font-black tracking-tighter ${isAtivo ? 'text-white' : 'text-red-400'}`}>
                        {usuario.planoAtivo || "PADRÃO"}
                      </p>
                  </div>
                  
                  {/* Cronômetro de Dias */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-gray-500 uppercase font-bold">Vencimento</p>
                      <p className="text-lg font-black text-blue-400">{diasRestantes} <span className="text-[10px] text-gray-400">DIAS</span></p>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(diasRestantes/30)*100}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={() => router.push('/planos')}
                    className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    ✨ UPGRADE DE PLANO
                  </button>
                </div>
            </div>
          </div>

          {isAtivo && (
            <div className="border-t border-white/10 pt-10">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-6"><span className="w-2 h-8 bg-blue-500 rounded-full"></span> No Ar Agora</h3>
              <PlaylistManager userId={usuario.id} />
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-7xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8 tracking-tighter">VIBZ.</h1>
      <Link href="/login" className="px-10 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors">Entrar</Link>
    </div>
  );
}