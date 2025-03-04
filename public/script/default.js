const { jsPDF } = window.jspdf;

// State Management
let entries = [];
let currentQuestion = null;
let currentReference = "";
let questionsData = [];

// Initialization
async function init() {
  try {
    // Load questions from JSON
    const response = await fetch("public/data/questions.json");
    const data = await response.json();
    questionsData = data.sections.flatMap((section) => section.questions);

    buildQuestionSelector();
    loadSavedData();
    setupEventListeners();
    updatePreview();
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to load application data");
  }
}

// DOM Utilities
function buildQuestionSelector() {
  const select = document.getElementById("questionSelect");
  select.innerHTML =
    '<option value="" disabled selected>Select a question</option>';

  questionsData.forEach((question) => {
    const option = document.createElement("option");
    option.value = question.id;
    option.textContent = question.label;
    select.appendChild(option);
  });

  select.addEventListener("change", handleQuestionChange);
}

function handleQuestionChange(e) {
  const questionId = e.target.value;
  currentQuestion = questionsData.find((q) => q.id === questionId);
  updateInputField();
}

function updateInputField() {
  const input = document.getElementById("answerInput");
  if (!currentQuestion) return;

  input.type = currentQuestion.type || "text";
  input.placeholder = currentQuestion.placeholder || "Your answer...";
  input.classList.toggle("password-field", currentQuestion.type === "password");
}

// Data Management
function saveEntry() {
  const answer = document.getElementById("answerInput").value.trim();
  if (!answer || !currentQuestion) return;

  entries.push({
    id: Date.now().toString(),
    question: currentQuestion.label,
    answer,
    reference: currentReference,
    type: currentQuestion.type,
    risk: currentQuestion.risklevel,
  });

  localStorage.setItem("footprintEntries", JSON.stringify(entries));
  resetInputs();
  updatePreview();
}

function deleteEntry(entryId) {
  entries = entries.filter((entry) => entry.id !== entryId);
  localStorage.setItem("footprintEntries", JSON.stringify(entries));
  updatePreview();
}

function loadSavedData() {
  const saved = localStorage.getItem("footprintEntries") || "[]";
  entries = JSON.parse(saved);
}

// Clear All Functionality
function confirmClear() {
  if (entries.length === 0) {
    showError("No entries to clear");
    return;
  }

  if (confirm("⚠️ This will permanently delete all entries!\nAre you sure?")) {
    clearAllEntries();
  }
}

function clearAllEntries() {
  entries = [];
  localStorage.removeItem("footprintEntries");
  updatePreview();
  showError("All data has been cleared");
}

// Preview System
function updatePreview() {
  const container = document.getElementById("entriesContainer");
  container.innerHTML = entries.length
    ? ""
    : '<p class="empty-state">No entries yet</p>';

  entries.forEach((entry) => {
    const entryEl = document.createElement("div");
    entryEl.className = "entry-item";
    entryEl.innerHTML = `
            <div class="entry-question">${entry.question}</div>
            <div class="entry-answer ${
              entry.type === "password" ? "password-field" : ""
            }" 
                ${
                  entry.type === "password"
                    ? `data-password="${entry.answer}"`
                    : ""
                }>
                ${formatAnswer(entry)}
            </div>
            <div class="entry-reference">${
              entry.reference || "No reference"
            }</div>
            <button class="delete-btn" onclick="deleteEntry('${
              entry.id
            }')">✕</button>
        `;
    container.appendChild(entryEl);
  });
}

// PDF Generation
function exportPDF() {
  const doc = new jsPDF();
  let pageNumber = 1;

  // Header/Footer
  const addHeader = () => {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Personal Footprint Report - ${new Date().toLocaleDateString()}`,
      15,
      15
    );
    doc.text(`Page ${pageNumber}`, 190, 15, { align: "right" });
  };

  const addFooter = () => {
    doc.setFontSize(9);
    doc.text("Confidential - personalfootprint.online", 105, 285, {
      align: "center",
    });
  };

  // Main Table
  doc.autoTable({
    startY: 25,
    head: [["Question", "Answer", "Reference", "Risk"]],
    body: entries.map((entry) => [
      entry.question,
      formatPdfAnswer(entry),
      entry.reference || "—",
      entry.risk,
    ]),
    styles: { fontSize: 10, textColor: [51, 51, 51] },
    headStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      3: {
        cellWidth: 20,
        halign: "center",
        valign: "middle",
      },
    },
    willDrawCell: (data) => {
      if (data.column.index === 3) {
        const risk = data.cell.raw;
        const color =
          risk >= 7 ? [244, 67, 54] : risk >= 4 ? [255, 193, 7] : [76, 175, 80];

        doc.setFillColor(...color);
        doc.rect(data.cell.x, data.cell.y, 15, 8, "F");
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.text(risk.toString(), data.cell.x + 7.5, data.cell.y + 5, {
          align: "center",
        });
        data.cell.text = "";
      }
    },
    didDrawPage: () => {
      addHeader();
      addFooter();
      pageNumber++;
    },
  });

  // Security Page
  doc.addPage();
  addHeader();
  addFooter();

  doc.setFontSize(16);
  doc.text("Security Recommendations", 15, 35);

  const securityContent = [
    "This document contains sensitive personal information. Please:",
    "- Store securely (encrypted drive/password manager)",
    "- Shred physical copies when no longer needed",
    "- Monitor accounts for suspicious activity",
    "- Use unique passwords for all services",
    "",
    `Generated by personalfootprint.online • ${new Date().getFullYear()}`,
  ];

  doc.setFontSize(12);
  doc.text(securityContent, 15, 50);

  // Watermark
  doc.setFontSize(48);
  doc.setTextColor(230, 230, 230);
  doc.text("CONFIDENTIAL", 40, 150, { angle: 45 });

  doc.save(`footprint-${Date.now()}.pdf`);
}

// Helpers
function formatAnswer(entry) {
  return entry.type === "password" ? "*".repeat(8) : entry.answer;
}

function formatPdfAnswer(entry) {
  return entry.answer;
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-banner";
  errorDiv.textContent = message;
  document.body.prepend(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Event Handling
function setupEventListeners() {
  document.getElementById("addBtn").addEventListener("click", saveEntry);
  document.getElementById("answerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveEntry();
  });
  document.getElementById("linkBtn").addEventListener("click", toggleLinkPopup);
  document.getElementById("clearBtn").addEventListener("click", confirmClear);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".link-wrapper")) hideLinkPopup();
  });
}

// Link Management
function toggleLinkPopup() {
  const popup = document.getElementById("linkPopup");
  popup.style.display = popup.style.display === "flex" ? "none" : "flex";
}

function hideLinkPopup() {
  document.getElementById("linkPopup").style.display = "none";
}

function handleReferenceSave() {
  currentReference = document.getElementById("referenceUrl").value.trim();
  hideLinkPopup();
}

function resetInputs() {
  document.getElementById("answerInput").value = "";
  currentReference = "";
  document.getElementById("referenceUrl").value = "";
}

// Initialize Application
window.onload = init;
window.deleteEntry = deleteEntry;
window.saveLink = handleReferenceSave;
window.cancelLink = hideLinkPopup;
window.exportPDF = exportPDF;
