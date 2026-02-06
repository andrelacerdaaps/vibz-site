"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Forms
  const [novoPlano, setNovoPlano] = useState({ nome: "", preco: "", tipo: "MENSAL", video: false, layout: false });
  const [novoCupom, setNovoCupom] = useState({ codigo: "", desconto: "", tipo: "PORCENTAGEM" });

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    try {
        const res = await fetch("/api/admin/users");
        const json = await res.json();
        setData(json);
        setLoading(false);
    } catch (e) { console.error("Erro ao carregar"); }
  }

  // --- FUNÇÃO: SAIR (MANTIDA) ---
  const sair = () => {
    if(confirm("Tem certeza que deseja sair do Admin?")) {
        localStorage.removeItem("usuarioVibz"); // Limpa a sessão
        router.push("/login"); // Manda pro login
    }
  }

  // --- FUNÇÕES DE AÇÃO ---

  // NOVO: Dar 7 Dias Grátis
  async function darSeteDias(userId: string) {
      if(!confirm("Liberar 7 dias grátis para este cliente?")) return;
      
      const res = await fetch("/api/admin/users", { 
          method: 'PUT', 
          body: JSON.stringify({ acao: 'DAR_TESTE', userId }) 
      });

      if(res.ok) {
          alert("✅ Cliente liberado por 7 dias!");
          carregarDados();
      } else {
          alert("Erro ao liberar (Verifique se atualizou o arquivo da API).");
      }
  }

  async function criarPlano(e: any) {
    e.preventDefault();
    await fetch("/api/admin/users", { method: 'PUT', body: JSON.stringify({ acao: 'CRIAR_PLANO', ...novoPlano }) });
    alert("Plano Criado!");
    carregarDados();
  }

  async function criarCupom(e: any) {
    e.preventDefault();
    await fetch("/api/admin/users", { method: 'PUT', body: JSON.stringify({ acao: 'CRIAR_CUPOM', ...novoCupom }) });
    alert("Cupom Criado!");
    setNovoCupom({ codigo: "", desconto: "", tipo: "PORCENTAGEM" }); 
    carregarDados();
  }

  async function deletarItem(tipo: 'plano' | 'cupom', id: string) {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    const res = await fetch(`/api/admin/users?tipo=${tipo}&id=${id}`, { method: 'DELETE' });
    if(res.ok) {
        carregarDados();
    } else {
        alert("Erro ao excluir. O item pode estar em uso.");
    }
  }

  async function alterarStatus(userId: string, statusAtual: string) {
    const novoStatus = statusAtual === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    await fetch("/api/admin/users", { method: 'PUT', body: JSON.stringify({ acao: 'ALTERAR_STATUS', userId, novoStatus }) });
    carregarDados();
  }

  if (loading) return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">Carregando Admin VIBZ...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#111] border-r border-gray-800 flex flex-col fixed h-full z-10">
        <div className="p-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">VIBZ<span className="text-white text-xs block mt-1 tracking-widest">ADMIN GOD</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'hover:bg-gray-800 text-gray-400'}`}>📊 Visão Geral</button>
          <button onClick={() => setActiveTab("clientes")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === 'clientes' ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'hover:bg-gray-800 text-gray-400'}`}>👥 Clientes</button>
          <button onClick={() => setActiveTab("planos")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === 'planos' ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'hover:bg-gray-800 text-gray-400'}`}>💎 Planos</button>
          <button onClick={() => setActiveTab("cupons")} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === 'cupons' ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'hover:bg-gray-800 text-gray-400'}`}>🏷️ Cupons</button>
        </nav>
        
        {/* BOTÃO DE SAIR */}
        <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-white text-sm text-left p-2 rounded hover:bg-white/5">← Voltar ao Site</button>
            <button onClick={sair} className="text-red-500 hover:text-red-400 text-sm font-bold text-left p-2 rounded hover:bg-red-900/10">🚪 SAIR (Logout)</button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 ml-64 p-10">
        
        {/* --- DASHBOARD (Com Gráficos) --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-bold">Dashboard Financeiro</h2>
            
            {/* Cards Topo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><span className="text-6xl text-green-500">$</span></div>
                <p className="text-gray-400 text-sm">Faturamento Estimado</p>
                <h3 className="text-3xl font-bold text-green-400 mt-2">R$ {data.stats.faturamento.toFixed(2)}</h3>
                <span className="text-xs text-gray-500">Recorrente Mensal</span>
              </div>
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-6xl text-white">@</span></div>
                <p className="text-gray-400 text-sm">Clientes Totais</p>
                <h3 className="text-3xl font-bold text-white mt-2">{data.stats.totalUsuarios}</h3>
              </div>
              
              {/* Alerta de Pendentes (NOVO) */}
              {data.users.some((u: any) => u.statusConta === 'EM_ANALISE') ? (
                 <div className="bg-yellow-900/20 p-6 rounded-2xl border border-yellow-500 animate-pulse relative overflow-hidden">
                    <p className="text-yellow-400 text-sm font-bold">⚠️ APROVAÇÃO PENDENTE</p>
                    <h3 className="text-3xl font-bold text-yellow-200 mt-2">
                        {data.users.filter((u: any) => u.statusConta === 'EM_ANALISE').length} Pedidos
                    </h3>
                 </div>
              ) : (
                 <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-6xl text-blue-500">★</span></div>
                    <p className="text-gray-400 text-sm">Assinantes Ativos</p>
                    <h3 className="text-3xl font-bold text-blue-400 mt-2">{data.stats.ativos}</h3>
                 </div>
              )}

               <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-6xl text-purple-500">%</span></div>
                <p className="text-gray-400 text-sm">Conversão</p>
                <h3 className="text-3xl font-bold text-purple-400 mt-2">
                    {data.stats.totalUsuarios > 0 ? ((data.stats.ativos / data.stats.totalUsuarios) * 100).toFixed(0) : 0}%
                </h3>
              </div>
            </div>

            {/* GRÁFICO VISUAL (Bar Chart CSS) */}
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 📈 Crescimento de Vendas <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Simulado</span>
              </h3>
              <div className="flex items-end justify-between h-64 gap-4 px-4 border-b border-gray-700 pb-2">
                {[30, 45, 25, 60, 75, 40, 80, 95].map((h, i) => (
                  <div key={i} className="w-full relative group">
                     {/* Tooltip */}
                     <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {h}%
                     </div>
                     {/* Barra */}
                    <div className="w-full bg-blue-500/20 rounded-t-lg hover:bg-blue-500/40 transition-all cursor-pointer overflow-hidden" style={{ height: `${h}%` }}>
                      <div className="w-full h-full bg-gradient-to-t from-blue-600 via-purple-600 to-pink-500 opacity-80 rounded-t-lg group-hover:opacity-100"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-gray-500 text-xs uppercase tracking-widest px-4">
                <span>Semana 1</span><span>Semana 2</span><span>Semana 3</span><span>Semana 4</span>
                <span>Semana 5</span><span>Semana 6</span><span>Semana 7</span><span>Atual</span>
              </div>
            </div>
          </div>
        )}

        {/* --- PLANOS --- */}
        {activeTab === "planos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Criar Novo Plano</h3>
              <form onSubmit={criarPlano} className="space-y-4">
                <input required className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none" placeholder="Nome (Ex: Ouro)" onChange={e => setNovoPlano({...novoPlano, nome: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" className="bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none" placeholder="Preço (99.90)" onChange={e => setNovoPlano({...novoPlano, preco: e.target.value})} />
                  <select className="bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none" onChange={e => setNovoPlano({...novoPlano, tipo: e.target.value})}>
                    <option value="MENSAL">Mensal</option><option value="DIARIA">Diária</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300"><input type="checkbox" className="accent-blue-500" onChange={e => setNovoPlano({...novoPlano, video: e.target.checked})} /> Vídeo</label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300"><input type="checkbox" className="accent-blue-500" onChange={e => setNovoPlano({...novoPlano, layout: e.target.checked})} /> Layout</label>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold mt-4 shadow-lg shadow-blue-600/20">SALVAR PLANO</button>
              </form>
            </div>
            <div className="space-y-4">
              {data.planos.map((plano: any) => (
                <div key={plano.id} className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 flex justify-between items-center group hover:border-blue-500/50 transition-colors">
                  <div>
                    <h4 className="font-bold text-lg">{plano.nome}</h4>
                    <p className="text-gray-400 text-sm">R$ {plano.preco} <span className="text-xs bg-gray-700 px-1 rounded">{plano.tipoCobranca}</span></p>
                     <div className="flex gap-2 mt-2">
                        {plano.liberaVideo && <span className="text-[10px] bg-purple-900 text-purple-200 px-2 rounded">VÍDEO</span>}
                        {plano.liberaLayout && <span className="text-[10px] bg-pink-900 text-pink-200 px-2 rounded">LAYOUT</span>}
                     </div>
                  </div>
                  <button onClick={() => deletarItem('plano', plano.id)} className="text-gray-600 hover:text-red-500 hover:bg-red-900/20 p-3 rounded-full transition-all">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CUPONS --- */}
        {activeTab === "cupons" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800">
                    <h3 className="text-xl font-bold mb-4 text-purple-400">Criar Novo Cupom</h3>
                    <form onSubmit={criarCupom} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-sm">Código</label>
                            <input required className="w-full bg-black border border-gray-700 p-3 rounded text-white uppercase focus:border-purple-500 outline-none" 
                                placeholder="EX: VIBZ10" value={novoCupom.codigo}
                                onChange={e => setNovoCupom({...novoCupom, codigo: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm">Desconto</label>
                                <input required type="number" className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none" 
                                    placeholder="10" value={novoCupom.desconto}
                                    onChange={e => setNovoCupom({...novoCupom, desconto: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm">Tipo</label>
                                <select className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-purple-500 outline-none"
                                    onChange={e => setNovoCupom({...novoCupom, tipo: e.target.value})}>
                                    <option value="PORCENTAGEM">% (Porcentagem)</option>
                                    <option value="FIXO">R$ (Reais)</option>
                                </select>
                            </div>
                        </div>
                        <button className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded font-bold mt-4 shadow-lg shadow-purple-600/20">CRIAR CUPOM</button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-300">Cupons Ativos</h3>
                    {data.cupons.length === 0 && <p className="text-gray-500 italic">Nenhum cupom criado ainda.</p>}
                    
                    {data.cupons.map((cupom: any) => (
                        <div key={cupom.id} className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 flex justify-between items-center border-l-4 border-l-purple-500 hover:bg-white/5 transition-all">
                            <div>
                                <h4 className="font-black text-xl tracking-widest text-white">{cupom.codigo}</h4>
                                <p className="text-gray-400 text-sm">
                                    Desconto de {cupom.tipo === 'PORCENTAGEM' ? <span className="text-green-400 font-bold">{cupom.desconto}%</span> : <span className="text-green-400 font-bold">R$ {cupom.desconto}</span>}
                                </p>
                            </div>
                            <button onClick={() => deletarItem('cupom', cupom.id)} className="text-gray-600 hover:text-red-500 hover:bg-red-900/20 p-3 rounded-full transition-all">🗑️</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- CLIENTES (COM BOTÃO DE APROVAÇÃO) --- */}
        {activeTab === "clientes" && (
          <div className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 animate-fade-in shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-[#111] text-gray-400 uppercase text-xs">
                <tr><th className="p-4">Cliente</th><th className="p-4">Plano / Validade</th><th className="p-4">Link TV</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.users.map((user: any) => {
                  // Calcula dias restantes
                  const validade = user.validadePlano ? new Date(user.validadePlano).toLocaleDateString('pt-BR') : null;
                  const dias = user.validadePlano ? Math.ceil((new Date(user.validadePlano).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  
                  // Detecta se está pedindo aprovação
                  const solicitandoTeste = user.statusConta === 'EM_ANALISE';

                  return (
                    <tr key={user.id} className={`transition-colors ${solicitandoTeste ? 'bg-yellow-900/10 hover:bg-yellow-900/20' : 'hover:bg-white/5'}`}>
                      <td className="p-4">
                          <div className="font-bold text-white">{user.nomeEmpresa}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="p-4">
                          {user.plano ? <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded text-xs border border-blue-900">{user.plano.nome}</span> : <span className="text-gray-600 text-xs">-</span>}
                          {validade && (
                                <div className={`text-[10px] mt-1 ${dias > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {dias > 0 ? `Vence em ${dias} dias (${validade})` : `Venceu em ${validade}`}
                                </div>
                          )}
                      </td>
                      <td className="p-4"><a href={`/tv?userId=${user.id}`} target="_blank" className="text-blue-400 hover:text-blue-300 underline text-xs">Abrir TV ↗</a></td>
                      <td className="p-4">
                          {solicitandoTeste ? (
                              <span className="text-yellow-400 text-xs font-bold animate-pulse">⏳ PEDIU TESTE</span>
                          ) : user.statusConta === 'ATIVO' ? (
                              <span className="text-green-400 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> ATIVO</span>
                          ) : (
                              <span className="text-yellow-500 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> PENDENTE</span>
                          )}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                         
                         {/* BOTÃO DE AÇÃO DINÂMICO */}
                         {solicitandoTeste ? (
                             <button 
                                onClick={() => darSeteDias(user.id)} 
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold shadow-lg shadow-green-900/30 animate-pulse transition-transform active:scale-95"
                             >
                                ✅ APROVAR
                             </button>
                         ) : (
                             <>
                                <button 
                                    onClick={() => darSeteDias(user.id)} 
                                    title="Dar 7 Dias Grátis"
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                >
                                    🎁 7 DIAS
                                </button>

                                <button onClick={() => alterarStatus(user.id, user.statusConta)} className={`px-3 py-1 rounded text-xs font-bold transition-transform active:scale-95 ${user.statusConta === 'ATIVO' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>{user.statusConta === 'ATIVO' ? 'BLOQUEAR' : 'LIBERAR'}</button>
                             </>
                         )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>
      
      {/* Estilos Globais de Animação */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}