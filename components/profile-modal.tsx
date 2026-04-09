'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, X, Loader2 } from 'lucide-react'

interface ProfileModalProps {
  userId: string
  onClose: () => void
  onUpdate: () => void
}

export default function ProfileModal({ userId, onClose, onUpdate }: ProfileModalProps) {
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProfile()
  }, [userId])

  async function getProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setAvatarUrl(data.avatar_url)
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('사진 업로드 중 오류가 발생했습니다!')
    } finally {
      setUploading(false)
    }
  }

  async function updateProfile() {
    try {
      setSaving(true)
      const updates = {
        id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error
      
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('프로필 저장 중 오류가 발생했습니다!')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-colors duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-200 transition-colors">
        <div className="p-6 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">프로필 설정</h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90 cursor-pointer">
              <X className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Avatar Upload Sector */}
          <div className="relative group mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-[#009bcb] dark:border-[#862633] flex items-center justify-center shadow-inner transaction-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="text-3xl font-bold text-zinc-400 dark:text-zinc-600">?</div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-[#009bcb] hover:bg-[#007a9e] dark:bg-[#862633] dark:hover:bg-[#6a1d26] rounded-full cursor-pointer transition-colors shadow-lg active:scale-90 transform duration-75">
              {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
              <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="text-xs text-zinc-500 ml-1 mb-1 block">이름</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#009bcb] dark:focus:ring-[#862633] transition-all"
              />
            </div>

            <button
              onClick={updateProfile}
              disabled={saving || uploading}
              className="w-full bg-[#009bcb] hover:bg-[#007a9e] dark:bg-[#862633] dark:hover:bg-[#6a1d26] disabled:opacity-50 text-white font-bold py-4 rounded-xl mt-4 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
