'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold text-center mb-8">로그인</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            id="email"
            type="text"
            placeholder="아이디"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#862633]"
            required
          />
          <input
            id="password"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-zinc-900 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#862633]"
            required
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            className="bg-[#862633] hover:bg-[#6a1d26] disabled:opacity-50 text-white rounded-lg py-3 font-medium transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
