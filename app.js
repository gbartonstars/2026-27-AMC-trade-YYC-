const db = firebase.database();
let currentStaff = null;
let allSchedules = {};
let tradeRequests = {};
let extraShiftRequests = {};
let isLoggedIn = false;

// Staff categorization
const PARAMEDICS = [
  'Greg Barton', 'Scott McTaggart', 'Dave Allison', 'Mackenzie Wardle',
  'Chad Hegge', 'Ken King', 'John Doyle', 'Bob Odney'
];

const NURSES = [
  'Graham Newton', 'Stuart Grant', 'Kellie Ann Vogelaar', 'Michelle Sexsmith',
  'Carolyn Hogan', 'Kris Austin', 'Flo Butler', 'Jodi Scott', 'Janice Kirkham'
];

// Admin users who can approve trades
const ADMINS = ['Greg Barton', 'Scott McTaggart', 'Graham Newton'];

// All staff
const ALL_STAFF = [...PARAMEDICS, ...NURSES];

// Login codes - matching availability program
const LOGIN_CODES = {
  'Greg Barton': 'B123',
  'Scott McTaggart': 'S456',
  'Dave Allison': 'D789',
  'Mackenzie Wardle': 'M321',
  'Chad Hegge': 'C654',
  'Ken King': 'K987',
  'John Doyle': 'J135',
  'Graham Newton': 'N246',
  'Stuart Grant': 'G369',
  'Kellie Ann Vogelaar': 'V481',
  'Michelle Sexsmith': 'S579',
  'Carolyn Hogan': 'H642',
  'Kris Austin': 'A753',
  'Flo Butler': 'B864',
  'Jodi Scott': 'J975',
  'Janice Kirkham': 'K108',
  'Bob Odney': 'O555'
};

// Track which shift is selected for trading
let selectedTradeShift = null;

// Load data when page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  showLoginScreen();
});

// ==================== LOGIN SYSTEM ====================

function showLoginScreen() {
  // Hide main content
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('loginContainer').style.display = 'flex';
  
  // Populate staff dropdown
  const staffSelect = document.getElementById('loginStaffSelect');
  staffSelect.innerHTML = '<option value="">-- Select Your Name --</option>';
  
  ALL_STAFF.forEach(staff => {
    const option = document.createElement('option');
    option.value = staff;
    option.textContent = staff;
    staffSelect.appendChild(option);
  });
}

function handleLogin() {
  const selectedStaff = document.getElementById('loginStaffSelect').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!selectedStaff) {
    alert('Please select your name');
    return;
  }
  
  if (!password) {
    alert('Please enter your login code');
    return;
  }
  
  // Check password against login codes
  const correctPassword = LOGIN_CODES[selectedStaff];
  
  if (password !== correctPassword) {
    alert('❌ Invalid login code. Please try again.');
    document.getElementById('loginPassword').value = '';
    return;
  }
  
  // Login successful
  isLoggedIn = true;
  currentStaff = selectedStaff;
  console.log(`✅ Logged in as: ${currentStaff}`);
  
  // Hide login, show main content
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  
  // Update header with logged-in user
  document.getElementById('loggedInUser').textContent = `Logged in as: ${currentStaff}`;
  
  // Set staff select dropdown and load data
  document.getElementById('staffSelect').value = currentStaff;
  document.getElementById('staffSelect').disabled = true;
  
  // Load all data
  loadAllSchedules();
  loadTradeRequests();
  loadExtraShiftRequests();
  setupEventListeners();
  
  // Initialize the view
  renderStaffsShifts();
  renderRosterCalendar();
  renderTradeInbox();
}

function handleLogout() {
  const confirmed = confirm('Are you sure you want to logout?');
  if (!confirmed) return;
  
  isLoggedIn = false;
  currentStaff = null;
  selectedTradeShift = null;
  
  // Reset form
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginStaffSelect').value = '';
  
  // Show login screen
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('loginContainer').style.display = 'flex';
}

