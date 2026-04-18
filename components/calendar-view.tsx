'use client'

import React, { useState, useEffect, useRef } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import PhotoUploadModal from './photo-upload-modal'
import PhotoViewModal from './photo-view-modal'
import { toast } from 'sonner'

export type CalendarPhoto = {
  id: string
  date: string
  photo_url: string
  user_id: string
  created_at: string
}

export default function CalendarView({ userId }: { userId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allPhotos, setAllPhotos] = useState<CalendarPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDateToUpload, setSelectedDateToUpload] = useState<{ date: Date, isReplace: boolean } | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  let days = eachDayOfInterval({ start: startDate, end: endDate })

  // 항상 6주(42일)을 채워서 달력이 월마다 들쭉날쭉하지 않게 일정한 높이를 유지
  while (days.length < 42) {
    const nextDay = addDays(days[days.length - 1], 1)
    days.push(nextDay)
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  useEffect(() => {
    fetchAllPhotos()
  }, [])

  const fetchAllPhotos = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('calendar_photos')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) {
      console.error('Error fetching photos:', error)
      // Ignore error if table doesn't exist yet
    } else if (data) {
      setAllPhotos(data as CalendarPhoto[])
    }
    setIsLoading(false)
  }

  const fetchAllPhotosSilently = async () => {
    const { data } = await supabase
      .from('calendar_photos')
      .select('*')
      .order('date', { ascending: true })
    if (data) setAllPhotos(data as CalendarPhoto[])
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const handleTouchStart = (day: Date, photo: CalendarPhoto | undefined) => {
    if (!photo) return
    longPressTimer.current = setTimeout(() => {
      setSelectedDateToUpload({ date: day, isReplace: true })
      if (navigator.vibrate) navigator.vibrate([30, 30])
    }, 600)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleDayClick = (day: Date) => {
    const photoForDayIndex = allPhotos.findIndex(p => p.date === format(day, 'yyyy-MM-dd'))
    if (photoForDayIndex !== -1) {
      setSelectedPhotoIndex(photoForDayIndex)
    } else {
      setSelectedDateToUpload({ date: day, isReplace: false })
    }
  }

  const handleContextMenu = (e: React.MouseEvent, day: Date, photo: CalendarPhoto | undefined) => {
    e.preventDefault()
    if (photo) {
      setSelectedDateToUpload({ date: day, isReplace: true })
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-4 py-2 sm:py-4 flex flex-col bg-zinc-50 dark:bg-black min-h-max pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
          <ChevronLeft className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </button>
        <div className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
          <ChevronRight className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 content-start border-l border-t border-zinc-200 dark:border-zinc-800">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isTodayDate = isToday(day)
          const coverPhoto = allPhotos.find(p => p.date === format(day, 'yyyy-MM-dd'))
          const isSpecialDate = (day.getMonth() === 5 && day.getDate() === 1) || 
                                (day.getMonth() === 9 && day.getDate() === 14) || 
                                (day.getMonth() === 1 && day.getDate() === 26);

          return (
            <motion.div
              key={day.toString()}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDayClick(day)}
              onContextMenu={(e) => handleContextMenu(e, day, coverPhoto)}
              onTouchStart={() => handleTouchStart(day, coverPhoto)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              className={`
                relative aspect-[4/5] overflow-hidden cursor-pointer border-r border-b border-zinc-200 dark:border-zinc-800
                transition-colors duration-200
                ${isCurrentMonth ? 'bg-white dark:bg-black group hover:bg-zinc-50 dark:hover:bg-zinc-900/50' : 'bg-zinc-50 dark:bg-zinc-900/30'}
                ${isTodayDate && !coverPhoto ? 'ring-2 ring-inset ring-[#009bcb] dark:ring-[#862633]' : ''}
              `}
            >
              {/* If Loading Skeleton */}
              {isLoading && isCurrentMonth && (
                <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              )}

              {/* Day Number */}
              {!isLoading && (
                <div className={`absolute top-1 left-1.5 z-10 flex items-center gap-0.5 text-[11px] sm:text-xs font-bold font-sans ${
                  coverPhoto ? 'text-white drop-shadow-md' : 
                  (isTodayDate ? 'text-[#009bcb] dark:text-[#862633]' : 
                  (isCurrentMonth ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-700'))
                }`}>
                  <span>{format(day, 'd')}</span>
                  {isSpecialDate && <span className="text-[9px] drop-shadow-sm relative top-[0.5px]">❤️</span>}
                </div>
              )}

              {/* Photo Box */}
              {!isLoading && (
                <div className={`w-full h-full flex items-center justify-center ${!isCurrentMonth && coverPhoto ? 'opacity-40' : ''}`}>
                  {coverPhoto ? (
                    <img src={coverPhoto.photo_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                  ) : (
                    <div className="text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedDateToUpload && (
          <PhotoUploadModal 
            userId={userId}
            date={selectedDateToUpload.date} 
            isReplace={selectedDateToUpload.isReplace}
            onClose={() => setSelectedDateToUpload(null)} 
            onSuccess={() => fetchAllPhotosSilently()} 
          />
        )}
        {selectedPhotoIndex !== null && (
          <PhotoViewModal
            photos={allPhotos}
            initialIndex={selectedPhotoIndex}
            userId={userId}
            onClose={() => setSelectedPhotoIndex(null)}
            onDelete={() => fetchAllPhotosSilently()}
            onChangePhoto={(date) => {
              setSelectedPhotoIndex(null)
              setSelectedDateToUpload({ date, isReplace: true })
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
