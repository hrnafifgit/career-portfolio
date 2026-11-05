let currentActivePage = 1;
const totalPages = 10;
let isSingleMode = true; // وضع الشريحة الواحدة للتعبئة المريحة
let activeDrawingTarget = null; // p2, p8, p9

// سجل إرسالات الطالبات للوحة المعلمة (يبدأ فارغاً)
let submissions = [];

document.addEventListener('DOMContentLoaded', () => {
  // مسح أي مسودات سابقة قديمة تجريبية من ذاكرة التخزين المحلية لضمان نظافة الحقول تماماً
  ['career_portfolio_draft_v1', 'career_portfolio_draft_v2', 'career_portfolio_draft_v3', 'career_portfolio_saved_v1'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  initStepper();
  setupDrawingCanvas();
  renderAdminTable();
  setSingleView(true);
  showSlide(1);
  setupInputConstraints();
  loadDraft();
});

// إنشاء أزرار التنقل 1-10
function initStepper() {
  const container = document.getElementById('stepperDots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const dot = document.createElement('div');
    dot.className = `page-num-dot ${i === 1 ? 'active' : ''}`;
    dot.innerText = i;
    dot.onclick = () => showSlide(i);
    container.appendChild(dot);
  }
}

// عرض شريحة محددة
function showSlide(pageNumber) {
  currentActivePage = Math.max(1, Math.min(totalPages, pageNumber));

  // تحديث الشريحة النشطة
  document.querySelectorAll('.slide-page').forEach((slide, idx) => {
    if (idx + 1 === currentActivePage) {
      slide.classList.add('current-active');
    } else {
      slide.classList.remove('current-active');
    }
  });

  // تحديث نقاط الترقيم
  document.querySelectorAll('.page-num-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx + 1 === currentActivePage);
  });

  // تحديث النص
  const indicator = document.getElementById('pageIndicatorText');
  if (indicator) {
    indicator.innerText = `صفحة ${currentActivePage} من ${totalPages}`;
  }

  // التمرير إلى أعلى
  if (isSingleMode) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    const target = document.getElementById(`page-${currentActivePage}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// التنقل بالأسهم السابق/التالي
function changeSlide(delta) {
  showSlide(currentActivePage + delta);
}

// التبديل بين وضع الشريحة الواحدة واستعراض كل الصفحات
function toggleViewMode() {
  setSingleView(!isSingleMode);
}

function setSingleView(enableSingle) {
  isSingleMode = enableSingle;
  const btn = document.getElementById('btnViewToggle');
  if (enableSingle) {
    document.body.classList.add('single-mode');
    if (btn) btn.innerHTML = '<span class="btn-icon">📑</span><span class="btn-label">عرض الكل</span>';
    showSlide(currentActivePage);
  } else {
    document.body.classList.remove('single-mode');
    if (btn) btn.innerHTML = '<span class="btn-icon">📄</span><span class="btn-label">شريحة واحدة</span>';
  }
}

// اختيار رقم الصف (وضع دائرة حول الرقم وتعبئة المربع)
function selectGradeNumber(gradeNum) {
  // إزالة التحديد السابق
  document.querySelectorAll('.selection-marker').forEach(m => m.classList.remove('active'));
  
  // تفعيل الدائرة حول الرقم المختار
  const marker = document.getElementById(`marker-grade-${gradeNum}`);
  if (marker) marker.classList.add('active');

  // أسماء الصفوف
  const gradeNames = {
    1: 'الأول الابتدائي',
    2: 'الثاني الابتدائي',
    3: 'الثالث الابتدائي',
    4: 'الرابع الابتدائي',
    5: 'الخامس الابتدائي',
    6: 'السادس الابتدائي'
  };

  // كتابة الصف في المربع الأعلى
  const textInput = document.getElementById('gradeTextInput');
  if (textInput) {
    textInput.value = gradeNames[gradeNum] || `الصف ${gradeNum}`;
  }
  triggerAutoSave();
}

// اختيار المنطقة (وضع دائرة حمراء حول كرت المنطقة وتحديدها)
function selectRegionSpot(regionName, element) {
  document.querySelectorAll('.region-circle-marker').forEach(m => m.classList.remove('active'));
  const marker = element.querySelector('.region-circle-marker');
  if (marker) marker.classList.add('active');
  triggerAutoSave();
}

// اختيار العلم (تحديد العلم وكتابة الجنسية في المربع)
function pickFlag(nationalityName, element) {
  document.querySelectorAll('.flag-hotspot').forEach(f => f.classList.remove('active'));
  element.classList.add('active');
  const input = document.getElementById('nationalityInput');
  if (input) input.value = nationalityName;
  triggerAutoSave();
}

// تفعيل زر اختيار الملف للصورة
function triggerFileInput(inputId) {
  const fileInput = document.getElementById(inputId);
  if (fileInput) fileInput.click();
}

// معالجة رفع الصور
function handlePhotoUpload(event, previewImgId) {
  const file = event.target.files[0];
  if (file) {
    // التحقق من حجم الصورة ألا يتجاوز 8 ميجابايت تفادياً لثقل المتصفح
    if (file.size > 8 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 8 ميجابايت 📷', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(previewImgId);
      if (preview) {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        triggerAutoSave();
        showToast('تمت إضافة صورتكِ بنجاح 🌸', 'success', 2500);
      }
    };
    reader.readAsDataURL(file);
  }
}

// نظام لوحة الرسم المدمج (Canvas Modal)
let drawCanvas, drawCtx, isPainting = false;

function setupDrawingCanvas() {
  drawCanvas = document.getElementById('mainDrawingCanvas');
  if (!drawCanvas) return;
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.lineWidth = 5;
  drawCtx.lineCap = 'round';
  drawCtx.strokeStyle = '#0d9488';

  function start(e) {
    isPainting = true;
    paint(e);
  }
  function stop() {
    isPainting = false;
    drawCtx.beginPath();
  }
  function paint(e) {
    if (!isPainting) return;
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    drawCtx.lineTo(x, y);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(x, y);
  }

  drawCanvas.addEventListener('mousedown', start);
  drawCanvas.addEventListener('mouseup', stop);
  drawCanvas.addEventListener('mousemove', paint);

  drawCanvas.addEventListener('touchstart', start, { passive: false });
  drawCanvas.addEventListener('touchend', stop, { passive: false });
  drawCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    paint(e);
  }, { passive: false });

  // ربط أداة اللون وحجم الفرشاة
  document.getElementById('canvasColorPicker').addEventListener('change', (e) => {
    drawCtx.strokeStyle = e.target.value;
  });
  document.getElementById('canvasBrushSize').addEventListener('change', (e) => {
    drawCtx.lineWidth = e.target.value;
  });
}

function openDrawingModal(targetPrefix) {
  activeDrawingTarget = targetPrefix;
  clearMainCanvas();
  document.getElementById('drawingModal').classList.remove('hidden');
}

function closeDrawingModal() {
  document.getElementById('drawingModal').classList.add('hidden');
}

function clearMainCanvas() {
  if (drawCtx && drawCanvas) {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }
}

function saveDrawingToActiveBox() {
  if (!drawCanvas || !activeDrawingTarget) return;
  const dataUrl = drawCanvas.toDataURL('image/png');
  const preview = document.getElementById(`${activeDrawingTarget}PreviewImg`);
  if (preview) {
    preview.src = dataUrl;
    preview.classList.remove('hidden');
    triggerAutoSave();
    showToast('تم حفظ رسمتكِ الرائعة بنجاح 🎨', 'success', 2500);
  }
  closeDrawingModal();
}

// دالة الطباعة السريعة: تجعل كل الصفحات مرئية للطباعة ثم تستدعي window.print()
function printDocument() {
  // عند الطباعة، المتصفح يستخدم أوتوماتيكياً @media print
  window.print();
}

// ========================================================
// رابط Google Apps Script لرفع ملف الـ PDF إلى Google Drive
// الصق الرابط الذي ستحصل عليه من Google Apps Script هنا:
// ========================================================
const GOOGLE_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbySb2xDDqa2JIbX1bviPoQDUwaBranHlO2kEDTeZVIU8IFT3cEP87BcG1Y24wRX9xAe/exec";

// مهلة الرفع: 60 ثانية لاستيعاب الشبكات البطيئة والملفات الكبيرة
const UPLOAD_TIMEOUT_MS = 60000;

// عدد محاولات إعادة الإرسال التلقائي عند الفشل
const MAX_RETRY_ATTEMPTS = 2;

let lastGeneratedPdfBlob = null;
let lastGeneratedPdfName = "ملف_التوجيه_المهني.pdf";

// دالة مساعدة لتجهيز الحقول للـ PDF بحيث تظهر النصوص العربية بشكل صحيح
function prepareDomForPdf(container) {
  const elements = container.querySelectorAll('input, textarea');
  const replacements = [];

  // دمج خانات التاريخ (يوم / شهر / سنة) لتظهر كسطر متكامل ومنسق تماماً في الـ PDF
  const dateSplits = container.querySelectorAll('.date-fields-split');
  dateSplits.forEach(splitBox => {
    const parent = splitBox.parentElement;
    const isHijri = parent && parent.classList.contains('box-p4-hijri');
    const day = parent.querySelector('.day')?.value || '';
    const month = parent.querySelector('.month')?.value || '';
    const year = parent.querySelector('.year')?.value || '';
    const suffix = isHijri ? 'هـ' : 'م';

    const div = document.createElement('div');
    div.className = 'pdf-cloned-content';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.fontFamily = "'Tajawal', sans-serif";
    div.style.fontSize = '1.35rem';
    div.style.fontWeight = '800';
    div.style.color = '#0f172a';
    div.style.background = 'transparent';
    div.style.border = 'none';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.direction = 'rtl';
    div.style.textAlign = 'center';

    if (day || month || year) {
      div.innerText = `${day || '--'} / ${month || '--'} / ${year || '----'} ${suffix}`;
    } else {
      div.innerText = isHijri ? '14 / 05 / 1436 هـ' : '05 / 03 / 2015 م';
    }

    splitBox.style.display = 'none';
    parent.appendChild(div);
    replacements.push({ el: splitBox, div: div, isDateSplit: true });
  });

  elements.forEach(el => {
    if (el.type === 'file' || el.classList.contains('seamless-date-part')) return;

    const div = document.createElement('div');
    div.className = el.className + ' pdf-cloned-content';

    const val = (el.value !== undefined && el.value !== '') ? el.value : (el.placeholder || '');
    div.innerText = val;

    const cs = window.getComputedStyle(el);
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.fontFamily = cs.fontFamily;
    div.style.fontSize = cs.fontSize;
    div.style.fontWeight = cs.fontWeight;
    div.style.lineHeight = cs.lineHeight;
    div.style.color = cs.color;
    div.style.background = 'transparent';
    div.style.border = 'none';
    div.style.outline = 'none';
    div.style.boxSizing = 'border-box';
    div.style.whiteSpace = 'pre-wrap';
    div.style.overflow = 'hidden';
    div.style.direction = 'rtl';

    if (el.classList.contains('seamless-textarea') || el.classList.contains('career-desc-field')) {
      div.style.textAlign = 'right';
      div.style.padding = cs.padding;
      div.style.display = 'block';
    } else {
      div.style.textAlign = cs.textAlign || 'center';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = cs.textAlign === 'right' ? 'flex-end' : 'center';
    }

    el.parentNode.insertBefore(div, el);
    el.style.display = 'none';
    replacements.push({ el, div, isDateSplit: false });
  });

  const activeMarkers = container.querySelectorAll('.selection-marker.active, .region-circle-marker.active, .flag-hotspot.active');
  const markerBackups = [];

  activeMarkers.forEach(marker => {
    markerBackups.push({
      marker,
      oldBorder: marker.style.border,
      oldBg: marker.style.backgroundColor,
      oldBoxSizing: marker.style.boxSizing
    });
    marker.style.setProperty('border', '5px solid #dc2626', 'important');
    marker.style.setProperty('background-color', 'rgba(220, 38, 38, 0.18)', 'important');
    marker.style.setProperty('box-sizing', 'border-box', 'important');
    marker.style.setProperty('display', 'block', 'important');
    marker.style.setProperty('visibility', 'visible', 'important');
    marker.style.setProperty('opacity', '1', 'important');
  });

  return () => {
    replacements.forEach(({ el, div, isDateSplit }) => {
      div.remove();
      el.style.display = isDateSplit ? 'flex' : '';
    });
    markerBackups.forEach(({ marker, oldBorder, oldBg, oldBoxSizing }) => {
      marker.style.border = oldBorder;
      marker.style.backgroundColor = oldBg;
      marker.style.boxSizing = oldBoxSizing;
    });
  };
}
function restoreSlideView(wasInSingleMode) {
  if (wasInSingleMode) {
    document.querySelectorAll('.slide-page').forEach((page, idx) => {
      page.style.display = (idx + 1 === currentActivePage) ? 'block' : 'none';
    });
  }
}

// ========================================================
// الإرسال الحقيقي لـ Google Drive مع CORS + إعادة المحاولة
// يقرأ رد الخادم ويتحقق من وصول الملف فعلياً
// ========================================================
async function sendToGoogleDrive(payload, attempt) {
  if (attempt === undefined) attempt = 1;
  const controller = new AbortController();
  const timeoutId = setTimeout(function() { controller.abort(); }, UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(GOOGLE_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('خطأ في الخادم: ' + response.status);
    }

    const result = await response.json();

    if (result && result.status === 'success') {
      return { success: true, fileUrl: result.fileUrl || null };
    } else {
      throw new Error(result && result.message ? result.message : 'استجابة غير متوقعة من الخادم');
    }

  } catch (err) {
    clearTimeout(timeoutId);
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise(function(resolve) { setTimeout(resolve, 2500); });
      return sendToGoogleDrive(payload, attempt + 1);
    }
    throw err;
  }
}

// ========================================================
// إرسال الملف للمعلمة وتوليد PDF ورفعه مع تحقق حقيقي
// ========================================================
async function submitPortfolio() {
  if (!validatePortfolio()) return;

  const submitBtn = document.getElementById('btnSubmitPortfolio');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.pointerEvents = 'none';
  }

  const nameInput  = document.getElementById('studentNameInput');
  const gradeInput = document.getElementById('gradeTextInput');
  const careerInput = document.getElementById('careerTitleInput');

  const name   = (nameInput  && nameInput.value.trim())   ? nameInput.value.trim()   : 'طالبة متميزة';
  const grade  = (gradeInput && gradeInput.value.trim())  ? gradeInput.value.trim()  : 'الصف الرابع الابتدائي';
  const career = (careerInput && careerInput.value.trim()) ? careerInput.value.trim() : 'طبيبة';

  lastGeneratedPdfName = ('ملف_التوجيه_المهني_' + name + '_' + grade + '.pdf').replace(/\s+/g, '_');

  openUploadModal();
  setUploadState('loading', 'جارٍ تجهيز ملفك المهني بصيغة PDF يا ' + name + '... ⏳');

  document.body.classList.add('pdf-export-mode');
  const prevMode = isSingleMode;
  document.querySelectorAll('.slide-page').forEach(function(page) {
    page.style.display = 'block';
  });

  const docElement = document.getElementById('documentContainer');
  const cleanupDom = prepareDomForPdf(docElement);

  // إعدادات PDF محسّنة: حجم أصغر + سرعة أكبر مع حفاظ كامل على الجودة المرئية
  const opt = {
    margin: 0,
    filename: lastGeneratedPdfName,
    image: { type: 'jpeg', quality: 0.82 },
    html2canvas: { scale: 1.2, useCORS: true, logging: false, scrollY: 0, imageTimeout: 15000 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], after: '.slide-page' }
  };

  try {
    if (typeof html2pdf !== 'function') {
      throw new Error('مكتبة html2pdf غير محملة. يرجى إعادة تحديث الصفحة والتحقق من الاتصال بالإنترنت.');
    }

    setUploadState('loading', 'جارٍ تحويل الصفحات إلى PDF... قد يستغرق بضع ثوانٍ ⚙️');

    const pdfDataUri = await html2pdf().set(opt).from(docElement).outputPdf('datauristring');
    const base64Data = pdfDataUri.split(',')[1];

    // استعادة واجهة الموقع فور انتهاء التوليد
    cleanupDom();
    document.body.classList.remove('pdf-export-mode');
    restoreSlideView(prevMode);

    if (!GOOGLE_SCRIPT_WEBAPP_URL || GOOGLE_SCRIPT_WEBAPP_URL.includes('ضع_رابط')) {
      setUploadState('error', 'تم تجهيز ملف الـ PDF بنجاح يا ' + name + '! 👏\nيمكنكِ تحميل الملف مباشرة على جهازك.');
      return;
    }

    setUploadState('loading', 'ملف PDF جاهز ✅ جارٍ إرساله إلى Google Drive... 📤');

    // الإرسال الحقيقي مع CORS + قراءة رد الخادم للتحقق الفعلي
    const uploadResult = await sendToGoogleDrive({
      fileName: lastGeneratedPdfName,
      fileData: base64Data,
      studentName: name,
      grade: grade
    });

    // ✅ تأكيد وصول الملف للخادم قبل إظهار شاشة النجاح
    if (typeof confetti === 'function') {
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
    }

    submissions.unshift({
      id: submissions.length + 1,
      name: name,
      grade: grade,
      region: 'المملكة العربية السعودية',
      career: career,
      date: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    });
    renderAdminTable();

    setUploadState('success', 'أحسنتِ يا ' + name + '! 🎉\nتم حفظ ملفك المهني في Google Drive للمعلمة بنجاح تام وتم التحقق من وصوله.');
    showToast('مبارك يا ' + name + '! وصل ملفكِ للمعلمة بنجاح مؤكد ✅', 'success', 6000);

  } catch (err) {
    console.error('خطأ في رفع الـ PDF:', err);

    try { cleanupDom(); } catch (e) {}
    document.body.classList.remove('pdf-export-mode');
    restoreSlideView(prevMode);

    var errorMsg = '';
    if (err.name === 'AbortError') {
      errorMsg = 'انتهى وقت الانتظار (60 ثانية).\nيرجى التحقق من قوة الإنترنت والمحاولة مجدداً، أو اضغطي على تحميل PDF وأرسليه للمعلمة.';
    } else if (err.message && err.message.indexOf('Failed to fetch') !== -1) {
      errorMsg = 'تعذّر الوصول إلى خادم Google Drive.\nتأكدي من فتح الموقع عبر المتصفح (Safari أو Chrome) وليس كملف محفوظ على الجهاز.';
    } else {
      errorMsg = 'حدث خطأ: ' + (err.message || 'مجهول') + '\nاضغطي على تحميل PDF وأرسليه للمعلمة مباشرة.';
    }

    setUploadState('error', errorMsg);
    showToast('تعذّر الرفع. يمكنكِ تحميل الـ PDF مباشرة 📥', 'warning', 6000);

  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.pointerEvents = 'auto';
    }
  }
}
// تحميل PDF مباشرة على الجهاز كخيار احتياطي
function downloadPdfDirectly() {
  document.body.classList.add('pdf-export-mode');
  const prevMode = isSingleMode;
  document.querySelectorAll('.slide-page').forEach(page => {
    page.style.display = 'block';
  });

  const docElement = document.getElementById('documentContainer');
  const cleanupDom = prepareDomForPdf(docElement);

  const opt = {
    margin: 0,
    filename: lastGeneratedPdfName,
    image: { type: 'jpeg', quality: 0.82 },
    html2canvas: { scale: 1.2, useCORS: true, scrollY: 0, imageTimeout: 15000 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], after: '.slide-page' }
  };

  html2pdf().set(opt).from(docElement).save().then(() => {
    cleanupDom();
    document.body.classList.remove('pdf-export-mode');
    if (prevMode) {
      document.querySelectorAll('.slide-page').forEach((page, idx) => {
        page.style.display = (idx + 1 === currentActivePage) ? 'block' : 'none';
      });
    }
    closeUploadModal();
  }).catch(() => {
    cleanupDom();
    document.body.classList.remove('pdf-export-mode');
  });
}

// وظائف التحكم بنافذة حالة الرفع
function openUploadModal() {
  const modal = document.getElementById('uploadStatusModal');
  if (modal) modal.classList.remove('hidden');
}

function closeUploadModal() {
  const modal = document.getElementById('uploadStatusModal');
  if (modal) modal.classList.add('hidden');
}

function setUploadState(state, message) {
  const loadingEl = document.getElementById('uploadLoadingState');
  const successEl = document.getElementById('uploadSuccessState');
  const errorEl = document.getElementById('uploadErrorState');
  const statusText = document.getElementById('uploadStatusText');
  const successMsg = document.getElementById('uploadSuccessMsg');
  const errorMsg = document.getElementById('uploadErrorMsg');

  loadingEl.classList.add('hidden');
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  if (state === 'loading') {
    loadingEl.classList.remove('hidden');
    if (statusText && message) statusText.innerText = message;
  } else if (state === 'success') {
    successEl.classList.remove('hidden');
    if (successMsg && message) successMsg.innerText = message;
  } else if (state === 'error') {
    errorEl.classList.remove('hidden');
    if (errorMsg && message) errorMsg.innerText = message;
  }
}

// لوحة المعلمة
function toggleAdminPanel() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.toggle('hidden');
  }
}

function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const countBadge = document.getElementById('submissionsCountBadge');
  const adminTotalCount = document.getElementById('adminTotalCount');
  const adminTopGrade = document.getElementById('adminTopGrade');
  const adminTopCareer = document.getElementById('adminTopCareer');

  const count = submissions.length;
  if (countBadge) countBadge.innerText = count;
  if (adminTotalCount) adminTotalCount.innerText = count;

  if (adminTopGrade) {
    if (count === 0) {
      adminTopGrade.innerText = '-';
    } else {
      const gradeCounts = {};
      submissions.forEach(s => { gradeCounts[s.grade] = (gradeCounts[s.grade] || 0) + 1; });
      const topGrade = Object.keys(gradeCounts).reduce((a, b) => gradeCounts[a] > gradeCounts[b] ? a : b, '-');
      adminTopGrade.innerText = topGrade.replace('الصف ', '');
    }
  }

  if (adminTopCareer) {
    if (count === 0) {
      adminTopCareer.innerText = '-';
    } else {
      const careerCounts = {};
      submissions.forEach(s => { careerCounts[s.career] = (careerCounts[s.career] || 0) + 1; });
      const topCareer = Object.keys(careerCounts).reduce((a, b) => careerCounts[a] > careerCounts[b] ? a : b, '-');
      adminTopCareer.innerText = topCareer;
    }
  }

  if (!tbody) return;
  if (count === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:22px; color:#64748b; font-size:0.95rem;">لا توجد إرسالات حتى الآن. ستظهر هنا إجابات الطالبات فور ضغطهن على «إرسال».</td></tr>`;
    return;
  }

  tbody.innerHTML = submissions.map((s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.grade}</td>
      <td>${s.region}</td>
      <td>${s.career}</td>
      <td><small style="color:#64748b;">${s.date}</small></td>
    </tr>
  `).join('');
}

function exportAdminExcel() {
  let csv = '\uFEFFالرقم,اسم الطالبة,الصف,المنطقة,مهنة المستقبل,تاريخ الإرسال\n';
  submissions.forEach((s, idx) => {
    csv += `"${idx + 1}","${s.name}","${s.grade}","${s.region}","${s.career}","${s.date}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ملفات_التوجيه_المهني_المستلمة.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ========================================================
// نظام التنبيهات المنبثقة السريعة (Toast Notification System)
// ========================================================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    warning: '⚠️',
    error: '⛔',
    success: '🎉',
    info: '💡'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '💡'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" title="إغلاق" aria-label="إغلاق">✕</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  closeBtn.onclick = removeToast;
  container.appendChild(toast);

  setTimeout(removeToast, duration);
}

// دالة إبراز الحقل واهتزازه ونقل الطالبة إليه تلقائياً
function highlightField(element, slideNum) {
  if (!element) return;
  if (slideNum) {
    showSlide(slideNum);
  }
  element.classList.add('field-error-highlight');
  try {
    element.focus();
    if (element.select) element.select();
  } catch (e) {}

  const clearHighlight = () => {
    element.classList.remove('field-error-highlight');
    element.removeEventListener('input', clearHighlight);
    element.removeEventListener('change', clearHighlight);
  };
  element.addEventListener('input', clearHighlight);
  element.addEventListener('change', clearHighlight);
}

// ========================================================
// التحقق المنطقي الشامل من صحة المدخلات (Form Validation)
// ========================================================
function validatePortfolio() {
  // 1. التحقق من اسم الطالبة (الصفحة 2)
  const nameInput = document.getElementById('studentNameInput');
  const rawName = nameInput ? nameInput.value.trim() : '';
  if (!rawName || rawName.length < 3) {
    showToast('يرجى كتابة اسمكِ الكريم في الصفحة 2 🌸', 'warning');
    highlightField(nameInput, 2);
    return false;
  }
  const nameWords = rawName.split(/\s+/).filter(Boolean);
  if (nameWords.length < 2) {
    showToast('يرجى كتابة اسمكِ ثنائياً على الأقل (اسمكِ واسم العائلة) ✍️', 'warning');
    highlightField(nameInput, 2);
    return false;
  }

  // 2. التحقق من الصف الدراسي (الصفحة 3)
  const gradeInput = document.getElementById('gradeTextInput');
  const gradeVal = gradeInput ? gradeInput.value.trim() : '';
  if (!gradeVal) {
    showToast('يرجى تحديد أو كتابة صفكِ الدراسي في الصفحة 3 🎒', 'warning');
    highlightField(gradeInput, 3);
    return false;
  }

  // 3. التحقق المنطقي الشامل لبيانات الأسرة (الصفحة 7)
  const totalInput = document.getElementById('inputFamilyTotal');
  const broInput = document.getElementById('inputBrothers');
  const sisInput = document.getElementById('inputSisters');
  const orderInput = document.getElementById('inputBirthOrder');

  const total = parseInt(totalInput ? totalInput.value : 0, 10);
  const brothers = parseInt(broInput ? broInput.value : 0, 10);
  const sisters = parseInt(sisInput ? sisInput.value : 0, 10);
  const birthOrder = parseInt(orderInput ? orderInput.value : 0, 10);

  if (isNaN(total) || total < 2) {
    showToast('عدد أفراد الأسرة في الصفحة 7 يجب أن يكون 2 على الأقل (أنتِ وأسرتكِ) 👨‍👩‍👧', 'warning');
    highlightField(totalInput, 7);
    return false;
  }

  if (isNaN(brothers) || brothers < 0) {
    showToast('عدد الإخوان يجب أن يكون صفراً أو أكثر في الصفحة 7 👦', 'warning');
    highlightField(broInput, 7);
    return false;
  }

  if (isNaN(sisters) || sisters < 0) {
    showToast('عدد الأخوات يجب أن يكون صفراً أو أكثر في الصفحة 7 👧', 'warning');
    highlightField(sisInput, 7);
    return false;
  }

  // إجمالي الأبناء = الإخوان + الأخوات + الطالبة نفسها
  const totalChildren = (isNaN(brothers) ? 0 : brothers) + (isNaN(sisters) ? 0 : sisters) + 1;
  if (totalChildren > total) {
    showToast(`مجموع الأبناء (${totalChildren}) أكبر من إجمالي أفراد الأسرة (${total})! يرجى مراجعة الأرقام 👨‍👩‍👧‍👦`, 'warning');
    highlightField(totalInput, 7);
    return false;
  }

  if (isNaN(birthOrder) || birthOrder < 1) {
    showToast('ترتيبكِ في العائلة يجب أن يكون 1 على الأقل (الصفحة 7) ⭐', 'warning');
    highlightField(orderInput, 7);
    return false;
  }

  if (birthOrder > totalChildren) {
    showToast(`ترتيبكِ (${birthOrder}) لا يمكن أن يتجاوز مجموع الأبناء (${totalChildren})! يرجى تصحيح الترتيب 🌟`, 'warning');
    highlightField(orderInput, 7);
    return false;
  }

  // 4. التحقق من المهنة المستقبلية (الصفحة 10)
  const careerTitleInput = document.getElementById('careerTitleInput');
  const titleVal = careerTitleInput ? careerTitleInput.value.trim() : '';
  if (!titleVal || titleVal.length < 2) {
    showToast('اكتبي مهنتكِ المستقبلية التي تحلمين بها في الصفحة 10 🚀', 'warning');
    highlightField(careerTitleInput, 10);
    return false;
  }

  const careerDescInput = document.getElementById('careerDescriptionInput');
  const descVal = careerDescInput ? careerDescInput.value.trim() : '';
  if (!descVal || descVal.length < 5) {
    showToast('اكتبي جملة بسيطة تعبر عن هدفكِ الجميل من هذه المهنة في الصفحة 10 💡', 'warning');
    highlightField(careerDescInput, 10);
    return false;
  }

  return true;
}

// قيود الإدخال المباشرة للأرقام والتواريخ

// ========================================================
// دوال إدارة حقول التاريخ مع الفواصل والرموز الثابتة (هـ / م)
// ========================================================
function getFormattedDateHijri() {
  const day = document.getElementById('dobHijriDay')?.value.trim();
  const month = document.getElementById('dobHijriMonth')?.value.trim();
  const year = document.getElementById('dobHijriYear')?.value.trim();
  if (!day && !month && !year) return '';
  return `${day || '--'} / ${month || '--'} / ${year || '----'} هـ`;
}

function getFormattedDateGreg() {
  const day = document.getElementById('dobGregDay')?.value.trim();
  const month = document.getElementById('dobGregMonth')?.value.trim();
  const year = document.getElementById('dobGregYear')?.value.trim();
  if (!day && !month && !year) return '';
  return `${day || '--'} / ${month || '--'} / ${year || '----'} م`;
}

function setupDateInputs() {
  const groups = [
    { day: 'dobHijriDay', month: 'dobHijriMonth', year: 'dobHijriYear' },
    { day: 'dobGregDay', month: 'dobGregMonth', year: 'dobGregYear' }
  ];

  groups.forEach(group => {
    const dayEl = document.getElementById(group.day);
    const monthEl = document.getElementById(group.month);
    const yearEl = document.getElementById(group.year);

    [dayEl, monthEl, yearEl].forEach(el => {
      if (!el) return;

      el.addEventListener('keydown', (e) => {
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
          e.preventDefault();
        }
        if (e.key === 'Backspace' && el.value === '') {
          if (el === yearEl && monthEl) monthEl.focus();
          else if (el === monthEl && dayEl) dayEl.focus();
        }
      });

      el.addEventListener('input', () => {
        el.value = el.value.replace(/[^0-9]/g, '');
        if (el === dayEl && el.value.length >= 2) {
          if (monthEl) monthEl.focus();
        } else if (el === monthEl && el.value.length >= 2) {
          if (yearEl) yearEl.focus();
        }
        triggerAutoSave();
      });
    });
  });
}

