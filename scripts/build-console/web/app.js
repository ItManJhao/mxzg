/**
 * 内网构建台的浏览器入口。读取公开状态，并把受保护的操作请求和日志查询交给本机门户服务。
 * 操作口令仅在当前页面内存中持有，不写入地址、缓存或浏览器存储。
 */
"use strict";

const actions = new Map([
    ["pull", "拉取最新"],
    ["frontend", "前端更新"],
    ["backend", "后端更新"],
    ["restart", "后端重启"],
    ["config", "配置表更新"],
    ["all", "一键全量更新"],
]);
const statuses = new Map([
    ["queued", ["排队中", "busy"]],
    ["pending", ["排队中", "busy"]],
    ["running", ["执行中", "busy"]],
    ["done", ["成功", "ok"]],
    ["success", ["成功", "ok"]],
    ["succeeded", ["成功", "ok"]],
    ["error", ["失败", "error"]],
    ["failed", ["失败", "error"]],
    ["cancelled", ["已取消", "muted"]],
    ["interrupted", ["已中断", "error"]],
]);
const dateFormat = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});
const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map(element => [element.id, element]));
const operationButtons = [...document.querySelectorAll("[data-action]")];
let token = "";
let snapshot = null;
let connected = false;
let selectedId = "";
let posting = false;
let polling = false;
let logRequest = 0;
let operatorRequest = 0;
let activeLogText = "";
let toastTimer = 0;
let historySignature = "";

/** 用与页面同源的接口发送请求，失败时保留可展示的错误及 HTTP 状态。 */
async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(path, {
            method: options.method || "GET",
            headers: options.headers,
            body: options.body,
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = typeof payload.error === "string" ? payload.error : "请求失败（" + response.status + "）";
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }
        return payload;
    } finally {
        clearTimeout(timer);
    }
}

/** 统一展示动作名，保留未知历史记录的可读标记。 */
function actionName(action) {
    return actions.get(action) || "未知操作";
}

/** 将完整 Git 提交号缩短为可读标识，缺少版本时展示占位。 */
function versionLabel(value) {
    const version = typeof value === "string" ? value : value?.commit || value?.version || "";
    if (!version || typeof version !== "string") {
        return "—";
    }
    return /^[a-f\d]{13,64}$/i.test(version) ? version.slice(0, 12) : version;
}

/** 把有效时间格式化为访客本地时间，旧记录缺失时间时留空占位。 */
function timeLabel(value) {
    const time = value ? new Date(value) : null;
    return time && Number.isFinite(time.getTime()) ? dateFormat.format(time) : "—";
}

/** 设置带颜色的状态标签，同时给读屏器保留状态文字。 */
function showPill(element, text, tone) {
    element.textContent = text;
    element.dataset.tone = tone;
}

/** 显示当前可用操作与占用状态，提交中或无法连接时禁用所有命令。 */
function renderOperations() {
    const busy = Boolean(snapshot?.activeJob);
    for (const button of operationButtons) {
        button.disabled = !token || !connected || busy || posting;
    }
    elements["operator-label"].textContent = token ? "锁定操作" : "解锁操作";
    elements["operator-button"].title = token ? "清除当前页面中的操作口令" : "输入操作口令";
    let hint = "输入操作口令后即可执行。";
    if (!connected) {
        hint = "构建台暂不可达，恢复连接后可执行操作。";
    } else if (busy || posting) {
        hint = "任务正在执行，完成后可提交下一项。";
    } else if (token) {
        hint = "选择一项操作开始构建。";
    }
    elements["operations-hint"].textContent = hint;
}

/** 渲染目标地址，只允许打开 HTTP 或 HTTPS 游戏页面。 */
function renderEndpoint(target) {
    const anchor = elements["target-link"];
    let url = null;
    try {
        const candidate = new URL(target?.url || "");
        if (["https:", "http:"].includes(candidate.protocol) && !candidate.username && !candidate.password) {
            url = candidate;
        }
    } catch {
        // 尚未配置目标时，入口保持不可用。
    }
    elements["target-address"].textContent = url?.href || "等待测试地址";
    if (url) {
        anchor.href = url.href;
        anchor.removeAttribute("aria-disabled");
    } else {
        anchor.removeAttribute("href");
        anchor.setAttribute("aria-disabled", "true");
    }
}

