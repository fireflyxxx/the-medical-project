"use client"

import { useState, useEffect } from "react"
import { Search, Bell, X } from "lucide-react"
import { api } from "@/lib/api"

interface Announcement {
  title: string
  content: string
  updatedTime: string
}

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false)

  // 自动获取并显示公告
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await api.getLatestAnnouncement()
        if (res && res.content) {
          setAnnouncement(res)
          setShowAnnouncementModal(true)
        }
      } catch (error) {
        console.error('获取公告失败:', error)
        setAnnouncement(null)
      }
    }

    fetchAnnouncement()
  }, [])

  const handleBellClick = async () => {
    setShowAnnouncementModal(true)
    setLoadingAnnouncement(true)
    try {
      const res = await api.getLatestAnnouncement()
      if (res) {
        setAnnouncement(res)
      }
    } catch (error) {
      console.error('获取公告失败:', error)
      setAnnouncement(null)
    } finally {
      setLoadingAnnouncement(false)
    }
  }

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer group" onClick={handleBellClick}>
          <Bell className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowAnnouncementModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl p-8 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-card-foreground">系统公告</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-muted-foreground hover:text-card-foreground transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingAnnouncement ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-muted-foreground">加载中...</p>
              </div>
            ) : announcement ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-card-foreground mb-2">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground">发布时间: {announcement.updatedTime}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-base text-card-foreground leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl text-muted-foreground mx-auto mb-4">📢</div>
                <p className="text-muted-foreground">暂无公告</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