function setupInputConstraints() {
  setupDateInputs();
  const numInputs = [
    document.getElementById('inputFamilyTotal'),
    document.getElementById('inputBrothers'),
    document.getElementById('inputSisters'),
    document.getElementById('inputBirthOrder')
  ];

  numInputs.forEach(input => {
    if (!input) return;

    // منع الحروف والرموز غير المرغوب فيها (e, +, -, .)
    input.addEventListener('keydown', (e) => {
      if (['e', 'E', '+', '-', '.'].includes(e.key)) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      triggerAutoSave();
    });
  });

  // ربط جميع حقول الإدخال بالحفظ التلقائي الفوري
  const allTextInputs = document.querySelectorAll('input:not([type="file"]), textarea');
  allTextInputs.forEach(input => {
    input.addEventListener('input', triggerAutoSave);
  });
}

// ========================================================
// نظام الحفظ والاسترجاع التلقائي (LocalStorage Auto-Save & Recovery)
// ========================================================
let autoSaveTimer = null;
const DRAFT_STORAGE_KEY = 'career_portfolio_clean_v4';

function triggerAutoSave() {
  setAutosaveStatus('saving');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSaveDraft, 350);
}

function setAutosaveStatus(state) {
  const indicator = document.getElementById('autosaveIndicator');
  if (!indicator) return;

  if (state === 'saving') {
    indicator.className = 'autosave-status saving no-print';
    indicator.innerText = 'جارٍ الحفظ...';
  } else if (state === 'saved') {
    indicator.className = 'autosave-status saved no-print';
    indicator.innerText = '✓ محفوظ';
    setTimeout(() => {
      if (indicator.innerText === '✓ محفوظ') {
        indicator.innerText = '';
      }
    }, 2500);
  }
}

