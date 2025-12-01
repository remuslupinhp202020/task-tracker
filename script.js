// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8lQIRVa06oc3fkWoTKpCyv2UBOR1LqRVBZ3rZU-FxmVhjBMJo-PD94jBZ-vFqvStMnvj3kwiENCIP/pub?gid=1627536188&single=true&output=csv';
const API_URL = 'https://script.google.com/macros/s/AKfycbxG1lHfybhGaxgypG5fwryHj2LjfuQGVbeSnvrZeoO-I6K9D8YvFC6w3WNoiWtOt_E1/exec';

let globalData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetch(CSV_URL)
        .then(response => response.text())
        .then(text => {
            globalData = parseCSV(text);
            renderCards(globalData.filter(t => t.Status !== 'Complete'));
        });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
        const val = e.target.value;
        if(val === 'All') renderCards(globalData);
        else if(val === 'Complete') renderCards(globalData.filter(t => t.Status === 'Complete'));
        else renderCards(globalData.filter(t => t.Status !== 'Complete'));
    });

    document.getElementById('sortBtn').addEventListener('click', () => {
        const map = { 'High': 3, 'Medium': 2, 'Low': 1 };
        globalData.sort((a, b) => (map[b.Priority] || 0) - (map[a.Priority] || 0));
        renderCards(globalData);
    });
});

function renderCards(data) {
    const container = document.getElementById('cardContainer');
    container.innerHTML = '';
    
    data.forEach(item => {
        if(!item.Unique_ID) return;

        const div = document.createElement('div');
        // If status is complete, use 'Complete' class, otherwise use Priority class
        const colorClass = item.Status === 'Complete' ? 'Complete' : item.Priority;
        div.className = `card card-${colorClass}`;
        div.setAttribute('data-id', item.Unique_ID); // Store ID for easy access
        div.setAttribute('data-priority', item.Priority); // Store original priority

        let dateStr = item.Date;
        if(dateStr && !isNaN(Date.parse(dateStr))) dateStr = new Date(dateStr).toLocaleDateString();

        // Button Logic: Show "Undo" if complete, "Finish" if not
        const btnHtml = item.Status === 'Complete' 
            ? `<button class="btn-finish" style="background:#777" onclick="toggleStatus(${item.Unique_ID}, 'Pending', this)">↩ Undo</button>`
            : `<button class="btn-finish" onclick="toggleStatus(${item.Unique_ID}, 'Complete', this)">✔ Finish</button>`;

        div.innerHTML = `
            <div class="client">${item.Client}</div>
            <h3>${item.Task}</h3>
            <span class="date">Due: ${dateStr}</span>
            ${item.Notes ? `<div class="notes">${item.Notes}</div>` : ''}
            ${btnHtml}
        `;
        container.appendChild(div);
    });
}

function toggleStatus(id, newStatus, btn) {
    // 1. Immediate Visual Update (Optimistic UI)
    const card = btn.closest('.card');
    const originalPriority = card.getAttribute('data-priority');
    
    // Update Global Data (so filters work immediately)
    const item = globalData.find(x => x.Unique_ID == id);
    if(item) item.Status = newStatus;

    if (newStatus === 'Complete') {
        // Turn Green
        card.className = `card card-Complete`;
        // Change Button to Undo
        btn.innerHTML = `↩ Undo`;
        btn.setAttribute('onclick', `toggleStatus(${id}, 'Pending', this)`);
        btn.style.background = "#777";
    } else {
        // Turn back to Priority Color
        card.className = `card card-${originalPriority}`;
        // Change Button to Finish
        btn.innerHTML = `✔ Finish`;
        btn.setAttribute('onclick', `toggleStatus(${id}, 'Complete', this)`);
        btn.style.background = "#28a745";
    }

    // 2. Send Data to Google Sheet (Background)
    fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unique_id: id, status: newStatus }) // Sending status now
    }).catch(err => console.error("Error syncing to sheet"));
}

function parseCSV(text) {
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        let obj = {};
        row.forEach((cell, i) => { if(headers[i]) obj[headers[i]] = cell.replace(/"/g, ''); });
        return obj;
    });
}
