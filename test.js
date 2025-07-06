// index.js

// ── Service Worker registration & auto-update logic ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js");
      console.log("✅ SW registered:", reg.scope);

      // force download new SW if available
      await reg.update();

      // if there's a waiting SW, ask it to skip waiting
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });

      // when a new SW is found...
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

      // reload page when controller changes to the new SW
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.error("❌ SW registration/update failed:", err);
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  // ── PROFILE: name + photo ──
  const nameInput = document.getElementById("userNameInput");
  const fileInput = document.getElementById("photoInput");
  const image = document.getElementById("babyPhoto");

  // restore from localStorage
  const savedName = localStorage.getItem("userName");
  const savedImage = localStorage.getItem("babyPhoto");
  if (savedName) nameInput.value = savedName;
  if (savedImage) image.src = savedImage;

  // save name on input
  nameInput.addEventListener("input", () => {
    localStorage.setItem("userName", nameInput.value);
  });

  // save photo on file selection
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      image.src = dataUrl;
      localStorage.setItem("babyPhoto", dataUrl);
    };
    reader.readAsDataURL(file);
  });

  // ── ELEMENTS for events ──
  const globalTimeInput = document.getElementById("globalTimeInput");
  const feedBtn = document.getElementById("feedBtn");
  const feedAmountInput = document.getElementById("feedAmountInput");
  const sleepBtn = document.getElementById("sleepBtn");
  const wakeBtn = document.getElementById("wakeBtn");
  const diaperBtn = document.getElementById("diaperBtn");
  const peeBtn = document.getElementById("peeBtn");
  const pooBtn = document.getElementById("pooBtn");
  const eventList = document.getElementById("eventList");
  const globalDateInput = document.getElementById("globalDateInput"); //Just added

  // restore saved events
  const savedEvents = JSON.parse(localStorage.getItem("events") || "[]");
  savedEvents.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    eventList.appendChild(li);
  });

  // helpers: time & event storage
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function getTimeFromInputOrNow() {
    const manual = globalTimeInput.value;
    globalTimeInput.value = "";
    return manual || getCurrentTime();
  }
  function saveToStorage(eventText) {
    const arr = JSON.parse(localStorage.getItem("events") || "[]");
    arr.push(eventText);
    localStorage.setItem("events", JSON.stringify(arr));
  }
  function addEvent(title, time) {
    const date = getDateOrToday(); // <-- получаем дату
    const eventText = `${date} ${title} — ${time}`;
    // const eventText = `${title} — ${time}`;
    const li = document.createElement("li");
    li.textContent = eventText;
    eventList.appendChild(li);
    saveToStorage(eventText);
  }
  function getDateOrToday() {
    //!!!!!!!!!!!!!!!!!!!!!!!!!!1111111111111111111111111111111111
    ///Just added, date
    const d = globalDateInput.value;
    if (d) return d;
    const today = new Date();
    const yy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  // ── FEED-TOTAL BLOCK START ──
  const feedTotalEl = document.getElementById("feedTotal");

  function updateFeedTotal() {
    const date = getDateOrToday(); // YYYY-MM-DD
    const events = JSON.parse(localStorage.getItem("events") || "[]");

    // суммируем только события «Еда» с нужной датой
    const total = events.reduce((sum, text) => {
      // строка: "YYYY-MM-DD Еда: X мл — HH:MM"
      if (!text.startsWith(date + " ")) return sum;
      const m = text.match(/Еда:\s*([\d.]+)\s*мл/);
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);

    feedTotalEl.textContent = total;
  }

  // вызываем при загрузке, чтобы сразу отобразить
  updateFeedTotal();

  // и внутри обработчика кнопки «Еда» после addEvent:
  //   feedBtn.addEventListener("click", () => {
  //     // … ваша логика addEvent …
  //     updateFeedTotal(); // пересчитываем сразу
  //   });

  // event listeners
  feedBtn.addEventListener("click", () => {
    const amount = feedAmountInput.value.trim();
    if (!amount) return alert("Введите объём смеси");
    addEvent(`Еда: ${amount} мл`, getTimeFromInputOrNow());
    feedAmountInput.value = "";
    updateFeedTotal(); // <-- recalc immediately
  });

  globalDateInput.addEventListener("change", updateFeedTotal);

  sleepBtn.addEventListener("click", () =>
    addEvent("Сон", getTimeFromInputOrNow())
  );
  wakeBtn.addEventListener("click", () =>
    addEvent("Проснулась", getTimeFromInputOrNow())
  );
  diaperBtn.addEventListener("click", () =>
    addEvent("Смена подгузника", getTimeFromInputOrNow())
  );
  peeBtn.addEventListener("click", () =>
    addEvent("Пи", getTimeFromInputOrNow())
  );
  pooBtn.addEventListener("click", () =>
    addEvent("Кака", getTimeFromInputOrNow())
  );

  const filterCheckboxes = document.querySelectorAll(".filter-checkbox");
  function applyFilter() {
    const activeCats = Array.from(filterCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
    document.querySelectorAll("#eventList li").forEach((li) => {
      const text = li.textContent;

      const matches = activeCats.some((cat) => text.includes(cat));
      li.style.display = matches ? "" : "none";
    });
  }
  filterCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilter));
  applyFilter();
  // ── КОНЕЦ БЛОКА ФИЛЬТРАЦИИ ──

  // ── DAILY FEED + FULL DAY SUMMARY ──
  const showSummaryBtn = document.getElementById("showSummaryBtn");
  const dailySummary = document.getElementById("dailySummary");
  const summaryDateEl = document.getElementById("summaryDate");
  const summaryList = document.getElementById("summaryList");

  function generateDailyFeedSummary() {
    const date = getDateOrToday(); // ваша функция из кода
    summaryDateEl.textContent = date;
    summaryList.innerHTML = ""; // очистить

    // все сохранённые события
    const events = JSON.parse(localStorage.getItem("events") || "[]");
    // только за нужную дату
    const dayEvents = events.filter((e) => e.startsWith(date + " "));

    // 1) Считаем общий объём еды
    const totalMl = dayEvents.reduce((sum, text) => {
      const m = text.match(/Еда:\s*([\d.]+)\s*мл/);
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);
    // выводим первую строку-сводку
    const liTotal = document.createElement("li");
    liTotal.textContent = `Всего съедено: ${totalMl} мл`;
    summaryList.appendChild(liTotal);

    // 2) Если нет событий вовсе
    if (dayEvents.length === 0) {
      const liNone = document.createElement("li");
      liNone.textContent = "Событий за этот день нет.";
      summaryList.appendChild(liNone);
      dailySummary.style.display = "block";
      return;
    }

    // 3) Потом выводим полный список всех событий этого дня
    dayEvents.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      summaryList.appendChild(li);
    });

    dailySummary.style.display = "block";
  }

  showSummaryBtn.addEventListener("click", generateDailyFeedSummary);
  // ── END DAILY FEED + FULL DAY SUMMARY ──
});