/** 展示内网 main 源码与部署版本，网络暂断时保留最后读取的结果。 */
function renderOverview() {
    const target = snapshot?.target;
    const source = snapshot?.source;
    renderEndpoint(target);
    if (!connected) {
        showPill(elements["target-status"], "状态未知", "muted");
        elements["target-status-detail"].textContent = "暂时无法获取服务状态";
    } else if (typeof target?.online === "boolean") {
        showPill(elements["target-status"], target.online ? "在线" : "离线", target.online ? "ok" : "error");
        elements["target-status-detail"].textContent = target.online ? "测试入口可访问" : "测试入口未通过探测";
    } else {
        showPill(elements["target-status"], "检查中", "muted");
        elements["target-status-detail"].textContent = "等待测试服探测结果";
    }
    elements["build-host"].textContent = snapshot?.buildHost || "—";
    elements["source-version"].textContent = versionLabel(source?.commit);
    const branch = "内网分支 " + (source?.branch || "main");
    const syncTime = source?.updatedAt ? timeLabel(source.updatedAt) : "等待拉取记录";
    elements["source-branch"].textContent = branch + " · " + syncTime;
    elements["frontend-version"].textContent = versionLabel(target?.frontend);
    elements["backend-version"].textContent = versionLabel(target?.backend);
}

/** 为一条任务生成可通过键盘选择的行，只把服务端字段当文本显示。 */
function jobRow(job) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const taskName = document.createElement("strong");
    const badge = document.createElement("span");
    const badgeCell = document.createElement("span");
    const time = document.createElement("time");
    button.type = "button";
    button.className = "job-row";
    button.dataset.jobId = String(job.id);
    button.setAttribute("aria-pressed", String(String(job.id) === selectedId));
    taskName.textContent = actionName(job.action);
    badge.className = "pill";
    showPill(badge, ...(statuses.get(job.status) || ["未知", "muted"]));
    badgeCell.append(badge);
    time.textContent = timeLabel(job.startedAt);
    if (typeof job.startedAt === "string") {
        time.dateTime = job.startedAt;
    }
    button.append(taskName, badgeCell, time);
    item.append(button);
    return item;
}

/** 同步任务列表与选择。数据变化时保留任务选择和列表滚动位置。 */
function renderHistory() {
    const jobs = Array.isArray(snapshot?.jobs) ? snapshot.jobs : [];
    if (!jobs.some(job => String(job.id) === selectedId)) {
        selectedId = jobs.length ? String(jobs[0].id) : "";
    }
    elements["history-empty"].hidden = jobs.length > 0;
    const signature = JSON.stringify([selectedId, jobs.map(job => [job.id, job.action, job.status, job.startedAt])]);
    if (signature === historySignature) {
        return;
    }
    historySignature = signature;
    const list = elements["job-list"];
    const position = list.scrollTop;
    const focusedId = document.activeElement?.dataset.jobId;
    list.replaceChildren(...jobs.map(jobRow));
    list.scrollTop = position;
    if (focusedId) {
        const focused = [...list.querySelectorAll("[data-job-id]")].find(button => button.dataset.jobId === focusedId);
        focused?.focus({ preventScroll: true });
    }
}

/** 显示日志并保留向上翻阅的位置，跟随底部的访客自动看到新内容。 */
function showLog(text, copyable = false) {
    const output = elements["log-output"];
    const atBottom = output.scrollHeight - output.clientHeight - output.scrollTop < 30;
    if (output.textContent !== text) {
        output.textContent = text;
        if (atBottom && copyable) {
            output.scrollTop = output.scrollHeight;
        }
    }
    activeLogText = copyable ? text : "";
    elements["copy-log"].disabled = !activeLogText;
}

/** 查询当前选中任务的受保护日志，丢弃切换任务或锁定后才到达的旧回包。 */
async function loadLog() {
    const generation = ++logRequest;
    const job = snapshot?.jobs?.find(entry => String(entry.id) === selectedId);
    elements["log-title"].textContent = job ? "执行日志 · " + actionName(job.action) : "执行日志";
    if (!job) {
        showLog("选择一条任务查看日志。");
        return;
    }
    if (!token) {
        showLog(job.error ? "任务结果：" + job.error + "\n\n解锁操作后可查看完整日志。" : "解锁操作后可查看完整日志。");
        return;
    }
    try {
        const result = await request("/api/jobs/" + encodeURIComponent(selectedId) + "/log", {
            headers: { Authorization: "Bearer " + token },
        });
        if (generation !== logRequest) {
            return;
        }
        const log = typeof result.text === "string" ? result.text : "";
        showLog(log || "该任务暂时没有日志。", Boolean(log));
    } catch (error) {
        if (generation !== logRequest) {
            return;
        }
        if (error.status === 401 || error.status === 403) {
            lockOperator();
            notify("操作口令无效，请重新输入。", true);
        } else {
            showLog("无法读取日志。" + error.message);
        }
    }
}

/** 刷新公开状态并更新正在查看的日志；同一时间只轮询一次。 */
async function refresh() {
    if (polling) {
        return;
    }
    polling = true;
    elements["refresh-button"].disabled = true;
    try {
        snapshot = await request("/api/state");
        connected = true;
    } catch {
        connected = false;
    } finally {
        renderOverview();
        renderOperations();
        renderHistory();
        void loadLog();
        polling = false;
        elements["refresh-button"].disabled = false;
    }
}