function autoSaveDraft() {
  try {
    const activeGradeMarker = document.querySelector('.selection-marker.active');
    const activeGradeId = activeGradeMarker ? activeGradeMarker.id : null;

    const activeRegionMarker = document.querySelector('.region-circle-marker.active');
    const activeRegionId = activeRegionMarker ? activeRegionMarker.id : null;

    const activeFlag = document.querySelector('.flag-hotspot.active');
    const activeFlagTitle = activeFlag ? activeFlag.getAttribute('title') : null;

    const p2Preview = document.getElementById('p2PreviewImg');
    const p8Preview = document.getElementById('p8PreviewImg');
    const p9Preview = document.getElementById('p9PreviewImg');

    const draftData = {
      studentName: document.getElementById('studentNameInput')?.value || '',
      gradeText: document.getElementById('gradeTextInput')?.value || '',
      activeGradeId: activeGradeId,
            dobHijriDay: document.getElementById('dobHijriDay')?.value || '',
      dobHijriMonth: document.getElementById('dobHijriMonth')?.value || '',
      dobHijriYear: document.getElementById('dobHijriYear')?.value || '',
      dobGregDay: document.getElementById('dobGregDay')?.value || '',
      dobGregMonth: document.getElementById('dobGregMonth')?.value || '',
      dobGregYear: document.getElementById('dobGregYear')?.value || '',
      dobHijri: getFormattedDateHijri(),
      dobGreg: getFormattedDateGreg(),
            nationality: document.getElementById('nationalityInput')?.value || '',
      activeFlagTitle: activeFlagTitle,
      activeRegionId: activeRegionId,
      familyTotal: document.getElementById('inputFamilyTotal')?.value || '',
      brothers: document.getElementById('inputBrothers')?.value || '',
      sisters: document.getElementById('inputSisters')?.value || '',
      birthOrder: document.getElementById('inputBirthOrder')?.value || '',
      hobbies: document.getElementById('hobbiesInput')?.value || '',
      talents: document.getElementById('talentsInput')?.value || '',
      careerTitle: document.getElementById('careerTitleInput')?.value || '',
      careerDesc: document.getElementById('careerDescriptionInput')?.value || '',
      p2ImgSrc: (p2Preview && !p2Preview.classList.contains('hidden')) ? p2Preview.src : '',
      p8ImgSrc: (p8Preview && !p8Preview.classList.contains('hidden')) ? p8Preview.src : '',
      p9ImgSrc: (p9Preview && !p9Preview.classList.contains('hidden')) ? p9Preview.src : '',
      savedAt: Date.now()
    };

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    setAutosaveStatus('saved');
  } catch (err) {
    console.warn('Auto-save notice:', err);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!data) return;

    if (data.studentName !== undefined && data.studentName !== '' && !data.studentName.includes('الابتدائي') && !data.studentName.includes('الصف')) {
      const el = document.getElementById('studentNameInput');
      if (el) el.value = data.studentName;
    }
    if (data.gradeText !== undefined && data.gradeText !== '') {
      const el = document.getElementById('gradeTextInput');
      if (el) el.value = data.gradeText;
    }
    if (data.activeGradeId) {
      document.querySelectorAll('.selection-marker').forEach(m => m.classList.remove('active'));
      const gm = document.getElementById(data.activeGradeId);
      if (gm) gm.classList.add('active');
    }
    if (data.dobHijriDay !== undefined) { const el = document.getElementById('dobHijriDay'); if (el) el.value = data.dobHijriDay; }
    if (data.dobHijriMonth !== undefined) { const el = document.getElementById('dobHijriMonth'); if (el) el.value = data.dobHijriMonth; }
    if (data.dobHijriYear !== undefined) { const el = document.getElementById('dobHijriYear'); if (el) el.value = data.dobHijriYear; }
    if (data.dobGregDay !== undefined) { const el = document.getElementById('dobGregDay'); if (el) el.value = data.dobGregDay; }
    if (data.dobGregMonth !== undefined) { const el = document.getElementById('dobGregMonth'); if (el) el.value = data.dobGregMonth; }
    if (data.dobGregYear !== undefined) { const el = document.getElementById('dobGregYear'); if (el) el.value = data.dobGregYear; }
    if (!data.dobHijriDay && !data.dobHijriMonth && !data.dobHijriYear && data.dobHijri) {
      const parts = data.dobHijri.replace(/[^\d\s\/]/g, '').split('/').map(s => s.trim());
      if (parts[0]) { const el = document.getElementById('dobHijriDay'); if (el) el.value = parts[0]; }
      if (parts[1]) { const el = document.getElementById('dobHijriMonth'); if (el) el.value = parts[1]; }
      if (parts[2]) { const el = document.getElementById('dobHijriYear'); if (el) el.value = parts[2]; }
    }
    if (!data.dobGregDay && !data.dobGregMonth && !data.dobGregYear && data.dobGreg) {
      const parts = data.dobGreg.replace(/[^\d\s\/]/g, '').split('/').map(s => s.trim());
      if (parts[0]) { const el = document.getElementById('dobGregDay'); if (el) el.value = parts[0]; }
      if (parts[1]) { const el = document.getElementById('dobGregMonth'); if (el) el.value = parts[1]; }
      if (parts[2]) { const el = document.getElementById('dobGregYear'); if (el) el.value = parts[2]; }
    }
    if (data.nationality !== undefined && data.nationality !== '') {
      const el = document.getElementById('nationalityInput');
      if (el) el.value = data.nationality;
    }
    if (data.activeFlagTitle) {
      document.querySelectorAll('.flag-hotspot').forEach(f => {
        f.classList.toggle('active', f.getAttribute('title') === data.activeFlagTitle);
      });
    }
    if (data.activeRegionId) {
      document.querySelectorAll('.region-circle-marker').forEach(m => m.classList.remove('active'));
      const rm = document.getElementById(data.activeRegionId);
      if (rm) rm.classList.add('active');
    }
    if (data.familyTotal !== undefined && data.familyTotal !== '') {
      const el = document.getElementById('inputFamilyTotal');
      if (el) el.value = data.familyTotal;
    }
    if (data.brothers !== undefined && data.brothers !== '') {
      const el = document.getElementById('inputBrothers');
      if (el) el.value = data.brothers;
    }
    if (data.sisters !== undefined && data.sisters !== '') {
      const el = document.getElementById('inputSisters');
      if (el) el.value = data.sisters;
    }
    if (data.birthOrder !== undefined && data.birthOrder !== '') {
      const el = document.getElementById('inputBirthOrder');
      if (el) el.value = data.birthOrder;
    }
    if (data.hobbies !== undefined && data.hobbies !== '') {
      const el = document.getElementById('hobbiesInput');
      if (el) el.value = data.hobbies;
    }
    if (data.talents !== undefined && data.talents !== '') {
      const el = document.getElementById('talentsInput');
      if (el) el.value = data.talents;
    }
    if (data.careerTitle !== undefined && data.careerTitle !== '') {
      const el = document.getElementById('careerTitleInput');
      if (el) el.value = data.careerTitle;
    }
    if (data.careerDesc !== undefined && data.careerDesc !== '') {
      const el = document.getElementById('careerDescriptionInput');
      if (el) el.value = data.careerDesc;
    }

    // استرجاع الصور والرسومات
    const restoreImg = (id, src) => {
      if (!src) return;
      const img = document.getElementById(id);
      if (img) {
        img.src = src;
        img.classList.remove('hidden');
      }
    };
    restoreImg('p2PreviewImg', data.p2ImgSrc);
    restoreImg('p8PreviewImg', data.p8ImgSrc);
    restoreImg('p9PreviewImg', data.p9ImgSrc);

    setAutosaveStatus('saved');
    if (data.studentName) {
      showToast(`مرحباً بكِ مجدداً يا ${data.studentName}! تم استرجاع إجاباتكِ المحفوظة 🌸`, 'info', 3500);
    }
  } catch (e) {
    console.error('Error restoring draft:', e);
  }
}

