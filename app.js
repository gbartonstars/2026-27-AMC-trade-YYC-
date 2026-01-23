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
      <button onclick="alert('Trade request feature coming soon for: ${shift.date} - ${shift.shiftLabel}')">
        Request Trade
      </button>
    `;
    shiftsList.appendChild(card);
  });

  shiftsSection.style.display = 'block';
}
