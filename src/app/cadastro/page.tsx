"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Cadastro() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1); // 1 = Cadastro, 2 = Verificação
  const [form, setForm] = useState({ nomeEmpresa: "", email: "", senha: "" });
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");

  // ETAPA 1: CRIAR A CONTA E GERAR CÓDIGO
  const criarConta = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const resposta = await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      setUserId(dados.id);
      setEtapa(2); // Pula para a etapa do código
      alert("Código de verificação enviado para o seu e-mail! (Simulado)");
    } else {
      alert("Erro: " + (dados.erro || "E-mail já existe ou falha no sistema."));
    }
    setLoading(false);
  };

  // ETAPA 2: VALIDAR O CÓDIGO DE 4 DÍGITOS
  const validarCodigo = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const resposta = await fetch("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ userId, codigo: codigoDigitado }),
    });

    if (resposta.ok) {
      alert("E-mail verificado com sucesso! 🚀");
      router.push("/login"); // Manda para o login para ele entrar com a conta validada
    } else {
      alert("Código incorreto. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl">
        <h2 className="text-4xl font-black text-center text-blue-600 mb-2 tracking-tighter">VIBZ</h2>
        
        {etapa === 1 ? (
          <>
            <p className="text-center text-gray-500 mb-8 uppercase text-xs font-bold tracking-widest">Crie sua conta profissional</p>
            <form onSubmit={criarConta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Empresa / Evento</label>
                <input 
                  required
                  className="w-full border border-gray-200 rounded-xl p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: Arena Porto"
                  onChange={(e) => setForm({...form, nomeEmpresa: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                <input 
                  required
                  type="email"
                  className="w-full border border-gray-200 rounded-xl p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="seu@email.com"
                  onChange={(e) => setForm({...form, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha de Acesso</label>
                <input 
                  required
                  type="password"
                  className="w-full border border-gray-200 rounded-xl p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="******"
                  onChange={(e) => setForm({...form, senha: e.target.value})}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                {loading ? "PROCESSANDO..." : "CRIAR MINHA CONTA"}
              </button>
            </form>
          </>
        ) : (
          /* TELA DO CÓDIGO DE 4 DÍGITOS */
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📧</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h3>
            <p className="text-gray-500 text-sm mb-8">Digitamos o código de 4 dígitos enviado para <br/><strong>{form.email}</strong></p>
            
            <form onSubmit={validarCodigo} className="space-y-6">
              <input 
                required
                type="text"
                maxLength={4}
                className="w-40 text-center text-4xl font-black tracking-[15px] border-b-4 border-blue-600 p-2 outline-none text-black"
                placeholder="0000"
                onChange={(e) => setCodigoDigitado(e.target.value)}
              />
              
              <button 
                disabled={loading || codigoDigitado.length < 4}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-lg transition-all"
              >
                {loading ? "VALIDANDO..." : "CONFIRMAR CÓDIGO"}
              </button>
              
              <button type="button" onClick={() => setEtapa(1)} className="text-sm text-gray-400 font-bold hover:text-gray-600">Voltar e corrigir e-mail</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}