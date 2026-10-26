let currentActivePage = 1;
const totalPages = 10;
let isSingleMode = true; // وضع الشريحة الواحدة للتعبئة المريحة
let activeDrawingTarget = null; // p2, p8, p9

// بيانات إرسال تجريبية أولية للوحة المعلمة
let submissions = [
  {
    id: 1,
    name: 'سارة خالد الشمري',
    grade: 'الصف الرابع الابتدائي',
    region: 'المنطقة الوسطى',
    career: 'طبيبة أطفال 🩺',
    date: 'اليوم، 10:15 ص'
  },
  {
    id: 2,
    name: 'ريم عبدالعزيز الغامدي',
    grade: 'الصف الخامس الابتدائي',
    region: 'المنطقة الغربية',
    career: 'مهندسة برمجيات 💻',
    date: 'اليوم، 11:30 ص'
  },
  {
    id: 3,
    name: 'جنى أحمد الدوسري',
    grade: 'الصف السادس الابتدائي',
    region: 'المنطقة الشرقية',
    career: 'رائدة فضاء 🚀',
    date: 'أمس، 02:40 م'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initStepper();
  setupDrawingCanvas();
  renderAdminTable();
  setSingleView(true);
  showSlide(1);
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
    if (btn) btn.innerText = '📜 استعراض كل الصفحات معاً';
    showSlide(currentActivePage);
  } else {
    document.body.classList.remove('single-mode');
    if (btn) btn.innerText = '📄 العودة لنمط الشريحة الواحدة';
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
}

// اختيار المنطقة (وضع دائرة حمراء حول كرت المنطقة وتحديدها)
function selectRegionSpot(regionName, element) {
  document.querySelectorAll('.region-circle-marker').forEach(m => m.classList.remove('active'));
  const marker = element.querySelector('.region-circle-marker');
  if (marker) marker.classList.add('active');
}

// اختيار العلم (تحديد العلم وكتابة الجنسية في المربع)
function pickFlag(nationalityName, element) {
  document.querySelectorAll('.flag-hotspot').forEach(f => f.classList.remove('active'));
  element.classList.add('active');
  const input = document.getElementById('nationalityInput');
  if (input) input.value = nationalityName;
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
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(previewImgId);
      if (preview) {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
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

let lastGeneratedPdfBlob = null;
let lastGeneratedPdfName = "ملف_التوجيه_المهني.pdf";

// إرسال البيانات للمعلمة وتوليد PDF ورفعه إلى Google Drive
async function submitPortfolio() {
  const nameInput = document.getElementById('studentNameInput');
  const gradeInput = document.getElementById('gradeTextInput');
  const careerInput = document.getElementById('careerTitleInput');

  const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'طالبة متميزة';
  const grade = (gradeInput && gradeInput.value.trim()) ? gradeInput.value.trim() : 'الصف الرابع الابتدائي';
  const career = (careerInput && careerInput.value.trim()) ? careerInput.value.trim() : 'طبيبة 🩺';

  lastGeneratedPdfName = `ملف_التوجيه_المهني_${name}_${grade}.pdf`.replace(/\s+/g, '_');

  // فتح نافذة حالة الرفع
  openUploadModal();
  setUploadState('loading', `جارٍ توليد وتجهيز صفحات ملفك المهني بصيغة PDF لـ ${name}...`);

  // حفظ في الجدول المحلي للوحة المعلمة
  submissions.unshift({
    id: submissions.length + 1,
    name: name,
    grade: grade,
    region: 'المملكة العربية السعودية',
    career: career,
    date: 'الآن'
  });
  renderAdminTable();

  // تفعيل وضع تصدير الـ PDF لمنع الفواصل وقص الصفحات
  document.body.classList.add('pdf-export-mode');
  const prevMode = isSingleMode;
  document.querySelectorAll('.slide-page').forEach(page => {
    page.style.display = 'block';
  });

  const docElement = document.getElementById('documentContainer');

  const opt = {
    margin: 0,
    filename: lastGeneratedPdfName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true, logging: false, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], after: '.slide-page' }
  };

  try {
    if (typeof html2pdf !== 'function') {
      throw new Error('مكتبة html2pdf غير متصلة.');
    }

    setUploadState('loading', 'جارٍ الرفع المباشر إلى مجلد Google Drive...');

    // تحويل الملف إلى DataURI / Base64 مع ضمان فصل كل شريحة في صفحة A4 مستقلة
    const pdfDataUri = await html2pdf().set(opt).from(docElement).outputPdf('datauristring');
    const base64Data = pdfDataUri.split(',')[1];

    // استعادة وضع العرض الأصلي وإزالة وضع التصدير
    document.body.classList.remove('pdf-export-mode');
    if (prevMode) {
      document.querySelectorAll('.slide-page').forEach((page, idx) => {
        page.style.display = (idx + 1 === currentActivePage) ? 'block' : 'none';
      });
    }

    // إذا لم يقم المعلم بوضع الرابط بعد، نوفر خيار التحميل المباشر مع توجيه
    if (!GOOGLE_SCRIPT_WEBAPP_URL || GOOGLE_SCRIPT_WEBAPP_URL.includes('ضع_رابط')) {
      setUploadState('error', `أحسنتِ يا ${name}! تم تجهيز ملف الـ PDF بنجاح 👏\n(لم يتم وضع رابط Google Apps Script بعد في الكود، يمكنك تحميل الملف مباشرة الآن).`);
      return;
    }

    // إرسال الملف إلى Google Apps Script
    // نستخدم text/plain لتفادي قيود CORS في المتصفحات مع وضع no-cors
    await fetch(GOOGLE_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        fileName: lastGeneratedPdfName,
        fileData: base64Data,
        studentName: name,
        grade: grade
      })
    });

    // تم الرفع بنجاح!
    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    setUploadState('success', `أحسنتِ يا ${name}! 🎉\nتم رفع ملفك المهني بصيغة PDF بنجاح إلى مجلد Google Drive للمعلمة.`);

  } catch (err) {
    console.error('Error uploading PDF:', err);

    // استعادة وضع العرض الأصلي وإزالة وضع التصدير
    document.body.classList.remove('pdf-export-mode');
    if (prevMode) {
      document.querySelectorAll('.slide-page').forEach((page, idx) => {
        page.style.display = (idx + 1 === currentActivePage) ? 'block' : 'none';
      });
    }

    setUploadState('error', `حدث خطأ أثناء الرفع التلقائي: (${err.message || 'فشل الاتصال'})\nيمكنك تحميل نسخة الـ PDF على جهازك مباشرة بالضغط على الزر أدناه:`);
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
  const opt = {
    margin: 0,
    filename: lastGeneratedPdfName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], after: '.slide-page' }
  };

  html2pdf().set(opt).from(docElement).save().then(() => {
    document.body.classList.remove('pdf-export-mode');
    if (prevMode) {
      document.querySelectorAll('.slide-page').forEach((page, idx) => {
        page.style.display = (idx + 1 === currentActivePage) ? 'block' : 'none';
      });
    }
    closeUploadModal();
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

  if (countBadge) countBadge.innerText = submissions.length;
  if (adminTotalCount) adminTotalCount.innerText = submissions.length;

  if (!tbody) return;
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

function syncStudentData() {
  // دالة لتحديث أي ملخص عند الكتابة الفورية
}
