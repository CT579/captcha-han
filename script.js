// === data map: QWERTY -> Korean jamo ===
const koreanMap = {
  q:"ㅂ", w:"ㅈ", e:"ㄷ", r:"ㄱ", t:"ㅅ",
  y:"ㅛ", u:"ㅕ", i:"ㅑ", o:"ㅐ", p:"ㅔ",
  a:"ㅁ", s:"ㄴ", d:"ㅇ", f:"ㄹ", g:"ㅎ",
  h:"ㅗ", j:"ㅓ", k:"ㅏ", l:"ㅣ", m:"ㅡ",
  z:"ㅋ", x:"ㅌ", c:"ㅊ", v:"ㅍ", b:"ㅠ", n:"ㅜ",

};
const koreanChars = Object.values(koreanMap);

// ==== DOM refs ====
const home = document.getElementById('home-screen');
const captchaScreen = document.getElementById('captcha-screen');
const resultScreen = document.getElementById('result-screen');
const quizScreen = document.getElementById('quiz-screen');

// Captcha elements
const startBtn = document.getElementById('start-btn');
const exitBtn = document.getElementById('exit-btn');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');
const captchaBox = document.getElementById('captcha');
const captchaInput = document.getElementById('captcha-input');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const resultMessage = document.getElementById('result-message');

let captchaText = "", currentInput = "", captchaTimer = null, captchaTime = 60;

// Quiz elements
const quizBtn = document.getElementById('quiz-btn');
const quizTimerEl = document.getElementById('quiz-timer');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const quizExitBtn = document.getElementById('quiz-exit-btn');
const quizSummary = document.getElementById('quiz-summary');
const currentQuestionEl = document.getElementById('current-question');
const summaryTop = document.getElementById('summary-top');

// modal
const confirmModal = document.getElementById('confirm-modal');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
const confirmText = document.getElementById('confirm-text');

let quizData = [], userAnswers = [], qIndex = 0, quizTimer = null, quizTimeLeft = 120, quizSubmitted=false;

// ---------------- Captcha logic ----------------
function showScreen(screenEl){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  screenEl.classList.add('active');
}
function randomCaptcha(){
  captchaText = Array.from({length:4}, ()=> koreanChars[Math.floor(Math.random()*koreanChars.length)]).join('');
  captchaBox.textContent = captchaText;
  currentInput = "";
  captchaInput.value = "";
  statusEl.textContent = "";
}
function startCaptcha(){
  showScreen(captchaScreen);
  randomCaptcha();
  captchaTime = 60; timerEl.textContent = captchaTime;
  clearInterval(captchaTimer);
  captchaTimer = setInterval(()=>{ captchaTime--; timerEl.textContent = captchaTime; if(captchaTime<=0){ clearInterval(captchaTimer); finalizeCaptcha(false); } },1000);
  captchaInput.focus();
}
function finalizeCaptcha(success){
  clearInterval(captchaTimer);
  if(success) resultMessage.textContent = "🎉 Bạn đã nhập chính xác!";
  else resultMessage.textContent = "⏰ Hết thời gian! Bạn đã thua!";
  showScreen(resultScreen);
}
captchaInput.addEventListener('keydown', (e)=>{
  // allow clipboard paste? we intercept normal keys
  const key = e.key.toLowerCase();
  if(key === 'backspace'){
    e.preventDefault();
    currentInput = currentInput.slice(0,-1);
    captchaInput.value = currentInput;
    return;
  }
  if(key === 'enter'){
    e.preventDefault();
    if(currentInput.length === 4){
      if(currentInput === captchaText) finalizeCaptcha(true);
      else { statusEl.textContent = "❌ Sai rồi! Captcha mới"; randomCaptcha(); }
    } else {
      statusEl.textContent = "⚠️ Cần đủ 4 ký tự trước khi nhấn Enter!";
    }
    return;
  }
  if(koreanMap[key] && currentInput.length < 4){
    e.preventDefault();
    currentInput += koreanMap[key];
    captchaInput.value = currentInput;
  }
});

// Captcha buttons
startBtn.addEventListener('click', startCaptcha);
exitBtn.addEventListener('click', ()=>{ clearInterval(captchaTimer); showScreen(home); });
retryBtn.addEventListener('click', startCaptcha);
homeBtn.addEventListener('click', ()=>{ showScreen(home); });

// ---------------- Quiz logic ----------------
function pickRandomCorrectKeyForChar(ch){
  // find a key whose mapping equals ch
  return Object.keys(koreanMap).find(k => koreanMap[k] === ch);
}
function shuffleArray(arr){ return arr.sort(()=>Math.random()-0.5); }


