import React, { useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { ACADEMY_COURSES, PASS_SCORE, TOTAL_LESSONS } from "../constants/trainingCurriculum.js";

const background = "#0b1628";
const card = { background: "#101f35", border: "1px solid #29405c", borderRadius: 14, padding: 18 };
const buttonBase = { border: "1px solid #344b68", background: "#1d3552", color: "#f1f5f9", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700, lineHeight: 1.5 };
const muted = { color: "#a6b7ce", lineHeight: 1.85 };
const percentage = (completed, total) => total ? Math.round(completed * 100 / total) : 0;

function storageKey(user) {
  return "parkstreet-training:v1:" + String(user?.uid || user?.email || "anonymous");
}
function readProgress(user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(user)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function persistProgress(user, next) {
  try {
    localStorage.setItem(storageKey(user), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export default function TrainingCenter({ currentUser }) {
  const { lang, tr } = useLanguage();
  const [courseId, setCourseId] = useState("operations");
  const [lessonId, setLessonId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(() => readProgress(currentUser));
  const [storageWarning, setStorageWarning] = useState(false);
  const [filter, setFilter] = useState("all");

  const courses = useMemo(() => {
    if (filter === "all") return ACADEMY_COURSES;
    return ACADEMY_COURSES.filter(c => c.id === filter);
  }, [filter]);
  const currentCourse = ACADEMY_COURSES.find(c => c.id === courseId) || ACADEMY_COURSES[0];
  const lesson = currentCourse.lessons.find(item => item.id === lessonId) || null;
  const completedLessons = ACADEMY_COURSES.reduce((sum, course) =>
    sum + course.lessons.filter(item => progress[item.id]?.passed === true).length, 0);
  const totalMinutes = ACADEMY_COURSES.reduce((sum, course) =>
    sum + course.lessons.reduce((s, item) => s + item.minutes, 0), 0);

  const title = (item) => lang === "ar" ? item.titleAr : item.titleEn;
  const courseCompleted = (course) => course.lessons.filter(l => progress[l.id]?.passed).length;

  function selectCourse(id) {
    setCourseId(id);
    setLessonId(null);
    setAnswers({});
    setResult(null);
  }

  function selectLesson(id) {
    setLessonId(id);
    setAnswers({});
    setResult(null);
  }

  function submitQuiz() {
    if (!lesson || !lesson.quiz || Object.keys(answers).length !== lesson.quiz.length) return;
    const correct = lesson.quiz.filter((question, index) => answers[index] === question.answer).length;
    const score = Math.round(correct * 100 / lesson.quiz.length);
    const passed = score >= PASS_SCORE;
    setResult({ score, passed });
    const existing = progress[lesson.id] || {};
    const next = {
      ...progress,
      [lesson.id]: {
        score: Math.max(existing.score || 0, score),
        passed: Boolean(existing.passed || passed),
        attempts: (existing.attempts || 0) + 1,
        lastAttempt: new Date().toISOString()
      }
    };
    setProgress(next);
    setStorageWarning(!persistProgress(currentUser, next));
  }

  function speak(phrase) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(phrase);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio playback is optional; the written lesson remains available.
    }
  }

  return (
    <section style={{ background, borderRadius: 18, border: "1px solid #20344e", padding: "clamp(12px, 3vw, 24px)", color: "#f1f5f9", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <div style={{ ...card, background: "linear-gradient(130deg,#12335a,#252056)" }}>
        <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 800, letterSpacing: ".06em" }}>PARK STREET TRAINING ACADEMY</div>
        <h2 style={{ margin: "8px 0", fontSize: "clamp(22px, 4vw, 30px)" }}>🎓 {tr("أكاديمية التدريب والتطوير", "Learning & Development Academy")}</h2>
        <p style={{ ...muted, margin: 0 }}>
          {tr("تدريب ميداني للفرق التشغيلية، الأمن، الصيانة، النظافة، خدمة الضيوف واللغة الإنجليزية المهنية.", "Practical learning for operations, security, maintenance, housekeeping, guest experience and workplace English.")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <div style={{ ...card, background: "#101f35cc", minWidth: 120, flex: "1 1 110px", padding: 12 }}>
            <div style={{ color: "#8eb9e9", fontSize: 12 }}>{tr("المسارات", "Tracks")}</div>
            <div style={{ fontSize: 27, fontWeight: 900 }}>{ACADEMY_COURSES.length}</div>
          </div>
          <div style={{ ...card, background: "#101f35cc", minWidth: 120, flex: "1 1 110px", padding: 12 }}>
            <div style={{ color: "#8eb9e9", fontSize: 12 }}>{tr("الدروس المجتازة", "Passed lessons")}</div>
            <div style={{ fontSize: 27, fontWeight: 900 }}>{completedLessons}/{TOTAL_LESSONS}</div>
          </div>
          <div style={{ ...card, background: "#101f35cc", minWidth: 120, flex: "1 1 110px", padding: 12 }}>
            <div style={{ color: "#8eb9e9", fontSize: 12 }}>{tr("نسبة الإنجاز", "Completion")}</div>
            <div style={{ fontSize: 27, fontWeight: 900 }}>{percentage(completedLessons, TOTAL_LESSONS)}%</div>
          </div>
          <div style={{ ...card, background: "#101f35cc", minWidth: 120, flex: "1 1 110px", padding: 12 }}>
            <div style={{ color: "#8eb9e9", fontSize: 12 }}>{tr("دقائق المحتوى", "Learning minutes")}</div>
            <div style={{ fontSize: 27, fontWeight: 900 }}>{totalMinutes}</div>
          </div>
        </div>
      </div>

      <p style={{ color: "#fcd34d", background: "#45351840", border: "1px solid #795819", borderRadius: 10, padding: "10px 12px", fontSize: 12, lineHeight: 1.8 }}>
        ⚠️ {tr("نسخة تدريبية أولية: يتم حفظ نتائج الاختبارات على هذا الجهاز والمتصفح فقط، وليست سجلًا مركزيًا معتمدًا أو شهادة رسمية. اتبع دائمًا إجراءات السلامة والتشغيل المعتمدة بالموقع.", "Pilot module: quiz progress is saved only in this browser/device. It is not a central training record or official certification. Follow your site's approved SOPs and safety procedures.")}
      </p>
      {storageWarning && <p role="alert" style={{ color: "#fca5a5" }}>{tr("تعذر حفظ التقدم على هذا الجهاز؛ النتائج الحالية مؤقتة.", "Could not save progress on this device; current results are temporary.")}</p>}

      <h3 style={{ marginTop: 24, marginBottom: 10 }}>{tr("اختر المسار التدريبي", "Choose a learning track")}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <button style={{ ...buttonBase, background: filter === "all" ? "#075985" : "#1d3552" }} onClick={() => setFilter("all")}>{tr("جميع المسارات", "All tracks")}</button>
        {ACADEMY_COURSES.map(c => <button key={c.id} style={{ ...buttonBase, background: filter === c.id ? "#075985" : "#1d3552" }} onClick={() => { setFilter(c.id); selectCourse(c.id); }}>{c.icon} {title(c)}</button>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 12 }}>
        {courses.map(course => {
          const count = courseCompleted(course);
          const active = courseId === course.id;
          return <button key={course.id} onClick={() => selectCourse(course.id)}
            aria-pressed={active}
            style={{ ...card, textAlign: lang === "ar" ? "right" : "left", cursor: "pointer", background: active ? "#1b3453" : "#101f35", borderColor: active ? course.color : "#29405c", color: "#fff", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 30 }}>{course.icon}</span>
              <span style={{ color: course.color, fontWeight: 800, fontSize: 13 }}>{count}/{course.lessons.length} {tr("دروس", "lessons")}</span>
            </div>
            <h4 style={{ margin: "6px 0", fontSize: 17 }}>{title(course)}</h4>
            <p style={{ ...muted, fontSize: 13, margin: "0 0 10px" }}>{lang === "ar" ? course.summaryAr : course.summaryEn}</p>
            <div style={{ background: "#0b1526", height: 7, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ background: course.color, width: percentage(count, course.lessons.length) + "%", height: "100%" }} />
            </div>
          </button>;
        })}
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16, alignItems: "start" }}>
        <aside style={card}>
          <div style={{ color: currentCourse.color, fontWeight: 800, fontSize: 12 }}>{currentCourse.titleEn}</div>
          <h3 style={{ margin: "6px 0 14px" }}>{currentCourse.icon} {title(currentCourse)}</h3>
          <div style={{ display: "grid", gap: 9 }}>
            {currentCourse.lessons.map((item, index) => {
              const done = progress[item.id]?.passed === true;
              return <button key={item.id} onClick={() => selectLesson(item.id)} style={{ ...buttonBase, display: "flex", alignItems: "center", textAlign: lang === "ar" ? "right" : "left", background: lessonId === item.id ? "#28466a" : "#12243b", gap: 12, borderColor: lessonId === item.id ? currentCourse.color : "#29405c" }}>
                <span style={{ background: done ? "#047857" : "#344b68", borderRadius: 9, padding: "6px 9px", whiteSpace: "nowrap" }}>{done ? "✓" : index + 1}</span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: "block" }}>{title(item)}</strong>
                  <small style={{ color: "#9cb2ce" }}>⏱ {item.minutes} {tr("دقيقة", "min")} {done ? " · " + tr("مجتاز", "Passed") : ""}</small>
                </span>
              </button>;
            })}
          </div>
        </aside>

        <article style={card}>
          {!lesson ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 45 }}>📖</div>
              <h3>{tr("اختر درسًا للبدء", "Select a lesson to begin")}</h3>
              <p style={muted}>{tr("كل درس يحتوي على أهداف وإرشادات وموقف عملي واختبار قصير.", "Every lesson includes objectives, guided steps, a scenario, and a short quiz.")}</p>
              <button style={{ ...buttonBase, background: "#0369a1" }} onClick={() => selectLesson(currentCourse.lessons[0].id)}>{tr("ابدأ أول درس", "Start first lesson")}</button>
            </div>
          ) : (
            <>
              <div style={{ color: "#9cb2ce", fontSize: 12 }}>{currentCourse.titleEn} · {lesson.minutes} {tr("دقيقة", "minutes")}</div>
              <h3 style={{ fontSize: 22, margin: "7px 0 16px" }}>{title(lesson)}</h3>

              <h4 style={{ color: "#7dd3fc", marginBottom: 8 }}>🎯 {tr("أهداف التعلم", "Learning objectives")}</h4>
              <ul style={{ ...muted, paddingInlineStart: 24 }}>
                {lesson.objectives.map((text, i) => <li key={i}>{text}</li>)}
              </ul>

              <h4 style={{ color: "#7dd3fc", marginBottom: 8 }}>🧭 {tr("المادة التدريبية والخطوات", "Training material & procedure")}</h4>
              <ol style={{ ...muted, paddingInlineStart: 24 }}>
                {lesson.steps.map((text, i) => <li key={i} style={{ marginBottom: 7 }}>{text}</li>)}
              </ol>

              {lesson.phrases && <>
                <h4 style={{ color: "#7dd3fc" }}>🗣️ {tr("عبارات للعمل والتدريب على النطق", "Workplace phrases & pronunciation")}</h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {lesson.phrases.map((p, i) => <div key={i} style={{ background: "#0c1b30", borderRadius: 10, padding: 12, border: "1px solid #304361" }}>
                    <div lang="en" dir="ltr" style={{ fontWeight: 800, fontSize: 15 }}>{p.en}</div>
                    <div style={{ ...muted, fontSize: 13 }}>{p.ar}</div>
                    <button type="button" style={{ ...buttonBase, marginTop: 8, fontSize: 12 }} onClick={() => speak(p.en)}>🔊 {tr("استمع للجملة", "Listen to phrase")}</button>
                  </div>)}
                </div>
              </>}

              <div style={{ marginTop: 16, background: "#0c2433", border: "1px solid #166080", borderRadius: 12, padding: 13 }}>
                <strong>🎭 {tr("موقف عملي", "Real-life scenario")}</strong>
                <p style={{ ...muted, margin: "7px 0" }}>{lesson.scenario}</p>
                <strong style={{ fontSize: 13 }}>✅ {tr("تطبيق عملي", "Practice task")}</strong>
                <p style={{ ...muted, marginBottom: 0 }}>{lesson.practice}</p>
              </div>

              <div style={{ marginTop: 20, paddingTop: 10, borderTop: "1px solid #334155" }}>
                <h4>📝 {tr("اختبار مراجعة قصير", "Quick knowledge check")} ({tr("درجة النجاح", "Passing score")} {PASS_SCORE}%)</h4>
                {lesson.quiz.map((question, qi) => (
                  <fieldset key={qi} style={{ border: "1px solid #304361", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <legend style={{ fontWeight: 800, padding: "0 5px" }}>{qi + 1}. {question.q}</legend>
                    {question.options.map((option, oi) => (
                      <label key={oi} style={{ display: "flex", alignItems: "center", gap: 8, margin: "9px 0", cursor: result ? "default" : "pointer", color: "#d9e5f5" }}>
                        <input type="radio" name={lesson.id + "-q-" + qi} checked={answers[qi] === oi} disabled={Boolean(result)}
                          onChange={() => setAnswers(prev => ({ ...prev, [qi]: oi }))} />
                        <span>{option}</span>
                      </label>
                    ))}
                    {result && <div style={{ color: "#a7f3d0", fontSize: 12, marginTop: 9 }}>{question.why}</div>}
                  </fieldset>
                ))}
                {result ? (
                  <div role="status" style={{ background: result.passed ? "#064e3b" : "#78350f", borderRadius: 10, padding: 13 }}>
                    <strong>{result.passed ? "✅ " + tr("اجتزت الاختبار", "Knowledge check passed") : "🔁 " + tr("راجع الدرس وحاول مرة أخرى", "Review and try again")}</strong>
                    <p style={{ margin: "7px 0" }}>{tr("النتيجة", "Score")}: {result.score}%</p>
                    <button style={buttonBase} onClick={() => { setAnswers({}); setResult(null); }}>{tr("أعد المحاولة", "Try again")}</button>
                  </div>
                ) : (
                  <button style={{ ...buttonBase, background: "#047857", opacity: Object.keys(answers).length !== lesson.quiz.length ? 0.5 : 1 }}
                    disabled={Object.keys(answers).length !== lesson.quiz.length} onClick={submitQuiz}>
                    {tr("تسليم الاختبار", "Submit knowledge check")}
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
