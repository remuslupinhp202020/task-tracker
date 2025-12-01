// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8lQIRVa06oc3fkWoTKpCyv2UBOR1LqRVBZ3rZU-FxmVhjBMJo-PD94jBZ-vFqvStMnvj3kwiENCIP/pub?gid=1627536188&single=true&output=csv';
const API_URL = 'https://script.google.com/macros/s/AKfycbxG1lHfybhGaxgypG5fwryHj2LjfuQGVbeSnvrZeoO-I6K9D8YvFC6w3WNoiWtOt_E1/exec';

// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'PASTE_YOUR_CSV_URL_HERE';
const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

// --- DIAGNOSTIC SCRIPT START ---
let globalData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Create Debug Box
    const debugBox = document.createElement('div');
    debugBox.id = 'debug-console';
    debugBox.style.cssText = "background: #fff3cd; color: #856404; padding: 15px; border: 2px solid #ffeeba; margin-bottom: 20px; font-family: monospace; white-space: pre-wrap;";
    document.body.prepend(debugBox);

    log("1. Starting App...");
    loadData();

    document.getElementById('showComplete').addEventListener('change', renderBoard);
    document.getElementById('refreshBtn').addEventListener('click', loadData);
});

function log(msg) {
    const box = document.getElementById('debug-console');
    box.innerHTML += msg + "\n";
    console.log(msg);
}

function loadData() {
    log("2. Fetching CSV from Google...");
    
    fetch(CSV_URL)
        .then(response => {
            if (!response.ok) throw new Error("HTTP Error: " + response.status);
            return response.text();
        })
        .then(text => {
            log(`3. CSV Downloaded. Length: ${text.length} characters.`);
            
            // Check if it's HTML (Wrong Link Error)
            if(text.trim().startsWith("<!DOCTYPE html") || text.includes("<html")) {
                log("❌ CRITICAL ERROR: The CSV Link is wrong.");
                log("   You pasted the 'Web Page' link, not the 'CSV' link.");
                log("   Go to File > Share > Publish to Web > Select 'CSV' > Republish.");
                return;
            }

            globalData = parseCSV(text);
            
            if (globalData.length === 0) {
                log("⚠️ Warning: No rows found in CSV.");
            } else {
                const firstRow = globalData[0];
                log(`4. Parsed ${globalData.length} rows.`);
                log(`   First Row Keys: [${Object.keys(firstRow).join(', ')}]`);
                log(`   First Row ID: "${firstRow.Unique_ID}"`);
                
                if (firstRow.Unique_ID === undefined) {
                    log("❌ ERROR: 'Unique_ID' column not found.");
                    log("   Check your Google Sheet Header (Row 1).");
                    log("   It must be 'Unique_ID' (Check for spaces!).");
                } else if (!firstRow.Unique_ID) {
                    log("⚠️ Issue: The first row has an empty Unique_ID.");
                    log("   Tasks without IDs are hidden. Type '1' in Col A of your sheet.");
                } else {
                    log("✅ Data looks good. Rendering board...");
                }
            }

            renderBoard();
        })
        .catch(err => {
            log("❌ FETCH ERROR: " + err.message);
            log("   Check if your CSV URL is correct and published.");
        });
}

function renderBoard() {
    ['High', 'Medium', 'Low'].forEach(p => document.getElementById(`container-${p}`).innerHTML = '');
    
    const showComplete = document.getElementById('showComplete').checked;
    
    // Sort logic
    let displayData = globalData
        .filter(item => item.Unique_ID) 
        .filter(item => showComplete ? true : item.Status !== 'Complete')
        .sort((a, b) => (a.Date ? new Date(a.Date) : new Date('2099-01-01')) - (b.Date ? new Date(b.Date) : new Date('2099-01-01')));

    log(`5. Rendering ${displayData.length} cards (Hidden: ${globalData.length - displayData.length}).`);

    displayData.forEach(item => {
        let priority = item.Priority ? item.Priority.trim() : 'Low';
        priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        if (!['High', 'Medium', 'Low'].includes(priority)) priority = 'Low';
        
        const card = createCard(item, priority);
        document.getElementById(`container-${priority}`).appendChild(card);
    });
}

function createCard(item, priority) {
    const div = document.createElement('div');
    const isComplete = item.Status === 'Complete';
    div.className = `card card-${isComplete ? 'Complete' : priority}`;
    
    let dateStr = item.Date && !isNaN(Date.parse(item.Date)) 
        ? new Date(item.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
        : '';

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
    const item = globalData.find(x => x.Unique_ID == id);
    if(item) item.Status = newStatus;
    renderBoard(); 
    fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unique_id: id, status: newStatus })
    });
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && text[i+1] === '"') { currentCell += '"'; i++; }
        else if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { row.push(currentCell.trim()); currentCell = ''; }
        else if ((char === '\r' || char === '\n') && !inQuotes) { 
            if(currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); row = []; currentCell = ''; }
        } else { currentCell += char; }
    }
    if (currentCell || row.length > 0) { row.push(currentCell.trim()); rows.push(row); }
    
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => { 
            let val = row[i];
            if(val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[h] = val; 
        });
        return obj;
    });
}
