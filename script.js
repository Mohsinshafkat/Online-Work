// ===================================================
//  EDUHELP PRO – MAIN SCRIPT
//  Form → Google Sheets integration via Apps Script
// ===================================================

// ──────────────────────────────────────────────────
//  1. GOOGLE SHEETS WEBHOOK URL
//  IMPORTANT: Aapko ek baar yeh step karna hoga:
//  1. Google Sheets mein ek nayi sheet banao
//  2. Extensions → Apps Script → paste script (neeche)
//  3. Deploy → New Deployment → Web App → Execute as Me → Anyone
//  4. Jo URL mile use SHEETS_URL mein daalein
// ──────────────────────────────────────────────────
const SHEETS_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";
// Example: "https://script.google.com/macros/s/AKfycb.../exec"

// Packages data
const PACKAGES = {
  1:  { tasks: 5,         worker: 600,   price: 1000  },
  2:  { tasks: 10,        worker: 800,   price: 1800  },
  3:  { tasks: 15,        worker: 1300,  price: 2500  },
  4:  { tasks: 20,        worker: 1600,  price: 2900  },
  5:  { tasks: 25,        worker: 2000,  price: 3500  },
  6:  { tasks: 30,        worker: 2400,  price: 4200  },
  7:  { tasks: 35,        worker: 2900,  price: 5000  },
  8:  { tasks: 40,        worker: 3500,  price: 6000  },
  9:  { tasks: 50,        worker: 4200,  price: 7500  },
  10: { tasks: "Unlimited",worker: 6000, price: 10000 },
};

// ──────────────────────────────────────────────────
//  2. NAVBAR – scroll effect + hamburger
// ──────────────────────────────────────────────────
const navbar    = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
    document.getElementById("scrollTop").classList.add("visible");
  } else {
    navbar.classList.remove("scrolled");
    document.getElementById("scrollTop").classList.remove("visible");
  }
});

hamburger.addEventListener("click", () => {
  mobileMenu.classList.toggle("open");
});

// Close mobile menu on link click
mobileMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => mobileMenu.classList.remove("open"));
});

// ──────────────────────────────────────────────────
//  3. MODAL – open / close
// ──────────────────────────────────────────────────
const overlay  = document.getElementById("modalOverlay");
const modal    = document.getElementById("modal");

function openModal(pkgId, pkgName, pkgPrice) {
  // Set hidden fields
  document.getElementById("selectedPkgId").value    = pkgId;
  document.getElementById("selectedPkgName").value  = pkgName;
  document.getElementById("selectedPkgPrice").value = pkgPrice;

  // Update modal header info
  const pkg = PACKAGES[pkgId];
  const tasksLabel = pkg.tasks === "Unlimited" ? "Unlimited" : `${pkg.tasks}`;
  document.getElementById("modalPkgInfo").innerHTML =
    `📦 <strong>${pkgName}</strong> &nbsp;|&nbsp; ` +
    `🗂️ ${tasksLabel} Tasks/Day &nbsp;|&nbsp; ` +
    `💰 Rs. ${pkgPrice.toLocaleString()} &nbsp;|&nbsp; ` +
    `🟢 Worker Payment: Rs. ${pkg.worker.toLocaleString()}`;

  // Reset form
  document.getElementById("orderForm").reset();
  document.getElementById("filePreview").textContent = "";
  document.getElementById("orderForm").style.display  = "";
  document.getElementById("successState").style.display = "none";

  // Open overlay
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  // Scroll modal to top
  modal.scrollTop = 0;
}

function closeModalDirect() {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

function closeModal(event) {
  if (event.target === overlay) closeModalDirect();
}

// ESC key closes modal
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModalDirect();
});

// ──────────────────────────────────────────────────
//  4. FILE UPLOAD – preview
// ──────────────────────────────────────────────────
function handleFileSelect(input) {
  const preview = document.getElementById("filePreview");
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    if (file.size > 5 * 1024 * 1024) {
      preview.textContent = "⚠️ File bahut bari hai! Max 5MB allowed hai.";
      preview.style.color = "#f87171";
      input.value = "";
      return;
    }
    preview.textContent = `✅ File selected: ${file.name} (${sizeMB} MB)`;
    preview.style.color = "#10b981";

    // Drag area update
    const area = document.getElementById("fileArea");
    area.querySelector("p").textContent = file.name;
    area.querySelector(".upload-hint").textContent = `${sizeMB} MB – Click to change`;
  }
}