// ==================== MAIN APP ====================

function setupEventListeners() {
  const shiftsTab = document.getElementById('shiftsTab');
  const calendarTab = document.getElementById('calendarTab');
  const inboxTab = document.getElementById('inboxTab');
  
  if (shiftsTab) {
    shiftsTab.addEventListener('click', () => {
      document.getElementById('shiftsSection').style.display = 'block';
      document.getElementById('calendarSection').style.display = 'none';
      document.getElementById('inboxSection').style.display = 'none';
      shiftsTab.style.borderBottom = '3px solid #2d8a8c';
      calendarTab.style.borderBottom = 'none';
      inboxTab.style.borderBottom = 'none';
      selectedTradeShift = null;
    });
  }
  
  if (calendarTab) {
    calendarTab.addEventListener('click', () => {
      document.getElementById('shiftsSection').style.display = 'none';
      document.getElementById('calendarSection').style.display = 'block';
      document.getElementById('inboxSection').style.display = 'none';
      calendarTab.style.borderBottom = '3px solid #2d8a8c';
      shiftsTab.style.borderBottom = 'none';
      inboxTab.style.borderBottom = 'none';
      renderRosterCalendar();
    });
  }

  if (inboxTab) {
    inboxTab.addEventListener('click', () => {
      document.getElementById('shiftsSection').style.display = 'none';
      document.getElementById('calendarSection').style.display = 'none';
      document.getElementById('inboxSection').style.display = 'block';
      inboxTab.style.borderBottom = '3px solid #2d8a8c';
      shiftsTab.style.borderBottom = 'none';
      calendarTab.style.borderBottom = 'none';
      selectedTradeShift = null;
      renderTradeInbox();
    });
  }

  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');
  
  if (prevMonth) {
    prevMonth.addEventListener('click', () => {
      window.calendarDate.setMonth(window.calendarDate.getMonth() - 1);
      renderRosterCalendar();
    });
  }
  
  if (nextMonth) {
    nextMonth.addEventListener('click', () => {
      window.calendarDate.setMonth(window.calendarDate.getMonth() + 1);
      renderRosterCalendar();
    });
  }
}

function loadAllSchedules() {
  console.log('Loading roster from Firebase...');
  db.ref('generatedRoster').on('value', (snapshot) => {
    allSchedules = snapshot.val() || {};
    console.log('Roster loaded');
    if (currentStaff) {
      renderStaffsShifts();
      renderRosterCalendar();
    }
  }, (error) => {
    console.error('Error loading roster:', error);
  });
}

function loadTradeRequests() {
  console.log('Loading trade requests...');
  db.ref('tradeRequests').on('value', (snapshot) => {
    tradeRequests = snapshot.val() || {};
    console.log('Trade requests loaded');
    if (currentStaff) {
      renderTradeInbox();
    }
  }, (error) => {
    console.error('Error loading trade requests:', error);
  });
}

function loadExtraShiftRequests() {
  console.log('Loading extra shift requests...');
  db.ref('extraShiftRequests').on('value', (snapshot) => {
    extraShiftRequests = snapshot.val() || {};
    console.log('Extra shift requests loaded');
    if (currentStaff) {
      renderRosterCalendar();
    }
  }, (error) => {
    console.error('Error loading extra shift requests:', error);
  });
}

function getStaffRole(staffName) {
  if (PARAMEDICS.includes(staffName)) return 'paramedic';
  if (NURSES.includes(staffName)) return 'nurse';
  return null;
}

