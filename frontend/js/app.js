const uploadBtn = document.getElementById("uploadBtn");
uploadBtn.addEventListener("click", handleUpload);

const toggleBtn = document.getElementById("themeToggle");
toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");

    toggleBtn.textContent = isLight ? "🌙" : "☀️";
});

let allCIDs = [];

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
});

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

        if (data.metrics) {
            renderMetrics(data.metrics);
        }

        await loadCIDList();

        
        const query = document.getElementById("cidSearch").value.toLowerCase();
        if (query) {
            const filtered = allCIDs.filter(cid =>
                cid.toLowerCase().includes(query)
            );
            renderCIDList(filtered);
        }

    } catch (error) {
        console.error(error);
        document.getElementById("status").textContent = error.message || "Error";
    }
}

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

        li.addEventListener("click", () => {
            window.open(`http://localhost:3000/download/${cid}`);
        });

        list.appendChild(li);
    });

    list.parentElement.scrollTop = list.parentElement.scrollHeight;
}