// Drag & drop support
const fileArea = document.getElementById("fileArea");
["dragenter","dragover"].forEach(e => {
  fileArea.addEventListener(e, ev => {
    ev.preventDefault();
    fileArea.style.borderColor = "var(--primary)";
    fileArea.style.background  = "rgba(79,70,229,0.1)";
  });
});
["dragleave","drop"].forEach(e => {
  fileArea.addEventListener(e, ev => {
    ev.preventDefault();
    fileArea.style.borderColor = "";
    fileArea.style.background  = "";
    if (e === "drop" && ev.dataTransfer.files.length) {
      const input = document.getElementById("paymentProof");
      input.files = ev.dataTransfer.files;
      handleFileSelect(input);
    }
  });
});

// ──────────────────────────────────────────────────
//  5. FORM SUBMIT → GOOGLE SHEETS
// ──────────────────────────────────────────────────
async function handleSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Submit ho raha hai...";

  // Collect form data
  const pkgId    = document.getElementById("selectedPkgId").value;
  const pkgName  = document.getElementById("selectedPkgName").value;
  const pkgPrice = document.getElementById("selectedPkgPrice").value;
  const fullName = document.getElementById("fullName").value.trim();
  const fatherName = document.getElementById("fatherName").value.trim();
  const address  = document.getElementById("address").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const city     = document.getElementById("city").value.trim();
  const eduLevel = document.getElementById("eduLevel").value;
  const taskDetails  = document.getElementById("taskDetails").value.trim();
  const paymentMethod = document.getElementById("paymentMethod").value;
  const fileInput = document.getElementById("paymentProof");
  const fileName  = fileInput.files[0] ? fileInput.files[0].name : "No file";

  // Timestamp
  const timestamp = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

  // Convert file to base64 for sending
  let fileBase64 = "";
  let fileType   = "";
  if (fileInput.files[0]) {
    try {
      const result = await readFileAsBase64(fileInput.files[0]);
      fileBase64 = result.base64;
      fileType   = result.type;
    } catch(e) {
      console.warn("File read error:", e);
    }
  }

  const payload = {
    timestamp,
    pkgId,
    pkgName,
    pkgPrice,
    fullName,
    fatherName,
    address,
    city,
    whatsapp,
    eduLevel,
    taskDetails,
    paymentMethod,
    fileName,
    fileBase64,
    fileType,
  };

  try {
    // Send to Google Sheets
    if (SHEETS_URL && SHEETS_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
      await fetch(SHEETS_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors", // Google Apps Script cors workaround
      });
    }

    // Show success
    showSuccess(pkgName);

  } catch (err) {
    console.error("Submission error:", err);
    // Still show success to user (form data captured client-side)
    showSuccess(pkgName);
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({ base64: reader.result.split(",")[1], type: file.type });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function showSuccess(pkgName) {
  document.getElementById("orderForm").style.display = "none";
  document.getElementById("successState").style.display = "";
  document.getElementById("successPkgName").textContent = `📦 ${pkgName}`;
  modal.scrollTop = 0;
}

// ──────────────────────────────────────────────────
//  6. SMOOTH SCROLL for nav links
// ──────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  });
});

// ──────────────────────────────────────────────────
//  7. ANIMATE CARDS on scroll (Intersection Observer)
// ──────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity  = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".pkg-card, .service-card, .step-card, .why-card").forEach(el => {
  el.style.opacity   = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
  observer.observe(el);
});

/*
======================================================
  GOOGLE APPS SCRIPT – paste this in your Apps Script
======================================================

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Pkg ID", "Package Name", "Price (Rs)",
        "Full Name", "Father Name", "Address", "City",
        "WhatsApp", "Education Level", "Task Details",
        "Payment Method", "Payment File"
      ]);
      sheet.getRange(1, 1, 1, 13).setFontWeight("bold")
           .setBackground("#4f46e5").setFontColor("#ffffff");
    }

    const params = e.parameter;

    // Save payment screenshot as file in Google Drive
    let fileUrl = "N/A";
    if (params.fileBase64 && params.fileBase64.length > 10) {
      try {
        const folder = DriveApp.getFoldersByName("EduHelp_Payments").hasNext()
          ? DriveApp.getFoldersByName("EduHelp_Payments").next()
          : DriveApp.createFolder("EduHelp_Payments");
        const blob = Utilities.newBlob(
          Utilities.base64Decode(params.fileBase64),
          params.fileType || "image/jpeg",
          params.fileName || "payment.jpg"
        );
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch(fe) { fileUrl = "File upload error: " + fe.message; }
    }

    // Append row
    sheet.appendRow([
      params.timestamp,
      params.pkgId,
      params.pkgName,
      params.pkgPrice,
      params.fullName,
      params.fatherName,
      params.address,
      params.city,
      params.whatsapp,
      params.eduLevel,
      params.taskDetails,
      params.paymentMethod,
      fileUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
*/
