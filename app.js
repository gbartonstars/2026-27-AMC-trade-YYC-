const db = firebase.database();
let currentStaff = null;
let allSchedules = {};

// Staff categorization
const PARAMEDICS = [
  'Greg Barton', 'Scott McTaggart', 'Dave Allison', 'Mackenzie Wardle',
  'Chad Hegge', 'Ken King', 'John Doyle', 'Bob Odney'
];

const NURSES = [
  'Graham Newton', 'Stuart Grant', 'Kellie Ann Vogelaar', 'Michelle Sexsmith',
  'Carolyn Hogan', 'Kris Austin', 'Flo Butler', 'Jodi Scott', 'Janice Kirkham'
];

// Load data when page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  loadAllSchedules();
  setupEventListeners();
});

function setupEventListeners() {
  const staffSelect = document.getElementById('staffSelect');
  staffSelect.addEventListener('change', (e) => {
    const selectedName = e.target.value;
    console.log('Dropdown changed to:', selectedName);
    
    if (!selectedName) {
      document.getElementById('shiftsSection').style.display = 'none';
      document.getElementById('calendarSection').style.display = 'none';
      currentStaff = null;
      return;
    }
    
    currentStaff = selectedName;
    renderStaffsShifts();
    renderRosterCalendar();
  });

  // Tab switching
  const shiftsTab = document.getElementById('shiftsTab');
  const calendarTab = document.getElementById('calendarTab');
  
  if (shiftsTab) {
    shiftsTab.addEventListener('click', () => {
      document.getElementById('shiftsSection').style.display = 'block';
      document.getElementById('calendarSection').style.display = 'none';
      shiftsTab.style.borderBottom = '3px solid #2d8a8c';
      calendarTab.style.borderBottom = 'none';
    });
  }
  
  if (calendarTab) {
    calendarTab.addEventListener('click', () => {
      document.getElementById('shiftsSection').style.display = 'none';
      document.getElementById('calendarSection').style.display = 'block';
      calendarTab.style.borderBottom = '3px solid #2d8a8c';
      shiftsTab.style.borderBottom = 'none';
    });
  }

  // Calendar navigation
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
  db.ref('generatedRoster').once('value', (snapshot) => {
    allSchedules = snapshot.val() || {};
    console.log('Roster loaded. Data keys:', Object.keys(allSchedules).slice(0, 5));
    if (currentStaff) {
      renderStaffsShifts();
      renderRosterCalendar();
    }
  }, (error) => {
    console.error('Error loading roster:', error);
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
  
  // Loop through all dates and find shifts for this person
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

  // Sort by date
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
      <button onclick="openTradeModal('${shift.date}', '${shift.shiftId}', '${shift.shiftLabel}')" style="padding: 8px 16px; background-color: #2d8a8c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Request Trade
      </button>
    `;
    shiftsList.appendChild(card);
  });

  shiftsSection.style.display = 'block';
}

function renderRosterCalendar() {
  if (!currentStaff) return;

  const calendarEl = document.getElementById('rosterCalendar');
  if (!calendarEl) return;

  // Initialize calendar date if not exists
  if (!window.calendarDate) {
    window.calendarDate = new Date(2026, 3, 1); // April 2026
  }

  const year = window.calendarDate.getFullYear();
  const month = window.calendarDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

  calendarEl.innerHTML = '';
  
  // Day headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.style.cssText = 'font-weight: bold; text-align: center; padding: 8px; background-color: #2d8a8c; color: white;';
    header.textContent = day;
    calendarEl.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'padding: 10px; border: 1px solid #eee;';
    calendarEl.appendChild(emptyCell);
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = allSchedules[dateStr];
    
    const dayCell = document.createElement('div');
    dayCell.style.cssText = 'padding: 10px; border: 1px solid #ddd; min-height: 120px; cursor: pointer; transition: background-color 0.2s;';
    dayCell.addEventListener('mouseenter', () => dayCell.style.backgroundColor = '#f0f0f0');
    dayCell.addEventListener('mouseleave', () => dayCell.style.backgroundColor = 'transparent');

    // Day number
    const dayNum = document.createElement('div');
    dayNum.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #333;';
    dayNum.textContent = day;
    dayCell.appendChild(dayNum);

    if (dayData) {
      // Show all shifts for this day
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
          shiftDiv.style.cssText = 'font-size: 11px; margin-bottom: 3px; padding: 3px 5px; background-color: #e8f4f8; border-radius: 3px; cursor: pointer;';
          
          // Highlight current staff's shifts
          if (staffName === currentStaff) {
            shiftDiv.style.backgroundColor = '#90EE90';
            shiftDiv.style.fontWeight = 'bold';
          }

          shiftDiv.innerHTML = `<strong>${shift.icon}</strong> ${staffName}`;
          
          // Allow clicking on any shift to request trade
          shiftDiv.addEventListener('click', () => {
            openTradeModal(dateStr, shift.key, shift.label);
          });

          dayCell.appendChild(shiftDiv);
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

function openTradeModal(fromDate, fromShiftId, fromShiftLabel) {
  console.log(`Opening trade modal for ${fromDate} ${fromShiftId}`);
  
  // Get the staff member on that shift
  const dayData = allSchedules[fromDate];
  if (!dayData || !dayData[fromShiftId]) {
    alert('Error: Could not find shift data');
    return;
  }

  const targetStaff = dayData[fromShiftId];
  
  // Check role compatibility
  const currentRole = getStaffRole(currentStaff);
  const targetRole = getStaffRole(targetStaff);

  if (currentRole !== targetRole) {
    alert(`❌ You can only trade with other ${currentRole === 'paramedic' ? 'Paramedics' : 'Nurses'}.\n\n${targetStaff} is a ${targetRole === 'paramedic' ? 'Paramedic' : 'Nurse'}.`);
    return;
  }

  if (targetStaff === currentStaff) {
    alert('You cannot trade with yourself!');
    return;
  }
  
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
  
  modalContent.innerHTML = `
    <h2>Request Trade</h2>
    <p><strong>Your Shift:</strong> ${fromShiftLabel} on ${fromDate}</p>
    <p><strong>Trade with:</strong> ${targetStaff}</p>
    <div style="margin-bottom: 15px; margin-top: 20px;">
      <label><strong>Trade Reason (optional):</strong></label>
      <textarea id="tradeReason" style="width: 100%; padding: 8px; height: 80px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeModal()" style="padding: 10px 20px; background-color: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button onclick="submitTrade('${fromDate}', '${fromShiftId}', '${currentStaff}', '${targetStaff}')" style="padding: 10px 20px; background-color: #2d8a8c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Submit Trade Request
      </button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function closeModal() {
  const modal = document.getElementById('tradeModal');
  if (modal) {
    modal.remove();
  }
}

function submitTrade(fromDate, fromShiftId, fromStaffName, toStaffName) {
  const tradeReason = document.getElementById('tradeReason').value;
  
  // Find what shift the trade partner has on that date
  const dayData = allSchedules[fromDate];
  let toShiftId = null;
  
  for (const [shiftKey, staffName] of Object.entries(dayData)) {
    if (staffName === toStaffName) {
      toShiftId = shiftKey;
      break;
    }
  }
  
  if (!toShiftId) {
    alert('Error: Could not find trade partner shift');
    return;
  }
  
  // Create trade request object
  const tradeRequest = {
    fromStaff: fromStaffName,
    fromDate: fromDate,
    fromShift: fromShiftId,
    toStaff: toStaffName,
    toDate: fromDate,
    toShift: toShiftId,
    reason: tradeReason || 'No reason provided',
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: fromStaffName
  };
  
  console.log('Submitting trade request:', tradeRequest);
  
  // Save to Firebase
  const tradeId = `${fromStaffName}_${fromDate}_${Date.now()}`;
  db.ref(`tradeRequests/${tradeId}`).set(tradeRequest)
    .then(() => {
      alert(`✅ Trade request submitted!\n\n${toStaffName} will be notified.`);
      closeModal();
    })
    .catch((error) => {
      console.error('Error submitting trade:', error);
      alert('❌ Error submitting trade request. Please try again.');
    });
}

