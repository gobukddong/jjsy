'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 아이디 -> 이메일 자동 변환
    let loginEmail = email
    if (email === 'jinjoo') loginEmail = 'j@j.com'
    if (email === 'sangyun') loginEmail = 's@s.com'

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-[#050505] transition-colors duration-500">
      
      {/* 1. Animated Glowing Orbs (Geometric Blobs) */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] min-w-[500px] min-h-[500px] bg-gradient-to-br from-[#009bcb]/20 to-cyan-400/20 dark:from-[#009bcb]/30 dark:to-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-80" 
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, -45, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[400px] min-h-[400px] bg-gradient-to-tl from-rose-400/20 to-orange-400/20 dark:from-[#862633]/30 dark:to-rose-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-80" 
      />

      {/* 2. Premium Geometric Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none text-zinc-900 dark:text-white"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 100%)'
        }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-[360px] z-10 px-4"
      >
        {/* Glassmorphism Panel */}
        <div className="glass-panel p-8 rounded-[2rem]">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-zinc-900 dark:text-white text-3xl font-[family-name:var(--font-outfit)] font-extrabold tracking-tight text-center drop-shadow-sm">
              로그인
            </h1>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input
                id="email"
                type="text"
                placeholder="아이디"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/40 dark:bg-black/30 placeholder:text-zinc-500 dark:placeholder:text-white/40 text-zinc-900 dark:text-white border border-white/40 dark:border-white/10 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#862633]/50 focus:border-transparent focus:bg-white/60 dark:focus:bg-black/50 transition-all font-medium backdrop-blur-sm"
                required
              />
            </div>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/40 dark:bg-black/30 placeholder:text-zinc-500 dark:placeholder:text-white/40 text-zinc-900 dark:text-white border border-white/40 dark:border-white/10 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#862633]/50 focus:border-transparent focus:bg-white/60 dark:focus:bg-black/50 transition-all font-medium backdrop-blur-sm"
                required
              />
            </div>
            {error && (
              <p className="text-red-500/90 dark:text-red-400/90 bg-red-100/50 dark:bg-red-900/20 px-3 py-2 rounded-lg text-[13px] text-center font-bold border border-red-200/50 dark:border-red-500/20 backdrop-blur-md">
                {error}
              </p>
            )}
            
            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="mt-2 relative overflow-hidden bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-[#3a1c3f] dark:to-[#5e2b4f] hover:from-black hover:to-zinc-800 dark:hover:from-[#4a2452] dark:hover:to-[#763663] disabled:opacity-70 text-white rounded-xl py-3.5 font-bold tracking-wide transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_0_rgba(134,38,51,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_20px_rgba(134,38,51,0.4)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? '들어가는 중...' : '또리링~'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
