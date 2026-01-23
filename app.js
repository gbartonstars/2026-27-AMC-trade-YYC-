const db = firebase.database();
const STAFF_LIST = [
  "Greg Barton", "Scott McTaggart", "Dave Allison", "Mackenzie Wardle", "Chad Hegge", "Ken King", "John Doyle", "Bob Odney",
  "Graham Newton", "Stuart Grant", "Kellie Ann Vogelaar", "Michelle Sexsmith", "Carolyn Hogan", "Kris Austin", "Flo Butler", "Jodi Scott", "Janice Kirkham"
];

let currentStaff = null;
let allSchedules = {};

// ===== INIT =====
document.getElementById('staffSelect').addEventListener('change', onStaffSelected);
loadAllSchedules();

// ===== LOAD SCHEDULE DATA =====
function loadAllSchedules() {
  db.ref('generatedRoster').on('value', (snapshot) => {
    allSchedules = snapshot.val() || {};
    console.log('Loaded roster:', allSchedules);
    if (currentStaff) {
      renderStaffsShifts();
    }
  });
}

// ===== STAFF SELECTION =====
function renderStaffsShifts() {
  if (!currentStaff) return;

  const shiftsSection = document.getElementById('shiftsSection');
  const shiftsTitle = document.getElementById('shiftsTitle');
  const shiftsList = document.getElementById('shiftsList');

  shiftsTitle.textContent = `${currentStaff}'s Assigned Shifts (Next 12 Months)`;
  shiftsList.innerHTML = '';

  const staffShifts = [];
  
  // allSchedules structure: "2026-04-04" → { paraDay: "name", nurseDay: "name", ... }
  for (const [dateStr, dayData] of Object.entries(allSchedules)) {
    if (!dayData || typeof dayData !== 'object') continue;
    
    // Check each shift type
    const shiftTypes = [
      { key: 'paraDay', label: 'Para Day' },
      { key: 'nurseDay', label: 'Nurse Day' },
      { key: 'paraNight', label: 'Para Night' },
      { key: 'nurseNight', label: 'Nurse Night' }
    ];
    
    shiftTypes.forEach(shift => {
      if (dayData[shift.key] === currentStaff) {
        staffShifts.push({
          date: dateStr,
          shiftId: shift.key,
          shiftLabel: shift.label
        });
      }
    });
  }

  if (staffShifts.length === 0) {
    shiftsList.innerHTML = '<p style="color: #999;">No shifts assigned in the generated roster.</p>';
    return;
  }

  // Sort by date
  staffShifts.sort((a, b) => new Date(a.date) - new Date(b.date));

  staffShifts.forEach((shift) => {
    const d = new Date(shift.date + 'T00:00:00');
    const dateFormatted = d.toDateString();
    
    const card = document.createElement('div');
    card.className = 'shift-card';
    card.innerHTML = `
      <h3>${dateFormatted}</h3>
      <div class="shift-details">
        <strong>Shift:</strong> ${shift.shiftLabel}<br>
        <strong>Date:</strong> ${shift.date}
      </div>
      <button onclick="initiateTradeRequest('${shift.date}', '${shift.shiftId}')">Request Trade</button>
    `;
    shiftsList.appendChild(card);
  });
}

// ===== INITIATE TRADE REQUEST =====
function initiateTradeRequest(date, shiftId) {
  const tradePartner = prompt('Who do you want to trade with? (Enter staff name)');
  if (!tradePartner || tradePartner.trim() === '') return;
  
  if (!STAFF_LIST.includes(tradePartner)) {
    alert('Staff member not found. Please check the name.');
    return;
  }

  const tradeId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tradeRequest = {
    id: tradeId,
    fromUser: currentStaff,
    toUser: tradePartner,
    date: date,
    fromShiftId: shiftId,
    status: 'pending',
    createdAt: Date.now(),
    createdBy: currentStaff
  };

  db.ref(`tradeRequests/${tradeId}`).set(tradeRequest, (error) => {
    if (error) {
      alert('Error creating trade request: ' + error.message);
    } else {
      alert(`Trade request sent to ${tradePartner}!`);
      loadTradeRequests();
    }
  });
}

// ===== LOAD & DISPLAY TRADE REQUESTS =====
function loadTradeRequests() {
  if (!currentStaff) return;

  db.ref('tradeRequests').once('value', (snapshot) => {
    const trades = snapshot.val() || {};
    const myTrades = [];

    for (const [tradeId, trade] of Object.entries(trades)) {
      if (trade.fromUser === currentStaff || trade.toUser === currentStaff) {
        myTrades.push(trade);
      }
    }

    renderTradeRequests(myTrades);
  });
}

function renderTradeRequests(trades) {
  const tradesList = document.getElementById('tradeRequestsList');
  tradesList.innerHTML = '';

  if (trades.length === 0) {
    tradesList.innerHTML = '<p style="color: #999;">No trade requests yet.</p>';
    return;
  }

  trades.forEach((trade) => {
    const isFromMe = trade.fromUser === currentStaff;
    const otherPerson = isFromMe ? trade.toUser : trade.fromUser;
    const directionText = isFromMe ? `Requesting trade with ${otherPerson}` : `${otherPerson} requested to trade with you`;

    const card = document.createElement('div');
    card.className = `trade-card ${trade.status}`;
    card.innerHTML = `
      <h4>${directionText}</h4>
      <p><strong>Date:</strong> ${trade.date}</p>
      <p><strong>Shift ID:</strong> ${trade.fromShiftId}</p>
      <p><strong>Created:</strong> ${new Date(trade.createdAt).toLocaleDateString()}</p>
      <span class="status-badge ${trade.status}">${trade.status.toUpperCase()}</span>
    `;
    tradesList.appendChild(card);
  });
}
