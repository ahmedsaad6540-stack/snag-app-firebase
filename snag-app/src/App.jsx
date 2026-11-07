import React, { useState, useEffect } from "react"
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
import ParkStreetModule from "./components/ParkStreetModule.jsx"
import OperationsPlansModule from "./components/OperationsPlansModule.jsx"
import WhatsAppShiftHubModule from "./components/WhatsAppShiftHubModule.jsx"
import AICommandCenter from "./components/AICommandCenter.jsx"
import { useSnags } from "./hooks/useSnags.js"
import { useAuth }  from "./hooks/useAuth.js"
import { useNotifications } from "./hooks/useNotifications.js"
import { useCustomLists } from "./hooks/useCustomLists.js"
import CustomListModule from "./components/CustomListModule.jsx"
import { Toaster } from "react-hot-toast"
import { useLanguage } from "./i18n/LanguageContext.jsx"
import { canUser, hasPrivilege, resolveUserPermissions, APP_MODULES } from "./constants/permissions.js"

export default function App() {
  const { lang, toggleLang, tr } = useLanguage()
  const { user, loading: authLoading, error: authError, login, register, logout, setError } = useAuth()
  const { notifications, unreadCount, notify, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, liveToast, dismissLiveToast } = useNotifications(user)
  const { snags, stats, loading, error, addSnag, cycleStatus, removeSnag, updateSnag, mergeImported, wipeAll } = useSnags(notify, user)
  const { customLists, addCustomList, removeCustomList } = useCustomLists(user)
  const [filteredSnags, setFilteredSnags] = useState([])
  const [showUsersManager, setShowUsersManager] = useState(false)
  const [activeTab, setActiveTab] = useState("snags")
  const [statusFilter, setStatusFilter] = useState("all")

  // Ensure activeTab is always a module the user is allowed to view
  useEffect(() => {
    if (!user) return
    const isCustomTab = customLists.some(l => l.id === activeTab)
    const modToCheck = isCustomTab ? "customLists" : activeTab
    if (!canUser(user, modToCheck, "view")) {
      const firstAllowed = APP_MODULES.find(m => canUser(user, m.id, "view"))
      if (firstAllowed) {
        setActiveTab(firstAllowed.id)
      }
    }
  }, [user, activeTab, customLists])

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id)
    if (notif.relatedSnagId && canUser(user, "snags", "view")) {
      setActiveTab("snags")
      setStatusFilter("all")
      setFilteredSnags([])
      
      setTimeout(() => {
        const el = document.getElementById(`snag-${notif.relatedSnagId}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
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
        <div style={{ fontWeight:700 }}>{tr("جاري التحميل…", "Loading...")}</div>
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
        <div style={{ fontWeight:700 }}>{tr("جاري الاتصال بـ Firebase…", "Connecting to Firebase...")}</div>
      </div>
    </div>
  )

  // ── Firestore error ──
  if (error) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#f87171", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:24 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:700, marginBottom:8 }}>{tr("خطأ في الاتصال بـ Firebase", "Firebase Connection Error")}</div>
        <div style={{ color:"#64748b", fontSize:13 }}>{error}</div>
        <div style={{ marginTop:16, color:"#64748b", fontSize:12 }}>{tr("تأكد من إعدادات firebaseConfig في src/lib/firebase.js", "Check firebaseConfig in src/lib/firebase.js")}</div>
      </div>
    </div>
  )

  // ── Pending approval ──
  if (user && !user.approved) return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#060d1a", color:"#e2e8f0", fontFamily:"IBM Plex Sans Arabic, sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:420, padding:32 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <button
            onClick={toggleLang}
            style={{ background: "#0f172a", border: "1px solid #334155", color: "#38bdf8", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            🌐 {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>
        <div style={{ fontSize:56, marginBottom:16 }}>⏳</div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:12 }}>
          {tr("في انتظار موافقة مدير النظام", "Awaiting System Admin Approval")}
        </div>
        <div style={{ color:"#94a3b8", fontSize:14, lineHeight:1.8, marginBottom:20 }}>
          {tr(
            "تم إنشاء حسابك بنجاح وهو الآن قيد المراجعة. سيتم تفعيله وتحديد صلاحياتك بعد موافقة مدير النظام.",
            "Your account has been created and is currently under review. It will be activated once approved by the System Administrator."
          )}
        </div>
        <div style={{ background:"rgba(30,41,59,0.6)", padding:"12px 20px", borderRadius:10, border:"1px solid #334155", marginBottom:20, fontSize:13 }}>
          <div style={{ color:"#64748b" }}>{tr("الحساب:", "Account:")}</div>
          <div style={{ fontWeight:700, color:"#e2e8f0" }}>{user.displayName || user.email}</div>
          <div style={{ color:"#64748b", fontSize:12 }}>{user.email}</div>
        </div>
        <button 
          style={{ background:"#1c0a0a", color:"#fca5a5", border:"1px solid #7f1d1d", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:700, fontSize:14 }} 
          onClick={logout}
        >
          🚪 {tr("تسجيل خروج", "Sign Out")}
        </button>
      </div>
    </div>
  )

  const resolvedPerms = resolveUserPermissions(user)
  const rolePreset = resolvedPerms.preset
  const canManageUsers = user.role === "admin" || hasPrivilege(user, "canManageUsers")
  const canManageLists = user.role === "admin" || hasPrivilege(user, "canManageLocations")

  // Default to all snags if no filter is applied yet
  const displaySnags = filteredSnags.length > 0 ? filteredSnags : snags

  return (
    <div style={s.app}>
      <div style={s.container} className="app-container">
        {/* User bar */}
        <div style={s.userBar} className="user-bar-wrap">
          <div style={s.userInfo} className="user-bar-info">
            <div style={s.avatar}>{(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || tr("مشرف", "Inspector")}</span>
                <span style={{
                  background: `${rolePreset.badgeColor}25`,
                  border: `1px solid ${rolePreset.badgeColor}`,
                  color: rolePreset.badgeColor,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}>
                  {rolePreset.icon} {lang === "ar" ? rolePreset.labelAr : rolePreset.labelEn}
                </span>
                {user.jobTitle && (
                  <span style={{ background: "#0f172a", color: "#38bdf8", padding: "2px 7px", borderRadius: 6, fontSize: 10, border: "1px solid #1e293b", whiteSpace: "nowrap" }}>
                    💼 {user.jobTitle}
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, color:"#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} className="user-bar-actions">
            {/* 🌐 Bilingual Language Switcher (AR <-> EN) */}
            <button
              type="button"
              onClick={toggleLang}
              style={{
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                color: "#38bdf8",
                border: "1px solid #334155",
                borderRadius: 10,
                padding: "8px 13px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title={tr("التبديل إلى اللغة الإنجليزية (English)", "Switch to Arabic (العربية)")}
            >
              <span>🌐</span>
              <span>{lang === "ar" ? "English" : "العربية"}</span>
            </button>

            {canManageUsers && (
              <button 
                style={{ ...s.logoutBtn, background: "#0f766e", color: "#ccfbf1", borderColor: "#115e59" }} 
                onClick={() => setShowUsersManager(true)}
              >
                🛡️ {tr("إدارة المستخدمين والصلاحيات", "Users & Permissions")}
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
              🚪 {tr("خروج", "Sign Out")}
            </button>
          </div>
        </div>

        <Toaster />

        {/* Header receives filtered snags for reports */}
        <Header 
          snags={displaySnags} 
          onImport={mergeImported} 
          isAdmin={user.role === "admin"}
          currentUser={user}
          activeModule={activeTab}
          onWipeAll={wipeAll}
        />

        {/* Tab Navigation (Filtered by User's View Permissions) */}
        <div style={s.tabs} className="tabs-row">
          {canUser(user, "snags", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "snags" ? s.activeTab : {}) }}
              onClick={() => setActiveTab("snags")}
            >
              📋 {tr("سجل الملاحظات", "Snags Log")}
            </button>
          )}
          {canUser(user, "whatsapp-hub", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "whatsapp-hub" ? { ...s.activeTab, background: "linear-gradient(135deg, #059669, #15803d)", color: "#ecfdf5" } : {}) }}
              onClick={() => setActiveTab("whatsapp-hub")}
            >
              💬 {tr("تحليل واتساب وملخص الـ 3 شيفتات", "WhatsApp Groups & 3-Shifts Hub")}
            </button>
          )}
          {canUser(user, "operations-plans", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "operations-plans" ? { ...s.activeTab, background: "linear-gradient(135deg, #16a34a, #0e7490)", color: "#f0fdf4" } : {}) }}
              onClick={() => setActiveTab("operations-plans")}
            >
              📅 {tr("خطط التشغيل والتقارير (اللاندسكيب • السبايدر • المكافحة • النظافة)", "Operations Plans & Reports (Daily • Weekly • Monthly)")}
            </button>
          )}
          {canUser(user, "park-street", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "park-street" ? { ...s.activeTab, background: "linear-gradient(135deg, #0e7490, #4c1d95)", color: "#f0f9ff" } : {}) }}
              onClick={() => setActiveTab("park-street")}
            >
              🌟 {tr("سناج بارك ستريت (الأمن • العميل • الزراعة • البيزمنت)", "Park St. Snag (4 Sectors)")}
            </button>
          )}
          {canUser(user, "restrooms", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "restrooms" ? { ...s.activeTab, background: "linear-gradient(135deg, #065f46, #047857)", color: "#ecfdf5" } : {}) }}
              onClick={() => setActiveTab("restrooms")}
            >
              🚽 {tr("مركز الحمامات وغرف النظافة", "Restrooms & Janitor Center")}
            </button>
          )}
          {canUser(user, "units", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "units" ? s.activeTab : {}) }}
              onClick={() => setActiveTab("units")}
            >
              🏢 {tr("بيانات الوحدات", "Units Directory")}
            </button>
          )}
          {canUser(user, "stores", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "stores" ? s.activeTab : {}) }}
              onClick={() => setActiveTab("stores")}
            >
              📦 {tr("بيانات المخازن", "Stores Directory")}
            </button>
          )}
          {canUser(user, "ai", "view") && (
            <button 
              style={{ ...s.tab, ...(activeTab === "ai" ? { ...s.activeTab, background: "linear-gradient(135deg, #1e1b4b, #312e81)", color: "#c4b5fd", borderColor: "#4c1d95" } : {}) }}
              onClick={() => setActiveTab("ai")}
            >
              🧠 {tr("مركز الذكاء", "AI Center")}
            </button>
          )}
          {canUser(user, "customLists", "view") && customLists.map(list => (
            <div key={list.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <button 
                style={{ ...s.tab, ...(activeTab === list.id ? s.activeTab : {}) }}
                onClick={() => setActiveTab(list.id)}
              >
                📁 {list.name}
              </button>
              {canManageLists && (
                <button 
                  style={s.delListBtn} 
                  onClick={() => {
                    if(window.confirm(tr(`هل أنت متأكد من حذف القائمة "${list.name}" نهائياً؟`, `Are you sure you want to permanently delete list "${list.name}"?`))) {
                      removeCustomList(list.id)
                      if(activeTab === list.id) setActiveTab("snags")
                    }
                  }}
                  title={tr("حذف القائمة", "Delete List")}
                >
                  ✖
                </button>
              )}
            </div>
          ))}
          {canManageLists && (
            <button 
              style={{ ...s.tab, border: "1px dashed #475569", color: "#94a3b8" }}
              onClick={() => {
                const name = window.prompt(tr("أدخل اسم القائمة الجديدة:", "Enter new custom list name:"))
                if (name && name.trim()) addCustomList(name.trim())
              }}
            >
              ➕ {tr("قائمة جديدة", "New List")}
            </button>
          )}
        </div>

        {activeTab === "snags" && canUser(user, "snags", "view") && (
          <>
            {/* Quick-access banners to WhatsApp Hub, Operations Plans, Park St. Inspection & Restroom Snag Center */}
            <div className="quick-banners-grid">
              {canUser(user, "whatsapp-hub", "view") && (
                <div
                  onClick={() => setActiveTab("whatsapp-hub")}
                  style={{
                    background: "linear-gradient(135deg, rgba(5,150,105,0.38), rgba(15,23,42,0.85))",
                    border: "1px solid #22c55e",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>💬</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#ecfdf5" }}>
                        {tr("WHATSAPP 3-SHIFTS AI HUB | تحليل جروبات الواتساب وملخص نهاية الـ 3 شيفتات", "WHATSAPP 3-SHIFTS AI HUB | WhatsApp Groups & Shift Summary")}
                      </div>
                      <div style={{ fontSize: 11, color: "#86efac" }}>
                        {tr(
                          "🔧 الصيانة • ⚙️ التشغيل • 🛡️ الأمن • 🧹 النظافة • 🧯 السيفتي | حصر المفتوح والمنتهي والفئات والملخص التنفيذي",
                          "🔧 Maintenance • ⚙️ Operations • 🛡️ Security • 🧹 Housekeeping • 🧯 Safety | Open vs Done & Executive Summary"
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "6px 12px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                  }}>
                    {tr("فتح محلل الواتساب والشيفتات ←", "Open WhatsApp Hub →")}
                  </span>
                </div>
              )}

              {canUser(user, "operations-plans", "view") && (
                <div
                  onClick={() => setActiveTab("operations-plans")}
                  style={{
                    background: "linear-gradient(135deg, rgba(22,163,74,0.32), rgba(14,116,144,0.45))",
                    border: "1px solid #10b981",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>📅</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#ecfdf5" }}>
                        {tr("OPERATIONS ACTION PLANS | خطط التشغيل والتقارير (يومي • أسبوعي • شهري)", "OPERATIONS ACTION PLANS | Daily, Weekly & Monthly Reports")}
                      </div>
                      <div style={{ fontSize: 11, color: "#a7f3d0" }}>
                        {tr(
                          "🌿 اللاندسكيب • 🧗 السبايدر والواجهات • 🦟 البيست كنترول • 🧹 الهاوس كيبنج والـ 3 ورديات",
                          "🌿 Landscape • 🧗 Spider & Facades • 🦟 Pest Control • 🧹 Housekeeping & 3 Shifts"
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "6px 12px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                  }}>
                    {tr("فتح خطط التشغيل والتقارير ←", "Open Action Plans →")}
                  </span>
                </div>
              )}

              {canUser(user, "park-street", "view") && (
                <div
                  onClick={() => setActiveTab("park-street")}
                  style={{
                    background: "linear-gradient(135deg, rgba(14,116,144,0.32), rgba(76,29,149,0.45))",
                    border: "1px solid #06b6d4",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>🌟</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#f0f9ff" }}>
                        {tr("PARK ST. SNAG | منظومة فحص بارك ستريت الشاملة", "PARK ST. SNAG | Integrated Mall Inspection")}
                      </div>
                      <div style={{ fontSize: 11, color: "#a5f3fc" }}>
                        {tr(
                          "🛡️ الأمن والحراسة • 🚶‍♂️ رحلة العميل • 🌿 الزراعة واللاندسكيب • 🚗 مسار السيارات بالبيزمنت",
                          "🛡️ Security & CCTV • 🚶‍♂️ Customer Journey • 🌿 Landscape • 🚗 Basement Car Path"
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: "#06b6d4",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "6px 12px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                  }}>
                    {tr("فتح سناج بارك ستريت ←", "Open Park St. Snag →")}
                  </span>
                </div>
              )}

              {canUser(user, "restrooms", "view") && (
                <div
                  onClick={() => setActiveTab("restrooms")}
                  style={{
                    background: "linear-gradient(135deg, rgba(6,95,70,0.28), rgba(30,27,75,0.5))",
                    border: "1px solid #059669",
                    borderRadius: 14,
                    padding: "12px 16px",
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
                        {tr("RESTROOM & JANITOR SNAG | مركز الحمامات وغرف النظافة", "RESTROOM & JANITOR SNAG | Restrooms & Janitor Rooms")}
                      </div>
                      <div style={{ fontSize: 11, color: "#a7f3d0" }}>
                        {tr(
                          "50 حمام + 36 غرفة نظافة (Janitor Room) • تصدير إكسيل بالصور المدمجة",
                          "50 Restrooms + 36 Janitor Rooms • Interactive Excel Export with Photos"
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "6px 12px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                  }}>
                    {tr("فتح مركز الحمامات ←", "Open Restrooms Center →")}
                  </span>
                </div>
              )}
            </div>

            <StatBar
              stats={stats}
              activeFilter={statusFilter}
              onFilter={(f) => setStatusFilter(f)}
            />
            <div className="app-grid">
              <SnagForm
                onAdd={addSnag}
                userName={user.displayName || user.email}
                userEmail={user.email}
                currentUser={user}
                notify={notify}
              />
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
        
        {activeTab === "whatsapp-hub" && canUser(user, "whatsapp-hub", "view") && (
          <WhatsAppShiftHubModule
            currentUser={user}
            notify={notify}
            onAddSnag={addSnag}
            snags={snags}
            onCycleSnagStatus={cycleStatus}
            onUpdateSnag={updateSnag}
          />
        )}
        {activeTab === "operations-plans" && canUser(user, "operations-plans", "view") && <OperationsPlansModule currentUser={user} notify={notify} onAddSnag={addSnag} />}
        {activeTab === "park-street" && canUser(user, "park-street", "view") && <ParkStreetModule currentUser={user} notify={notify} onAddSnag={addSnag} />}
        {activeTab === "restrooms" && canUser(user, "restrooms", "view") && <RestroomsModule currentUser={user} notify={notify} onAddSnag={addSnag} />}
        {activeTab === "units" && canUser(user, "units", "view") && <UnitsModule currentUser={user} notify={notify} />}
        {activeTab === "stores" && canUser(user, "stores", "view") && <StoresModule currentUser={user} notify={notify} />}
        {activeTab === "ai" && canUser(user, "ai", "view") && <AICommandCenter snags={snags} />}
        
        {canUser(user, "customLists", "view") && customLists.find(l => l.id === activeTab) && (
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
    flexWrap:"wrap", gap:10,
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
    display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 10, flexWrap: "wrap"
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
