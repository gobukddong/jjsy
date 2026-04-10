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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ffecd2] to-[#fcb69f] dark:from-[#2e1437] dark:via-[#141526] dark:to-[#172552] animate-gradient-x transition-colors duration-500">
      {/* Floating Orbs for Magical Aura */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute top-[20%] left-[10%] w-72 h-72 bg-rose-400/30 dark:bg-purple-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] animate-pulse" 
        style={{ animationDuration: '4s' }} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
        className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-orange-300/30 dark:bg-pink-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] animate-pulse" 
        style={{ animationDuration: '7s' }} 
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
            <h1 className="text-zinc-800 dark:text-white text-3xl font-[family-name:var(--font-cormorant)] italic font-bold tracking-wider text-center">
              Our Private Space
            </h1>
            <p className="text-zinc-600 dark:text-white/60 text-sm mt-1 font-medium tracking-wide">
              jinjoo & sangyun
            </p>
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
