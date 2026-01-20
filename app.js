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
  db.ref('schedule').once('value', (snapshot) => {
    allSchedules = snapshot.val() || {};
    if (currentStaff) {
      renderStaffsShifts();
    }
  });
}

// ===== STAFF SELECTION =====
function onStaffSelected(e) {
  currentStaff = e.target.value;
  if (!currentStaff) {
    document.getElementById('shiftsSection').style.display = 'none';
    document.getElementById('tradeRequestsSection').style.display = 'none';
    return;
  }
  
  renderStaffsShifts();
  loadTradeRequests();
  document.getElementById('shiftsSection').style.display = 'block';
  document.getElementById('tradeRequestsSection').style.display = 'block';
}

// ===== RENDER SHIFTS FOR SELECTED STAFF =====
function renderStaffsShifts() {
  if (!currentStaff) return;

  const shiftsSection = document.getElementById('shiftsSection');
  const shiftsTitle = document.getElementById('shiftsTitle');
  const shiftsList = document.getElementById('shiftsList');

  shiftsTitle.textContent = `${currentStaff}'s Assigned Shifts (Next 6 Months)`;
  shiftsList.innerHTML = '';

  const staffShifts = [];
  for (const [date, dayData] of Object.entries(allSchedules)) {
    if (dayData.assignments) {
      for (const [shiftId, staffName] of Object.entries(dayData.assignments)) {
        if (staffName === currentStaff) {
          staffShifts.push({
            date,
            shiftId,
            shift: dayData.shifts?.[shiftId] || 'Unknown Shift'
          });
        }
      }
    }
  }

  if (staffShifts.length === 0) {
    shiftsList.innerHTML = '<p style="color: #999;">No shifts found for this staff member.</p>';
    return;
  }

  staffShifts.forEach((shift) => {
    const card = document.createElement('div');
    card.className = 'shift-card';
    card.innerHTML = `
      <h3>${shift.date}</h3>
      <div class="shift-details">
        <strong>Shift:</strong> ${shift.shift}<br>
        <strong>Shift ID:</strong> ${shift.shiftId}
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