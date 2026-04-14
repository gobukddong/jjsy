'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ko } from 'date-fns/locale'

export default function PhotoUploadModal({ 
  date, 
  userId, 
  isReplace,
  onClose, 
  onSuccess 
}: { 
  date: Date, 
  userId: string, 
  isReplace?: boolean,
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      await handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    const toastId = toast.loading('사진을 저장하는 중입니다...')

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // 만약 수정(Replace)인 경우, 기존 날짜 데이터 삭제 진행
      if (isReplace) {
        await supabase.from('calendar_photos').delete().eq('date', dateStr)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${dateStr}/${fileName}`

      // 스토리지에 새 파일 업로드
      const { error: uploadError } = await supabase.storage
        .from('calendar_photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('calendar_photos')
        .getPublicUrl(filePath)

      // DB에 새 데이터 삽입
      const { error: dbError } = await supabase
        .from('calendar_photos')
        .insert({
          date: dateStr,
          photo_url: publicUrlData.publicUrl,
          user_id: userId
        })

      if (dbError) throw dbError

      toast.success(isReplace ? '사진이 성공적으로 변경되었습니다!' : '사진이 추가되었습니다.', { id: toastId })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error('업로드 실패: ' + error.message, { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold">
            {format(date, 'M월 d일', { locale: ko })} {isReplace ? '사진 변경하기' : ''}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isUploading ? (
            <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-4 animate-pulse">
              <Upload className="w-8 h-8 text-[#009bcb] dark:text-[#862633] animate-bounce" />
              <p className="font-semibold text-zinc-500">사진을 올리는 중입니다...</p>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
                <ImageIcon className="w-8 h-8 text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-zinc-700 dark:text-zinc-300">이 곳을 눌러 사진 추가</p>
              </div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </motion.div>
    </div>
  )
}
