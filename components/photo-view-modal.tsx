'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react'
import { CalendarPhoto } from './calendar-view'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import useEmblaCarousel from 'embla-carousel-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function PhotoViewModal({
  photos,
  initialIndex,
  userId,
  onClose,
  onDelete,
  onChangePhoto
}: {
  photos: CalendarPhoto[],
  initialIndex: number,
  userId: string,
  onClose: () => void,
  onDelete: () => void, // trigger refetch in parent
  onChangePhoto: (date: Date) => void
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex, loop: false })
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isDeleting, setIsDeleting] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCurrentIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi, setCurrentIndex])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  const handleDelete = async (photo: CalendarPhoto) => {
    setIsDeleting(true)
    const toastId = toast.loading('사진을 삭제하는 중입니다...')
    
    try {
      const { error } = await supabase
        .from('calendar_photos')
        .delete()
        .eq('id', photo.id)
      
      if (error) throw error
      
      toast.success('사진이 삭제되었습니다.', { id: toastId })
      onDelete() // parent refetches
      
      if (photos.length === 1) {
        onClose()
      }
    } catch (error: any) {
      toast.error('삭제 실패: ' + error.message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  // If photos array changes (e.g. deletion), make sure index is bound
  const currentPhoto = photos[currentIndex] || photos[photos.length - 1]

  if (!currentPhoto) return null

  const photoDate = new Date(currentPhoto.date)

  return (
    <div 
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 backdrop-blur-md"
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-[130] bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
        <div className="flex flex-col">
          <div className="text-lg font-bold drop-shadow-md">
            {format(photoDate, 'yyyy년 M월 d일', { locale: ko })}
          </div>
          <div className="text-xs text-zinc-400 font-medium">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentPhoto.user_id === userId && (
            <>
              <button 
                onClick={() => onChangePhoto(new Date(currentPhoto.date))}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-[#009bcb]/80 dark:hover:bg-[#862633]/80 text-white transition-all shadow-lg active:scale-95"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleDelete(currentPhoto)}
                disabled={isDeleting}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-red-500/80 text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white/20 text-white transition-colors shadow-lg active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 w-full relative overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {photos.map((photo, index) => (
            <div key={photo.id} className="flex-[0_0_100%] min-w-0 relative h-full flex items-center justify-center p-2 mt-16 sm:mt-0">
              <motion.img 
                initial={false}
                src={photo.photo_url} 
                alt="Calendar Memory" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl pointer-events-auto" 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <button 
        onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev() }}
        disabled={!emblaApi?.canScrollPrev()}
        className="flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md disabled:opacity-0 transition-all z-[130]"
      >
        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext() }}
        disabled={!emblaApi?.canScrollNext()}
        className="flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md disabled:opacity-0 transition-all z-[130]"
      >
        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>

    </div>
  )
}
