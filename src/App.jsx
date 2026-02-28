import React, { useState, useEffect, useMemo, useRef, Component } from "react";
import { ClipboardList, Home, History, Activity, MessageCircle, Send, Youtube, ImageOff, Dumbbell, Edit2, RotateCcw, Trash2 } from "lucide-react";

/* === 錯誤邊界 (Error Boundary) 防止整個 App 崩潰 === */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF8F5] flex items-center justify-center p-6 text-[#4A3B32]">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#EBE3DB] max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">系統發生異常</h2>
            <p className="text-sm text-[#8C7A6B] mb-4">很抱歉，應用程式遇到了一些問題。</p>
            <div className="text-xs bg-red-50 text-red-800 p-3 rounded-xl overflow-auto text-left mb-4">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="w-full bg-[#B68D6D] text-white py-2 rounded-xl text-sm font-bold shadow-sm"
            >
              清除暫存並重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* === 簡易替換的 UI 元件 === */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-[#EBE3DB] ${className}`}>{children}</div>
);
const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

/* === 內部圖片讀取元件 === */
const GifImage = ({ src, alt }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FBF8F5] text-[#A3978F] p-4 text-center">
        <ImageOff size={24} className="mb-2 opacity-50" />
        <span className="text-xs font-bold text-[#8C7A6B] mb-1">圖片載入受限</span>
        <span className="text-[10px]">來源網站阻擋了圖片顯示<br/>請直接點擊右下角看影片教學</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-contain mix-blend-multiply px-4 py-2" 
      onError={() => setError(true)}
    />
  );
};

