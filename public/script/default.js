let formData;
let collectedData = {};

// Initialize application
async function initApp() {
    try {
        // Load questions from JSON
        const response = await fetch('/public/data/questions.json');
        formData = await response.json();

        // Build form and restore saved data
        buildForm();
        addEventListeners();
        loadSavedData();
    } catch (error) {
        alert('Error loading questions. Please try again.');
        console.error('Initialization error:', error);
    }
}

// Build form structure
function buildForm() {
    const container = document.getElementById('formContainer');
    container.innerHTML = ''; // Clear existing content

    formData.sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section';

        // Create collapsible header
        const header = document.createElement('div');
        header.className = 'section-title';
        header.innerHTML = `
            ${section.title}
            <span class="toggle">▼</span>
        `;

        // Create content area
        const content = document.createElement('div');
        content.className = 'section-content';

        // Add questions
        section.questions.forEach(question => {
            const group = document.createElement('div');
            group.className = 'question-group';

            // Create label with risk badge
            const label = document.createElement('label');
            label.innerHTML = `
                ${question.label}
                <span class="risk-badge ${getRiskClass(question.risklevel)}">
                    Risk: ${question.risklevel}
                </span>
            `;

            // Create input field
            const input = document.createElement(question.type === 'textarea' ? 'textarea' : 'input');
            input.id = question.id;
            input.type = question.type || 'text';
            input.placeholder = question.placeholder || '';
            input.value = collectedData[question.id] || '';

            // Save data on input
            input.addEventListener('input', () => {
                collectedData[question.id] = input.value.trim();
                localStorage.setItem(question.id, input.value.trim());
            });

            // Assemble elements
            group.appendChild(label);
            group.appendChild(input);
            content.appendChild(group);
        });

        // Toggle section visibility
        header.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            header.querySelector('.toggle').textContent = 
                content.classList.contains('collapsed') ? '▶' : '▼';
        });

        sectionEl.appendChild(header);
        sectionEl.appendChild(content);
        container.appendChild(sectionEl);
    });
}

// Get risk level CSS class
function getRiskClass(riskLevel) {
    if (riskLevel >= 7) return 'high';
    if (riskLevel >= 4) return 'medium';
    return 'low';
}

// Load saved data from localStorage
function loadSavedData() {
    formData.sections.forEach(section => {
        section.questions.forEach(question => {
            const savedValue = localStorage.getItem(question.id);
            if (savedValue) {
                collectedData[question.id] = savedValue;
            }
        });
    });
}

// Add event listeners
function addEventListeners() {
    document.getElementById('exportBtn').addEventListener('click', exportPDF);
}

// Generate PDF report
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cover Page
    doc.setFontSize(22);
    doc.text("Personal Digital Footprint Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text("personalfootprint.online", 160, 297);
    doc.addPage();

    // Data Pages
    formData.sections.forEach((section, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(18);
        doc.setTextColor(33, 150, 243);
        doc.text(section.title, 20, 20);
        doc.setFontSize(12);
        doc.setTextColor(0);

        const tableData = section.questions
            .filter(q => collectedData[q.id])
            .map(q => ({
                question: q.label,
                answer: collectedData[q.id],
                risk: q.risklevel
            }));

        doc.autoTable({
            startY: 30,
            head: [['Question', 'Answer', 'Risk']],
            body: tableData.map(item => [item.question, item.answer, item.risk]),
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                2: { cellWidth: 25 }
            },
            didDrawCell: (data) => {
                if (data.column.index === 2 && data.cell.raw) {
                    const colors = {
                        high: [244, 67, 54],
                        medium: [255, 193, 7],
                        low: [76, 175, 80]
                    };
                    doc.setFillColor(...colors[getRiskClass(data.cell.raw)]);
                    doc.rect(data.cell.x + 5, data.cell.y + 2, 10, 10, 'F');
                }
            }
        });
    });

    // Security Page
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(244, 67, 54);
    doc.text("Security Warning", 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0);
    const warningText = [
        'This document contains sensitive personal information:',
        '',
        '• Store securely (password manager/encrypted drive)',
        '• Do not share via unsecured channels',
        '• Shred physical copies when no longer needed',
        '• Review account permissions regularly',
        '',
        'Report generated by personalfootprint.online'
    ];
    doc.text(warningText, 20, 40);

    doc.save('digital-footprint-report.pdf');
}

// Start application
window.addEventListener('DOMContentLoaded', initApp);