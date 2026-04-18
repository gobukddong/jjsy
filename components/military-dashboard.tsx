'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User as UserIcon, Camera, Loader2, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface MilitaryDashboardProps {
  userId: string
}

// Hardcoded dates for calculation
const START_DATE = new Date('2026-04-20T00:00:00')
const END_DATE = new Date('2027-10-19T00:00:00')

const PROMOTIONS = [
  { name: '이병', date: new Date('2026-04-20T00:00:00') },
  { name: '일병', date: new Date('2026-07-01T00:00:00') },
  { name: '상병', date: new Date('2027-01-01T00:00:00') },
  { name: '병장', date: new Date('2027-07-01T00:00:00') },
  { name: '전역', date: new Date('2027-10-19T00:00:00') },
]

export default function MilitaryDashboard({ userId }: MilitaryDashboardProps) {
  const [now, setNow] = useState(new Date())
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState('양상윤')
  const [isEditingName, setIsEditingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // DB에서 군인 정보 불러오기
    const fetchInfo = async () => {
      if (!userId || userId === 'mock-user') return
      const { data, error } = await supabase.from('military_info').select('photo_url, partner_name').eq('user_id', userId).maybeSingle()
      
      if (error) {
        console.error("Supabase Fetch Error:", error)
      }
      
      if (data) {
        if (data.photo_url) setPhotoUrl(data.photo_url)
        if (data.partner_name) setPartnerName(data.partner_name)
      }
    }
    fetchInfo()

    // 시간에 따른 애니메이션 렌더링 유지
    const timer = setInterval(() => setNow(new Date()), 50)
    return () => clearInterval(timer)
  }, [userId])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditingName])

  // Time calculations
  const currentMs = now.getTime() - START_DATE.getTime()
  
  const isBeforeEnlistment = now < START_DATE
  const isAfterDischarge = now > END_DATE
  
  // 고정 복무일: 548일
  const totalDays = 548
  const daysToEnlistment = Math.max(0, Math.ceil((START_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  // 복무일 계산 (입대일이 1일차)
  const currentDays = isBeforeEnlistment ? 0 : Math.min(totalDays, Math.floor(currentMs / (1000 * 60 * 60 * 24)) + 1)
  const remainingDays = isBeforeEnlistment ? totalDays : Math.max(0, totalDays - currentDays)

  // 548일 기준 퍼센트율 계산
  const totalMsFixed = totalDays * 24 * 60 * 60 * 1000
  const progressTotal = isBeforeEnlistment ? 0 : Math.max(0, Math.min(100, (currentMs / totalMsFixed) * 100))

  // Find Current Rank & Next Rank
  let currentRankIdx = 0
  for (let i = 0; i < PROMOTIONS.length; i++) {
    if (now >= PROMOTIONS[i].date) {
      currentRankIdx = i
    }
  }
  
  const currentRank = PROMOTIONS[currentRankIdx]
  const nextRank = currentRankIdx < PROMOTIONS.length - 1 ? PROMOTIONS[currentRankIdx + 1] : null

  // Next Rank Progress
  let rankProgress = 100
  let nextRankDays = 0
  if (nextRank) {
    const rankTotalMs = nextRank.date.getTime() - currentRank.date.getTime()
    const rankCurrentMs = now.getTime() - currentRank.date.getTime()
    rankProgress = Math.max(0, Math.min(100, (rankCurrentMs / rankTotalMs) * 100))
    nextRankDays = Math.max(0, Math.ceil((nextRank.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  // Next Hobong Phase (Hobong increases strictly on the 1st of every month)
  let currentHobong = 1
  let prevHobongDate = new Date(currentRank.date)
  let nextHobongDate = new Date(currentRank.date)

  if (now > START_DATE && now < END_DATE) {
    const monthsSinceRank = (now.getFullYear() - currentRank.date.getFullYear()) * 12 + now.getMonth() - currentRank.date.getMonth()
    currentHobong = monthsSinceRank + 1
    
    // Previous hobong boundary is the 1st of the current month, or the rank start date if it's the very first month
    prevHobongDate = new Date(Math.max(currentRank.date.getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()))
    
    // Next hobong boundary is the 1st of the next month
    nextHobongDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    
    if (nextRank && nextHobongDate.getTime() >= nextRank.date.getTime()) {
      nextHobongDate = nextRank.date
    }
  }

  // Avoid division by zero strictly just in case
  const hobongTotalMs = Math.max(1, nextHobongDate.getTime() - prevHobongDate.getTime())
  const hobongCurrentMs = now.getTime() - prevHobongDate.getTime()
  const hobongProgress = isBeforeEnlistment ? 0 : Math.max(0, Math.min(100, (hobongCurrentMs / hobongTotalMs) * 100))

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, '')
  }

  const formatMonthDay = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Calculate year/month/day remaining string
  const getRemainingYMD = () => {
    if (isBeforeEnlistment) return `입대까지 ${daysToEnlistment}일 남았습니다`
    if (isAfterDischarge) return '전역을 축하합니다!'
    const y = Math.floor(remainingDays / 365)
    let rem = remainingDays % 365
    // Simplified month count for rough UI display
    const m = Math.floor(rem / 30)
    const d = rem % 30
    let str = ''
    if (y > 0) str += `${y}년 `
    if (m > 0) str += `${m}개월 `
    if (d > 0) str += `${d}일 `
    return str + '남았습니다'
  }

  const displayRankName = isBeforeEnlistment ? '민간인' : (isAfterDischarge ? '예비역' : currentRank.name)
  const displayHobong = isBeforeEnlistment ? '' : `${currentHobong}호봉`
  const topBannerDDay = isBeforeEnlistment ? `입대 D-${daysToEnlistment}` : `전역 D-${remainingDays}`

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `military-${userId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // 기존 프로필 사진 저장에 사용되는 avatars 버킷을 그대로 재사용합니다
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setPhotoUrl(publicUrl)

      // DB에 사진 URL 저장/업데이트
      await supabase.from('military_info').upsert({
        user_id: userId,
        photo_url: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    } catch (error) {
      console.error('Error uploading military photo:', error)
      alert('사진 업로드 중 오류가 발생했습니다!')
    } finally {
      setUploading(false)
    }
  }

  async function handleNameSave() {
    setIsEditingName(false)
    const finalName = partnerName.trim() || '내 군인'
    setPartnerName(finalName)

    try {
      if (userId && userId !== 'mock-user') {
        const { error } = await supabase.from('military_info').upsert({
          user_id: userId,
          partner_name: finalName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        
        if (error) {
          console.error("Supabase Save Error:", error)
          alert(`이름 저장에 실패했습니다. (Supabase 에러: ${error.message}) SQL 명령어(add column partner_name)를 실행하셨는지 확인해 주세요!`)
        }
      }
    } catch (error) {
      console.error('Error updating name:', error)
      alert('오류가 발생했습니다.')
    }
  }

  return (
    <div className="w-full bg-white dark:bg-[#111] min-h-full pb-24 selection:bg-[#62A18D]/30">
      
      {/* Top Profile Section */}
      <div className="px-6 py-10 flex items-center gap-6">
        {/* Avatar Upload Sector */}
        <div className="relative group flex-shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-sm outline outline-1 outline-zinc-200 dark:outline-zinc-700">
            {photoUrl ? (
              <img src={photoUrl} alt="Military Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <UserIcon className="w-12 h-12 text-zinc-400 dark:text-zinc-600" />
            )}
          </div>
          
          <label className="absolute bottom-1 right-1 p-2 bg-gradient-to-r from-[#009bcb] to-purple-500 dark:from-[#862633] dark:to-orange-500 text-white rounded-full cursor-pointer transition-transform shadow-lg active:scale-90 border border-white/20">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <input type="file" className="hidden" accept="image/*" onChange={uploadPhoto} disabled={uploading} />
          </label>
        </div>
        
        {/* Profile Info */}
        <div className="flex flex-col gap-1.5 flex-1 w-full min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-medium text-zinc-600 dark:text-zinc-400 tracking-tight flex-shrink-0">{displayRankName}</span>
            {isEditingName ? (
              <input 
                ref={nameInputRef}
                type="text" 
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave() }}
                className="w-full max-w-[140px] bg-transparent border-b-2 border-zinc-900 dark:border-white outline-none tracking-tight text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white"
                placeholder="별명 입력"
              />
            ) : (
              <h2 
                onClick={() => setIsEditingName(true)} 
                className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate cursor-pointer hover:opacity-70 transition-opacity"
              >
                {partnerName}
              </h2>
            )}
            <button 
              onClick={() => isEditingName ? handleNameSave() : setIsEditingName(true)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-full transition-colors ml-[-4px]"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-2 flex flex-col gap-1">
            <div className="flex gap-3"><span className="w-8 flex-shrink-0">입대</span> <span className="text-zinc-900 dark:text-zinc-200">{formatDate(START_DATE)}</span></div>
            <div className="flex gap-3"><span className="w-8 flex-shrink-0">전역</span> <span className="text-zinc-900 dark:text-zinc-200">{formatDate(END_DATE)}</span></div>
          </div>
          <div className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300 mt-2 tracking-tight">
            {getRemainingYMD()}
          </div>
        </div>
      </div>

      {/* Main Card Dashboard Section */}
      <div className="px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#009bcb]/15 to-purple-500/15 dark:from-[#862633]/25 dark:to-orange-500/25 backdrop-blur-lg rounded-t-[20px] sm:rounded-t-2xl flex justify-between px-5 sm:px-6 py-4 items-center border border-zinc-200/60 dark:border-zinc-700/60 border-b-0 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-900 dark:text-white font-bold text-[17px] sm:text-[19px] relative z-10 transition-colors tracking-tight">
            <Calendar className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] opacity-80" />
            <span>{topBannerDDay}</span>
          </div>
          <div className="text-zinc-700 dark:text-zinc-200 font-bold text-[15px] sm:text-[17px] flex items-center gap-2 sm:gap-3 relative z-10 transition-colors tracking-tight">
            <span className="w-3 sm:w-4 h-[2px] bg-zinc-300 dark:bg-zinc-600 block"></span>
            {displayRankName} {displayHobong}
          </div>
        </div>
        
        {/* Middle Main Progress Area */}
        <div className="bg-gradient-to-br from-[#009bcb]/[0.04] to-purple-500/[0.04] dark:from-[#862633]/10 dark:to-orange-500/10 backdrop-blur-xl rounded-b-[20px] sm:rounded-b-2xl p-5 sm:p-6 space-y-7 pb-8 border border-zinc-200/60 dark:border-zinc-700/60 shadow-lg relative overflow-hidden">
          
          {/* Total Progress */}
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-2.5">
              <div className="text-zinc-900 dark:text-white font-bold text-lg flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity tracking-tight">
                전역 <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-1">❯</span>
              </div>
              <div className="text-zinc-500 dark:text-zinc-400 text-[15px] font-medium tracking-wide">
                {formatMonthDay(END_DATE)}
              </div>
            </div>
            {/* Progress Bar with Liquid Animation */}
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden mb-2 flex shadow-inner cursor-pointer"
              onClick={() => { if(navigator.vibrate) navigator.vibrate(10) }}
            >
              <motion.div 
                className="h-full bg-gradient-to-r from-[#009bcb] via-[#4fd1f5] to-[#009bcb] dark:from-[#862633] dark:via-[#e64500] dark:to-[#862633] animate-liquid rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressTotal}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </motion.div>
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-[#009bcb] to-purple-500 dark:from-[#862633] dark:to-orange-500 text-[16px] font-[family-name:var(--font-space-mono)] font-bold tracking-tight">
              {progressTotal.toFixed(7)}%
            </div>
          </div>

          <div className="w-full h-[1px] bg-zinc-200/50 dark:bg-zinc-800/50 relative z-10" />

          {/* Sub Progresses */}
          <div className="grid grid-cols-2 gap-x-6 relative z-10">
            
            {/* Next Hobong */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="text-zinc-800 dark:text-zinc-200 font-bold text-[15px] tracking-tight">다음 호봉</div>
                <div className="text-right">
                  {!isBeforeEnlistment ? (
                    <>
                      <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mb-0.5 tracking-wider">{formatDate(nextHobongDate)}</div>
                      <div className="text-zinc-800 dark:text-zinc-200 text-[13px] font-semibold">{currentRank.name} {currentHobong + 1}호봉</div>
                    </>
                  ) : (
                    <>
                      <div className="opacity-0 pointer-events-none text-[11px] mb-0.5">-</div>
                      <div className="text-zinc-800 dark:text-zinc-200 text-[13px] font-semibold">입대 후 계산</div>
                    </>
                  )}
                </div>
              </div>
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => { if(navigator.vibrate) navigator.vibrate(5) }}
                className="h-2 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden mb-1.5 flex shadow-inner cursor-pointer"
              >
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#009bcb] via-[#75e9ff] to-[#009bcb] dark:from-[#862633] dark:via-[#ff7c42] dark:to-[#862633] animate-liquid rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${isBeforeEnlistment ? 0 : hobongProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </motion.div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[13px] font-[family-name:var(--font-space-mono)] font-semibold mt-1.5 tracking-tight">
                {isBeforeEnlistment ? '0.00000%' : `${hobongProgress.toFixed(5)}%`}
              </div>
            </div>

            {/* Next Rank */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="text-zinc-800 dark:text-zinc-200 font-bold text-[15px] tracking-tight">다음 계급</div>
                <div className="text-right">
                  {!isBeforeEnlistment ? (
                    nextRank ? (
                      <>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mb-0.5 tracking-wider">{formatDate(nextRank.date)}</div>
                        <div className="text-zinc-800 dark:text-zinc-200 text-[13px] font-semibold">{nextRank.name}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mb-0.5 tracking-wider">-</div>
                        <div className="text-zinc-800 dark:text-zinc-200 text-[13px] font-semibold">최고 계급</div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mb-0.5 tracking-wider">{formatDate(START_DATE)}</div>
                      <div className="text-zinc-800 dark:text-zinc-200 text-[13px] font-semibold">이병</div>
                    </>
                  )}
                </div>
              </div>
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => { if(navigator.vibrate) navigator.vibrate(5) }}
                className="h-2 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden mb-1.5 flex shadow-inner cursor-pointer"
              >
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 via-[#ff94e0] to-purple-500 dark:from-orange-500 dark:via-[#ffba61] dark:to-orange-500 animate-liquid rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${isBeforeEnlistment ? 0 : rankProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </motion.div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[13px] font-[family-name:var(--font-space-mono)] font-semibold mt-1.5 tracking-tight">
                {isBeforeEnlistment ? '0.00000%' : `${rankProgress.toFixed(5)}%`}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Stats List */}
      <div className="mt-8 px-4 sm:px-6">
        <div className="bg-transparent border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 font-medium text-[16px] tracking-tight">
          <div className="flex justify-between py-4">
            <span className="text-zinc-600 dark:text-zinc-400 font-bold">전체 복무일</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{totalDays}</span>
          </div>
          <div className="flex justify-between py-4">
            <span className="text-zinc-600 dark:text-zinc-400 font-bold">현재 복무일</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{currentDays}</span>
          </div>
          <div className="flex justify-between py-4">
            <span className="text-zinc-600 dark:text-zinc-400 font-bold">남은 복무일</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{remainingDays > 0 ? remainingDays : 0}</span>
          </div>
          <div className="flex justify-between py-4">
            <span className="text-zinc-600 dark:text-zinc-400 font-bold">계급 진급일</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{isBeforeEnlistment ? daysToEnlistment : (nextRankDays > 0 ? nextRankDays : 0)}</span>
          </div>
        </div>
        
        
      </div>

    </div>
  )
}
