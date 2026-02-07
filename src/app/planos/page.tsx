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
  const [statusPagamento, setStatusPagamento] = useState("AGUARDANDO"); // AGUARDANDO | APROVADO
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const dadosUser = localStorage.getItem("usuarioVibz");
    if (dadosUser) setUsuario(JSON.parse(dadosUser));

    async function carregarPlanos() {
      try {
        const res = await fetch("/api/admin/users");
        const dados = await res.json();
        if (dados.planos) setPlanos(dados.planos);
      } catch (e) {
        console.error("Erro ao carregar planos");
      }
    }
    carregarPlanos();

    // Limpa intervalo ao sair da tela
    return () => pararVerificacao();
  }, []);

  // Função para parar o loop de verificação
  const pararVerificacao = () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  // Função que verifica o status a cada 3 segundos
  const iniciarVerificacao = (paymentId: string) => {
    pararVerificacao(); // Garante que não tem dois loops rodando
    
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamento?id=${paymentId}`);
        const dados = await res.json();

        if (dados.status === "approved") {
          setStatusPagamento("APROVADO");
          pararVerificacao();
          
          // Atualiza o usuario no LocalStorage
          const novoUsuario = {
             ...usuario,
             plano: planoSelecionado?.nome || "VIBZ PRO", // Fallback seguro
             statusConta: "ATIVO",
          };
          localStorage.setItem("usuarioVibz", JSON.stringify(novoUsuario));
          
          setTimeout(() => {
             alert("✅ Pagamento Confirmado! Bem-vindo ao VIBZ.");
             router.push("/");
          }, 1000);
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
      }
    }, 3000); // Roda a cada 3 segundos
  };

  const gerarPix = async (plano: any) => {
    if (!usuario) {
      alert("Faça login primeiro!");
      router.push("/login");
      return;
    }

    setLoadingId(plano.id);
    setPlanoSelecionado(plano);
    setStatusPagamento("AGUARDANDO");

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

      if (res.ok && dados.qr_code && dados.payment_id) {
        setPixData(dados);
        setCopiado(false);
        // Inicia a verificação automática usando o ID do pagamento
        iniciarVerificacao(dados.payment_id);
      } else {
        alert(`Erro: ${dados.erro || "Falha ao gerar PIX"}`);
      }
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setLoadingId(null);
    }
  };

  const copiarCodigo = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const fecharModal = () => {
      pararVerificacao();
      setPixData(null);
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
                 <div className="flex flex-col items-center justify-center py-10 animate-pulse">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-green-500 font-bold text-xl">PAGAMENTO APROVADO!</h3>
                    <p className="text-gray-400 text-sm mt-2">Redirecionando...</p>
                 </div>
              ) : (
                <>
                  <div className="bg-white p-2 rounded-xl mb-6 flex justify-center items-center" style={{ width: "180px", height: "180px" }}>
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
                    
                    {/* Animação de carregamento */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-xs text-green-500 ml-2 animate-pulse">Aguardando pagamento...</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- LISTA DE PLANOS --- */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
          Planos VIBZ.
        </h1>
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {planos.length === 0 && (
          <p className="col-span-3 text-center text-gray-500">Carregando...</p>
        )}

        {planos.map((plano) => {
          const isAtual = usuario?.plano === plano.nome;
          return (
            <div
              key={plano.id}
              className={`group relative p-8 rounded-3xl border transition-all duration-300 flex flex-col ${
                isAtual
                  ? "border-green-500 bg-green-900/10"
                  : "bg-[#0a0a0a] border-white/5 hover:border-blue-500"
              }`}
            >
              {isAtual && (
                <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl">
                  ATUAL
                </div>
              )}
              <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-gray-400">
                {plano.nome}
              </h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-sm text-gray-500">R$</span>
                <span className="text-5xl font-black text-white">{plano.preco}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="text-sm text-gray-300">✓ Acesso ao Painel</li>
                {plano.liberaVideo && <li className="text-sm text-white font-bold">★ Vídeos</li>}
                {plano.liberaLayout && <li className="text-sm text-white font-bold">★ Layout VIP</li>}
              </ul>
              <button
                onClick={() => !isAtual && gerarPix(plano)}
                disabled={loadingId === plano.id || isAtual}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                  isAtual
                    ? "border border-green-500/30 text-green-500 cursor-default"
                    : "bg-white text-black hover:bg-blue-50"
                }`}
              >
                {loadingId === plano.id ? "Gerando..." : isAtual ? "✅ ATIVO" : "ASSINAR AGORA"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}