/** 提交固定动作，成功后切换到新任务并显示异步执行进度。 */
async function submitAction(action) {
    if (!actions.has(action) || !token || !connected || posting || snapshot?.activeJob) {
        return;
    }
    posting = true;
    renderOperations();
    try {
        const result = await request("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ action }),
        });
        if (result.job?.id !== undefined) {
            selectedId = String(result.job.id);
            snapshot.jobs = [result.job, ...(snapshot.jobs || []).filter(job => String(job.id) !== selectedId)];
            snapshot.activeJob = selectedId;
            renderHistory();
        }
        notify(actionName(action) + "已提交，可在任务记录查看进度。");
    } catch (error) {
        if (error.status === 401 || error.status === 403) {
            lockOperator();
            notify("操作口令无效，请重新输入。", true);
        } else {
            notify(error.message, true);
        }
    } finally {
        posting = false;
        renderOperations();
        void refresh();
    }
}

/** 显示单条操作反馈，下一条提示替换上一条。 */
function notify(message, error = false) {
    const toast = elements.message;
    toast.textContent = message;
    toast.dataset.tone = error ? "error" : "info";
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 4500);
}

/** 清除当前页面中的口令和日志，并保留公开任务列表。 */
function lockOperator() {
    token = "";
    renderOperations();
    void loadLog();
}

/** 更新解锁对话框的行内错误和输入提示状态。 */
function showOperatorError(message) {
    const input = elements["operator-token"];
    const error = elements["operator-error"];
    error.textContent = message;
    error.hidden = !message;
    if (message) {
        input.setAttribute("aria-invalid", "true");
    } else {
        input.removeAttribute("aria-invalid");
    }
}

/** 标记是否正在校验，以免重复提交或在途修改口令。 */
function setOperatorPending(pending) {
    elements["operator-form"].setAttribute("aria-busy", String(pending));
    elements["operator-token"].readOnly = pending;
    elements["submit-operator"].disabled = pending;
    elements["submit-operator"].textContent = pending ? "验证中…" : "解锁";
}

/** 交给服务端校验口令，通过后才解锁操作，失败时保留对话框。 */
async function unlockOperator(event) {
    event.preventDefault();
    const input = elements["operator-token"];
    const dialog = elements["operator-dialog"];
    const candidate = input.value.trim();
    if (!candidate || elements["submit-operator"].disabled) {
        return;
    }
    const generation = ++operatorRequest;
    showOperatorError("");
    setOperatorPending(true);
    try {
        const result = await request("/api/operator", {
            headers: { Authorization: "Bearer " + candidate },
        });
        if (generation !== operatorRequest || !dialog.open) {
            return;
        }
        if (result.authorized !== true) {
            throw new Error("校验未通过。");
        }
        token = candidate;
        dialog.close();
        renderOperations();
        void loadLog();
    } catch (error) {
        if (generation !== operatorRequest || !dialog.open) {
            return;
        }
        showOperatorError(error.status === 401 || error.status === 403
            ? "操作口令无效，请重新输入。"
            : "暂时无法校验口令，请稍后重试。");
        input.focus();
        input.select();
    } finally {
        if (generation === operatorRequest) {
            setOperatorPending(false);
        }
    }
}

/** 关闭后清除草稿、提示及在途校验，避免下一次打开收到旧回包。 */
function resetOperatorDialog() {
    operatorRequest++;
    elements["operator-form"].reset();
    setOperatorPending(false);
    showOperatorError("");
}

/** 把当前日志复制到系统剪贴板，浏览器拒绝时保留可选择的文本。 */
async function copyLog() {
    try {
        await navigator.clipboard.writeText(activeLogText);
        notify("日志已复制。");
    } catch {
        notify("无法直接复制。可选中日志文本手动复制。", true);
    }
}

for (const button of operationButtons) {
    button.addEventListener("click", () => void submitAction(button.dataset.action));
}
elements["operator-button"].addEventListener("click", () => {
    if (token) {
        lockOperator();
    } else {
        elements["operator-dialog"].showModal();
        elements["operator-token"].focus();
    }
});
elements["operator-form"].addEventListener("submit", unlockOperator);
elements["cancel-operator"].addEventListener("click", () => elements["operator-dialog"].close());
elements["operator-dialog"].addEventListener("close", resetOperatorDialog);
elements["operator-token"].addEventListener("input", () => showOperatorError(""));
elements["job-list"].addEventListener("click", event => {
    const button = event.target.closest("[data-job-id]");
    if (button) {
        selectedId = button.dataset.jobId;
        renderHistory();
        void loadLog();
    }
});
elements["refresh-button"].addEventListener("click", () => void refresh());
elements["copy-log"].addEventListener("click", () => void copyLog());
setInterval(() => {
    if (!document.hidden) {
        void refresh();
    }
}, 5000);
void refresh();