function confirmResetPortfolio() {
  const confirmed = window.confirm('هل ترغبين ببدء ملف جديد ومسح الإجابات الحالية في هذا الجهاز؟');
  if (!confirmed) return;

  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {}

  const resetVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  resetVal('studentNameInput', '');
  resetVal('gradeTextInput', '');
    resetVal('dobHijriDay', '');
  resetVal('dobHijriMonth', '');
  resetVal('dobHijriYear', '');
  resetVal('dobGregDay', '');
  resetVal('dobGregMonth', '');
  resetVal('dobGregYear', '');
  resetVal('nationalityInput', '');
  resetVal('inputFamilyTotal', '');
  resetVal('inputBrothers', '');
  resetVal('inputSisters', '');
  resetVal('inputBirthOrder', '');
  resetVal('hobbiesInput', '');
  resetVal('talentsInput', '');
  resetVal('careerTitleInput', '');
  resetVal('careerDescriptionInput', '');

  // إخفاء الصور والرسومات
  ['p2PreviewImg', 'p8PreviewImg', 'p9PreviewImg'].forEach(id => {
    const img = document.getElementById(id);
    if (img) {
      img.removeAttribute('src');
      img.classList.add('hidden');
    }
  });

  // إزالة جميع علامات التحديد لتبدأ الطالبة من الصفر
  document.querySelectorAll('.selection-marker').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.region-circle-marker').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.flag-hotspot').forEach(f => f.classList.remove('active'));

  showSlide(1);
  showToast('تم إفراغ الحقول بالكامل وبدء ملف جديد بنجاح! يمكنكِ الآن تعبئة بياناتكِ 🚀', 'success', 3500);
}

function syncStudentData() {
  triggerAutoSave();
}