/* === 資料庫 === */
const exercises = [
  { name: "滑輪下拉機", target: "back", sets: "12 x 4", time: 8, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif", focus: "改善駝背/增加寬度" },
  { name: "坐姿划船機", target: "back", sets: "15 x 3", time: 7, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif", focus: "改善圓肩/夾緊肩胛" },
  { name: "啞鈴側平舉", target: "shoulder", sets: "15 x 4", time: 8, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif", focus: "增加肩寬/解決骨架小" },
  { name: "坐姿肩推機", target: "shoulder", sets: "12 x 3", time: 7, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/04/Lever-Shoulder-Press.gif", focus: "立體肩膀" },
  { name: "坐姿胸推機", target: "chest", sets: "12 x 3", time: 8, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Press-Machine.gif", focus: "胸部厚度" },
  { name: "蝴蝶夾胸機", target: "chest", sets: "15 x 3", time: 8, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pec-Deck-Fly.gif", focus: "胸大肌/中縫" },
  { name: "捲腹機", target: "abs", sets: "20 x 3", time: 5, gif: "https://fitnessprogramer.com/wp-content/uploads/2021/09/Seated-Crunch-Machine.gif", focus: "收緊肋骨外翻/減腹" },
  { name: "跑步機", target: "cardio", sets: "10 分鐘", time: 10, gif: "https://fitnessprogramer.com/wp-content/uploads/2023/01/treadmill-for-aerobic-exercises.gif", focus: "消脂肪肚" }
];

const correctionExercises = [
  { name: "腹式呼吸", desc: "專注吐氣時將肋骨向下收緊，每天10分，改善肋骨外翻", gif: "https://respelearning.scot/sites/default/files/breathing_diaphragm.gif" },
  { name: "牆天使", desc: "背靠牆雙手上下滑動，改善工程師圓肩", gif: "https://fa.pelank.com/wp-content/uploads/2025/10/wall-slide.gif" },
  { name: "貓牛式", desc: "增加胸椎活動度，解決長期久坐僵硬", gif: "https://fitnessprogramer.com/wp-content/uploads/2021/02/cat-cow.gif" }
];

// 安全的時間解析工具，防止 Invalid Date 崩潰
const safeFormatDateTime = (isoString) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "未知時間";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } catch (e) {
    return "未知時間";
  }
};

// 計算每日推薦：嚴格選出 5 項計畫，讓使用者一次看齊
function analyzeDailyRecommendation(logs, profile) {
  const p = profile || { height: 174, weight: 71.5, age: 32, job: "Engineer" };
  
  // 加入防護，避免身高為 0 導致無限大 (Infinity) 崩潰
  let bmi = "N/A";
  const h = Number(p.height) || 174;
  const w = Number(p.weight) || 71.5;
  if (h > 0) {
    bmi = (w / ((h / 100) ** 2)).toFixed(1);
  }

  const counts = { back: 0, shoulder: 0, abs: 0, chest: 0, cardio: 0 };
  
  if (Array.isArray(logs)) {
    logs.slice(-20).forEach(log => {
      const ex = exercises.find(e => e.name === log?.exercise);
      if (ex) counts[ex.target]++;
    });
  }

  const priority = ["back", "shoulder", "abs", "cardio", "chest"];
  const sortedPriority = [...priority].sort((a, b) => {
    const scoreA = counts[a] - (a === "back" || a === "shoulder" ? 0.5 : 0);
    const scoreB = counts[b] - (b === "back" || b === "shoulder" ? 0.5 : 0);
    return scoreA - scoreB;
  });

  const primaryTarget = sortedPriority[0];
  const secondaryTarget = sortedPriority[1];
  
  // 萃取前兩名弱項部位的動作 (各挑 2 個)
  const primaryEx = exercises.filter(e => e.target === primaryTarget).slice(0, 2);
  const secondaryEx = exercises.filter(e => e.target === secondaryTarget).slice(0, 2);
  let recommended = [...primaryEx, ...secondaryEx];
  
  // 確保必定包含 1 項有氧
  if (!recommended.find(e => e.target === "cardio")) {
    const cardioEx = exercises.find(e => e.target === "cardio");
    if (cardioEx) recommended.push(cardioEx);
  }

  // 如果湊不滿 5 項，用剩餘的動作補齊至 5 項
  if (recommended.length < 5) {
    const remaining = exercises.filter(e => !recommended.includes(e));
    recommended = [...recommended, ...remaining.slice(0, 5 - recommended.length)];
  }

  recommended = recommended.slice(0, 5);

  let analysis = `目前 BMI ${bmi}。偵測到工程師體態風險。`;
  if (primaryTarget === "back") analysis += "今日重點：拉開胸腔，強化背肌以修正圓肩。";
  if (primaryTarget === "shoulder") analysis += "今日重點：強化中束，打造寬肩視覺。";

  return { recommended, analysis };
}

function MainApp() {
  // === 動態個人資料狀態 (加入 try-catch 與空值防護) ===
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("gymProfile");
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && typeof parsed === 'object') ? parsed : { height: 174, weight: 71.5, age: 32, job: "Engineer" };
    } catch (e) {
      console.warn("Storage access limited:", e);
      return { height: 174, weight: 71.5, age: 32, job: "Engineer" };
    }
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("daily");
  const [completedToday, setCompletedToday] = useState([]);
  const [weightInputs, setWeightInputs] = useState({});
  const [expandedHistory, setExpandedHistory] = useState(null);

  // === 日期追蹤狀態 ===
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString());

  // === AI 教練狀態 ===
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ 
    role: "model", 
    text: "你好！我是你的專屬 AI 健身教練✨ 關於你的工程師體態（圓肩、肋骨外翻），或是今天的訓練課表，有什麼我可以幫忙的嗎？" 
  }]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  /* 🔥 關鍵：在此處讀取 Vercel 的環境變數 🔥 */
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

  // === 零耗電跨日偵測機制 ===
  useEffect(() => {
    const checkCrossDay = () => {
      try {
        const todayDateStr = new Date().toLocaleDateString();
        if (todayDateStr !== currentDate) {
          setCurrentDate(todayDateStr);
          setCompletedToday([]); 
          setAiAnalysis(""); 
        }
      } catch (e) { console.error(e); }
    };

    checkCrossDay();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkCrossDay();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentDate]);

  // === 本地資料儲存與讀取 ===
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem("gymLogs_v2");
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        setLogs(Array.isArray(parsedLogs) ? parsedLogs : []);
      }
      
      const savedCompleted = localStorage.getItem(`completed_${currentDate}`);
      if (savedCompleted) {
        const parsedCompleted = JSON.parse(savedCompleted);
        setCompletedToday(Array.isArray(parsedCompleted) ? parsedCompleted : []);
      } else {
        setCompletedToday([]); 
      }
    } catch (e) {
      console.warn("讀取紀錄失敗，將採用初始狀態", e);
      setLogs([]);
      setCompletedToday([]);
    }
  }, [currentDate]);

  // === 安全的資料寫入機制 ===
  useEffect(() => {
    try { localStorage.setItem("gymProfile", JSON.stringify(profile)); } catch (e) {}
  }, [profile]);
  
  useEffect(() => {
    try { localStorage.setItem("gymLogs_v2", JSON.stringify(logs)); } catch (e) {}
  }, [logs]);
  
  useEffect(() => {
    try { localStorage.setItem(`completed_${currentDate}`, JSON.stringify(completedToday)); } catch (e) {}
  }, [completedToday, currentDate]);

  const dailyPlan = useMemo(() => analyzeDailyRecommendation(logs, profile), [logs, profile]);

  // === 進度條計算 (加入防護) ===
  const progressPercentage = useMemo(() => {
    if (!dailyPlan.recommended || dailyPlan.recommended.length === 0) return 0;
    const completedCount = Array.isArray(completedToday) ? completedToday.length : 0;
    return Math.round((completedCount / dailyPlan.recommended.length) * 100);
  }, [completedToday, dailyPlan.recommended]);

  // === 完成紀錄、重置與刪除 ===
  const handleComplete = (exName) => {
    if ((completedToday || []).includes(exName)) return;
    const newLog = { 
      exercise: exName, 
      weight: weightInputs[exName] || "N/A", 
      timestamp: new Date().toISOString() 
    };
    setLogs([...(logs || []), newLog]);
    setCompletedToday([...(completedToday || []), exName]);
    setWeightInputs({...weightInputs, [exName]: ""});
  };

  const handleResetToday = () => {
    const safeLogs = logs || [];
    const updatedLogs = safeLogs.filter(log => {
      try {
        const logDate = new Date(log.timestamp).toLocaleDateString();
        const isToday = logDate === currentDate;
        const isRecommended = dailyPlan.recommended.some(r => r.name === log.exercise);
        return !(isToday && isRecommended); 
      } catch (e) { return true; }
    });
    setLogs(updatedLogs);
    setCompletedToday([]);
    setWeightInputs({});
  };

  const handleDeleteLog = (timestampToDelete, exerciseName) => {
    const safeLogs = logs || [];
    const updatedLogs = safeLogs.filter(log => log.timestamp !== timestampToDelete);
    setLogs(updatedLogs);

    try {
      const isToday = new Date(timestampToDelete).toLocaleDateString() === currentDate;
      if (isToday) {
        const remainingLogsToday = updatedLogs.filter(log => {
          try {
            return new Date(log.timestamp).toLocaleDateString() === currentDate && log.exercise === exerciseName;
          } catch(e) { return false; }
        });
        if (remainingLogsToday.length === 0) {
          setCompletedToday(prev => (prev || []).filter(ex => ex !== exerciseName));
        }
      }
    } catch (e) { console.error(e); }
  };

  // === AI 呼叫 ===
  const callGemini = async (prompt, systemInstruction) => {
    // 檢查有沒有設定金鑰
    if (!apiKey) {
      return "尚未設定 VITE_GEMINI_API_KEY，請至 Vercel 環境變數設定您的金鑰！";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "教練現在有點忙，請稍後再試。";
    } catch (error) {
      return "連線發生錯誤，請確認網路狀態。";
    }
  };

  const generateCoachFeedback = async () => {
    setIsAnalyzing(true);
    try {
      const safeLogs = logs || [];
      const recentLogs = safeLogs.slice(-10).map(l => `${l.exercise}(${l.weight}kg)`).join(", ");
      const p = profile || { age: 32, height: 174, weight: 71.5 };
      const prompt = `我是一名 ${p.age} 歲工程師，身高 ${p.height}cm，體重 ${p.weight}kg。我有圓肩、駝背、肋骨外翻的問題。這是我最近的訓練紀錄：${recentLogs || "目前還沒有紀錄"}。請給我一段 50 字左右的毒舌但充滿鼓勵的專屬教練講評，並告訴我今天的重訓重點。`;
      const instruction = "你是一位專業、幽默、有時微毒舌但充滿關心的健身教練。不要使用 Markdown 格式。";
      const result = await callGemini(prompt, instruction);
      setAiAnalysis(result);
    } catch (error) {
      setAiAnalysis("教練正在準備講評中，請稍後再試！");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const p = profile || { age: 32 };
      const prompt = `用戶提問：${userMsg}。請以專業健身教練的角度，針對這名 ${p.age} 歲有圓肩駝背的工程師給出簡短（100字內）且具體的建議。`;
      const instruction = "你是一位專業的健身教練，專門解決工程師的體態問題（圓肩、肋骨外翻）。回答要專業、具體、溫和，且排版容易閱讀。";
      const result = await callGemini(prompt, instruction);
      setChatMessages(prev => [...prev, { role: "model", text: result }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: "model", text: "抱歉，教練剛剛信號不好，請再問一次！" }]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    if (tab === "coach") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, tab, isChatting]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FBF8F5] pb-20 font-sans relative overflow-x-hidden shadow-2xl">
      {/* Header 與個人資料編輯區 */}
      <div className="bg-[#B68D6D] p-6 text-white shadow-md rounded-b-[2rem] transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-wide">吉米的訓練計畫</h1>
            <p className="text-[#F4EBE1] text-sm mt-1 opacity-90">
              {profile?.height || 174}cm / {profile?.weight || 71.5}kg ({profile?.age || 32}y)
            </p>
          </div>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="p-2 bg-[#A37A5C] rounded-full hover:bg-[#8C684E] transition-colors"
          >
            <Edit2 size={16} />
          </button>
        </div>

        {/* 動態輸入展開面板 */}
        {isEditingProfile && (
          <div className="mt-4 pt-4 border-t border-[#C49D82] animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#F4EBE1] opacity-80 mb-1 block">身高 (cm)</label>
                <input 
                  type="number" 
                  value={profile?.height || ""} 
                  onChange={(e) => setProfile({...profile, height: Number(e.target.value) || ""})} 
                  className="w-full bg-[#A37A5C] text-white border border-[#C49D82] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white" 
                />
              </div>
              <div>
                <label className="text-[10px] text-[#F4EBE1] opacity-80 mb-1 block">體重 (kg)</label>
                <input 
                  type="number" 
                  value={profile?.weight || ""} 
                  onChange={(e) => setProfile({...profile, weight: Number(e.target.value) || ""})} 
                  className="w-full bg-[#A37A5C] text-white border border-[#C49D82] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white" 
                />
              </div>
              <div>
                <label className="text-[10px] text-[#F4EBE1] opacity-80 mb-1 block">年齡 (歲)</label>
                <input 
                  type="number" 
                  value={profile?.age || ""} 
                  onChange={(e) => setProfile({...profile, age: Number(e.target.value) || ""})} 
                  className="w-full bg-[#A37A5C] text-white border border-[#C49D82] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white" 
                />
              </div>
            </div>
            <p className="text-[10px] text-[#F4EBE1] opacity-70 mt-3 text-center">修改後將自動儲存並重新計算您的 BMI</p>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Tab 1: AI Daily Plan */}
        {tab === "daily" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EBE3DB]">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#4A3B32]">今日訓練進度</h3>
                  <p className="text-[10px] text-[#A3978F] mt-0.5">{currentDate} · 共 {dailyPlan.recommended.length} 項任務</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#B68D6D]">{progressPercentage}%</span>
                </div>
              </div>
              <div className="w-full bg-[#F2EAE1] rounded-full h-3 mb-4 overflow-hidden">
                <div 
                  className="bg-[#B68D6D] h-3 rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <button 
                onClick={handleResetToday}
                disabled={!completedToday || completedToday.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#FBF8F5] text-[#8C7A6B] hover:bg-[#F2EAE1] border border-[#EBE3DB]"
              >
                <RotateCcw size={14} />
                重置今日任務再來一次
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-[#B68D6D]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="flex items-center font-bold text-[#4A3B32]">
                  <Activity className="mr-2 w-5 h-5 text-[#B68D6D]" /> AI 處方籤
                </h2>
                <button 
                  onClick={generateCoachFeedback} 
                  disabled={isAnalyzing} 
                  className="py-1 px-3 h-8 text-xs font-medium rounded-lg transition-colors bg-[#F5EFE8] text-[#4A3B32] hover:bg-[#EBE1D5] border border-[#DFD2C4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? "分析中..." : "✨ 生成專屬講評"}
                </button>
              </div>
              <p className="text-sm text-[#736356] mt-2 leading-relaxed whitespace-pre-wrap">
                {aiAnalysis || dailyPlan.analysis}
              </p>
            </div>

            {dailyPlan.recommended.map((ex, idx) => {
              const isCompleted = (completedToday || []).includes(ex?.name);
              return (
                <Card key={idx} className={`overflow-hidden transition-all duration-300 ${isCompleted ? 'opacity-50 grayscale-[50%]' : ''}`}>
                  <CardContent className="p-0">
                    <div className="p-4 flex justify-between items-start bg-[#FBF8F5] border-b border-[#EBE3DB]/60">
                      <span className="text-xs font-bold text-[#8C7A6B] flex items-center gap-1.5">
                         <span className="bg-[#B68D6D] text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{idx + 1}</span>
                         任務 {idx + 1} / 5
                      </span>
                      <span className="text-[10px] font-bold bg-[#F7F2ED] text-[#9C755A] px-2.5 py-1 rounded-full uppercase tracking-wider">{ex?.target}</span>
                    </div>
                    
                    <div className="px-4 py-3 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-[#4A3B32]">{ex?.name}</h3>
                        <p className="text-xs text-[#8C7A6B] mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A87C] block"></span>
                          {ex?.focus}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#9C755A] font-bold text-sm bg-[#F7F2ED] px-2 py-1 rounded-lg inline-block">{ex?.sets}</p>
                        <p className="text-[11px] text-[#A3978F] mt-1">約 {ex?.time} 分鐘</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-48 bg-[#F2EAE1] flex items-center justify-center border-y border-[#EBE3DB] relative">
                      <GifImage src={ex?.gif} alt={ex?.name} />
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent((ex?.name || '') + ' 正確姿勢 健身教學')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 bg-[#CC7A6B]/90 hover:bg-[#B3685A] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm backdrop-blur-sm transition-all"
                      >
                        <Youtube size={14} /> 動作教學
                      </a>
                    </div>

                    <div className="p-4 flex gap-3">
                      <input 
                        type="number" 
                        placeholder="kg" 
                        value={weightInputs[ex?.name] || ""}
                        className="w-20 border border-[#DFD5CB] rounded-xl px-3 text-center text-sm outline-none focus:border-[#B68D6D] focus:ring-2 focus:ring-[#F7F2ED] transition-all bg-[#FBF8F5]"
                        onChange={(e) => setWeightInputs({...weightInputs, [ex?.name]: e.target.value})}
                        disabled={isCompleted}
                      />
                      <button 
                        className={`flex-1 rounded-xl font-medium transition-colors shadow-sm px-4 py-2 ${
                          isCompleted ? "bg-[#DFD5CB] text-[#A3978F] cursor-not-allowed" : "bg-[#B68D6D] text-white hover:bg-[#A37A5C]"
                        }`}
                        onClick={() => handleComplete(ex?.name)} 
                        disabled={isCompleted}
                      >
                        {isCompleted ? "今日已完成 ✓" : "完成紀錄"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab 2: Correction */}
        {tab === "home" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#FDF9F1] p-4 rounded-2xl shadow-sm border border-[#EFE5D3]">
                <h2 className="font-bold text-[#8A6841] flex items-center gap-2">💡 日常體態修正</h2>
                <p className="text-xs text-[#A37E54] mt-1">不用去健身房，在辦公室或睡前也能做。</p>
             </div>
             {correctionExercises.map((ex, i) => (
               <Card key={i} className="overflow-hidden">
                 <div className="w-full h-48 bg-[#F2EAE1] flex items-center justify-center border-b border-[#EBE3DB] relative">
                    <GifImage src={ex.gif} alt={ex.name} />
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 改善 物理治療')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 bg-[#CC7A6B]/90 hover:bg-[#B3685A] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm backdrop-blur-sm transition-all"
                    >
                      <Youtube size={14} /> 動作教學
                    </a>
                 </div>
                 <CardContent>
                    <h3 className="font-bold text-[#4A3B32]">{ex.name}</h3>
                    <p className="text-sm text-[#736356] mt-1.5 leading-relaxed">{ex.desc}</p>
                 </CardContent>
               </Card>
             ))}
          </div>
        )}

        {/* Tab 3: All Exercises */}
        {tab === "all" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#FDF9F1] p-4 rounded-2xl shadow-sm border border-[#EFE5D3]">
                <h2 className="font-bold text-[#8A6841] flex items-center gap-2">
                   <Dumbbell className="w-5 h-5 text-[#B68D6D]" /> 器材圖鑑與紀錄
                </h2>
                <p className="text-xs text-[#A37E54] mt-1">瀏覽所有健身房器材教學，並查看各項目的進步軌跡。</p>
             </div>
             {exercises.map((ex, i) => {
               const exerciseLogs = (logs || []).filter(l => l.exercise === ex.name).reverse();
               const isExpanded = expandedHistory === ex.name;
               return (
                 <Card key={i} className="overflow-hidden">
                   <div className="w-full h-48 bg-[#F2EAE1] flex items-center justify-center border-b border-[#EBE3DB] relative">
                      <GifImage src={ex.gif} alt={ex.name} />
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 正確姿勢 健身教學')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 bg-[#CC7A6B]/90 hover:bg-[#B3685A] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm backdrop-blur-sm transition-all"
                      >
                        <Youtube size={14} /> 動作教學
                      </a>
                   </div>
                   <CardContent>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-bold bg-[#F7F2ED] text-[#9C755A] px-2.5 py-1 rounded-full uppercase tracking-wider">{ex.target}</span>
                          <h3 className="text-lg font-bold mt-2 text-[#4A3B32]">{ex.name}</h3>
                          <p className="text-xs text-[#8C7A6B] mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A87C] block"></span> {ex.focus}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#9C755A] font-bold text-sm bg-[#F7F2ED] px-2 py-1 rounded-lg inline-block">{ex.sets}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedHistory(isExpanded ? null : ex.name)}
                        className="w-full py-2.5 bg-[#FBF8F5] text-[#8C7A6B] border border-[#EBE3DB] rounded-xl text-sm font-medium hover:bg-[#F2EAE1] transition-colors flex justify-center items-center gap-2"
                      >
                        <History size={16} /> {isExpanded ? "收合歷史紀錄" : `查看訓練紀錄 (${exerciseLogs.length})`}
                      </button>
                      {isExpanded && (
                        <div className="mt-3 space-y-2 border-t border-[#EBE3DB] pt-3 animate-in slide-in-from-top-2">
                          {exerciseLogs.length === 0 ? (
                            <p className="text-center text-xs text-[#A3978F] py-3">尚無訓練紀錄</p>
                          ) : (
                            exerciseLogs.map((log) => (
                              <div key={log.timestamp} className="flex justify-between items-center bg-[#FBF8F5] px-3 py-2 rounded-xl text-sm border border-[#EBE3DB]/50">
                                <span className="text-[#736356] text-xs">
                                  {safeFormatDateTime(log.timestamp)}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-[#856148]">{log.weight} <span className="text-[10px] opacity-70">kg</span></span>
                                  <button onClick={() => handleDeleteLog(log.timestamp, log.exercise)} className="text-[#D98274] hover:text-[#B3685A] transition-colors p-1">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                   </CardContent>
                 </Card>
               );
             })}
          </div>
        )}

        {/* Tab 4: AI Coach */}
        {tab === "coach" && (
          <div className="flex flex-col h-[65vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#F5EFE8] p-4 rounded-2xl shadow-sm border border-[#EBE1D5] mb-4 shrink-0">
               <h2 className="font-bold text-[#5C4532] flex items-center gap-2">✨ 專屬 AI 教練諮詢</h2>
               <p className="text-xs text-[#8A6A50] mt-1">針對你的圓肩、重訓疑惑，隨時提問！</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#F2EAE1]/50 rounded-2xl mb-4 border border-[#DFD5CB]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-[#B68D6D] text-white rounded-tr-sm shadow-sm" : "bg-white text-[#4A3B32] shadow-sm border border-[#EBE3DB] rounded-tl-sm"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-[#EBE3DB] flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-[#B68D6D] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[#B68D6D] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-1.5 h-1.5 bg-[#B68D6D] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} className="h-2" />
            </div>

            <div className="flex gap-2 relative shrink-0">
              <input
                type="text"
                placeholder="例如：下拉機抓不到背部發力怎麼辦？"
                className="flex-1 border border-[#DFD5CB] rounded-full pl-4 pr-12 py-3 text-sm outline-none focus:border-[#B68D6D] shadow-sm bg-white"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatting || !chatInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#B68D6D] text-white rounded-full flex items-center justify-center disabled:bg-[#DFD5CB] transition-colors shadow-sm"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: History */}
        {tab === "records" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-bold text-[#4A3B32] mb-4 px-1">所有訓練紀錄總覽</h2>
            {(!logs || logs.length === 0) ? (
               <div className="text-center py-20">
                  <div className="w-16 h-16 bg-[#F2EAE1] rounded-full flex items-center justify-center mx-auto mb-4">
                     <History className="text-[#A3978F] w-8 h-8" />
                  </div>
                  <p className="text-[#8C7A6B] text-sm">尚無紀錄<br/>今天開始你的第一筆訓練吧！</p>
               </div>
            ) : (
              [...(logs || [])].reverse().map((log) => (
                <div key={log.timestamp} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-[#EBE3DB]">
                  <div>
                    <p className="font-bold text-[#4A3B32]">{log.exercise}</p>
                    <p className="text-[11px] text-[#A3978F] mt-1">
                      {safeFormatDateTime(log.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#F7F2ED] text-[#856148] font-bold px-3 py-1.5 rounded-lg text-sm">
                      {log.weight} <span className="text-xs opacity-70">kg</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteLog(log.timestamp, log.exercise)}
                      className="p-2 text-[#CC7A6B] hover:bg-[#F2EAE1] rounded-lg transition-colors"
                      title="刪除這筆紀錄"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBE3DB] h-[72px] flex justify-between items-center px-1 max-w-md mx-auto pb-safe z-50">
        <button onClick={() => setTab("daily")} className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${tab === "daily" ? "text-[#B68D6D]" : "text-[#A3978F] hover:text-[#8C7A6B]"}`}>
          <ClipboardList size={20} className={tab === "daily" ? "mb-1" : "mb-1 scale-90"} /> 
          <span className="text-[10px] font-bold whitespace-nowrap">今日處方</span>
        </button>
        <button onClick={() => setTab("home")} className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${tab === "home" ? "text-[#B68D6D]" : "text-[#A3978F] hover:text-[#8C7A6B]"}`}>
          <Home size={20} className={tab === "home" ? "mb-1" : "mb-1 scale-90"} /> 
          <span className="text-[10px] font-bold whitespace-nowrap">體態修正</span>
        </button>
        <button onClick={() => setTab("all")} className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${tab === "all" ? "text-[#B68D6D]" : "text-[#A3978F] hover:text-[#8C7A6B]"}`}>
          <Dumbbell size={20} className={tab === "all" ? "mb-1" : "mb-1 scale-90"} /> 
          <span className="text-[10px] font-bold whitespace-nowrap">所有項目</span>
        </button>
        <button onClick={() => setTab("coach")} className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${tab === "coach" ? "text-[#B68D6D]" : "text-[#A3978F] hover:text-[#8C7A6B]"}`}>
          <MessageCircle size={20} className={tab === "coach" ? "mb-1" : "mb-1 scale-90"} /> 
          <span className="text-[10px] font-bold whitespace-nowrap">AI 教練</span>
        </button>
        <button onClick={() => setTab("records")} className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${tab === "records" ? "text-[#B68D6D]" : "text-[#A3978F] hover:text-[#8C7A6B]"}`}>
          <History size={20} className={tab === "records" ? "mb-1" : "mb-1 scale-90"} /> 
          <span className="text-[10px] font-bold whitespace-nowrap">總紀錄</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}