function generateQuiz() {
  quizData = [];
  const keys = Object.keys(koreanMap);
  const shuffledKeys = [...keys];
  shuffleArray(shuffledKeys);

  for (let i = 0; i < 26; i++) {
    const correctKey = shuffledKeys[i];
    const char = koreanMap[correctKey];
    const wrongs = keys.filter(k => k !== correctKey);
    shuffleArray(wrongs);
    const wrong3 = wrongs.slice(0, 3);
    const opts = [correctKey, ...wrong3].map(k => k.toUpperCase());
    shuffleArray(opts);
    quizData.push({ char, correct: correctKey.toUpperCase(), options: opts });
  }

  userAnswers = Array(26).fill(null);
  qIndex = 0;
  quizSubmitted = false;
  quizTimeLeft = 360; // 👉 6 phút

  renderQuizQuestion();
  quizSummary.innerHTML = "";
  summaryTop.textContent = "";

  clearInterval(quizTimer);

  // 👉 Hiển thị đúng 6:00 ngay lập tức
  const initMinutes = Math.floor(quizTimeLeft / 60);
  const initSeconds = quizTimeLeft % 60;
  quizTimerEl.textContent = `${initMinutes}:${initSeconds.toString().padStart(2, "0")}`;

  // 👉 Bắt đầu đếm sau 1 giây
  quizTimer = setInterval(() => {
    quizTimeLeft--;

    if (quizTimeLeft < 0) {
      clearInterval(quizTimer);
      openConfirm(true);
      return;
    }

    const minutes = Math.floor(quizTimeLeft / 60);
    const seconds = quizTimeLeft % 60;
    quizTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, 1000);
}




function renderQuizQuestion(){
  const q = quizData[qIndex];
  quizQuestionEl.textContent = q.char;
  currentQuestionEl.textContent = `${qIndex + 1}/${quizData.length}`;

  // show A/B on top row, C/D bottom row displayed by grid
  quizOptionsEl.innerHTML = '';
  for(let i=0;i<4;i++){
    const optKey = q.options[i];
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.opt = optKey;
    const label = document.createElement('div'); label.className='option-label'; label.textContent = String.fromCharCode(65+i);
    const text = document.createElement('div'); text.className='option-text'; text.textContent = optKey;
    btn.appendChild(label); btn.appendChild(text);

    // state classes
    if(userAnswers[qIndex] === optKey) btn.classList.add('selected');
    if(quizSubmitted){
      if(optKey === q.correct) btn.classList.add('correct');
      else if(userAnswers[qIndex] === optKey && userAnswers[qIndex] !== q.correct) btn.classList.add('incorrect');
      else if(!userAnswers[qIndex]) btn.classList.add('unanswered');
    }

    btn.addEventListener('click', ()=>{
      if(quizSubmitted) return; // no change after submit
      userAnswers[qIndex] = optKey;
      // update visual selection
      renderQuizQuestion();
    });
    quizOptionsEl.appendChild(btn);
  }
  // fade effect
  quizOptionsEl.classList.remove('hidden');
  void quizOptionsEl.offsetWidth;
}

function startQuiz() {
  showScreen(quizScreen);
  generateQuiz();

  // ❌ XÓA hoặc ghi đè dòng cũ: quizTimerEl.textContent = quizTimeLeft;
  // ✅ Thay bằng đoạn này để hiển thị ngay định dạng 6:00
  const minutes = Math.floor(quizTimeLeft / 60);
  const seconds = quizTimeLeft % 60;
  quizTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

quizBtn.addEventListener('click', startQuiz);
quizExitBtn.addEventListener('click', ()=>{ clearInterval(quizTimer); showScreen(home); });

// prev/next handlers
prevBtn.addEventListener('click', ()=>{
  if(qIndex>0){
    qIndex--; renderQuizQuestion();
    if(quizSubmitted) renderFeedbackForIndex();
  }
});

nextBtn.addEventListener('click', ()=>{
  if(qIndex < quizData.length -1){
    qIndex++; renderQuizQuestion();
    if(quizSubmitted) renderFeedbackForIndex();
  } else {
    // 👉 Nếu chưa nộp thì hỏi xác nhận, còn nếu đã nộp thì không hỏi nữa
    if(!quizSubmitted) openConfirm(false);
  }
});


// Submit flow
submitQuizBtn.addEventListener('click', ()=>{
  if(!quizSubmitted){
    openConfirm(false);
  } else {
    // "Làm lại" behavior
    generateQuiz();
    submitQuizBtn.textContent = '📝 Nộp bài';
  }
});

// -------------------- Modal confirm control --------------------
function openConfirm(auto = false) {
  if (auto) {
    // tự động nộp bài khi hết giờ
    doSubmit();
    return;
  }

  // hiển thị modal xác nhận
  confirmText.textContent = "📝 Bạn có chắc muốn nộp bài không?";
  confirmModal.classList.remove("hidden");
  confirmModal.style.display = "flex"; // đảm bảo hiện trên mọi trình duyệt
  confirmModal.focus();
}

confirmNo.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  confirmModal.style.display = "none";
});

confirmYes.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  confirmModal.style.display = "none";
  doSubmit(); // GỌI NỘP BÀI TẠI ĐÂY
});

function doSubmit() {
  clearInterval(quizTimer);
  quizSubmitted = true;
  qIndex = 0;
  renderQuizQuestion();


  // Tính điểm
  let correctCount = 0;
  quizData.forEach((q, i) => {
    if (userAnswers[i] === q.correct) correctCount++;
  });

  summaryTop.textContent = `✅ Kết quả: ${correctCount}/${quizData.length} đúng`;
  quizSummary.innerHTML = `<div class="muted">Dùng ⬅️ / ➡️ để xem lại từng câu hoặc bấm 🔁 Làm lại để chơi lại.</div>`;

  // Cập nhật nút nộp bài thành "Làm lại"
  submitQuizBtn.textContent = "🔁 Làm lại";

  // Hiển thị đánh dấu đúng/sai cho câu hiện tại
  renderFeedbackForIndex();
}


