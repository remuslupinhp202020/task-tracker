// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8lQIRVa06oc3fkWoTKpCyv2UBOR1LqRVBZ3rZU-FxmVhjBMJo-PD94jBZ-vFqvStMnvj3kwiENCIP/pub?gid=1627536188&single=true&output=csv';
const API_URL = 'https://script.google.com/macros/s/AKfycbxG1lHfybhGaxgypG5fwryHj2LjfuQGVbeSnvrZeoO-I6K9D8YvFC6w3WNoiWtOt_E1/exec';


let globalData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
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
        .catch(err => alert("Error loading data. Check CSV URL."));
        .then(text => {
                globalData = parseCSV(text);
                
                // --- ADD THESE 2 DEBUG LINES ---
                console.log("Raw Data:", globalData);
                alert(`Found ${globalData.length} rows. First row ID: "${globalData[0]?.Unique_ID}"`);
                // -------------------------------
    
                renderBoard();
                container.style.opacity = '1';
            })
    
}

function renderBoard() {
    // 1. Clear Columns
    ['High', 'Medium', 'Low'].forEach(p => {
        document.getElementById(`container-${p}`).innerHTML = '';
    });

    const showComplete = document.getElementById('showComplete').checked;

    // 2. Filter & Sort by Date
    let displayData = globalData
        .filter(item => item.Unique_ID) // Remove empty rows
        .filter(item => showComplete ? true : item.Status !== 'Complete') // Filter Completed
        .sort((a, b) => {
            // Sort by Date (Earliest first). Handle empty dates.
            const dateA = a.Date ? new Date(a.Date) : new Date('2099-01-01');
            const dateB = b.Date ? new Date(b.Date) : new Date('2099-01-01');
            return dateA - dateB;
        });

    // 3. Distribute to Columns
    displayData.forEach(item => {
        // Fallback: If priority is missing or weird, put in Low
        let priority = ['High', 'Medium', 'Low'].includes(item.Priority) ? item.Priority : 'Low';
        
        const card = createCard(item);
        document.getElementById(`container-${priority}`).appendChild(card);
    });
}

function createCard(item) {
    const div = document.createElement('div');
    const isComplete = item.Status === 'Complete';
    
    div.className = `card card-${isComplete ? 'Complete' : item.Priority}`;
    div.setAttribute('data-id', item.Unique_ID);

    // Date Format
    let dateStr = item.Date;
    if(dateStr && !isNaN(Date.parse(dateStr))) {
        dateStr = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
        dateStr = '';
    }

    div.innerHTML = `
        <div class="client">${item.Client || 'No Client'}</div>
        <h3>${item.Task}</h3>
        ${dateStr ? `<span class="date">📅 ${dateStr}</span>` : ''}
        ${item.Notes ? `<div class="notes">${item.Notes}</div>` : ''}
        ${isComplete 
            ? `<button class="btn-undo" onclick="toggleStatus(${item.Unique_ID}, 'Pending', '${item.Priority}', this)">↩ Undo</button>`
            : `<button class="btn-finish" onclick="toggleStatus(${item.Unique_ID}, 'Complete', '${item.Priority}', this)">✔ Finish</button>`
        }
    `;
    return div;
}

function toggleStatus(id, newStatus, priority, btn) {
    // Optimistic UI Update
    const card = btn.closest('.card');
    
    // Update Local Data
    const item = globalData.find(x => x.Unique_ID == id);
    if(item) item.Status = newStatus;

    // Re-render immediately to move/color the card correctly
    renderBoard(); 

    // Send to Backend
    fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unique_id: id, status: newStatus })
    });
}

// --- ROBUST CSV PARSER (Fixes the comma bug) ---
function parseCSV(text) {
    const rows = [];
    let row = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') { currentCell += '"'; i++; } // Escaped quote
            else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) {
            row.push(currentCell.trim()); currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); row = []; currentCell = ''; }
        } else { currentCell += char; }
    }
    if (currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); }

    const headers = rows[0];
    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            // Remove quotes if present
            let val = row[index];
            if(val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[header] = val;
        });
        return obj;
    });
}