function renderStaffsShifts() {
  console.log('Rendering shifts for:', currentStaff);
  
  if (!currentStaff) return;

  const shiftsSection = document.getElementById('shiftsSection');
  const shiftsTitle = document.getElementById('shiftsTitle');
  const shiftsList = document.getElementById('shiftsList');

  shiftsTitle.textContent = `${currentStaff}'s Assigned Shifts`;
  shiftsList.innerHTML = '';

  const staffShifts = [];
  
  for (const [dateStr, dayData] of Object.entries(allSchedules)) {
    if (!dayData || typeof dayData !== 'object') continue;
    
    const shiftTypes = [
      { key: 'paraDay', label: 'Paramedic - Day' },
      { key: 'nurseDay', label: 'Nurse - Day' },
      { key: 'paraNight', label: 'Paramedic - Night' },
      { key: 'nurseNight', label: 'Nurse - Night' }
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

  console.log(`Found ${staffShifts.length} shifts for ${currentStaff}`);

  if (staffShifts.length === 0) {
    shiftsList.innerHTML = '<p style="color: #999;">No shifts assigned in the roster.</p>';
    shiftsSection.style.display = 'block';
    return;
  }

  staffShifts.sort((a, b) => new Date(a.date) - new Date(b.date));

  staffShifts.forEach((shift) => {
    const d = new Date(shift.date + 'T00:00:00');
    const dateFormatted = d.toDateString();
    
    const card = document.createElement('div');
    card.className = 'shift-card';
    card.style.padding = '15px';
    card.style.marginBottom = '10px';
    card.style.backgroundColor = '#f9f9f9';
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '5px';
    
    card.innerHTML = `
      <h3 style="margin-top: 0;">${dateFormatted}</h3>
      <p><strong>Shift:</strong> ${shift.shiftLabel}</p>
      <p><strong>Date:</strong> ${shift.date}</p>
      <button onclick="selectTradeShiftInCalendar('${shift.date}', '${shift.shiftId}', '${shift.shiftLabel}')" style="padding: 8px 16px; background-color: #2d8a8c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Request Trade
      </button>
    `;
    shiftsList.appendChild(card);
  });

  shiftsSection.style.display = 'block';
}

function selectTradeShiftInCalendar(myDate, myShiftId, myShiftLabel) {
  // Store the shift they want to trade
  selectedTradeShift = {
    date: myDate,
    shiftId: myShiftId,
    shiftLabel: myShiftLabel
  };

  console.log('Selected shift to trade:', selectedTradeShift);

  // Switch to calendar view
  document.getElementById('shiftsSection').style.display = 'none';
  document.getElementById('calendarSection').style.display = 'block';
  document.getElementById('inboxSection').style.display = 'none';
  
  const shiftsTab = document.getElementById('shiftsTab');
  const calendarTab = document.getElementById('calendarTab');
  const inboxTab = document.getElementById('inboxTab');
  
  shiftsTab.style.borderBottom = 'none';
  calendarTab.style.borderBottom = '3px solid #2d8a8c';
  inboxTab.style.borderBottom = 'none';

  // Render calendar and highlight the selected shift
  renderRosterCalendar();
  
  // Show instruction
  const instruction = document.createElement('div');
  instruction.id = 'tradeInstruction';
  instruction.style.cssText = 'background-color: #cfe9ff; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #0d6efd;';
  instruction.innerHTML = `
    <strong>📍 Shift Selected for Trade:</strong> ${myShiftLabel} on ${myDate}<br>
    <em>Click on another person's shift below to initiate the trade request</em>
  `;
  
  const calendarSection = document.getElementById('calendarSection');
  const existingInstruction = document.getElementById('tradeInstruction');
  if (existingInstruction) existingInstruction.remove();
  calendarSection.insertBefore(instruction, calendarSection.firstChild);
}

function renderRosterCalendar() {
  if (!currentStaff) return;

  const calendarEl = document.getElementById('rosterCalendar');
  if (!calendarEl) return;

  if (!window.calendarDate) {
    window.calendarDate = new Date(2026, 3, 1);
  }

  const year = window.calendarDate.getFullYear();
  const month = window.calendarDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

  calendarEl.innerHTML = '';
  
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.style.cssText = 'font-weight: bold; text-align: center; padding: 8px; background-color: #2d8a8c; color: white;';
    header.textContent = day;
    calendarEl.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'padding: 10px; border: 1px solid #eee;';
    calendarEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = allSchedules[dateStr];
    
    const dayCell = document.createElement('div');
    dayCell.style.cssText = 'padding: 10px; border: 1px solid #ddd; min-height: 120px; cursor: pointer; transition: background-color 0.2s;';
    dayCell.addEventListener('mouseenter', () => dayCell.style.backgroundColor = '#f0f0f0');
    dayCell.addEventListener('mouseleave', () => dayCell.style.backgroundColor = 'transparent');

    const dayNum = document.createElement('div');
    dayNum.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #333;';
    dayNum.textContent = day;
    dayCell.appendChild(dayNum);

    if (dayData) {
      const shifts = [
        { key: 'paraDay', label: 'Para Day', icon: '🚑' },
        { key: 'nurseDay', label: 'RN Day', icon: '⚕️' },
        { key: 'paraNight', label: 'Para Night', icon: '🌙🚑' },
        { key: 'nurseNight', label: 'RN Night', icon: '🌙⚕️' }
      ];

      shifts.forEach(shift => {
        if (dayData[shift.key]) {
          const staffName = dayData[shift.key];
          const shiftDiv = document.createElement('div');
          shiftDiv.style.cssText = 'font-size: 11px; margin-bottom: 3px; padding: 3px 5px; background-color: #e8f4f8; border-radius: 3px; cursor: pointer; transition: all 0.2s;';
          
          // Highlight current staff's shifts in green
          if (staffName === currentStaff) {
            shiftDiv.style.backgroundColor = '#90EE90';
            shiftDiv.style.fontWeight = 'bold';
          }

          // Highlight the selected shift for trading in bright orange
          if (selectedTradeShift && dateStr === selectedTradeShift.date && shift.key === selectedTradeShift.shiftId) {
            shiftDiv.style.backgroundColor = '#FFA500';
            shiftDiv.style.fontWeight = 'bold';
            shiftDiv.style.border = '2px solid #FF6600';
          }

          shiftDiv.innerHTML = `<strong>${shift.icon}</strong> ${staffName}`;
          
          // Click handler for trade
          shiftDiv.addEventListener('click', () => {
            if (selectedTradeShift && dateStr === selectedTradeShift.date && shift.key === selectedTradeShift.shiftId) {
              // Clicking your own selected shift - deselect it
              selectedTradeShift = null;
              renderRosterCalendar();
            } else if (!selectedTradeShift) {
              // No shift selected yet - select this one if it's yours
              if (staffName === currentStaff) {
                selectTradeShiftInCalendar(dateStr, shift.key, shift.label);
              }
            } else {
              // A shift is selected - initiate trade with this shift
              initiateTradeFromCalendar(dateStr, shift.key, staffName, shift.label);
            }
          });

          dayCell.appendChild(shiftDiv);
        } else {
          // Empty shift slot
          const emptyShiftDiv = document.createElement('div');
          emptyShiftDiv.style.cssText = 'font-size: 11px; margin-bottom: 3px; padding: 3px 5px; background-color: #ff6b6b; border-radius: 3px; cursor: pointer; transition: all 0.2s; font-weight: bold; color: white;';
          
          const shiftLabel = shift.label;
          emptyShiftDiv.innerHTML = `<strong>${shift.icon}</strong> OPEN`;
          
          emptyShiftDiv.addEventListener('mouseenter', () => emptyShiftDiv.style.backgroundColor = '#ff5252');
          emptyShiftDiv.addEventListener('mouseleave', () => emptyShiftDiv.style.backgroundColor = '#ff6b6b');
          
          emptyShiftDiv.addEventListener('click', () => {
            requestExtraShift(dateStr, shift.key, shiftLabel);
          });

          dayCell.appendChild(emptyShiftDiv);
        }
      });
    } else {
      const noShifts = document.createElement('div');
      noShifts.style.cssText = 'font-size: 11px; color: #999;';
      noShifts.textContent = 'No roster';
      dayCell.appendChild(noShifts);
    }

    calendarEl.appendChild(dayCell);
  }

  document.getElementById('calendarSection').style.display = 'block';
}

function initiateTradeFromCalendar(targetDate, targetShiftId, targetStaff, targetShiftLabel) {
  if (!selectedTradeShift) {
    alert('No shift selected for trading');
    return;
  }

  console.log('Initiating trade from calendar:', {
    myShift: selectedTradeShift,
    targetShift: { date: targetDate, shiftId: targetShiftId, staff: targetStaff }
  });

  const myDate = selectedTradeShift.date;
  const myShiftId = selectedTradeShift.shiftId;
  const myStaff = currentStaff;

  // Check role compatibility
  const currentRole = getStaffRole(myStaff);
  const targetRole = getStaffRole(targetStaff);

  if (currentRole !== targetRole) {
    alert(`❌ You can only trade with other ${currentRole === 'paramedic' ? 'Paramedics' : 'Nurses'}.\n\n${targetStaff} is a ${targetRole === 'paramedic' ? 'Paramedic' : 'Nurse'}.`);
    return;
  }

  if (targetStaff === myStaff) {
    alert('You cannot trade with yourself!');
    return;
  }

  // Open the confirmation modal
  openTradeConfirmationModal(myDate, myShiftId, myStaff, targetDate, targetShiftId, targetStaff, targetShiftLabel);
}

function requestExtraShift(dateStr, shiftId, shiftLabel) {
  const currentRole = getStaffRole(currentStaff);
  const shiftIsForRole = (shiftId.includes('para')) ? 'paramedic' : 'nurse';
  
  if (currentRole !== shiftIsForRole) {
    alert(`❌ You can only request shifts for your role.\n\nThis is a ${shiftIsForRole === 'paramedic' ? 'Paramedic' : 'Nurse'} shift.`);
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'extraShiftModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;

  const d = new Date(dateStr + 'T00:00:00');

  modalContent.innerHTML = `
    <h2>Request Extra Shift</h2>
    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p><strong>Shift:</strong> ${shiftLabel}</p>
      <p><strong>Date:</strong> ${d.toDateString()}</p>
      <p style="color: #666; font-size: 12px;">An admin will need to approve this request</p>
    </div>
    <div style="margin-bottom: 15px;">
      <label><strong>Reason for requesting this shift:</strong></label>
      <textarea id="extraShiftReason" style="width: 100%; padding: 8px; height: 80px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeExtraShiftModal()" style="padding: 10px 20px; background-color: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button onclick="submitExtraShiftRequest('${dateStr}', '${shiftId}', '${shiftLabel}')" style="padding: 10px 20px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Submit Request
      </button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeExtraShiftModal();
    }
  });
}

function closeExtraShiftModal() {
  const modal = document.getElementById('extraShiftModal');
  if (modal) {
    modal.remove();
  }
}

function submitExtraShiftRequest(dateStr, shiftId, shiftLabel) {
  const reason = document.getElementById('extraShiftReason').value || 'No reason provided';
  
  const request = {
    staffName: currentStaff,
    date: dateStr,
    shiftId: shiftId,
    shiftLabel: shiftLabel,
    reason: reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  const requestId = `${currentStaff}_${dateStr}_${shiftId}_${Date.now()}`;
  
  db.ref(`extraShiftRequests/${requestId}`).set(request)
    .then(() => {
      alert(`✅ Extra shift request submitted!\n\nAdmins will review and approve shortly.`);
      closeExtraShiftModal();
      renderRosterCalendar();
    })
    .catch((error) => {
      console.error('Error submitting extra shift request:', error);
      alert('❌ Error submitting request. Please try again.');
    });
}

function openTradeConfirmationModal(myDate, myShiftId, myStaff, targetDate, targetShiftId, targetStaff, targetShiftLabel) {
  const modal = document.createElement('div');
  modal.id = 'tradeModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;

  const myShiftLabel = getShiftLabelFromId(myShiftId);
  const d1 = new Date(myDate + 'T00:00:00');
  const d2 = new Date(targetDate + 'T00:00:00');

  modalContent.innerHTML = `
    <h2>Confirm Trade Request</h2>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p><strong>✓ You give:</strong> ${myShiftLabel} on ${d1.toDateString()}</p>
      <p><strong>✓ You receive:</strong> ${targetShiftLabel} on ${d2.toDateString()}</p>
      <p><strong>Trading with:</strong> ${targetStaff}</p>
    </div>
    <div style="margin-bottom: 15px;">
      <label><strong>Trade Reason (optional):</strong></label>
      <textarea id="tradeReason" style="width: 100%; padding: 8px; height: 80px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeModal()" style="padding: 10px 20px; background-color: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button onclick="submitTrade('${myDate}', '${myShiftId}', '${myStaff}', '${targetDate}', '${targetShiftId}', '${targetStaff}')" style="padding: 10px 20px; background-color: #2d8a8c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Submit Trade Request
      </button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function renderTradeInbox() {
  if (!currentStaff) return;

  const inboxSection = document.getElementById('inboxSection');
  const inboxList = document.getElementById('inboxList');
  inboxList.innerHTML = '';

  const myPendingRequests = [];
  const requestsForMe = [];
  const acceptedRequests = [];

  for (const [tradeId, trade] of Object.entries(tradeRequests)) {
    if (trade.fromStaff === currentStaff && trade.status === 'pending') {
      myPendingRequests.push({ id: tradeId, ...trade });
    }
    if (trade.toStaff === currentStaff && trade.status === 'pending') {
      requestsForMe.push({ id: tradeId, ...trade });
    }
    if ((trade.fromStaff === currentStaff || trade.toStaff === currentStaff) && 
        (trade.status === 'accepted' || trade.status === 'both_accepted' || trade.status === 'adminApproved')) {
      acceptedRequests.push({ id: tradeId, ...trade });
    }
  }

  let html = '';

  // Extra shift requests section (for admins)
  if (ADMINS.includes(currentStaff)) {
    let pendingExtraShifts = [];
    for (const [reqId, req] of Object.entries(extraShiftRequests)) {
      if (req.status === 'pending') {
        pendingExtraShifts.push({ id: reqId, ...req });
      }
    }

    if (pendingExtraShifts.length > 0) {
      html += '<h3 style="color: #28a745;">📋 Extra Shift Requests (Admin)</h3>';
      pendingExtraShifts.forEach(req => {
        const d = new Date(req.date + 'T00:00:00');
        html += `
          <div style="background-color: #fff3cd; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p><strong>${req.staffName}</strong> requesting <strong>${req.shiftLabel}</strong> on <strong>${d.toDateString()}</strong></p>
            <p style="color: #666; font-size: 12px;"><strong>Reason:</strong> ${req.reason}</p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button onclick="approveExtraShift('${req.id}', '${req.date}', '${req.shiftId}', '${req.staffName}')" style="padding: 8px 16px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ✓ Approve
              </button>
              <button onclick="denyExtraShift('${req.id}')" style="padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ✗ Deny
              </button>
            </div>
          </div>
        `;
      });
    }
  }

  if (myPendingRequests.length > 0) {
    html += '<h3 style="margin-top: 30px;">Requests Awaiting Response</h3>';
    myPendingRequests.forEach(trade => {
      const d1 = new Date(trade.fromDate + 'T00:00:00');
      const d2 = new Date(trade.toDate + 'T00:00:00');
      html += `
        <div style="background-color: #fff3cd; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>You requested:</strong> ${trade.toStaff}'s ${getShiftLabelFromId(trade.toShift)} (${d2.toDateString()})</p>
          <p><strong>You offered:</strong> Your ${getShiftLabelFromId(trade.fromShift)} (${d1.toDateString()})</p>
          <p style="color: #666; font-size: 12px;">Waiting for ${trade.toStaff}'s response...</p>
        </div>
      `;
    });
  }

  if (requestsForMe.length > 0) {
    html += '<h3 style="margin-top: 30px;">Requests from Others</h3>';
    requestsForMe.forEach(trade => {
      const d1 = new Date(trade.fromDate + 'T00:00:00');
      const d2 = new Date(trade.toDate + 'T00:00:00');
      html += `
        <div style="background-color: #d4edff; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #0d6efd;">
          <p><strong>${trade.fromStaff} is requesting:</strong> Your ${getShiftLabelFromId(trade.toShift)} (${d2.toDateString()})</p>
          <p><strong>They offer:</strong> Their ${getShiftLabelFromId(trade.fromShift)} (${d1.toDateString()})</p>
          <p style="color: #666; font-size: 12px;"><strong>Reason:</strong> ${trade.reason}</p>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button onclick="acceptTrade('${trade.id}')" style="padding: 8px 16px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              ✓ Accept
            </button>
            <button onclick="declineTrade('${trade.id}')" style="padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              ✗ Decline
            </button>
          </div>
        </div>
      `;
    });
  }

  if (acceptedRequests.length > 0) {
    html += '<h3 style="margin-top: 30px;">✓ Accepted/Approved Trades</h3>';
    acceptedRequests.forEach(trade => {
      const d1 = new Date(trade.fromDate + 'T00:00:00');
      const d2 = new Date(trade.toDate + 'T00:00:00');
      const statusColor = trade.status === 'adminApproved' ? '#28a745' : '#ffc107';
      const statusText = trade.status === 'adminApproved' ? 'Admin Approved' : 'Both Accepted';
      html += `
        <div style="background-color: #d4edda; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid ${statusColor};">
          <p><strong>${trade.fromStaff} ↔ ${trade.toStaff}</strong></p>
          <p>${getShiftLabelFromId(trade.fromShift)} (${d1.toDateString()}) ↔ ${getShiftLabelFromId(trade.toShift)} (${d2.toDateString()})</p>
          <p style="color: #666; font-size: 12px;"><strong>Status:</strong> ${statusText}</p>
          ${ADMINS.includes(currentStaff) && trade.status === 'both_accepted' ? `
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button onclick="approveTrade('${trade.id}')" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                🔒 Admin Approve (Apply Changes)
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });
  }

  if (html === '') {
    html = '<p style="color: #999;">No requests at this time.</p>';
  }

  inboxList.innerHTML = html;
  inboxSection.style.display = 'block';
}

function getShiftLabelFromId(shiftId) {
  const labels = {
    'paraDay': 'Paramedic - Day',
    'nurseDay': 'Nurse - Day',
    'paraNight': 'Paramedic - Night',
    'nurseNight': 'Nurse - Night'
  };
  return labels[shiftId] || shiftId;
}

function closeModal() {
  const modal = document.getElementById('tradeModal');
  if (modal) {
    modal.remove();
  }
  selectedTradeShift = null;
}

function submitTrade(myDate, myShiftId, myStaff, targetDate, targetShiftId, targetStaff) {
  const tradeReason = document.getElementById('tradeReason').value;
  
  const tradeRequest = {
    fromStaff: myStaff,
    fromDate: myDate,
    fromShift: myShiftId,
    toStaff: targetStaff,
    toDate: targetDate,
    toShift: targetShiftId,
    reason: tradeReason || 'No reason provided',
    status: 'pending',
    fromStaffAccepted: true,
    toStaffAccepted: false,
    createdAt: new Date().toISOString(),
    createdBy: myStaff
  };
  
  console.log('Submitting trade request:', tradeRequest);
  
  const tradeId = `${myStaff}_${myDate}_${Date.now()}`;
  db.ref(`tradeRequests/${tradeId}`).set(tradeRequest)
    .then(() => {
      alert(`✅ Trade request submitted!\n\n${targetStaff} will need to accept or decline.`);
      closeModal();
      selectedTradeShift = null;
      renderStaffsShifts();
      renderRosterCalendar();
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error submitting trade:', error);
      alert('❌ Error submitting trade request. Please try again.');
    });
}

function acceptTrade(tradeId) {
  console.log(`Accepting trade: ${tradeId}`);
  
  db.ref(`tradeRequests/${tradeId}`).update({
    toStaffAccepted: true,
    status: 'both_accepted',
    toStaffAcceptedAt: new Date().toISOString()
  })
    .then(() => {
      alert('✅ You accepted the trade!\n\nAn admin will review and apply the changes.');
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error accepting trade:', error);
      alert('❌ Error accepting trade.');
    });
}

function declineTrade(tradeId) {
  const reason = prompt('Reason for declining (optional):');
  
  db.ref(`tradeRequests/${tradeId}`).update({
    status: 'declined',
    declinedBy: currentStaff,
    declinedReason: reason || 'No reason provided',
    declinedAt: new Date().toISOString()
  })
    .then(() => {
      alert('✅ Trade declined.');
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error declining trade:', error);
      alert('❌ Error declining trade.');
    });
}

function approveExtraShift(requestId, dateStr, shiftId, staffName) {
  db.ref(`extraShiftRequests/${requestId}`).update({
    status: 'approved',
    approvedBy: currentStaff,
    approvedAt: new Date().toISOString()
  })
    .then(() => {
      // Update roster to assign the shift
      const dayData = allSchedules[dateStr] || {};
      dayData[shiftId] = staffName;
      allSchedules[dateStr] = dayData;
      return db.ref('generatedRoster').set(allSchedules);
    })
    .then(() => {
      alert(`✅ Extra shift approved and assigned to ${staffName}!`);
      renderRosterCalendar();
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error approving extra shift:', error);
      alert('❌ Error approving extra shift. Please try again.');
    });
}

function denyExtraShift(requestId) {
  const reason = prompt('Reason for denying (optional):');
  
  db.ref(`extraShiftRequests/${requestId}`).update({
    status: 'denied',
    deniedBy: currentStaff,
    deniedReason: reason || 'No reason provided',
    deniedAt: new Date().toISOString()
  })
    .then(() => {
      alert('✅ Extra shift request denied.');
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error denying extra shift:', error);
      alert('❌ Error denying request. Please try again.');
    });
}

function approveTrade(tradeId) {
  if (!ADMINS.includes(currentStaff)) {
    alert('Only admins can approve trades');
    return;
  }

  console.log(`Admin approving trade: ${tradeId}`);
  const trade = tradeRequests[tradeId];

  if (!trade) {
    alert('Trade not found');
    return;
  }

  const fromDate = trade.fromDate;
  const toDate = trade.toDate;
  const fromShift = trade.fromShift;
  const toShift = trade.toShift;

  if (!allSchedules[fromDate] || !allSchedules[toDate]) {
    alert('Error: Dates not found in roster');
    return;
  }

  // Swap shifts
  const temp = allSchedules[fromDate][fromShift];
  allSchedules[fromDate][fromShift] = allSchedules[toDate][toShift];
  allSchedules[toDate][toShift] = temp;

  // Update Firebase
  db.ref('generatedRoster').set(allSchedules)
    .then(() => {
      return db.ref(`tradeRequests/${tradeId}`).update({
        status: 'adminApproved',
        approvedBy: currentStaff,
        approvedAt: new Date().toISOString()
      });
    })
    .then(() => {
      alert(`✅ Trade approved and applied!\n\nShifts have been swapped in the roster.`);
      renderRosterCalendar();
      renderStaffsShifts();
      renderTradeInbox();
    })
    .catch((error) => {
      console.error('Error approving trade:', error);
      alert('❌ Error approving trade. Please try again.');
    });
}
