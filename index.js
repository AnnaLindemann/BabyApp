if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js"); // ← подключаем sw.js
      console.log("✅ SW registered:", reg.scope);

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
      console.error("❌ SW registration failed:", err);
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
  function updateEvent(index, newText) {
    const arr = JSON.parse(localStorage.getItem("events") || "[]");
    arr[index] = newText;
    localStorage.setItem("events", JSON.stringify(arr));
  }

  function deleteEvent(index) {
    const arr = JSON.parse(localStorage.getItem("events") || "[]");
    arr.splice(index, 1);
    localStorage.setItem("events", JSON.stringify(arr));
  }

  function renderEventsForDate(date) {
    eventList.innerHTML = "";
    const all = JSON.parse(localStorage.getItem("events") || "[]");

    // Фильтруем только события на нужную дату
    const filtered = all.filter((e) => e.startsWith(date + " "));

    //  Сортировка по времени
    filtered.sort((a, b) => {
      const getTime = (str) => {
        const timePart = str.split("—")[1]?.trim();
        return timePart || "00:00";
      };
      return getTime(a).localeCompare(getTime(b));
    });

    // Рендер

    filtered.forEach((text) => {
      const indexInAll = all.indexOf(text);
      const li = document.createElement("li");

      const span = document.createElement("span");
      span.textContent = text;

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "Редактировать";
      editBtn.addEventListener("click", () => {
        const newText = prompt("Измените событие:", text);
        if (newText && newText !== text) {
          updateEvent(indexInAll, newText);
          renderEventsForDate(getDateOrToday());
          updateFeedTotal();
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Удалить";
      deleteBtn.addEventListener("click", () => {
        if (confirm("Удалить это событие?")) {
          deleteEvent(indexInAll);
          renderEventsForDate(getDateOrToday());
          updateFeedTotal();
        }
      });

      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      eventList.appendChild(li);
    });

    applyFilter();
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

  function isInRange(date, start, end) {
    return date >= start && date <= end;
  }

  function calculateTotalSleep(events) {
    let sleepMinutes = 0;
    let lastSleepTime = null;

    events.forEach((ev) => {
      const rest = ev.slice(11).trim();
      const [title, timeStr] = rest.split("—").map((s) => s.trim());
      if (!timeStr) return;

      const [h, m] = timeStr.split(":").map(Number);
      const minutes = h * 60 + m;

      if (title === "Сон") {
        lastSleepTime = minutes;
      } else if (title === "Проснулась" && lastSleepTime !== null) {
        let duration = minutes - lastSleepTime;
        if (duration < 0) duration += 24 * 60; // через полночь
        sleepMinutes += duration;
        lastSleepTime = null;
      }
    });

    const hours = Math.floor(sleepMinutes / 60);
    const mins = sleepMinutes % 60;
    return { hours, mins };
  }

  // function generateRangeSummary() {
  //   // 1) Диапазон
  //   const start = startDateInput.value || getDateOrToday();
  //   const end = endDateInput.value || getDateOrToday();

  //   // 2) Забираем все события и фильтруем по дате
  //   const all = JSON.parse(localStorage.getItem("events") || "[]");

  //   const period = all
  //     .filter((ev) => {
  //       const date = ev.slice(0, 10);
  //       return date >= start && date <= end;
  //     })
  //     .sort((a, b) => {
  //       const [dA, tA] = a.split("—").length === 2 ? a.split("—") : [a, ""];
  //       const [dB, tB] = b.split("—").length === 2 ? b.split("—") : [b, ""];
  //       const fullA = new Date(dA.trim() + "T" + tA.trim());
  //       const fullB = new Date(dB.trim() + "T" + tB.trim());
  //       return fullA - fullB;
  //     });

  //   // 3) Считаем по категориям
  //   let diaperCount = 0;
  //   let peeCount = 0;
  //   let pooCount = 0;
  //   let foodTotal = 0;
  //   let sleepMinutes = 0;
  //   let lastSleepTime = null;

  //   period.forEach((ev) => {
  //     const rest = ev.slice(11).trim();
  //     const [title, timeStr] = rest.split("—").map((s) => s.trim());

  //     if (title === "Смена подгузника") {
  //       diaperCount++;
  //     } else if (title === "Пи") {
  //       peeCount++;
  //     } else if (title === "Кака") {
  //       pooCount++;
  //     } else if (title.startsWith("Еда:")) {
  //       const m = title.match(/Еда:\s*([\d.]+)\s*мл/);
  //       if (m) foodTotal += parseFloat(m[1]);
  //     }

  //     if (timeStr) {
  //       const [h, m] = timeStr.split(":").map(Number);
  //       const minutes = h * 60 + m;

  //       if (title === "Сон") {
  //         lastSleepTime = minutes;
  //       } else if (title === "Проснулась" && lastSleepTime !== null) {
  //         let duration = minutes - lastSleepTime;
  //         if (duration < 0) duration += 24 * 60; // если сон через полночь
  //         sleepMinutes += duration;
  //         lastSleepTime = null;
  //       }
  //     }
  //   });

  //   const hours = Math.floor(sleepMinutes / 60);
  //   const mins = sleepMinutes % 60;

  //   // 4) Вывод
  //   rangeSummaryList.innerHTML = "";
  //   rangeSummaryDates.textContent = `${start} → ${end}`;
  //   [
  //     `Всего съедено: ${foodTotal} мл`,
  //     `Смена подгузника: ${diaperCount} раз`,
  //     `Пописала: ${peeCount} раз`,
  //     `Покакала: ${pooCount} раз`,
  //     `Сон всего: ${hours} ч ${mins} мин`,
  //   ].forEach((text) => {
  //     const li = document.createElement("li");
  //     li.textContent = text;
  //     rangeSummaryList.appendChild(li);
  //   });

  //   rangeSummary.style.display = "block";
  // }
  function generateRangeSummary() {
    // 1) Диапазон
    const start = startDateInput.value || getDateOrToday();
    const end = endDateInput.value || getDateOrToday();

    // 2) Забираем все события и фильтруем по дате
    const all = JSON.parse(localStorage.getItem("events") || "[]");

    const period = all
      .filter((ev) => {
        const date = ev.slice(0, 10);
        return date >= start && date <= end;
      })
      .sort((a, b) => {
        const [dA, tA] = a.split("—").length === 2 ? a.split("—") : [a, ""];
        const [dB, tB] = b.split("—").length === 2 ? b.split("—") : [b, ""];
        const fullA = new Date(dA.trim() + "T" + tA.trim());
        const fullB = new Date(dB.trim() + "T" + tB.trim());
        return fullA - fullB;
      });

    // 3) Считаем по категориям
    let diaperCount = 0;
    let peeCount = 0;
    let pooCount = 0;
    let foodTotal = 0;

    // ❌ Удалено:
    // let sleepMinutes = 0;
    // let lastSleepTime = null;

    period.forEach((ev) => {
      const rest = ev.slice(11).trim();
      const [title, timeStr] = rest.split("—").map((s) => s.trim());

      if (title === "Смена подгузника") {
        diaperCount++;
      } else if (title === "Пи") {
        peeCount++;
      } else if (title === "Кака") {
        pooCount++;
      } else if (title.startsWith("Еда:")) {
        const m = title.match(/Еда:\s*([\d.]+)\s*мл/);
        if (m) foodTotal += parseFloat(m[1]);
      }

      // ❌ Удалено всё, что касалось sleepMinutes
    });

    // ✅ Добавлено:
    const { hours, mins } = calculateTotalSleep(period);

    // 4) Вывод
    rangeSummaryList.innerHTML = "";
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
});
