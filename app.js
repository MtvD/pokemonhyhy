(function () {
  const ACTIVE_SESSION_KEY = "pokemon-session-manager:active-session";
  const API_BASE = "api";
  const currency = new Intl.NumberFormat("vi-VN");

  const elements = {
    sessionSelect: document.querySelector("#sessionSelect"),
    newSessionBtn: document.querySelector("#newSessionBtn"),
    sessionName: document.querySelector("#sessionName"),
    buyinValue: document.querySelector("#buyinValue"),
    sessionDate: document.querySelector("#sessionDate"),
    playerName: document.querySelector("#playerName"),
    playerBuyins: document.querySelector("#playerBuyins"),
    addPlayerBtn: document.querySelector("#addPlayerBtn"),
    addTigerRiceBtn: document.querySelector("#addTigerRiceBtn"),
    clearSessionBtn: document.querySelector("#clearSessionBtn"),
    playersBody: document.querySelector("#playersBody"),
    emptyState: document.querySelector("#emptyState"),
    rowTemplate: document.querySelector("#playerRowTemplate"),
    totalPlayers: document.querySelector("#totalPlayers"),
    totalBuyinCount: document.querySelector("#totalBuyinCount"),
    totalStartPoints: document.querySelector("#totalStartPoints") || document.querySelector("#totalBuyinMoney"),
    totalFinalPoints: document.querySelector("#totalFinalPoints") || document.querySelector("#totalFinalMoney"),
    totalDifference: document.querySelector("#totalDifference"),
    differenceMetric: document.querySelector("#differenceMetric"),
    historyActiveSessions: document.querySelector("#historyActiveSessions"),
    historyBuyinCount: document.querySelector("#historyBuyinCount"),
    historyStartPoints: document.querySelector("#historyStartPoints") || document.querySelector("#historyBuyinMoney"),
    historyFinalPoints: document.querySelector("#historyFinalPoints") || document.querySelector("#historyFinalMoney"),
    historyDifference: document.querySelector("#historyDifference"),
    historyDifferenceMetric: document.querySelector("#historyDifferenceMetric"),
    personStatsBody: document.querySelector("#personStatsBody"),
    personStatsEmpty: document.querySelector("#personStatsEmpty"),
    historyBody: document.querySelector("#historyBody"),
    historyEmpty: document.querySelector("#historyEmpty")
  };

  let state = {
    activeSessionId: null,
    sessions: []
  };
  let sessionSaveTimer = null;
  const playerSaveTimers = new Map();

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function apiRequest(path, options) {
    const response = await fetch(API_BASE + "/" + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      throw new Error(data.error || "Không kết nối được server");
    }

    return data;
  }

  function activeSession() {
    return state.sessions.find((session) => String(session.id) === String(state.activeSessionId)) || state.sessions[0];
  }

  function activeSessionsForStats() {
    return state.sessions.filter((session) => !session.deletedAt);
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function points(value) {
    return currency.format(Math.round(value)) + " điểm";
  }

  function balanceText(value) {
    if (value < 0) {
      return "Dư - " + points(Math.abs(value));
    }

    if (value > 0) {
      return "Thiếu - " + points(value);
    }

    return points(0);
  }

  function playerResultText(value) {
    if (value > 0) {
      return "Lời " + points(value);
    }

    if (value < 0) {
      return "Lỗ " + points(Math.abs(value));
    }

    return "Huề";
  }

  function setBalanceClasses(element, value) {
    element.classList.toggle("ok", value === 0);
    element.classList.toggle("warn", value < 0);
    element.classList.toggle("shortage", value > 0);
  }

  function setResultClasses(element, value) {
    element.classList.toggle("positive", value > 0);
    element.classList.toggle("negative", value < 0);
    element.classList.toggle("surplus", false);
    element.classList.toggle("shortage", false);
  }

  function setBalanceResultClasses(element, value) {
    element.classList.toggle("surplus", value < 0);
    element.classList.toggle("shortage", value > 0);
    element.classList.toggle("positive", false);
    element.classList.toggle("negative", false);
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const [year, month, day] = value.split("-");
    return [day, month, year].filter(Boolean).join("/");
  }

  function playerKeyword(name) {
    return name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function setBusy(isBusy) {
    [
      elements.sessionSelect,
      elements.newSessionBtn,
      elements.sessionName,
      elements.buyinValue,
      elements.sessionDate,
      elements.playerName,
      elements.playerBuyins,
      elements.addPlayerBtn,
      elements.addTigerRiceBtn,
      elements.clearSessionBtn
    ].forEach((element) => {
      element.disabled = isBusy;
    });
  }

  function showError(error) {
    alert(error.message || "Có lỗi xảy ra");
  }

  async function loadSessions() {
    setBusy(true);
    try {
      const data = await apiRequest("sessions.php");
      state.sessions = data.sessions || [];

      if (!state.sessions.length) {
        const created = await apiRequest("sessions.php", {
          method: "POST",
          body: JSON.stringify({
            name: "Phiên " + new Date().toLocaleString("vi-VN"),
            date: today(),
            buyinValue: 0
          })
        });
        state.sessions = [created.session];
      }

      const savedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
      const hasSavedSession = state.sessions.some((session) => String(session.id) === String(savedActiveId));
      state.activeSessionId = hasSavedSession ? savedActiveId : state.sessions[0].id;
      render();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function render() {
    const session = activeSession();
    if (!session) {
      return;
    }

    localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
    renderSessionSelect(session.id);
    elements.sessionName.value = session.name;
    elements.buyinValue.value = session.buyinValue || "";
    elements.sessionDate.value = session.date || today();
    renderPlayers(session);
    renderSessionSummary(session);
    renderHistory();
  }

  function renderSessionSelect(activeId) {
    elements.sessionSelect.innerHTML = "";

    state.sessions
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .forEach((session) => {
        const option = document.createElement("option");
        option.value = session.id;
        option.textContent = (session.name || "Phiên không tên") + (session.deletedAt ? " (đã ẩn)" : "");
        option.selected = String(session.id) === String(activeId);
        elements.sessionSelect.append(option);
      });
  }

  function renderPlayers(session) {
    elements.playersBody.innerHTML = "";
    elements.emptyState.hidden = session.players.length > 0;

    session.players.forEach((player) => {
      const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);

      const nameInput = row.querySelector(".name-input");
      const buyinsInput = row.querySelector(".buyins-input");
      const finalInput = row.querySelector(".final-input");

      nameInput.value = player.name;
      buyinsInput.value = player.buyins;
      finalInput.value = player.finalAmount || "";
      updateRowTotals(row, player, session);

      nameInput.addEventListener("input", () => updatePlayer(player.id, { name: nameInput.value }, row));
      buyinsInput.addEventListener("input", () => updatePlayer(player.id, { buyins: toNumber(buyinsInput.value) }, row));
      finalInput.addEventListener("input", () => updatePlayer(player.id, { finalAmount: toNumber(finalInput.value) }, row));
      row.querySelector(".delete-player").addEventListener("click", () => deletePlayer(player.id));

      elements.playersBody.append(row);
    });
  }

  function sessionTotals(session) {
    return session.players.reduce(
      (sum, player) => {
        const buyins = toNumber(player.buyins);
        sum.players += 1;
        sum.buyinCount += buyins;
        sum.startPoints += buyins * toNumber(session.buyinValue);
        sum.finalPoints += toNumber(player.finalAmount);
        return sum;
      },
      { players: 0, buyinCount: 0, startPoints: 0, finalPoints: 0 }
    );
  }

  function updateRowTotals(row, player, session) {
    const startPoints = toNumber(player.buyins) * toNumber(session.buyinValue);
    const finalPoints = toNumber(player.finalAmount);
    const result = finalPoints - startPoints;
    const resultCell = row.querySelector(".result-cell");

    const startPointsCell = row.querySelector(".start-points") || row.querySelector(".buyin-money");
    if (startPointsCell) {
      startPointsCell.textContent = points(startPoints);
    }
    resultCell.textContent = playerResultText(result);
    setResultClasses(resultCell, result);
  }

  function renderSessionSummary(session) {
    const totals = sessionTotals(session);
    const difference = totals.finalPoints - totals.startPoints;

    elements.totalPlayers.textContent = String(totals.players);
    elements.totalBuyinCount.textContent = String(totals.buyinCount);
    elements.totalStartPoints.textContent = points(totals.startPoints);
    elements.totalFinalPoints.textContent = points(totals.finalPoints);
    elements.totalDifference.textContent = balanceText(difference);
    setBalanceClasses(elements.differenceMetric, difference);
  }

  function renderHistory() {
    const visibleSessions = activeSessionsForStats();
    const allTotals = visibleSessions.reduce(
      (sum, session) => {
        const totals = sessionTotals(session);
        sum.buyinCount += totals.buyinCount;
        sum.startPoints += totals.startPoints;
        sum.finalPoints += totals.finalPoints;
        return sum;
      },
      { buyinCount: 0, startPoints: 0, finalPoints: 0 }
    );
    const difference = allTotals.finalPoints - allTotals.startPoints;

    elements.historyActiveSessions.textContent = String(visibleSessions.length);
    elements.historyBuyinCount.textContent = String(allTotals.buyinCount);
    elements.historyStartPoints.textContent = points(allTotals.startPoints);
    elements.historyFinalPoints.textContent = points(allTotals.finalPoints);
    elements.historyDifference.textContent = balanceText(difference);
    setBalanceClasses(elements.historyDifferenceMetric, difference);

    renderPersonStats(visibleSessions);
    renderHistoryRows();
  }

  function renderPersonStats(sessions) {
    const stats = new Map();

    sessions.forEach((session) => {
      session.players.forEach((player) => {
        const key = playerKeyword(player.name);
        if (!key) {
          return;
        }

        if (!stats.has(key)) {
          stats.set(key, {
            name: key,
            aliases: new Set(),
            buyinCount: 0,
            startPoints: 0,
            finalPoints: 0
          });
        }

        const item = stats.get(key);
        const buyins = toNumber(player.buyins);
        item.aliases.add(player.name.trim());
        item.buyinCount += buyins;
        item.startPoints += buyins * toNumber(session.buyinValue);
        item.finalPoints += toNumber(player.finalAmount);
      });
    });

    const rows = Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    elements.personStatsBody.innerHTML = "";
    elements.personStatsEmpty.hidden = rows.length > 0;

    rows.forEach((item) => {
      const result = item.finalPoints - item.startPoints;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Người chơi"></td>
        <td data-label="Tổng lượt"></td>
        <td data-label="Tổng điểm đầu"></td>
        <td data-label="Tổng điểm chốt"></td>
        <td data-label="Kết quả" class="result-cell"></td>
      `;
      row.children[0].textContent = item.name;
      row.children[0].title = Array.from(item.aliases).join(", ");
      row.children[1].textContent = String(item.buyinCount);
      row.children[2].textContent = points(item.startPoints);
      row.children[3].textContent = points(item.finalPoints);
      row.children[4].textContent = playerResultText(result);
      setResultClasses(row.children[4], result);
      elements.personStatsBody.append(row);
    });
  }

  function renderHistoryRows() {
    const rows = state.sessions
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));

    elements.historyBody.innerHTML = "";
    elements.historyEmpty.hidden = rows.length > 0;

    rows.forEach((session) => {
      const totals = sessionTotals(session);
      const result = totals.finalPoints - totals.startPoints;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Ngày"></td>
        <td data-label="Phiên"></td>
        <td data-label="Điểm đầu"></td>
        <td data-label="Điểm chốt"></td>
        <td data-label="Chênh điểm" class="result-cell"></td>
        <td data-label="Trạng thái"></td>
        <td class="actions-cell"></td>
      `;

      const status = document.createElement("span");
      status.className = "status-badge" + (session.deletedAt ? " deleted" : "");
      status.textContent = session.deletedAt ? "Đã ẩn" : "Đang tính";

      const actions = document.createElement("div");
      actions.className = "row-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "ghost";
      editButton.textContent = "Sửa";
      editButton.addEventListener("click", () => {
        state.activeSessionId = session.id;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      const visibilityButton = document.createElement("button");
      visibilityButton.type = "button";
      visibilityButton.className = "ghost";
      visibilityButton.textContent = session.deletedAt ? "Khôi phục" : "Xóa";
      visibilityButton.addEventListener("click", () => toggleSessionVisibility(session.id, !session.deletedAt));

      actions.append(editButton, visibilityButton);

      row.children[0].textContent = formatDate(session.date);
      row.children[1].textContent = session.name || "Phiên không tên";
      row.children[2].textContent = points(totals.startPoints);
      row.children[3].textContent = points(totals.finalPoints);
      row.children[4].textContent = balanceText(result);
      setBalanceResultClasses(row.children[4], result);
      row.children[5].append(status);
      row.children[6].append(actions);
      elements.historyBody.append(row);
    });
  }

  async function addPlayer() {
    const session = activeSession();
    const name = elements.playerName.value.trim();
    if (!session || !name) {
      elements.playerName.focus();
      return;
    }

    const initialBuyins = elements.playerBuyins.value === "" ? 1 : toNumber(elements.playerBuyins.value);

    elements.addPlayerBtn.disabled = true;
    try {
      const data = await apiRequest("players.php", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.id,
          name,
          buyins: initialBuyins,
          finalAmount: 0
        })
      });

      session.players.push(data.player);
      elements.playerName.value = "";
      elements.playerBuyins.value = "1";
      render();
      elements.playerName.focus();
    } catch (error) {
      showError(error);
    } finally {
      elements.addPlayerBtn.disabled = false;
    }
  }

  async function addPresetPlayers() {
    const session = activeSession();
    if (!session) {
      return;
    }

    const names = [
      "Gá Việt",
      "TIP - Vũ Thợ Định",
      "Lực bật công tắc gật đầu",
      "Minh Lơ",
      "Tú chắc cú"
    ];

    elements.addTigerRiceBtn.disabled = true;
    try {
      const createdPlayers = [];

      for (const name of names) {
        const data = await apiRequest("players.php", {
          method: "POST",
          body: JSON.stringify({
            sessionId: session.id,
            name,
            buyins: 1,
            finalAmount: 0
          })
        });

        if (!data.player) {
          throw new Error("Không tạo được người chơi: " + name);
        }

        createdPlayers.push(data.player);
      }

      session.players.push(...createdPlayers);
      render();
    } catch (error) {
      showError(error);
    } finally {
      elements.addTigerRiceBtn.disabled = false;
    }
  }

  function updateSession(patch) {
    const session = activeSession();
    if (!session) {
      return;
    }

    Object.assign(session, patch);
    renderSessionSelect(session.id);
    renderPlayers(session);
    renderSessionSummary(session);
    renderHistory();

    clearTimeout(sessionSaveTimer);
    sessionSaveTimer = setTimeout(async () => {
      try {
        await apiRequest("sessions.php", {
          method: "PUT",
          body: JSON.stringify({
            id: session.id,
            name: session.name,
            date: session.date,
            buyinValue: toNumber(session.buyinValue)
          })
        });
      } catch (error) {
        showError(error);
      }
    }, 350);
  }

  function updatePlayer(playerId, patch, row) {
    const session = activeSession();
    const player = session.players.find((item) => String(item.id) === String(playerId));
    if (!player) {
      return;
    }

    Object.assign(player, patch);
    updateRowTotals(row, player, session);
    renderSessionSummary(session);
    renderHistory();

    clearTimeout(playerSaveTimers.get(playerId));
    playerSaveTimers.set(
      playerId,
      setTimeout(async () => {
        try {
          await apiRequest("players.php", {
            method: "PUT",
            body: JSON.stringify({
              id: player.id,
              name: player.name,
              buyins: toNumber(player.buyins),
              finalAmount: toNumber(player.finalAmount)
            })
          });
        } catch (error) {
          showError(error);
        }
      }, 350)
    );
  }

  async function deletePlayer(playerId) {
    const session = activeSession();
    try {
      await apiRequest("players.php", {
        method: "DELETE",
        body: JSON.stringify({ id: playerId })
      });
      session.players = session.players.filter((player) => String(player.id) !== String(playerId));
      render();
    } catch (error) {
      showError(error);
    }
  }

  async function toggleSessionVisibility(sessionId, shouldHide) {
    const session = state.sessions.find((item) => String(item.id) === String(sessionId));
    if (!session) {
      return;
    }

    if (shouldHide && !confirm("Ẩn phiên này khỏi thống kê? Dữ liệu vẫn được giữ để khôi phục.")) {
      return;
    }

    try {
      await apiRequest("sessions.php", {
        method: "DELETE",
        body: JSON.stringify({ id: sessionId, action: shouldHide ? "hide" : "restore" })
      });
      session.deletedAt = shouldHide ? new Date().toISOString() : null;
      render();
    } catch (error) {
      showError(error);
    }
  }

  elements.newSessionBtn.addEventListener("click", async () => {
    setBusy(true);
    try {
      const data = await apiRequest("sessions.php", {
        method: "POST",
        body: JSON.stringify({
          name: "Phiên " + new Date().toLocaleString("vi-VN"),
          date: today(),
          buyinValue: 0
        })
      });
      state.sessions.push(data.session);
      state.activeSessionId = data.session.id;
      render();
      elements.sessionName.focus();
      elements.sessionName.select();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  });

  elements.sessionSelect.addEventListener("change", () => {
    state.activeSessionId = elements.sessionSelect.value;
    render();
  });

  elements.sessionName.addEventListener("input", () => updateSession({ name: elements.sessionName.value }));
  elements.buyinValue.addEventListener("input", () => updateSession({ buyinValue: toNumber(elements.buyinValue.value) }));
  elements.sessionDate.addEventListener("input", () => updateSession({ date: elements.sessionDate.value }));
  elements.addPlayerBtn.addEventListener("click", addPlayer);
  elements.addTigerRiceBtn.addEventListener("click", addPresetPlayers);
  elements.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addPlayer();
    }
  });
  elements.playerBuyins.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addPlayer();
    }
  });
  elements.clearSessionBtn.addEventListener("click", async () => {
    const session = activeSession();
    if (!session || !confirm("Xóa tất cả người chơi trong phiên này?")) {
      return;
    }

    try {
      await apiRequest("sessions.php", {
        method: "DELETE",
        body: JSON.stringify({ id: session.id, action: "clearPlayers" })
      });
      session.players = [];
      render();
    } catch (error) {
      showError(error);
    }
  });

  loadSessions();
})();
