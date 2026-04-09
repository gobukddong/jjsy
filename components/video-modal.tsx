'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Youtube, Calendar, Play, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Video = {
  id: string
  youtube_id: string
  title: string
  video_date: string
  thumbnail_url: string
}

interface VideoModalProps {
  video?: Video | null // 있으면 수정, 없으면 추가
  onClose: () => void
  onUpdate: () => void
}

export default function VideoModal({ video, onClose, onUpdate }: VideoModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  useEffect(() => {
    if (video) {
      setUrl(`https://www.youtube.com/watch?v=${video.youtube_id}`)
      setTitle(video.title)
      setDate(video.video_date)
    } else {
      // 추가 모드일 때 현재 날짜 기본 세팅 (YYYY. MM. DD)
      const now = new Date()
      const formatted = `${now.getFullYear()}. ${(now.getMonth() + 1).toString().padStart(2, '0')}. ${now.getDate().toString().padStart(2, '0')}`
      setDate(formatted)
    }
  }, [video])

  // 유튜브 URL에서 ID 추출 로직 (Shorts 포함 모든 형식 지원)
  const extractVideoId = (input: string) => {
    if (!input) return ''
    
    // 1. Shorts 형식 처리 (youtube.com/shorts/ID)
    if (input.includes('shorts/')) {
      return input.split('shorts/')[1].split(/[?&]/)[0]
    }
    
    // 2. 일반 형식 처리
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = input.match(regExp)
    return (match && match[7].length === 11) ? match[7] : input.trim()
  }

  const handleSave = async () => {
    if (!url.trim() || !title.trim() || !date.trim()) {
      alert('모든 정보를 입력해주세요!')
      return
    }

    setSaving(true)
    const youtubeId = extractVideoId(url)
    const thumbnailUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`

    const videoData = {
      youtube_id: youtubeId,
      title,
      video_date: date,
      thumbnail_url: thumbnailUrl,
    }

    try {
      if (video) {
        // 수정
        const { error } = await supabase
          .from('videos')
          .update(videoData)
          .eq('id', video.id)
        if (error) throw error
      } else {
        // 추가
        const { data: userData } = await supabase.auth.getUser()
        const { error } = await supabase
          .from('videos')
          .insert({ ...videoData, created_by: userData.user?.id })
        if (error) throw error
      }
      onUpdate()
      onClose()
    } catch (error) {
      console.error('영상 저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!video) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id)
      if (error) throw error
      onUpdate()
      onClose()
    } catch (error) {
      console.error('영상 삭제 실패:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {video ? '영상 정보 수정' : '새로운 영상 추가'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 유튜브 링크 */}
            <div>
              <label className="flex items-center gap-2 text-xs text-zinc-500 ml-1 mb-1.5 font-medium">
                <Youtube className="w-3 h-3" /> 유튜브 링크
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#862633] transition-all"
              />
            </div>

            {/* 제목 */}
            <div>
              <label className="flex items-center gap-2 text-xs text-zinc-500 ml-1 mb-1.5 font-medium">
                <Play className="w-3 h-3" /> 영상 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="똥"
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#862633] transition-all"
              />
            </div>

            {/* 날짜 */}
            <div>
              <label className="flex items-center gap-2 text-xs text-zinc-500 ml-1 mb-1.5 font-medium">
                <Calendar className="w-3 h-3" /> 날짜
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2024. 02. 26"
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#862633] transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              {video && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={deleting || saving}
                  className="flex-1 bg-zinc-800 hover:bg-red-900/40 text-red-500 border border-red-900/20 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  삭제
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className={`grow-[2] bg-[#862633] hover:bg-[#6a1d26] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2`}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 커스텀 삭제 확인 모달 */}
      {showConfirmDelete && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 w-full max-w-xs rounded-3xl border border-zinc-800 p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">엥?</h3>
            <p className="text-sm text-zinc-400 mb-6">삭제된 영상은 상윤이가 복구해줍니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 bg-zinc-800 text-zinc-300 font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors cursor-pointer"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
