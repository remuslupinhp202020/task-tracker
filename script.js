// --- PASTE YOUR URLS HERE ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8lQIRVa06oc3fkWoTKpCyv2UBOR1LqRVBZ3rZU-FxmVhjBMJo-PD94jBZ-vFqvStMnvj3kwiENCIP/pub?gid=1627536188&single=true&output=csv';
const API_URL = 'https://script.google.com/macros/s/AKfycbxG1lHfybhGaxgypG5fwryHj2LjfuQGVbeSnvrZeoO-I6K9D8YvFC6w3WNoiWtOt_E1/exec';

let globalData = [];

// Load data when page opens
document.addEventListener('DOMContentLoaded', () => {
    fetch(CSV_URL)
        .then(response => response.text())
        .then(text => {
            globalData = parseCSV(text);
            renderCards(globalData.filter(t => t.Status !== 'Complete')); // Show pending by default
        });

    // Button Listeners
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

// Display the cards
function renderCards(data) {
    const container = document.getElementById('cardContainer');
    container.innerHTML = '';
    
    data.forEach(item => {
        if(!item.Unique_ID) return; // Skip empty rows

        const div = document.createElement('div');
        div.className = `card card-${item.Status === 'Complete' ? 'Complete' : item.Priority}`;
        
        // Format Date
        let dateStr = item.Date;
        if(dateStr && !isNaN(Date.parse(dateStr))) {
            dateStr = new Date(dateStr).toLocaleDateString();
        }

        div.innerHTML = `
            <div class="client">${item.Client}</div>
            <h3>${item.Task}</h3>
            <span class="date">Due: ${dateStr}</span>
            ${item.Notes ? `<div class="notes">${item.Notes}</div>` : ''}
            ${item.Status !== 'Complete' ? 
                `<button class="btn-finish" onclick="markDone(${item.Unique_ID}, this)">✔ Finish</button>` : 
                `<b>✔ Done</b>`
            }
        `;
        container.appendChild(div);
    });
}

// Handle the "Finish" button
function markDone(id, btn) {
    if(!confirm("Mark as Done?")) return;
    btn.innerText = "...";
    
    fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ unique_id: id })
    }).then(() => {
        alert("Updated!");
        location.reload(); // Refresh page to show change
    });
}

// Helper: Read CSV
function parseCSV(text) {
    const rows = text.split('\n').map(row => row.split(',')); // Simple split
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        let obj = {};
        row.forEach((cell, i) => { if(headers[i]) obj[headers[i]] = cell.replace(/"/g, ''); });
        return obj;
    });
}
