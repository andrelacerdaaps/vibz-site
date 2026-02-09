"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Planos() {
  const router = useRouter();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);
  const [statusPagamento, setStatusPagamento] = useState("PENDENTE"); // PENDENTE | APROVADO
  
  // Referência para o timer de verificação
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const dadosUser = localStorage.getItem("usuarioVibz");
    if (dadosUser) setUsuario(JSON.parse(dadosUser));

    async function carregarPlanos() {
      try {
        // Tenta buscar na rota pública de planos primeiro, se falhar tenta na admin
        let res = await fetch("/api/planos"); // Rota ideal
        if (!res.ok) {
             res = await fetch("/api/admin/users"); // Rota alternativa (conforme seu código original)
        }
        
        const dados = await res.json();
        
        // Ajuste para pegar a lista independente do formato da resposta (array direto ou objeto com chave planos)
        if (Array.isArray(dados)) {
            setPlanos(dados);
        } else if (dados.planos) {
            setPlanos(dados.planos);
        }
      } catch (e) {
        console.error("Erro ao carregar planos", e);
      }
    }
    carregarPlanos();

    // Limpa a verificação se o usuário sair da tela
    return () => pararVerificacao();
  }, []);

  const pararVerificacao = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const iniciarVerificacao = (idTransacao: string) => {
    pararVerificacao();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamento?id=${idTransacao}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setStatusPagamento("APROVADO");
          pararVerificacao();
          
          // --- ATUALIZA O LOCALSTORAGE COM O NOME CORRETO ---
          const novoUsuario = { 
            ...usuario, 
            planoAtivo: planoSelecionado?.nome, // Salva o NOME, não o ID
            statusConta: "ATIVO" 
          };
          localStorage.setItem("usuarioVibz", JSON.stringify(novoUsuario));
          setUsuario(novoUsuario); // Atualiza o estado local também
          
          setTimeout(() => {
              alert("✅ Pagamento Aprovado! Bem-vindo ao time.");
              router.push("/");
          }, 1500);
        }
      } catch (error) {
        console.error("Tentando verificar pagamento...");
      }
    }, 3000); // Verifica a cada 3 segundos
  };

  const gerarPix = async (plano: any) => {
    if (!usuario) {
      alert("Faça login primeiro!");
      router.push("/login");
      return;
    }

    setLoadingId(plano.id);
    setPlanoSelecionado(plano);
    setStatusPagamento("PENDENTE");

    try {
      const res = await fetch("/api/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: usuario.id,
          planoId: plano.id,
          preco: plano.preco,
          email: usuario.email,
        }),
      });

      const dados = await res.json();

      if (res.ok && dados.qr_code) {
        setPixData(dados);
        setCopiado(false);
        // Inicia o monitoramento automático
        if (dados.id_transacao) iniciarVerificacao(dados.id_transacao);
      } else {
        alert(`Erro: ${dados.erro || "Falha ao comunicar com Mercado Pago"}`);
      }
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setLoadingId(null);
    }
  };

  const fecharModal = () => {
      pararVerificacao();
      setPixData(null);
  };

  const copiarCodigo = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-20 px-4">
      {/* --- MODAL DE PAGAMENTO --- */}
      {pixData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#1a1a1a] w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col items-center">
            
            <div className="w-full bg-[#111] p-4 text-center border-b border-gray-800 relative">
              <h3 className="text-white font-bold text-lg">Pagamento PIX</h3>
              <p className="text-gray-400 text-xs">
                Total: <span className="text-green-400 font-bold text-sm">R$ {planoSelecionado?.preco}</span>
              </p>
              <button
                onClick={fecharModal}
                className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 w-full flex flex-col items-center">
              
              {statusPagamento === "APROVADO" ? (
                 <div className="flex flex-col items-center py-6 animate-pulse">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-green-400 font-bold text-lg">PAGAMENTO APROVADO!</h3>
                    <p className="text-gray-500 text-xs mt-2">Ativando sua conta...</p>
                 </div>
              ) : (
                <>
                  <div
                    className="bg-white p-2 rounded-xl mb-6 flex justify-center items-center"
                    style={{ width: "180px", height: "180px" }}
                  >
                    <img
                      src={`data:image/png;base64,${pixData.qr_code_base64}`}
                      className="w-full h-full object-contain mix-blend-multiply"
                      alt="QR Code"
                    />
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={copiarCodigo}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm ${
                        copiado ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {copiado ? "✓ CÓDIGO COPIADO!" : "📋 COPIAR CÓDIGO PIX"}
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">
                      Cole o código no app do seu banco.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="w-full p-4 bg-[#111] border-t border-gray-800">
               {statusPagamento === "APROVADO" ? (
                  <div className="w-full py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 font-bold text-center text-sm">
                      ✓ SUCESSO
                  </div>
               ) : (
                  <div className="w-full py-3 rounded-xl border border-gray-700 bg-gray-800/30 text-gray-400 font-bold text-center text-xs flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      Aguardando confirmação do banco...
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- LISTA DE PLANOS --- */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Nossos Planos
        </h1>
        <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest font-bold">
            Escolha o nível da sua Vibz TV
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Voltar ao Painel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {planos.length === 0 && (
          <p className="col-span-3 text-center text-gray-500">Buscando as melhores ofertas...</p>
        )}

        {planos.map((plano) => {
          // --- CORREÇÃO AQUI: Comparação Robusta ---
          // Verifica se o planoAtivo do usuário é igual ao ID do plano OU ao NOME do plano
          const isAtual = (usuario?.planoAtivo === plano.id) || (usuario?.planoAtivo === plano.nome);

          const isDiamante = plano.liberaVideo && plano.liberaLayout;
          const isPlatina = plano.liberaVideo && !plano.liberaLayout;

          const estiloCard = isDiamante 
            ? "border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.2)] bg-gradient-to-b from-yellow-900/10 to-black" 
            : isPlatina 
            ? "border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.2)] bg-gradient-to-b from-blue-900/10 to-black"
            : "bg-[#0a0a0a] border-white/5 hover:border-gray-500";

          const corTexto = isDiamante ? "text-yellow-500" : isPlatina ? "text-blue-400" : "text-gray-400";

          return (
            <div
              key={plano.id}
              className={`group relative p-8 rounded-3xl border transition-all duration-500 flex flex-col ${estiloCard} ${isAtual ? 'scale-105 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : ''}`}
            >
              {isAtual && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-black px-4 py-1 rounded-full shadow-lg z-10">
                  PLANO ATUAL
                </div>
              )}
              
              <h3 className={`font-black uppercase tracking-widest text-sm mb-3 ${corTexto}`}>
                {isDiamante ? "💎 " : isPlatina ? "🥈 " : "📦 "} 
                {plano.nome}
              </h3>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm text-gray-500">R$</span>
                <span className="text-5xl font-black text-white">{plano.preco}</span>
                <span className="text-xs text-gray-500">/mês</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-green-500">✓</span> Fotos Ilimitadas
                </li>
                <li className={`text-sm flex items-center gap-2 ${plano.liberaVideo ? 'text-white font-bold' : 'text-gray-600'}`}>
                    {plano.liberaVideo ? <span className="text-green-500">✓</span> : <span className="text-red-900">✕</span>} 
                    Suporte a Vídeos
                </li>
                <li className={`text-sm flex items-center gap-2 ${plano.liberaLayout ? 'text-white font-bold' : 'text-gray-600'}`}>
                    {plano.liberaLayout ? <span className="text-green-500">✓</span> : <span className="text-red-900">✕</span>} 
                    Layout VIP / Temas
                </li>
              </ul>

              <button
                onClick={() => !isAtual && gerarPix(plano)}
                disabled={loadingId === plano.id || isAtual}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  isAtual
                    ? "bg-green-500/10 text-green-500 border border-green-500/20 cursor-default opacity-100" // Opacity 100 para garantir visibilidade
                    : isDiamante
                    ? "bg-yellow-500 text-black hover:bg-yellow-400"
                    : isPlatina
                    ? "bg-blue-500 text-white hover:bg-blue-400"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {loadingId === plano.id ? "⏳ Aguarde..." : isAtual ? "✓ SEU PLANO" : "ATIVAR AGORA"}
              </button>
            </div>
          );
        })}
      </div>
      
      <p className="text-center text-gray-600 text-[10px] mt-12 uppercase tracking-widest">
          Pagamento Seguro via Mercado Pago
      </p>
    </div>
  );
}