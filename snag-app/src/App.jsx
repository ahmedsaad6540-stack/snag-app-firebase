import React, { useState } from "react"
import Header       from "./components/Header.jsx"
import StatBar      from "./components/StatBar.jsx"
import SnagForm     from "./components/SnagForm.jsx"
import SnagList     from "./components/SnagList.jsx"
import AuthScreen   from "./components/AuthScreen.jsx"
import UsersManager from "./components/UsersManager.jsx"
import NotificationCenter, { LiveNotifBanner } from "./components/NotificationCenter.jsx"
import UnitsModule  from "./components/UnitsModule.jsx"
import StoresModule from "./components/StoresModule.jsx"
import RestroomsModule from "./components/RestroomsModule.jsx"
import AICommandCenter from "./components/AICommandCenter.jsx"
import { useSnags } from "./hooks/useSnags.js"
import { useAuth }  from "./hooks/useAuth.js"
import { useNotifications } from "./hooks/useNotifications.js"
import { useCustomLists } from "./hooks/useCustomLists.js"
import CustomListModule from "./components/CustomListModule.jsx"
import { Toaster } from "react-hot-toast"

export default function App() {
  const { user, loading: authLoading, error: authError, login, register, logout, setError } = useAuth()
  const { notifications, unreadCount, notify, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, liveToast, dismissLiveToast } = useNotifications(user)
  const { snags, stats, loading, error, addSnag, cycleStatus, removeSnag, updateSnag, mergeImported, wipeAll } = useSnags(notify, user)
  const { customLists, addCustomList, removeCustomList } = useCustomLists(user)
  const [filteredSnags, setFilteredSnags] = useState([])
  const [showUsersManager, setShowUsersManager] = useState(false)
  const [activeTab, setActiveTab] = useState("snags") // "snags" | "restrooms" | "units" | "stores" | custom_id
  const [statusFilter, setStatusFilter] = useState("all") // shared between StatBar ↔ SnagList

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id)
    if (notif.relatedSnagId) {
      setActiveTab("snags")
      setStatusFilter("all")
      setFilteredSnags([]) // clear filters to ensure the snag is visible
      
      // Allow React time to render the snags tab if we were elsewhere
      setTimeout(() => {
        const el = document.getElementById(`snag-${notif.relatedSnagId}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          // Add a subtle highlight effect
          const originalBg = el.style.background
          el.style.background = "rgba(59, 130, 246, 0.2)"
          setTimeout(() => {
            el.style.background = originalBg
          }, 2000)
        }
      }, 300)
    }
  }

  // ── Auth loading ──
  if (authLoading) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#4a5f82", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
        <div style={{ fontWeight:700 }}>جاري التحميل…</div>
      </div>
    </div>
  )

  // ── Not logged in → show auth screen ──
  if (!user) return (
    <AuthScreen
      onLogin={login}
      onRegister={register}
      error={authError}
    />
  )

  // ── Data loading ──
  if (loading) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#4a5f82", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
        <div style={{ fontWeight:700 }}>جاري الاتصال بـ Firebase…</div>
      </div>
    </div>
  )

  // ── Firestore error ──
  if (error) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#f87171", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:24 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:700, marginBottom:8 }}>خطأ في الاتصال بـ Firebase</div>
        <div style={{ color:"#64748b", fontSize:13 }}>{error}</div>
        <div style={{ marginTop:16, color:"#64748b", fontSize:12 }}>تأكد من إعدادات firebaseConfig في src/lib/firebase.js</div>
      </div>
    </div>
  )

  // ── Pending approval ──
  if (user && !user.approved) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#e2e8f0", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:420, padding:32 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>⏳</div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:12 }}>في انتظار موافقة مدير النظام</div>
        <div style={{ color:"#94a3b8", fontSize:14, lineHeight:1.8, marginBottom:20 }}>
          تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة.
          <br />
          سيتم تفعيله بعد موافقة مدير النظام.
        </div>
        <div style={{ background:"rgba(30,41,59,0.6)", padding:"12px 20px", borderRadius:10, border:"1px solid #334155", marginBottom:20, fontSize:13 }}>
          <div style={{ color:"#64748b" }}>الحساب:</div>
          <div style={{ fontWeight:700, color:"#e2e8f0" }}>{user.displayName || user.email}</div>
          <div style={{ color:"#64748b", fontSize:12 }}>{user.email}</div>
        </div>
        <button 
          style={{ background:"#1c0a0a", color:"#fca5a5", border:"1px solid #7f1d1d", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:700, fontSize:14 }} 
          onClick={logout}
        >
          🚪 تسجيل خروج
        </button>
      </div>
    </div>
  )

  // Default to all snags if no filter is applied yet
  const displaySnags = filteredSnags.length > 0 ? filteredSnags : snags

  return (
    <div style={s.app}>
      <div style={s.container}>
        {/* User bar */}
        <div style={s.userBar} className="user-bar-wrap">
          <div style={s.userInfo}>
            <div style={s.avatar}>{user.displayName?.[0] || user.email?.[0] || "م"}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0" }}>
                {user.displayName || "مشرف"}
                {user.role === "admin" && (
                  <span style={{ marginLeft: 8, background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>مدير نظام</span>
                )}
              </div>
              <div style={{ fontSize:11, color:"#64748b" }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }} className="user-bar-actions">
            {user.role === "admin" && (
              <button 
                style={{ ...s.logoutBtn, background: "#0f766e", color: "#ccfbf1", borderColor: "#115e59" }} 
                onClick={() => setShowUsersManager(true)}
              >
                👥 إدارة المستخدمين
              </button>
            )}
            <NotificationCenter 
              notifications={notifications} 
              unreadCount={unreadCount}
              currentUser={user}
              onMarkAsRead={markAsRead} 
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              onClearAll={clearAllNotifications}
              onNotificationClick={handleNotificationClick}
            />
            <button style={s.logoutBtn} onClick={logout}>
              🚪 خروج
            </button>
          </div>
        </div>

        <Toaster />

        {/* Header receives filtered snags for reports */}
        <Header 
          snags={displaySnags} 
          onImport={mergeImported} 
          isAdmin={user.role === "admin"}
          onWipeAll={wipeAll}
        />

        {/* Tab Navigation */}
        <div style={s.tabs} className="tabs-row">
          <button 
            style={{ ...s.tab, ...(activeTab === "snags" ? s.activeTab : {}) }}
            onClick={() => setActiveTab("snags")}
          >
            📋 سجل الملاحظات
          </button>
          <button 
            style={{ ...s.tab, ...(activeTab === "restrooms" ? { ...s.activeTab, background: "linear-gradient(135deg, #065f46, #047857)", color: "#ecfdf5" } : {}) }}
            onClick={() => setActiveTab("restrooms")}
          >
            🚽 مركز متابعة الحمامات
          </button>
          <button 
            style={{ ...s.tab, ...(activeTab === "units" ? s.activeTab : {}) }}
            onClick={() => setActiveTab("units")}
          >
            🏢 بيانات الوحدات
          </button>
          <button 
            style={{ ...s.tab, ...(activeTab === "stores" ? s.activeTab : {}) }}
            onClick={() => setActiveTab("stores")}
          >
            📦 بيانات المخازن
          </button>
          <button 
            style={{ ...s.tab, ...(activeTab === "ai" ? { ...s.activeTab, background: "linear-gradient(135deg, #1e1b4b, #312e81)", color: "#c4b5fd", borderColor: "#4c1d95" } : {}) }}
            onClick={() => setActiveTab("ai")}
          >
            🧠 مركز الذكاء
          </button>
          {customLists.map(list => (
            <div key={list.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <button 
                style={{ ...s.tab, ...(activeTab === list.id ? s.activeTab : {}) }}
                onClick={() => setActiveTab(list.id)}
              >
                📁 {list.name}
              </button>
              {user.role === "admin" && (
                <button 
                  style={s.delListBtn} 
                  onClick={() => {
                    if(window.confirm(`هل أنت متأكد من حذف القائمة "${list.name}" نهائياً؟`)) {
                      removeCustomList(list.id)
                      if(activeTab === list.id) setActiveTab("snags")
                    }
                  }}
                  title="حذف القائمة"
                >
                  ✖
                </button>
              )}
            </div>
          ))}
          {user.role === "admin" && (
            <button 
              style={{ ...s.tab, border: "1px dashed #475569", color: "#94a3b8" }}
              onClick={() => {
                const name = window.prompt("أدخل اسم القائمة الجديدة:")
                if (name && name.trim()) addCustomList(name.trim())
              }}
            >
              ➕ قائمة جديدة
            </button>
          )}
        </div>

        {activeTab === "snags" && (
          <>
            {/* Quick-access banner to Restroom Snag Center inside the main Snag tab */}
            <div
              onClick={() => setActiveTab("restrooms")}
              style={{
                background: "linear-gradient(135deg, rgba(6,95,70,0.28), rgba(30,27,75,0.5))",
                border: "1px solid #059669",
                borderRadius: 14,
                padding: "12px 18px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🚽</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#ecfdf5" }}>
                    RESTROOM SNAG | مركز متابعة وفحص الحمامات التفصيلي
                  </div>
                  <div style={{ fontSize: 12, color: "#a7f3d0" }}>
                    حصر فني شامل (50 حمام • 1,450 مكون) • جولات الفحص • تصدير إكسيل بالصور المدمجة بدون روابط
                  </div>
                </div>
              </div>
              <span style={{
                background: "#10b981",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                padding: "7px 14px",
                borderRadius: 8,
              }}>
                فتح مركز الحمامات ←
              </span>
            </div>

            <StatBar
              stats={stats}
              activeFilter={statusFilter}
              onFilter={(f) => setStatusFilter(f)}
            />
            <div className="app-grid">
              <SnagForm onAdd={addSnag} userName={user.displayName || user.email} userEmail={user.email} notify={notify} />
              <SnagList 
                snags={snags} 
                currentUser={user}
                onCycleStatus={cycleStatus} 
                onRemove={removeSnag} 
                onUpdate={updateSnag}
                onFilteredChange={setFilteredSnags}
                externalStatusFilter={statusFilter}
                onExternalStatusChange={setStatusFilter}
              />
            </div>
          </>
        )}
        
        {activeTab === "restrooms" && <RestroomsModule currentUser={user} notify={notify} onAddSnag={addSnag} />}
        {activeTab === "units" && <UnitsModule currentUser={user} notify={notify} />}
        {activeTab === "stores" && <StoresModule currentUser={user} notify={notify} />}
        {activeTab === "ai" && <AICommandCenter snags={snags} />}
        
        {customLists.find(l => l.id === activeTab) && (
          <CustomListModule list={customLists.find(l => l.id === activeTab)} currentUser={user} notify={notify} />
        )}
      </div>
      
      {showUsersManager && (
        <UsersManager onClose={() => setShowUsersManager(false)} currentUser={user} />
      )}

      {/* 🔔 Live Notification Banner */}
      <LiveNotifBanner liveToast={liveToast} onDismiss={dismissLiveToast} onClick={handleNotificationClick} />
    </div>
  )
}

const s = {
  app:       { minHeight:"100vh", paddingBottom:60 },
  container: { maxWidth:1400, margin:"0 auto", padding:"24px 20px" },
  userBar: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    background:"rgba(10,22,40,0.8)", border:"1px solid #1e293b",
    borderRadius:14, padding:"10px 16px", marginBottom:16,
    backdropFilter:"blur(10px)",
  },
  userInfo: { display:"flex", alignItems:"center", gap:10 },
  avatar: {
    width:36, height:36, borderRadius:999,
    background:"linear-gradient(135deg, #f59e0b, #ef4444)",
    display:"grid", placeItems:"center",
    color:"white", fontWeight:800, fontSize:16,
  },
  logoutBtn: {
    background:"#1c0a0a", color:"#fca5a5", border:"1px solid #7f1d1d",
    borderRadius:10, padding:"8px 14px", cursor:"pointer",
    fontWeight:700, fontSize:13,
  },
  tabs: {
    display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 10
  },
  tab: {
    background: "transparent", border: "none", color: "#94a3b8",
    fontSize: 15, fontWeight: "bold", padding: "10px 16px",
    cursor: "pointer", borderRadius: 8, transition: "0.2s"
  },
  activeTab: {
    background: "#1e293b", color: "#e2e8f0"
  },
  delListBtn: {
    background: "transparent", border: "none", color: "#ef4444", fontSize: 10, cursor: "pointer",
    marginLeft: -10, padding: 4, borderRadius: "50%", zIndex: 10
  }
}
