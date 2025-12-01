// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8lQIRVa06oc3fkWoTKpCyv2UBOR1LqRVBZ3rZU-FxmVhjBMJo-PD94jBZ-vFqvStMnvj3kwiENCIP/pub?gid=1627536188&single=true&output=csv';
const API_URL = 'https://script.google.com/macros/s/AKfycbxG1lHfybhGaxgypG5fwryHj2LjfuQGVbeSnvrZeoO-I6K9D8YvFC6w3WNoiWtOt_E1/exec';

// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'PASTE_YOUR_CSV_URL_HERE';
const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

let globalData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Event Listeners
    document.getElementById('showComplete').addEventListener('change', renderBoard);
    document.getElementById('refreshBtn').addEventListener('click', loadData);
});

function loadData() {
    const container = document.querySelector('.board');
    container.style.opacity = '0.5'; // Visual cue that it's loading
    
    fetch(CSV_URL)
        .then(response => response.text())
        .then(text => {
            globalData = parseCSV(text);
            renderBoard();
            container.style.opacity = '1';
        })
        .catch(err => {
            console.error(err);
            alert("Error loading data. Please refresh.");
        });
}

function renderBoard() {
    // 1. Clear Columns
    ['High', 'Medium', 'Low'].forEach(p => {
        const col = document.getElementById(`container-${p}`);
        if(col) col.innerHTML = '';
    });

    const showComplete = document.getElementById('showComplete').checked;

    // 2. Filter & Sort
    let displayData = globalData
        .filter(item => item.Unique_ID) 
        .filter(item => showComplete ? true : item.Status !== 'Complete') 
        .sort((a, b) => {
            // Sort by Date (Earliest first)
            const dateA = a.Date ? new Date(a.Date) : new Date('2099-01-01');
            const dateB = b.Date ? new Date(b.Date) : new Date('2099-01-01');
            return dateA - dateB;
        });

    // 3. Distribute to Columns
    displayData.forEach(item => {
        // Normalize Priority (Handle casing or missing values)
        let priority = item.Priority ? item.Priority.trim() : 'Low';
        // Capitalize first letter (High, Medium, Low)
        priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        
        // Fallback if priority isn't standard
        if (!['High', 'Medium', 'Low'].includes(priority)) priority = 'Low';
        
        const card = createCard(item, priority);
        const col = document.getElementById(`container-${priority}`);
        if(col) col.appendChild(card);
    });
}

function createCard(item, priority) {
    const div = document.createElement('div');
    const isComplete = item.Status === 'Complete';
    
    div.className = `card card-${isComplete ? 'Complete' : priority}`;
    div.setAttribute('data-id', item.Unique_ID);

    // Date Format
    let dateStr = item.Date;
    if(dateStr && !isNaN(Date.parse(dateStr))) {
        dateStr = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
        dateStr = '';
    }

    div.innerHTML = `
        <div class="client">${item.Client || ''}</div>
        <h3>${item.Task}</h3>
        ${dateStr ? `<span class="date">📅 ${dateStr}</span>` : ''}
        ${item.Notes ? `<div class="notes">${item.Notes}</div>` : ''}
        ${isComplete 
            ? `<button class="btn-undo" onclick="toggleStatus(${item.Unique_ID}, 'Pending', '${priority}', this)">↩ Undo</button>`
            : `<button class="btn-finish" onclick="toggleStatus(${item.Unique_ID}, 'Complete', '${priority}', this)">✔ Finish</button>`
        }
    `;
    return div;
}

function toggleStatus(id, newStatus, priority, btn) {
    // 1. Optimistic UI Update (Instant Change)
    const card = btn.closest('.card');
    
    // Update Local Data
    const item = globalData.find(x => x.Unique_ID == id);
    if(item) item.Status = newStatus;

    // 2. Re-render immediately
    renderBoard(); 

    // 3. Send to Backend
    fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unique_id: id, status: newStatus })
    }).catch(err => console.error("Sync Error:", err));
}

// --- ROBUST CSV PARSER ---
function parseCSV(text) {
    const rows = [];
    let row = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') { currentCell += '"'; i++; } 
            else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) {
            row.push(currentCell.trim()); currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); row = []; currentCell = ''; }
        } else { currentCell += char; }
    }
    if (currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); }

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            let val = row[index];
            if(val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[header] = val;
        });
        return obj;
    });
}
