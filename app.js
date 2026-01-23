const db = firebase.database();
let currentStaff = null;
let allSchedules = {};

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
      currentStaff = null;
      return;
    }
    
    currentStaff = selectedName;
    renderStaffsShifts();
  });
}

function loadAllSchedules() {
  console.log('Loading roster from Firebase...');
  db.ref('generatedRoster').once('value', (snapshot) => {
    allSchedules = snapshot.val() || {};
    console.log('Roster loaded. Data keys:', Object.keys(allSchedules).slice(0, 5));
    if (currentStaff) {
      renderStaffsShifts();
    }
  }, (error) => {
    console.error('Error loading roster:', error);
  });
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

function openTradeModal(fromDate, fromShiftId, fromShiftLabel) {
  console.log(`Opening trade modal for ${fromDate} ${fromShiftId}`);
  
  const modal = document.createElement('div');
  modal.id = 'tradeModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backgroundColor: rgba(0,0,0,0.5);
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
  
  // Get list of available staff for swapping
  const availableStaff = getAvailableStaffForSwap(fromDate, fromShiftId);
  
  let staffOptionsHTML = '<option value="">-- Select who you want to trade with --</option>';
  availableStaff.forEach(person => {
    staffOptionsHTML += `<option value="${person.name}">${person.name} (${person.theirShift})</option>`;
  });
  
  modalContent.innerHTML = `
    <h2>Request Trade</h2>
    <p><strong>Your Shift:</strong> ${fromShiftLabel} on ${fromDate}</p>
    <p style="margin-top: 20px;"><strong>Who would you like to trade with?</strong></p>
    <select id="tradePartner" style="width: 100%; padding: 10px; margin-bottom: 20px;">
      ${staffOptionsHTML}
    </select>
    <div style="margin-bottom: 15px;">
      <label><strong>Trade Reason (optional):</strong></label>
      <textarea id="tradeReason" style="width: 100%; padding: 8px; height: 80px; margin-top: 5px;"></textarea>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button onclick="closeModal()" style="padding: 10px 20px; background-color: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button onclick="submitTrade('${fromDate}', '${fromShiftId}', '${currentStaff}')" style="padding: 10px 20px; background-color: #2d8a8c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
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

function getAvailableStaffForSwap(targetDate, targetShiftId) {
  // Find who else is scheduled on that date for any shift
  const dayData = allSchedules[targetDate];
  if (!dayData) return [];
  
  const staffList = [];
  const shiftTypes = ['paraDay', 'nurseDay', 'paraNight', 'nurseNight'];
  
  shiftTypes.forEach(shiftKey => {
    const staffName = dayData[shiftKey];
    if (staffName && staffName !== currentStaff) {
      staffList.push({
        name: staffName,
        theirShift: getShiftLabel(shiftKey)
      });
    }
  });
  
  return staffList;
}

function getShiftLabel(shiftId) {
  const labels = {
    'paraDay': 'Para Day',
    'nurseDay': 'Nurse Day',
    'paraNight': 'Para Night',
    'nurseNight': 'Nurse Night'
  };
  return labels[shiftId] || shiftId;
}

function submitTrade(fromDate, fromShiftId, fromStaffName) {
  const tradePartner = document.getElementById('tradePartner').value;
  const tradeReason = document.getElementById('tradeReason').value;
  
  if (!tradePartner) {
    alert('Please select someone to trade with');
    return;
  }
  
  // Find what shift the trade partner has on that date
  const dayData = allSchedules[fromDate];
  let toShiftId = null;
  
  for (const [shiftKey, staffName] of Object.entries(dayData)) {
    if (staffName === tradePartner) {
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
    toStaff: tradePartner,
    toDate: fromDate,  // For now, same day trades only
    toShift: toShiftId,
    reason: tradeReason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: fromStaffName
  };
  
  console.log('Submitting trade request:', tradeRequest);
  
  // Save to Firebase
  const tradeId = `${fromStaffName}_${fromDate}_${Date.now()}`;
  db.ref(`tradeRequests/${tradeId}`).set(tradeRequest)
    .then(() => {
      alert(`✅ Trade request submitted!\n\n${tradePartner} will be notified.`);
      closeModal();
      // Reload the page to see updated status
      setTimeout(() => location.reload(), 1000);
    })
    .catch((error) => {
      console.error('Error submitting trade:', error);
      alert('❌ Error submitting trade request. Please try again.');
    });
}
