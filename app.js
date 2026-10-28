// Local Storage Handler
let storeApps = JSON.parse(localStorage.getItem('origin_apps')) || [];

function saveData() {
  localStorage.setItem('origin_apps', JSON.stringify(storeApps));
  renderStore();
  renderAdminPanel();
}

function getCategoryIcon(cat) {
  switch(cat) {
    case 'Games': return 'ph-game-controller';
    case 'Tools': return 'ph-wrench';
    case 'Productivity': return 'ph-chart-line-up';
    case 'Personalization': return 'ph-sparkle';
    default: return 'ph-cube';
  }
}

// Render Main Public Store Feed
function renderStore(filterCategory = 'All', searchQuery = '') {
  const publicList = document.getElementById('publicAppList');
  publicList.innerHTML = '';

  const approvedApps = storeApps.filter(app => {
    const matchesCategory = filterCategory === 'All' || app.category === filterCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return app.status === 'APPROVED' && matchesCategory && matchesSearch;
  });

  if (approvedApps.length === 0) {
    publicList.innerHTML = `<div class="empty-state">No apps published yet.<br>Upload an APK from the profile menu to get started!</div>`;
    return;
  }

  approvedApps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-icon"><i class="ph ${getCategoryIcon(app.category)}"></i></div>
      <div class="app-details">
        <div class="app-title">${app.name} <i class="ph-fill ph-seal-check verified-icon"></i></div>
        <div class="app-meta">${app.category} • ${app.packageName}</div>
        <div class="app-badge-row">
          <span class="badge-safe">Verified Safe</span>
        </div>
      </div>
      <a href="${app.fileUrl}" download="${app.name}.apk" class="btn-download">Get APK</a>
    `;
    publicList.appendChild(card);
  });
}

// Render Secret Admin Moderation Dashboard
function renderAdminPanel() {
  const adminList = document.getElementById('adminAppList');
  const pendingCountEl = document.getElementById('pendingCount');
  const approvedCountEl = document.getElementById('approvedCount');

  adminList.innerHTML = '';

  const pendingApps = storeApps.filter(app => app.status === 'PENDING_REVIEW');
  const approvedApps = storeApps.filter(app => app.status === 'APPROVED');

  pendingCountEl.textContent = pendingApps.length;
  approvedCountEl.textContent = approvedApps.length;

  if (pendingApps.length === 0) {
    adminList.innerHTML = `<div class="empty-state">✨ No apps currently waiting in the review queue. All clear!</div>`;
    return;
  }

  pendingApps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'admin-app-card';
    card.innerHTML = `
      <div class="admin-card-header">
        <div class="app-icon"><i class="ph ${getCategoryIcon(app.category)}"></i></div>
        <div class="app-details">
          <div class="app-title">${app.name}</div>
          <div class="app-meta">${app.category} • ${app.packageName}</div>
          <span class="badge-pending">Pending Review</span>
        </div>
      </div>
      <div class="admin-app-desc"><b>Description:</b> ${app.description}</div>
      <div class="admin-action-row">
        <button class="btn-approve" onclick="approveApp('${app.id}')">Approve & Publish</button>
        <button class="btn-reject" onclick="rejectApp('${app.id}')">Reject</button>
      </div>
    `;
    adminList.appendChild(card);
  });
}

function approveApp(id) {
  const app = storeApps.find(a => a.id === id);
  if (app) {
    app.status = 'APPROVED';
    saveData();
  }
}

function rejectApp(id) {
  storeApps = storeApps.filter(a => a.id !== id);
  saveData();
}

// Modals Setup
const profileModal = document.getElementById('profileModal');
const uploadModal = document.getElementById('uploadModal');
const adminModal = document.getElementById('adminModal');
const aiModal = document.getElementById('aiModal');

document.getElementById('headerAvatarBtn').onclick = () => profileModal.classList.add('active');
document.getElementById('navProfile').onclick = () => profileModal.classList.add('active');
document.getElementById('closeProfileBtn').onclick = () => profileModal.classList.remove('active');

document.getElementById('triggerUploadBtn').onclick = () => {
  profileModal.classList.remove('active');
  uploadModal.classList.add('active');
};
document.getElementById('closeUploadBtn').onclick = () => uploadModal.classList.remove('active');

document.getElementById('fabAiBtn').onclick = () => aiModal.classList.add('active');
document.getElementById('headerAiBtn').onclick = () => aiModal.classList.add('active');
document.getElementById('closeAiBtn').onclick = () => aiModal.classList.remove('active');

// SECRET GESTURE ACCESS TO ADMIN DASHBOARD (Tap Logo 3 Times -> Password "74")
let logoTapCount = 0;
let logoTapTimer = null;

document.getElementById('secretLogoTrigger').onclick = () => {
  logoTapCount++;
  clearTimeout(logoTapTimer);

  if (logoTapCount === 3) {
    logoTapCount = 0;
    const pass = prompt('🔐 Enter Admin Password:');
    if (pass === '74') {
      renderAdminPanel();
      adminModal.classList.add('active');
    } else if (pass !== null) {
      alert('Incorrect Password!');
    }
  } else {
    logoTapTimer = setTimeout(() => {
      logoTapCount = 0;
    }, 800);
  }
};

document.getElementById('closeAdminBtn').onclick = () => adminModal.classList.remove('active');

// File Upload Form Handling
document.getElementById('apkFile').onchange = (e) => {
  if (e.target.files.length > 0) {
    document.getElementById('fileNameDisplay').textContent = e.target.files[0].name;
  }
};

document.getElementById('appUploadForm').onsubmit = (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('apkFile');
  const file = fileInput.files[0];

  if (!file) return;

  const newApp = {
    id: Date.now().toString(),
    name: document.getElementById('appName').value,
    packageName: document.getElementById('packageName').value,
    category: document.getElementById('appCategory').value,
    description: document.getElementById('appDesc').value,
    fileUrl: URL.createObjectURL(file),
    status: 'PENDING_REVIEW'
  };

  storeApps.push(newApp);
  saveData();

  alert(`"${newApp.name}" submitted successfully! It is now in the verification queue.`);
  uploadModal.classList.remove('active');
  e.target.reset();
  document.getElementById('fileNameDisplay').textContent = 'Select .APK File';
};

// Category Filtering
let currentCategory = 'All';
document.querySelectorAll('#categoryContainer .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#categoryContainer .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.getAttribute('data-category');
    renderStore(currentCategory, document.getElementById('searchInput').value);
  };
});

// Search Filtering
document.getElementById('searchInput').oninput = (e) => {
  renderStore(currentCategory, e.target.value);
};

// Initialize
renderStore();
renderAdminPanel();
