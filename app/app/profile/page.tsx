"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useVocabStore } from "@/lib/store"
import { Save, User } from 'lucide-react'
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

const avatars = [
  "https://i.pravatar.cc/150?img=1",
  "https://i.pravatar.cc/150?img=2",
  "https://i.pravatar.cc/150?img=3",
  "https://i.pravatar.cc/150?img=4",
  "https://i.pravatar.cc/150?img=5",
  "https://i.pravatar.cc/150?img=6",
  "https://i.pravatar.cc/150?img=7",
  "https://i.pravatar.cc/150?img=8",
]

export default function ProfilePage() {
  const user = useVocabStore((s) => s.user)
  const setUser = useVocabStore((s) => s.setUser)
  const prefs = useVocabStore((s) => s.preferences)
  const setDailyGoal = useVocabStore((s) => s.setDailyGoal)
  const setNotifications = useVocabStore((s) => s.setNotifications)
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || "")
  const [goal, setGoal] = useState<number>(prefs.dailyGoal)
  const [dark, setDark] = useState<boolean>(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setDark(isDark)
  }, [])

  const toggleTheme = (v: boolean) => {
    setDark(v)
    if (v) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    try {
      localStorage.setItem("theme", v ? "dark" : "light")
    } catch {}
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const res = await fetch("/api/db/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, avatar: selectedAvatar }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || "Failed to save profile")

      setUser({ name: name || user?.name || "User", email: email || user?.email || "user@example.com", avatar: selectedAvatar })
      setDailyGoal(goal)
      toast({ title: "Başarılı", description: "Profiliniz güncellendi." })
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{'Profil Resmi'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {avatars.map(avatar => (
              <button key={avatar} onClick={() => setSelectedAvatar(avatar)} className="rounded-full overflow-hidden border-2 hover:border-primary transition-colors data-[selected=true]:border-primary" data-selected={selectedAvatar === avatar}>
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{'Kullanıcı Bilgileri'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name">{'Ad'}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{'E-posta'}</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">{'Günlük Hedef (kelime)'}</Label>
            <Input id="goal" type="number" value={goal} onChange={(e) => setGoal(parseInt(e.target.value || "0"))} />
          </div>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : <><Save className="mr-2 h-4 w-4" /> Kaydet</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{'Tercihler'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{'Tema'}</div>
              <div className="text-xs text-muted-foreground">{'Açık / Koyu'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{dark ? "Koyu" : "Açık"}</span>
              <Switch checked={dark} onCheckedChange={toggleTheme} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{'Bildirimler'}</div>
              <div className="text-xs text-muted-foreground">{'Günlük hatırlatma'}</div>
            </div>
            <Switch checked={prefs.notifications} onCheckedChange={(v) => setNotifications(!!v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
