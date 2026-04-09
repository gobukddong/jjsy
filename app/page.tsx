'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, MessageCircle, Send, LogOut, User as UserIcon, UserCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import ProfileModal from '@/components/profile-modal'

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
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  }
}

export default function Page() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
  }, [router])

  useEffect(() => {
    if (!user) return

    supabase
      .from('messages')
      .select('*, profiles(*)')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data as Message[]) })

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as Message
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.user_id)
            .single()
          
          const messageWithProfile = { ...newMessage, profiles: profile }

          setMessages((prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev
            return [...prev, messageWithProfile]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return
    const text = inputValue
    const tempId = `temp-${Date.now()}`
    setInputValue('')

    const optimisticMsg: Message = {
      id: tempId,
      user_id: user.id,
      text: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    const { data: insertedData, error } = await supabase
      .from('messages')
      .insert({ user_id: user.id, text })
      .select('*, profiles(*)')
      .single()

    if (error) {
      console.error('전송 실패:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } else if (insertedData) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (insertedData as Message) : m))
      )
    }
  }

  const refreshMessages = () => {
    supabase
      .from('messages')
      .select('*, profiles(*)')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data as Message[]) })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900">
        <div className="h-14 flex items-center justify-between px-4">
          <button onClick={() => setIsProfileOpen(true)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer" aria-label="프로필 설정">
            <UserCircle className="w-6 h-6 text-zinc-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">진주 & 상윤</h1>
          <button onClick={handleLogout} className="p-2 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer" aria-label="로그아웃">
            <LogOut className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      <main className="pt-14 pb-20">
        {activeTab === 'home' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {videos.map((video) => (
              <article key={video.id} className="w-full">
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
          <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-4 bg-black">
              {messages.map((msg, index) => {
                const isMe = msg.user_id === user.id
                const profile = msg.profiles
                
                const currentDate = new Date(msg.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
                })
                const prevDate = index > 0 
                  ? new Date(messages[index - 1].created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
                    })
                  : null
                const showDateHeader = currentDate !== prevDate

                const isSameUserAsPrev = index > 0 && messages[index - 1].user_id === msg.user_id && !showDateHeader
                const nextMsg = messages[index + 1]
                const isSameUserAsNext = nextMsg && nextMsg.user_id === msg.user_id
                
                const currentMsgTime = new Date(msg.created_at).setSeconds(0, 0)
                const nextMsgTime = nextMsg ? new Date(nextMsg.created_at).setSeconds(0, 0) : null
                const isSameMinuteAsNext = isSameUserAsNext && currentMsgTime === nextMsgTime

                const timeStr = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                  hour: '2-digit', minute: '2-digit', hour12: true,
                })

                return (
                  <div key={msg.id} className={`flex flex-col ${isSameUserAsPrev ? 'mt-1' : 'mt-4'}`}>
                    {showDateHeader && (
                      <div className="flex justify-center my-6">
                        <div className="bg-zinc-800 text-zinc-200 text-[12px] px-4 py-1.5 rounded-full border border-zinc-700 font-semibold">
                          {currentDate}
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start items-start gap-2'}`}>
                      {!isMe && (
                        <div className="w-10 h-10 flex-shrink-0">
                          {!isSameUserAsPrev ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <UserIcon className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-10" />
                          )}
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {!isMe && !isSameUserAsPrev && (
                          <span className="text-[13px] text-zinc-200 mb-1.5 ml-1 font-semibold">
                            {profile?.full_name || '익명'}
                          </span>
                        )}
                        <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-[14.5px] leading-relaxed break-all whitespace-pre-wrap ${
                              isMe ? 'bg-[#862633] text-white rounded-tr-none' : 'bg-zinc-800 text-white rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                          {!isSameMinuteAsNext ? (
                            <span className="text-[11px] text-zinc-400 whitespace-nowrap mb-0.5 font-medium">
                              {timeStr}
                            </span>
                          ) : (
                            <div className="w-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-zinc-900 p-4 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-zinc-900 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#862633]"
              />
              <button onClick={handleSendMessage} className="bg-[#862633] hover:bg-[#6a1d26] transition-colors rounded-lg p-2">
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full z-50 bg-zinc-950 border-t border-zinc-900 pb-safe">
        <div className="h-16 flex items-center justify-around">
          <button onClick={() => setActiveTab('home')} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors cursor-pointer">
            <Home className="w-6 h-6" style={{ color: activeTab === 'home' ? '#862633' : '#71717a' }} />
            <span className="text-xs" style={{ color: activeTab === 'home' ? '#862633' : '#71717a' }}>홈</span>
          </button>
          <button onClick={() => setActiveTab('chat')} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors cursor-pointer">
            <MessageCircle className="w-6 h-6" style={{ color: activeTab === 'chat' ? '#862633' : '#71717a' }} />
            <span className="text-xs" style={{ color: activeTab === 'chat' ? '#862633' : '#71717a' }}>채팅</span>
          </button>
        </div>
      </nav>
      {isProfileOpen && (
        <ProfileModal
          userId={user.id}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={refreshMessages}
        />
      )}
    </div>
  )
}
