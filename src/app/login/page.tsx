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
        localStorage.setItem("usuarioVibz", JSON.stringify(data.usuario));
        
        // --- AQUI ESTÁ A CORREÇÃO ---
        
        // 1. Se for ADMIN, vai direto para o Painel Secreto
        if (data.usuario.role === 'ADMIN') {
            router.push("/admin");
            return;
        }

        // 2. Se for Cliente
        if (data.usuario.statusConta === 'ATIVO') {
           router.push("/"); // Cliente pagante
        } else {
           router.push("/planos"); // Cliente caloteiro ou novo
        }
        
      } else {
        setErro(data.erro || "Erro ao entrar.");
      }
    } catch (err) {
      setErro("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">VIBZ LOGIN</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">Entre para gerenciar sua TV.</p>

        {erro && <div className="bg-red-900/30 text-red-400 p-3 rounded mb-4 text-center text-sm border border-red-900">{erro}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">E-mail</label>
            <input 
              type="email" required
              className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none transition-colors mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Senha</label>
            <input 
              type="password" required
              className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none transition-colors mt-1"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>
          
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition-transform active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Verificando..." : "ACESSAR SISTEMA"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          Ainda não tem conta? <Link href="/cadastro" className="text-blue-400 hover:underline">Crie agora</Link>
        </p>
      </div>
    </div>
  );
}