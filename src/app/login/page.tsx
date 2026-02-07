"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();

      if (res.ok) {
        // Salva os dados completos (incluindo o planoAtivo que criamos)
        localStorage.setItem("usuarioVibz", JSON.stringify(data.usuario));
        
        // 1. Se for ADMIN, vai direto para o Painel Secreto
        if (data.usuario.role === 'ADMIN') {
            router.push("/admin");
            return;
        }

        // 2. Se for Cliente
        if (data.usuario.statusConta === 'ATIVO') {
           router.push("/"); // Cliente pagante
        } else {
           router.push("/planos"); // Novo ou Inativo
        }
        
      } else {
        setErro(data.erro || "E-mail ou senha incorretos.");
      }
    } catch (err) {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Fundo Preto Total para combinar com a Vibz TV
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans">
      
      {/* Card de Login com Borda Metálica */}
      <div className="w-full max-w-md bg-[#0a0a0a] p-10 rounded-[32px] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* Detalhe de Brilho no Topo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 blur-[100px]"></div>
        
        <div className="relative z-10 text-center mb-10">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-tighter">
            VIBZ LOGIN
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium uppercase tracking-widest">
            Acesse sua TV Corporativa
          </p>
        </div>

        {erro && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-6 text-center text-xs font-bold border border-red-500/20 animate-shake">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">E-mail de Acesso</label>
            <input 
              type="email" 
              required
              placeholder="exemplo@email.com"
              className="w-full bg-black border border-white/5 p-4 rounded-2xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-800"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Sua Senha</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full bg-black border border-white/5 p-4 rounded-2xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-800"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>
          
          <button 
            disabled={loading}
            className="w-full bg-white text-black hover:bg-blue-50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5 mt-4"
          >
            {loading ? "Autenticando..." : "ACESSAR SISTEMA"}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-500 text-xs font-medium">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-blue-400 hover:text-blue-300 font-bold underline-offset-4 hover:underline">
              Crie agora
            </Link>
          </p>
        </div>
      </div>
      
      {/* Estilo para a animação de erro */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}