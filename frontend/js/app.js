const uploadBtn = document.getElementById("uploadBtn");
uploadBtn.addEventListener("click", handleUpload);

const toggleBtn = document.getElementById("themeToggle");
toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");

    // Cambiar icono
    toggleBtn.textContent = isLight ? "🌙" : "☀️";
});

window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        toggleBtn.textContent = "🌙";
    }
});

function downloadFile() {
    const cid = document.getElementById("cid").textContent;

    if (!cid || cid === "-") {
        alert("No hay archivo para descargar");
        return;
    }

    window.open(`http://localhost:3000/download/${cid}`);
}

async function handleUpload() {
    console.log("UPLOAD START");

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

        const res = await fetch("/upload/ipfs", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        document.getElementById("cid").textContent = data.cid;
        document.getElementById("hash").textContent = data.hash;
        document.getElementById("time").textContent = data.time + " ms";
        document.getElementById("cost").textContent = "0";

        document.getElementById("status").textContent = "Upload complete";

    } catch (error) {
        console.error(error);
        document.getElementById("status").textContent = "Error";
    }
}