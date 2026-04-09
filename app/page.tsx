'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, MessageCircle, Send, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

const videos = [
  {
    id: 'M1XWaf28UHg',
    title: '포디',
    date: '2025. 09. 12',
    thumbnail: 'https://i.ytimg.com/vi/M1XWaf28UHg/hqdefault.jpg'
  },
  {
    id: 'T7T3-iu-EXM',
    title: '케이키만들기',
    date: '2025. 12. 28',
    thumbnail: 'https://i.ytimg.com/vi/T7T3-iu-EXM/hqdefault.jpg'
  },
  {
    id: 'RJ0Q81EAgNM',
    title: '청계천',
    date: '2025. 09. 26',
    thumbnail: 'https://i.ytimg.com/vi/RJ0Q81EAgNM/hqdefault.jpg'
  },
  {
    id: 'o2_QPs4pfso',
    title: '찜질방',
    date: '2024. 11. 30',
    thumbnail: 'https://i.ytimg.com/vi/o2_QPs4pfso/hqdefault.jpg'
  },
  {
    id: 'Ssox6VAuTEM',
    title: 'Ssing 기술 시연',
    date: '2025. 10. 09',
    thumbnail: 'https://i.ytimg.com/vi/Ssox6VAuTEM/hqdefault.jpg'
  },
  {
    id: 'Wtqp8L60TXw',
    title: '카페 브이로그',
    date: '2024. 11. 23',
    thumbnail: 'https://i.ytimg.com/vi/Wtqp8L60TXw/hqdefault.jpg'
  },
  {
    id: 'xP_0qVws0_k',
    title: '남산타워',
    date: '2025. 01. 01',
    thumbnail: 'https://i.ytimg.com/vi/xP_0qVws0_k/hqdefault.jpg'
  },
  {
    id: 'uU4ed-FiVCU',
    title: '오늘만 i love you',
    date: '2025. 07. 27',
    thumbnail: 'https://i.ytimg.com/vi/uU4ed-FiVCU/hqdefault.jpg'
  },
  {
    id: 'w7JKtf3KeSU',
    title: '덴지진주',
    date: '2025. 10. 24',
    thumbnail: 'https://i.ytimg.com/vi/w7JKtf3KeSU/hqdefault.jpg'
  },
]

type Message = {
  id: string
  user_id: string
  text: string
  created_at: string
}

export default function Page() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 로그인 체크
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
  }, [router])

  // 메시지 로드 + 실시간 구독
  useEffect(() => {
    if (!user) return

    // 기존 메시지 로드
    supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data as Message[]) })

    // 실시간 구독
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // 이미 내 리스트에 있는 메시지(ID가 같은 경우)는 무시
            if (prev.find((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // 새 메시지 오면 스크롤 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return
    const text = inputValue
    const tempId = `temp-${Date.now()}`
    setInputValue('')

    // 1. 낙관적 업데이트: 내 화면에 먼저 표시
    const optimisticMsg: Message = {
      id: tempId,
      user_id: user.id,
      text: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    // 2. 서버에 저장
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: user.id, text })
      .select()
      .single()

    if (error) {
      console.error('전송 실패:', error)
      // 실패 시 목록에서 제거
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } else if (data) {
      // 3. 성공 시 임시 메시지를 서버에서 받은 진짜 데이터로 교체
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data as Message) : m))
      )
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="w-8" />
          <h1 className="text-lg font-semibold text-white">진주와상윤</h1>
          <button onClick={handleLogout} aria-label="로그아웃">
            <LogOut className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14 pb-20">
        {activeTab === 'home' ? (
          // Video Feed
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {videos.map((video) => (
              <article key={video.id} className="w-full">
                {/* Video Player or Thumbnail */}
                <div className="rounded-xl overflow-hidden">
                  {playingVideoId === video.id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="w-full aspect-video border-0"
                      title={video.title}
                    />
                  ) : (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPlayingVideoId(video.id)}
                    />
                  )}
                </div>

                {/* Video Info */}
                <div className="p-3">
                  <h2 className="text-white text-base font-medium line-clamp-2 mb-1">
                    {video.title}
                  </h2>
                  <p className="text-sm text-gray-400">{video.date}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          // Chat View
          <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
              {messages.map((msg) => {
                const isMe = msg.user_id === user.id
                let nickname = ''
                
                if (isMe) {
                  nickname = user.email === 's@s.com' ? 'sangyun' : 'jinjoo'
                } else {
                  nickname = user.email === 's@s.com' ? 'jinjoo' : 'sangyun'
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-zinc-500 mb-1 px-1">
                      {nickname}
                    </span>
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-[#862633] text-white rounded-tr-none'
                          : 'bg-zinc-800 text-white rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-zinc-900 p-4 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage()
                }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-zinc-900 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#862633]"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#862633] hover:bg-[#6a1d26] transition-colors rounded-lg p-2"
                aria-label="전송"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 bg-zinc-950 border-t border-zinc-900 pb-safe">
        <div className="h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            aria-label="홈"
          >
            <Home
              className="w-6 h-6"
              style={{ color: activeTab === 'home' ? '#862633' : '#71717a' }}
            />
            <span
              className="text-xs"
              style={{ color: activeTab === 'home' ? '#862633' : '#71717a' }}
            >
              홈
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            aria-label="채팅"
          >
            <MessageCircle
              className="w-6 h-6"
              style={{ color: activeTab === 'chat' ? '#862633' : '#71717a' }}
            />
            <span
              className="text-xs"
              style={{ color: activeTab === 'chat' ? '#862633' : '#71717a' }}
            >
              채팅
            </span>
          </button>
        </div>
      </nav>
    </div>
  )
}
