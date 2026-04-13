// =========================
// ELEMENTOS
// =========================
const uploadBtn = document.getElementById("uploadBtn");
const toggleBtn = document.getElementById("themeToggle");
const verifyBtn = document.getElementById("verifyBtn");

// =========================
// EVENTOS
// =========================
uploadBtn.addEventListener("click", handleUpload);

toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");

    toggleBtn.textContent = isLight ? "🌙" : "☀️";
});

verifyBtn.addEventListener("click", handleVerify);

// =========================
// ESTADO
// =========================
let allCIDs = [];
let timeChart;
let gasChart;

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        toggleBtn.textContent = "🌙";
    }

    const searchInput = document.getElementById("cidSearch");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();

        const filtered = allCIDs.filter(cid =>
            cid.toLowerCase().includes(query)
        );

        renderCIDList(filtered);
    });

    loadCIDList();
    renderChart();
});

// =========================
// UPLOAD
// =========================
async function handleUpload() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Selecciona un archivo");
        return;
    }

    document.getElementById("status").textContent = "Uploading...";

    try {
        const formData = new FormData();
        formData.append("file", file);

        resetMetrics();

        const res = await fetch("/upload/ipfs", {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            throw new Error("Error en el servidor");
        }

        const data = await res.json();

        document.getElementById("cid").textContent = data.cid;
        document.getElementById("hash").textContent = " " + data.hash;

        document.getElementById("status").textContent = "Upload complete";

        // métricas
        if (data.metrics) {
            renderMetrics(data.metrics);
        }

        // refrescos
        await renderChart();
        await loadCIDList();

    } catch (error) {
        console.error(error);
        document.getElementById("status").textContent = error.message || "Error";
    }
}

// =========================
// VERIFY
// =========================
async function handleVerify() {
    const cid = document.getElementById("verifyInput").value.trim();

    if (!cid) {
        alert("Introduce un CID");
        return;
    }

    const statusEl = document.getElementById("verifyStatus");
    statusEl.textContent = "Verifying...";

    try {
        const res = await fetch("/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cid })
        });

        if (!res.ok) {
            throw new Error("Error en verificación");
        }

        const data = await res.json();

        document.getElementById("verifyExists").textContent =
            data.exists ? "YES" : "NO";

        document.getElementById("verifyTimestamp").textContent =
            data.formattedTimestamp || "-";

        statusEl.textContent = "Verification complete";

    } catch (error) {
        console.error(error);
        statusEl.textContent = error.message || "Error";
    }
}

// =========================
// METRICS
// =========================
function renderMetrics(metrics) {
    document.getElementById("ipfsTime").textContent = metrics.ipfsTime;
    document.getElementById("blockchainTime").textContent = metrics.blockchainTime;
    document.getElementById("verifyTime").textContent = metrics.verifyTime;
    document.getElementById("totalTime").textContent = metrics.totalTime;
    document.getElementById("gasUsed").textContent = String(metrics.gasUsed);
}

function resetMetrics() {
    ["ipfsTime","blockchainTime","verifyTime","totalTime","gasUsed"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "-";
        });
}

// =========================
// CID LIST
// =========================
async function loadCIDList() {
    try {
        const res = await fetch("/upload/cids");

        if (!res.ok) {
            throw new Error("Error cargando CIDs");
        }

        const cids = await res.json();

        allCIDs = cids;
        renderCIDList(cids);

    } catch (error) {
        console.error(error);
    }
}

function renderCIDList(cids) {
    const list = document.getElementById("cidList");
    list.innerHTML = "";

    cids.forEach(cid => {
        const li = document.createElement("li");
        li.textContent = cid;
        li.style.cursor = "pointer";

        li.addEventListener("dblclick", () => {
            window.open(`/download/${cid}`);
        });

        li.addEventListener("click", async () => {
            document.getElementById("verifyInput").value = cid;
            await handleVerify();
        });


        list.appendChild(li);
    });

    if (cids.length === allCIDs.length) {
        list.parentElement.scrollTop = list.parentElement.scrollHeight;
    }
}

// =========================
// CHARTS
// =========================
async function loadMetricsHistory() {
    const res = await fetch("/upload/metrics");
    return await res.json();
}

async function renderChart() {
    const data = await loadMetricsHistory();
    if (!data || data.length === 0) return;

    const labels = data.map((_, i) => i + 1);

    const totalTimes = data.map(d => Number(d.metrics.totalTime));
    const ipfsTimes = data.map(d => Number(d.metrics.ipfsTime));
    const blockchainTimes = data.map(d => Number(d.metrics.blockchainTime));
    const gasValues = data.map(d => Number(d.metrics.gasUsed));

    const textColor = getComputedStyle(document.body).getPropertyValue('--text');

    // TIME CHART
    const timeCtx = document.getElementById("timeChart");
    if (timeChart) timeChart.destroy();

    timeChart = new Chart(timeCtx, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Total", data: totalTimes },
                { label: "IPFS", data: ipfsTimes },
                { label: "Blockchain", data: blockchainTimes }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor } },
                y: { ticks: { color: textColor } }
            }
        }
    });

    // GAS CHART
    const gasCtx = document.getElementById("gasChart");
    if (gasChart) gasChart.destroy();

    gasChart = new Chart(gasCtx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Gas Used",
                    data: gasValues
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor } },
                y: { ticks: { color: textColor } }
            }
        }
    });
}