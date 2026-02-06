"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Planos() {
  const router = useRouter();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const dadosUser = localStorage.getItem("usuarioVibz");
    if (dadosUser) setUsuario(JSON.parse(dadosUser));

    async function carregarPlanos() {
      try {
        const res = await fetch("/api/admin/users");
        const dados = await res.json();
        if(dados.planos) setPlanos(dados.planos);
      } catch (e) { console.error("Erro ao carregar planos"); }
    }
    carregarPlanos();
  }, []);

  // --- ROBÔ DE VERIFICAÇÃO AUTOMÁTICA (NOVO) ---
  useEffect(() => {
    let intervalo: any;

    // Só liga o robô se o QR Code estiver na tela
    if (pixData && usuario) {
        intervalo = setInterval(async () => {
            try {
                // Pergunta pro servidor: "O status desse cara mudou?"
                // (Aqui usamos a rota de admin para checar, em produção idealmente teríamos uma rota /api/me)
                const res = await fetch("/api/admin/users");
                const data = await res.json();
                
                // Encontra o usuário atual na lista
                const me = data.users.find((u: any) => u.id === usuario.id);

                // SE O PAGAMENTO CAIU (STATUS VIROU ATIVO)
                if (me && me.statusConta === 'ATIVO') {
                    clearInterval(intervalo); // Para o robô
                    
                    // Atualiza o LocalStorage
                    const novoUsuario = { ...usuario, plano: me.plano?.nome, statusConta: 'ATIVO' };
                    localStorage.setItem("usuarioVibz", JSON.stringify(novoUsuario));
                    
                    // Sucesso e Redireciona
                    alert("✅ Pagamento Confirmado! Redirecionando...");
                    router.push("/");
                }
            } catch (error) {
                console.error("Verificando pagamento...", error);
            }
        }, 3000); // Verifica a cada 3 segundos
    }

    return () => clearInterval(intervalo); // Limpa ao fechar
  }, [pixData, usuario, router]);
  // ----------------------------------------------

  // --- SOLICITAR TESTE GRÁTIS ---
  const solicitarTeste = async () => {
    if(!usuario) return;
    setLoadingId("TESTE");
    
    try {
        const res = await fetch("/api/pagamento", {
            method: 'POST',
            body: JSON.stringify({ acao: 'SOLICITAR_TESTE', userId: usuario.id })
        });

        const data = await res.json();

        if(res.ok) {
            alert("✅ Solicitação enviada! Aguarde a liberação do suporte.");
            const novoUser = { ...usuario, statusConta: 'EM_ANALISE' };
            localStorage.setItem("usuarioVibz", JSON.stringify(novoUser));
            router.push("/");
        } else {
            alert("Erro: " + (data.erro || "Erro ao solicitar."));
        }
    } catch (error) {
        alert("Erro de conexão.");
    } finally {
        setLoadingId(null);
    }
  }

  const gerarPix = async (plano: any) => {
    if (!usuario) { alert("Faça login primeiro!"); router.push("/login"); return; }
    
    setLoadingId(plano.id);

    try {
      const res = await fetch("/api/pagamento", {
        method: "POST",
        body: JSON.stringify({
          userId: usuario.id,
          planoId: plano.id,
          preco: plano.preco,
          email: usuario.email
        }),
      });

      const dados = await res.json();
      
      if (res.ok && dados.qr_code) {
        setPixData({ ...dados, preco: plano.preco }); // Salvamos o preço aqui para mostrar no modal
        setCopiado(false);
      } else {
        alert(`Erro: ${dados.erro || "Falha ao comunicar com Mercado Pago"}`);
      }
    } catch (error) { 
        alert("Erro de conexão."); 
    } finally { 
        setLoadingId(null);
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  // --- MODAL PREMIUM (COM VERIFICAÇÃO AUTOMÁTICA) ---
  if (pixData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#1a1a1a] w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col items-center relative">
          
          {/* Cabeçalho */}
          <div className="w-full bg-[#111] p-4 text-center border-b border-gray-800 relative">
             <h3 className="text-white font-bold text-lg">Pagamento PIX</h3>
             <p className="text-gray-400 text-xs">Total: <span className="text-green-400 font-bold text-sm">R$ {pixData.preco}</span></p>
             <button onClick={() => setPixData(null)} className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors text-xl font-bold">✕</button>
          </div>

          <div className="p-6 w-full flex flex-col items-center bg-[#1a1a1a]">
             
             {/* QR Code Pequeno e Limpo (Fundo Branco) */}
             <div className="bg-white p-2 rounded-xl shadow-inner mb-6 flex justify-center items-center" style={{ width: '180px', height: '180px' }}>
                <img 
                  src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                  className="w-full h-full object-contain mix-blend-multiply" 
                  alt="QR Code"
                />
             </div>

             {/* Botão Copiar */}
             <div className="w-full space-y-3">
                <button 
                  onClick={copiarCodigo}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm ${
                    copiado 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {copiado ? "✓ CÓDIGO COPIADO!" : "📋 COPIAR CÓDIGO PIX"}
                </button>
                <p className="text-[10px] text-gray-500 text-center px-4">
                  Abra o app do seu banco e escolha "Pix Copia e Cola".
                </p>
             </div>
          </div>

          {/* RODAPÉ AUTOMÁTICO (SEM BOTÃO) */}
          <div className="w-full p-6 bg-[#111] border-t border-gray-800 flex flex-col items-center justify-center text-center">
             <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-green-400 font-bold text-xs animate-pulse">AGUARDANDO CONFIRMAÇÃO DO BANCO...</p>
             <p className="text-[10px] text-gray-600 mt-1">A liberação é automática em alguns segundos.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL DE PLANOS ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-20 px-4">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">Planos VIBZ.</h1>
        <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm transition-colors">← Voltar para o Painel</button>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
          
          {/* --- CARD DE TESTE GRÁTIS --- */}
          {usuario && !usuario.testeGratisUsado && usuario.statusConta !== 'EM_ANALISE' && usuario.statusConta !== 'ATIVO' && (
              <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 max-w-3xl mx-auto shadow-2xl shadow-purple-900/20 animate-fade-in">
                  <div className="text-left">
                      <h3 className="text-2xl font-bold text-white mb-2">🎁 Experimente Grátis</h3>
                      <p className="text-gray-300 text-sm">Solicite <strong className="text-purple-400">7 Dias de Acesso Total</strong>. Sem compromisso.</p>
                  </div>
                  <button 
                    onClick={solicitarTeste} 
                    disabled={loadingId === "TESTE"}
                    className="whitespace-nowrap px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                  >
                    {loadingId === "TESTE" ? "Solicitando..." : "🚀 Solicitar Teste Grátis"}
                  </button>
              </div>
          )}
          
          {/* MENSAGEM SE JÁ SOLICITOU */}
          {usuario?.statusConta === 'EM_ANALISE' && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl text-center max-w-2xl mx-auto animate-pulse">
                  <p className="text-yellow-400 font-bold">⏳ Solicitação em Análise</p>
                  <p className="text-gray-400 text-sm">Aguarde a liberação do suporte. Você será notificado.</p>
              </div>
          )}

          {/* GRID DE PLANOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planos.length === 0 && <p className="col-span-3 text-center text-gray-500">Carregando planos...</p>}
              
              {planos.map((plano) => {
                const isAtual = usuario?.plano === plano.nome;
                return (
                    <div key={plano.id} className={`group relative p-8 rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden ${isAtual ? 'border-green-500 bg-green-900/10' : 'bg-[#0a0a0a] border-white/5 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/20'}`}>
                    
                    {isAtual && <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg">ATUAL</div>}

                    <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-gray-400 group-hover:text-blue-400 transition-colors">{plano.nome}</h3>
                    <div className="flex items-baseline gap-1 mb-8"><span className="text-sm text-gray-500">R$</span><span className="text-5xl font-black text-white">{plano.preco}</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="text-sm text-gray-300 flex items-center gap-3">✓ Acesso ao Painel</li>
                        {plano.liberaVideo && <li className="text-sm text-white font-bold flex items-center gap-3"><span className="text-purple-400">★</span> Vídeos Liberados</li>}
                        {plano.liberaLayout && <li className="text-sm text-white font-bold flex items-center gap-3"><span className="text-pink-400">★</span> Layout VIP</li>}
                    </ul>
                    <button 
                        onClick={() => !isAtual && gerarPix(plano)} 
                        disabled={loadingId === plano.id || isAtual}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 ${isAtual ? 'bg-transparent border border-green-500/30 text-green-500 cursor-default' : 'bg-white text-black hover:bg-blue-50 hover:scale-[1.02] shadow-lg'}`}
                    >
                        {loadingId === plano.id ? "Gerando..." : isAtual ? "✅ ATIVO" : "ASSINAR AGORA"}
                    </button>
                    </div>
                );
              })}
          </div>
      </div>
      <style jsx global>{` @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-fade-in { animation: fadeIn 0.2s ease-out; } `}</style>
    </div>
  );
}