// render feedback for currently displayed index
function renderFeedbackForIndex(){
  const q = quizData[qIndex];
  const correct = q.correct;
  const optionButtons = Array.from(quizOptionsEl.querySelectorAll('.option-btn'));
  optionButtons.forEach(btn=>{
    const opt = btn.dataset.opt;
    btn.classList.remove('selected','correct','incorrect','unanswered');
    if(opt === correct) btn.classList.add('correct');
    if(userAnswers[qIndex] === opt && userAnswers[qIndex] !== correct) btn.classList.add('incorrect');
    if(!userAnswers[qIndex] && opt === correct) btn.classList.add('unanswered');
  });
}

// helper to show results page of all questions (if you want full list)
function buildFullResultHTML(){
  let correct = 0;
  let html = `<h3>Chi tiết kết quả</h3>`;
  quizData.forEach((q,i)=>{
    const ans = userAnswers[i];
    const right = q.correct;
    if(ans === right) correct++;
    html += `<div class="card" style="margin-top:8px;padding:10px">`;
    html += `<div><b>Câu ${i+1}:</b> ${q.char}</div>`;
    q.options.forEach((opt,j)=>{
      let cls = '';
      let icon = '';
      if(opt === right){ cls='correct'; icon=' ✅'; }
      if(ans === opt && ans !== right){ cls='incorrect'; icon=' ❌'; }
      if(!ans && opt === right){ cls='unanswered'; icon=' (chưa chọn)'; }
      html += `<div class="option-btn ${cls}" style="display:block;margin-top:6px;padding:8px">${String.fromCharCode(65+j)}. ${opt}${icon}</div>`;
    });
    html += `</div>`;
  });
  html = `<h2>${correct}/${quizData.length} đúng</h2>` + html;
  return html;
}

// optional: show full result under summary if user wants
// e.g. quizSummary.innerHTML = buildFullResultHTML();

// keyboard support: space to move next (only when not submitted)
document.addEventListener('keydown', (e)=>{
  if(!quizScreen.classList.contains('active')) return;
  if(e.key === 'ArrowRight' || e.key === 'd') nextBtn.click();
  if(e.key === 'ArrowLeft' || e.key === 'a') prevBtn.click();
  if(e.key === 'Enter') {
    if(!quizSubmitted) openConfirm(false);
    else {
      // when submitted and at last index, pressing Enter does nothing special
    }
  }
});


// ---- Virtual Keyboard for mobile ----
const vKeyboard = document.getElementById('virtual-keyboard');
if (vKeyboard) {
  vKeyboard.addEventListener('click', (e) => {
    if (!e.target.matches('button')) return;
    const key = e.target.dataset.key.toLowerCase();

    if (key === 'backspace') {
      currentInput = currentInput.slice(0, -1);
      captchaInput.value = currentInput;
      return;
    }
    if (key === 'enter') {
      if (currentInput.length === 4) {
        if (currentInput === captchaText) finalizeCaptcha(true);
        else {
          statusEl.textContent = "❌ Sai rồi! Captcha mới";
          randomCaptcha();
        }
      } else {
        statusEl.textContent = "⚠️ Cần đủ 4 ký tự trước khi nhấn Enter!";
      }
      return;
    }

    // Normal QWERTY keys -> Hangul map
    if (koreanMap[key] && currentInput.length < 4) {
      currentInput += koreanMap[key];
      captchaInput.value = currentInput;
    }
  });
}



// === HƯỚNG DẪN NHẬP TIẾNG HÀN ===
const guideBtn = document.getElementById("guideBtn");
const guideModal = document.getElementById("guideModal");
const closeGuide = document.getElementById("closeGuide");

if (guideBtn && guideModal && closeGuide) {
  guideBtn.addEventListener("click", () => {
    guideModal.style.display = "block";
  });

  closeGuide.addEventListener("click", () => {
    guideModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === guideModal) {
      guideModal.style.display = "none";
    }
  });
}


// === Ảnh phóng to trong modal hướng dẫn ===
const guideImage = document.querySelector(".hinh_ki_tu_captcha");
const imgZoomModal = document.getElementById("imgZoomModal");
const zoomedImg = document.getElementById("zoomedImg");
const closeImgZoom = document.getElementById("closeImgZoom");

if (guideImage && imgZoomModal && zoomedImg && closeImgZoom) {
  guideImage.addEventListener("click", () => {
    zoomedImg.src = guideImage.src;
    imgZoomModal.style.display = "flex";
  });

  closeImgZoom.addEventListener("click", () => {
    imgZoomModal.style.display = "none";
  });

  imgZoomModal.addEventListener("click", (e) => {
    if (e.target === imgZoomModal) {
      imgZoomModal.style.display = "none";
    }
  });
}
