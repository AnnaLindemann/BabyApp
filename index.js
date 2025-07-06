// index.js

// ── 1. Service Worker ───────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js");
      console.log("✅ SW registered:", reg.scope);
      await reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        newSW.addEventListener("statechange", () => {
          if (
            newSW.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            newSW.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (err) {
      console.error("❌ SW registration/update failed:", err);
    }
  });
}

// ── 2. Основная логика после загрузки DOM ───────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // ——— Элементы UI —————————————————————————————————————————————
  const nameInput = document.getElementById("userNameInput");
  const fileInput = document.getElementById("photoInput");
  const image = document.getElementById("babyPhoto");
  const globalDateInput = document.getElementById("globalDateInput");
  const globalTimeInput = document.getElementById("globalTimeInput");
  const feedBtn = document.getElementById("feedBtn");
  const feedAmountInput = document.getElementById("feedAmountInput");
  const sleepBtn = document.getElementById("sleepBtn");
  const wakeBtn = document.getElementById("wakeBtn");
  const diaperBtn = document.getElementById("diaperBtn");
  const peeBtn = document.getElementById("peeBtn");
  const pooBtn = document.getElementById("pooBtn");
  const eventList = document.getElementById("eventList");
  const feedTotalEl = document.getElementById("feedTotal");
  const filterCheckboxes = document.querySelectorAll(".filter-checkbox");
  //   const showSummaryBtn = document.getElementById("showSummaryBtn");
  //   const dailySummary = document.getElementById("dailySummary");
  //   const summaryDateEl = document.getElementById("summaryDate");
  //   const summaryList = document.getElementById("summaryList");
  const startDateInput = document.getElementById("startDateInput");
  const endDateInput = document.getElementById("endDateInput");
  const showRangeSummaryBtn = document.getElementById("showRangeSummaryBtn");
  const rangeSummary = document.getElementById("rangeSummary");
  const rangeSummaryDates = document.getElementById("rangeSummaryDates");
  const rangeSummaryList = document.getElementById("rangeSummaryList");
  // ——— Вспомогательные функции ——————————————————————————————————
  function getDateOrToday() {
    const d = globalDateInput.value;
    if (d) return d;
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(t.getDate()).padStart(2, "0")}`;
  }
  function getTimeOrNow() {
    const m = globalTimeInput.value;
    globalTimeInput.value = "";
    if (m) return m;
    const t = new Date();
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function saveToStorage(evtText) {
    const arr = JSON.parse(localStorage.getItem("events") || "[]");
    arr.push(evtText);
    localStorage.setItem("events", JSON.stringify(arr));
  }

  function renderEventsForDate(date) {
    eventList.innerHTML = "";
    const all = JSON.parse(localStorage.getItem("events") || "[]");
    all
      .filter((e) => e.startsWith(date + " "))
      .forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        eventList.appendChild(li);
      });
  }

  function updateFeedTotal() {
    const date = getDateOrToday();
    const all = JSON.parse(localStorage.getItem("events") || "[]");
    const sum = all.reduce((s, t) => {
      if (!t.startsWith(date + " ")) return s;
      const m = t.match(/Еда:\s*([\d.]+)\s*мл/);
      return s + (m ? parseFloat(m[1]) : 0);
    }, 0);
    feedTotalEl.textContent = sum;
  }

  function applyFilter() {
    const cats = Array.from(filterCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
    document.querySelectorAll("#eventList li").forEach((li) => {
      li.style.display =
        cats.length === 0 || cats.some((cat) => li.textContent.includes(cat))
          ? ""
          : "none";
    });
  }

  function scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(() => {
      globalDateInput.value = "";
      const d = getDateOrToday();
      renderEventsForDate(d);
      updateFeedTotal();
      scheduleMidnightRefresh();
    }, next - now);
  }

  //   function generateDailySummary() {
  //     const date = getDateOrToday();
  //     summaryDateEl.textContent = date;
  //     summaryList.innerHTML = "";
  //     const all = JSON.parse(localStorage.getItem("events") || "[]");
  //     const day = all.filter((e) => e.startsWith(date + " "));
  //     const totalMl = day.reduce((s, t) => {
  //       const m = t.match(/Еда:\s*([\d.]+)\s*мл/);
  //       return s + (m ? parseFloat(m[1]) : 0);
  //     }, 0);
  //     summaryList.appendChild(
  //       Object.assign(document.createElement("li"), {
  //         textContent: `Всего съедено: ${totalMl} мл`,
  //       })
  //     );
  //     if (day.length === 0) {
  //       summaryList.appendChild(
  //         Object.assign(document.createElement("li"), {
  //           textContent: "Событий за этот день нет.",
  //         })
  //       );
  //     } else {
  //       day.forEach((text) => {
  //         summaryList.appendChild(
  //           Object.assign(document.createElement("li"), {
  //             textContent: text,
  //           })
  //         );
  //       });
  //     }
  //     dailySummary.style.display = "block";
  //   }

  // 2) Функция для проверки, лежит ли дата между двумя датами
  function isInRange(date, start, end) {
    return date >= start && date <= end;
  }

  // 3) Своя логика генерации отчёта за период
  //   function generateRangeSummary() {
  //     const start = startDateInput.value || getDateOrToday();
  //     const end = endDateInput.value || getDateOrToday();

  //     rangeSummaryDates.textContent = `${start} → ${end}`;
  //     rangeSummaryList.innerHTML = "";

  //     const all = JSON.parse(localStorage.getItem("events") || "[]");
  //     const periodEvents = all.filter((ev) => {
  //       const d = ev.slice(0, 10);
  //       return isInRange(d, start, end);
  //     });

  //     const totalMl = periodEvents.reduce((s, ev) => {
  //       const m = ev.match(/Еда:\s*([\d.]+)\s*мл/);
  //       return s + (m ? +m[1] : 0);
  //     }, 0);

  //     rangeSummaryList.appendChild(
  //       Object.assign(document.createElement("li"), {
  //         textContent: `Всего съедено: ${totalMl} мл`,
  //       })
  //     );

  //     if (!periodEvents.length) {
  //       rangeSummaryList.appendChild(
  //         Object.assign(document.createElement("li"), {
  //           textContent: "Событий за этот период нет.",
  //         })
  //       );
  //     } else {
  //       periodEvents.forEach((text) => {
  //         rangeSummaryList.appendChild(
  //           Object.assign(document.createElement("li"), { textContent: text })
  //         );
  //       });
  //     }

  //     rangeSummary.style.display = "block";
  //   }

  function generateRangeSummary() {
    // 1) Диапазон
    const start = startDateInput.value || getDateOrToday();
    const end = endDateInput.value || getDateOrToday();

    // 2) Забираем все события и фильтруем по дате (YYYY-MM-DD)
    const all = JSON.parse(localStorage.getItem("events") || "[]");
    const period = all.filter((ev) => {
      const date = ev.slice(0, 10);
      return date >= start && date <= end;
    });

    // 3) Считаем по категориям
    let diaperCount = 0;
    let peeCount = 0;
    let pooCount = 0;
    let foodTotal = 0;
    const sleepStack = []; // для подсчёта сна

    period.forEach((ev) => {
      // ev = "YYYY-MM-DD Смена подгузника — HH:MM" и т.д.
      const rest = ev.slice(11).trim(); // "Смена подгузника — HH:MM"
      const [title, time] = rest.split("—").map((s) => s.trim());

      if (title === "Смена подгузника") {
        diaperCount++;
      } else if (title === "Пи") {
        peeCount++;
      } else if (title === "Кака") {
        pooCount++;
      } else if (title.startsWith("Еда:")) {
        const m = title.match(/Еда:\s*([\d.]+)\s*мл/);
        if (m) foodTotal += parseFloat(m[1]);
      } else if (title === "Сон" || title === "Проснулась") {
        sleepStack.push({ type: title, time });
      }
    });

    // 4) Подсчитываем общее время сна по парам Сон→Проснулась
    let sleepMinutes = 0;
    for (let i = 0; i < sleepStack.length - 1; i++) {
      if (
        sleepStack[i].type === "Сон" &&
        sleepStack[i + 1].type === "Проснулась"
      ) {
        const [h1, m1] = sleepStack[i].time.split(":").map(Number);
        const [h2, m2] = sleepStack[i + 1].time.split(":").map(Number);
        sleepMinutes += h2 * 60 + m2 - (h1 * 60 + m1);
        i++; // пропускаем «Проснулась»
      }
    }
    const hours = Math.floor(sleepMinutes / 60);
    const mins = sleepMinutes % 60;

    // 5) Выводим только итоговые строки
    rangeSummaryList.innerHTML = ""; // очищаем предыдущий результат
    rangeSummaryDates.textContent = `${start} → ${end}`;

    [
      `Всего съедено: ${foodTotal} мл`,
      `Смена подгузника: ${diaperCount} раз`,
      `Пописала: ${peeCount} раз`,
      `Покакала: ${pooCount} раз`,
      `Сон всего: ${hours} ч ${mins} мин`,
    ].forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      rangeSummaryList.appendChild(li);
    });

    rangeSummary.style.display = "block";
  }
  // 4) И навешиваем кнопку
  showRangeSummaryBtn.addEventListener("click", generateRangeSummary);

  // ——— Инициализация UI при загрузке ——————————————————————
  // профиль
  const sn = localStorage.getItem("userName");
  if (sn) nameInput.value = sn;
  const si = localStorage.getItem("babyPhoto");
  if (si) image.src = si;
  nameInput.addEventListener("input", () =>
    localStorage.setItem("userName", nameInput.value)
  );
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      image.src = ev.target.result;
      localStorage.setItem("babyPhoto", ev.target.result);
    };
    r.readAsDataURL(f);
  });

  // события первого рендера
  const today = getDateOrToday();
  globalDateInput.value = today;
  renderEventsForDate(today);
  updateFeedTotal();
  scheduleMidnightRefresh();

  // ——— Слушатели кнопок и полей ————————————————————————
  globalDateInput.addEventListener("change", () => {
    const d = getDateOrToday();
    renderEventsForDate(d);
    updateFeedTotal();
  });
  filterCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilter));

  feedBtn.addEventListener("click", () => {
    const amt = feedAmountInput.value.trim();
    if (!amt) return alert("Введите объём смеси");
    const evt = `${getDateOrToday()} Еда: ${amt} мл — ${getTimeOrNow()}`;
    saveToStorage(evt);
    renderEventsForDate(getDateOrToday());
    updateFeedTotal();
    feedAmountInput.value = "";
  });

  [sleepBtn, wakeBtn, diaperBtn, peeBtn, pooBtn].forEach((btn) => {
    const title =
      btn.id === "sleepBtn"
        ? "Сон"
        : btn.id === "wakeBtn"
        ? "Проснулась"
        : btn.id === "diaperBtn"
        ? "Смена подгузника"
        : btn.id === "peeBtn"
        ? "Пи"
        : /*pooBtn*/ "Кака";
    btn.addEventListener("click", () => {
      const evt = `${getDateOrToday()} ${title} — ${getTimeOrNow()}`;
      saveToStorage(evt);
      renderEventsForDate(getDateOrToday());
    });
  });

  showSummaryBtn.addEventListener("click", generateDailySummary);
});
