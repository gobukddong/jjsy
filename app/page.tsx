'use client'

import { useState, useEffect, useRef } from 'react'
import { Home, MessageCircle, Send, LogOut, User as UserIcon, UserCircle, Plus, Edit2, X, Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import ProfileModal from '@/components/profile-modal'
import VideoModal from '@/components/video-modal'
import HeartPhysics, { HeartPhysicsRef } from '@/components/heart-physics'
import { motion, AnimatePresence } from 'framer-motion'

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

type Video = {
  id: string
  youtube_id: string
  title: string
  video_date: string
  thumbnail_url: string
}

export default function Page() {
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string | null, avatar_url: string | null } | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<{ full_name: string | null, avatar_url: string | null } | null>(null)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home')
  const [messages, setMessages] = useState<Message[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [videos, setVideos] = useState<Video[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isPartnerImageOpen, setIsPartnerImageOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [dDay, setDDay] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastActiveTab = useRef(activeTab)
  const heartPhysicsRef = useRef<HeartPhysicsRef>(null)

  // 테마가 변경될 때 모바일 상태표시줄 색상(theme-color meta tag)도 동기화
  useEffect(() => {
    // 1. 기존 메타 태그 싹 다 지워서 Safari의 혼동 방지
    const metaTags = document.querySelectorAll('meta[name="theme-color"]')
    metaTags.forEach(tag => tag.remove())

    // 2. 현재 활성화된 모드 (system 세팅 무시하고 실제 렌더링된 모드 기준)
    const currentTheme = theme === 'system' ? resolvedTheme : theme
    const desiredColor = currentTheme === 'dark' ? '#000000' : '#ffffff'
    
    // 3. 확실한 메타 태그 하나만 다시 생성
    const newMeta = document.createElement('meta')
    newMeta.setAttribute('name', 'theme-color')
    newMeta.setAttribute('content', desiredColor)
    document.head.appendChild(newMeta)
  }, [theme, resolvedTheme])

  // 디데이 계산
  useEffect(() => {
    const start = new Date('2024-02-26T00:00:00')
    const updateDDay = () => {
      const now = new Date()
      const diff = now.getTime() - start.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
      setDDay(days)
    }
    updateDDay()
    // 매분마다 체크해서 날짜가 바뀌면 업데이트 (부드러운 전환을 위해)
    const timer = setInterval(updateDDay, 1000 * 60)
    return () => clearInterval(timer)
  }, [])

  // 로그인 체크 및 정보 로드
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        fetchUserProfile(data.user.id)
        fetchPartnerProfile(data.user.id)
      }
    })
  }, [router])

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single()
    if (data) setUserProfile(data)
  }

  const fetchPartnerProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .neq('id', userId)
      .limit(1)
      .maybeSingle()
    if (data) setPartnerProfile(data)
  }

  // 데이터 로드
  useEffect(() => {
    if (!user) return
    fetchVideos()
    fetchMessages()

    // 메시지 실시간 구독
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

          // 만약 현재 채팅 탭이 아니고, 내가 보낸 메시지가 아니라면 안읽음 카운트 증가
          if (activeTabRef.current !== 'chat' && newMessage.user_id !== data.user.id) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // activeTabRef 업데이트 (구독 콜백에서 최신 값을 참조하기 위함)
  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
    if (activeTab === 'chat') {
      setUnreadCount(0)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'chat') {
      const isInitialEntry = lastActiveTab.current !== 'chat'
      
      const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior })
      }

      if (isInitialEntry) {
        // Initial entry to chat: Use 'auto' behavior to jump to bottom instantly.
        // Multiple timeouts to ensure it settles after the 0.3s tab transition.
        scrollToBottom('auto')
        const t1 = setTimeout(() => scrollToBottom('auto'), 100)
        const t2 = setTimeout(() => scrollToBottom('auto'), 350)
        lastActiveTab.current = 'chat'
        return () => {
          clearTimeout(t1)
          clearTimeout(t2)
        }
      } else {
        // Already in chat, just new messages: Smooth scroll.
        scrollToBottom('smooth')
      }
    } else {
      lastActiveTab.current = activeTab
    }
  }, [messages, activeTab])

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('video_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setVideos(data)
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(*)')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data as Message[])
  }

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Heart Physics Overlay */}
      <HeartPhysics ref={heartPhysicsRef} />

      {/* Top Header: YouTube Style Realignment */}
      <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-300">
        <div className="h-16 flex items-center justify-between px-6">
          <h1 
            onClick={() => heartPhysicsRef.current?.addHeart()}
            className="text-3xl font-[family-name:var(--font-playfair)] italic font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-800 via-zinc-500 to-zinc-400 dark:from-white dark:via-zinc-200 dark:to-zinc-500 cursor-pointer select-none active:scale-95 transition-transform"
          >
            {dDay > 0 ? `D+${dDay}` : 'D-DAY'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400"
              aria-label="테마 변경"
            >
              <div className={`transition-transform duration-500 ease-in-out flex items-center justify-center ${theme === 'dark' ? 'rotate-0' : 'rotate-180'}`}>
                {theme === 'dark' ? <Moon className="w-5 h-5 fill-current" /> : <Sun className="w-5 h-5" />}
              </div>
            </button>

            {/* Add Video Button: Dark/Light Style */}
            <button
              onClick={() => {
                setSelectedVideo(null)
                setIsVideoModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-black text-zinc-900 dark:text-zinc-100 rounded-full font-bold text-sm shadow-xl hover:scale-105 hover:bg-zinc-300 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>

            {/* Partner Profile Icon (Zoomable) */}
            {partnerProfile && (
              <button 
                onClick={() => setIsPartnerImageOpen(true)} 
                className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400 group relative"
                aria-label="상대방 프로필 크게 보기"
              >
                {partnerProfile.avatar_url ? (
                  <img src={partnerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-6 h-6" />
                )}
              </button>
            )}

            <button 
              onClick={() => setIsProfileMenuOpen(true)} 
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 overflow-hidden hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center text-zinc-600 dark:text-zinc-400"
            >
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'home' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'home' ? -20 : 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            {activeTab === 'home' ? (
              // Video Feed
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 relative">
                {videos.map((video) => (
                  <article key={video.id} className="w-full relative group transition-transform duration-300 hover:scale-[1.01] active:scale-[0.98]">
                    {/* Video Player or Thumbnail */}
                    <div className="rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 aspect-video relative shadow-md group-hover:shadow-lg transition-shadow">
                      {playingVideoId === video.id ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
                          allow="autoplay; fullscreen"
                          allowFullScreen
                          className="w-full h-full border-0"
                          title={video.title}
                        />
                      ) : (
                        <div className="relative w-full h-full group">
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-all duration-300"
                            onClick={() => setPlayingVideoId(video.id)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="p-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-zinc-900 dark:text-zinc-100 text-base font-medium line-clamp-2 mb-1">
                          {video.title}
                        </h2>
                        <p className="text-sm text-zinc-500 font-medium">{video.video_date}</p>
                      </div>
                      
                      {/* Edit Button: Moved for Mobile Accessibility */}
                      <button 
                        onClick={() => {
                          setSelectedVideo(video)
                          setIsVideoModalOpen(true)
                        }}
                        className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer flex-shrink-0 mt-0.5"
                        aria-label="영상 정보 수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              // Chat View
              <div className="flex flex-col" style={{ height: 'calc(100vh - 9rem)' }}>
                <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-4 bg-zinc-50 dark:bg-black">
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
                            <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 text-[12px] px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 font-semibold">
                              {currentDate}
                            </div>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start items-start gap-2'}`}>
                          {!isMe && (
                            <div className="w-10 h-10 flex-shrink-0">
                              {!isSameUserAsPrev ? (
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                                  {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
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
                              <span className="text-[13px] text-zinc-700 dark:text-zinc-200 mb-1.5 ml-1 font-semibold">
                                {profile?.full_name || '익명'}
                              </span>
                            )}
                            <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div
                                className={`px-3 py-2 rounded-2xl text-[14.5px] leading-relaxed break-all whitespace-pre-wrap ${
                                  isMe ? 'bg-[#009bcb] dark:bg-[#862633] text-white rounded-tr-none' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent text-zinc-900 dark:text-white rounded-tl-none shadow-sm dark:shadow-none'
                                }`}
                              >
                                {msg.text}
                              </div>
                              {!isSameMinuteAsNext ? (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mb-0.5 font-medium">
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

                {/* Chat Input */}
                <div className="border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black p-4 flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#009bcb] dark:focus:ring-[#862633]"
                  />
                  <button onClick={handleSendMessage} className="bg-[#009bcb] hover:bg-[#007a9e] dark:bg-[#862633] dark:hover:bg-[#6a1d26] transition-colors rounded-lg p-2 cursor-pointer shadow-sm">
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-900/50 pb-safe transition-colors duration-300">
        <div className="h-16 flex items-center justify-around">
          <button onClick={() => setActiveTab('home')} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all cursor-pointer group active:scale-[0.95]">
            <Home className={`w-6 h-6 transition-transform group-active:scale-95 ${activeTab === 'home' ? 'text-[#009bcb] dark:text-[#862633]' : 'text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400'}`} />
          </button>
          <button onClick={() => setActiveTab('chat')} className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all cursor-pointer group active:scale-[0.95]">
            <div className="relative">
              <MessageCircle className={`w-6 h-6 transition-colors ${activeTab === 'chat' ? 'text-[#009bcb] dark:text-[#862633]' : 'text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#ff4d4f] text-white text-[10px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-sm animate-in zoom-in duration-200">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* Profile Menu Dropdown (YouTube Style) */}
      {isProfileMenuOpen && (
        <div 
          className="fixed inset-0 z-[100] flex justify-end p-4 animate-in fade-in duration-200"
          onClick={() => setIsProfileMenuOpen(false)}
        >
          {/* Transparent backdrop for closing */}
          <div className="absolute inset-0 bg-black/20" />
          
          <div 
            className="relative top-12 w-full max-w-[280px] h-fit bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-top-2 duration-200 pointer-events-auto transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info Header */}
            <div className="flex items-start gap-4 p-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex-shrink-0">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-full h-full text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-zinc-900 dark:text-white font-bold truncate text-lg mb-1">{userProfile?.full_name || '사용자'}</div>
                <button 
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    setIsProfileOpen(true)
                  }}
                  className="text-[#009bcb] dark:text-[#862633] text-[13px] font-bold hover:bg-[#009bcb]/10 dark:hover:bg-[#862633]/10 px-0.5 py-0.5 rounded transition-colors cursor-pointer"
                >
                  내 프로필 관리하기
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false)
                  setShowLogoutConfirm(true)
                }}
                className="flex items-center gap-4 w-full p-3 px-5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <span className="text-zinc-700 dark:text-zinc-200 text-sm font-medium">로그아웃</span>
              </button>
              
              <button
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-4 w-full p-3 px-5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left border-t border-zinc-200 dark:border-zinc-800 mt-1 cursor-pointer"
              >
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">닫기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Backdrop */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 z-[110] bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-[32px] p-8 border-t border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom duration-300 pointer-events-auto transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">오우노우</h3>
              <p className="text-zinc-500">로그아웃 할껴?</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold py-4 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                아니오
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-[#009bcb] hover:bg-[#007a9e] dark:bg-[#862633] dark:hover:bg-[#6a1d26] text-white font-bold py-4 rounded-2xl transition-colors cursor-pointer shadow-md"
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isProfileOpen && (
        <ProfileModal
          userId={user.id}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={fetchMessages}
        />
      )}
      {isVideoModalOpen && (
        <VideoModal
          video={selectedVideo}
          onClose={() => {
            setIsVideoModalOpen(false)
            setSelectedVideo(null)
          }}
          onUpdate={fetchVideos}
        />
      )}

      {/* Partner Image Zoom Modal */}
      <AnimatePresence>
        {isPartnerImageOpen && partnerProfile?.avatar_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPartnerImageOpen(false)}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[90vh] w-fit h-fit flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={partnerProfile.avatar_url} 
                alt="Partner Large" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl pointer-events-none"
              />
              <button 
                onClick={() => setIsPartnerImageOpen(false)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

