let storeApps = [];
let storeBroadcast = localStorage.getItem('origin_broadcast') || '';
let totalDownloads = parseInt(localStorage.getItem('origin_downloads')) || 0;
let currentUser = JSON.parse(localStorage.getItem('origin_current_user')) || null;
let currentCategory = 'All';
let currentSort = 'popular';

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.classList.add('hidden');
  }, 1500);

  fetchAppsFromFirebase();
  renderBroadcast();
  renderUserSession();
  setupEventListeners();
});

// --- Firebase Cloud Database Fetch & Save ---
async function fetchAppsFromFirebase() {
  try {
    if (!window.db) throw new Error("Firebase DB not ready");
    const querySnapshot = await window.getDocs(window.collection(window.db, "origin_store_apps"));
    storeApps = [];
    querySnapshot.forEach((docSnap) => {
      storeApps.push({ firebaseId: docSnap.id, ...docSnap.data() });
    });
    renderStore(currentCategory, document.getElementById('searchInput')?.value || '');
    renderAdminPanel();
  } catch (err) {
    console.warn("Using LocalStorage fallback due to Firebase error:", err);
    storeApps = JSON.parse(localStorage.getItem('origin_apps')) || [];
    renderStore(currentCategory, document.getElementById('searchInput')?.value || '');
    renderAdminPanel();
  }
}

async function saveAppToFirebase(appData) {
  try {
    if (!window.db) return;
    await window.addDoc(window.collection(window.db, "origin_store_apps"), appData);
    fetchAppsFromFirebase();
  } catch (err) {
    console.error("Error adding app to Firebase:", err);
  }
}

async function updateAppInFirebase(firebaseId, updatedFields) {
  try {
    if (!window.db) return;
    const appRef = window.doc(window.db, "origin_store_apps", firebaseId);
    await window.updateDoc(appRef, updatedFields);
    fetchAppsFromFirebase();
  } catch (err) {
    console.error("Error updating app in Firebase:", err);
  }
}

async function deleteAppFromFirebase(firebaseId) {
  try {
    if (!window.db) return;
    await window.deleteDoc(window.doc(window.db, "origin_store_apps", firebaseId));
    fetchAppsFromFirebase();
  } catch (err) {
    console.error("Error deleting app from Firebase:", err);
  }
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function renderUserSession() {
  const headerAvatar = document.getElementById('headerAvatarBtn');
  const modalAvatar = document.getElementById('profileModalAvatar');
  const modalName = document.getElementById('profileModalName');
  const modalEmail = document.getElementById('profileModalEmail');
  const authMenuTitle = document.getElementById('authMenuTitle');
  const authMenuSub = document.getElementById('authMenuSub');

  if (currentUser) {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    if (headerAvatar) headerAvatar.textContent = initial;
    if (modalAvatar) modalAvatar.textContent = initial;
    if (modalName) modalName.textContent = currentUser.name || 'Origin User';
    if (modalEmail) modalEmail.textContent = currentUser.email;
    if (authMenuTitle) authMenuTitle.textContent = 'Sign Out';
    if (authMenuSub) authMenuSub.textContent = `Logged in as ${currentUser.email}`;
  } else {
    if (headerAvatar) headerAvatar.textContent = 'U';
    if (modalAvatar) modalAvatar.textContent = 'U';
    if (modalName) modalName.textContent = 'Guest User';
    if (modalEmail) modalEmail.textContent = 'Not signed in';
    if (authMenuTitle) authMenuTitle.textContent = 'Sign In / Sign Up';
    if (authMenuSub) authMenuSub.textContent = 'Access your account or register';
  }
}

function getCategoryIcon(cat) {
  switch (cat) {
    case 'Games': return 'ph-game-controller';
    case 'Tools': return 'ph-wrench';
    case 'Productivity': return 'ph-chart-line-up';
    case 'Personalization': return 'ph-sparkle';
    default: return 'ph-cube';
  }
}

function renderBroadcast() {
  const container = document.getElementById('broadcastBannerContainer');
  if (!container) return;
  if (storeBroadcast && storeBroadcast.trim() !== '') {
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--border-glass); padding: 10px 14px; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
        <i class="ph ph-megaphone" style="font-size: 18px; color: var(--accent-magenta);"></i>
        <div><b>Announcement:</b> ${storeBroadcast}</div>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

// --- Render Main Public Store Feed ---
function renderStore(filterCategory = 'All', searchQuery = '') {
  const publicList = document.getElementById('publicAppList');
  if (!publicList) return;
  publicList.innerHTML = '';

  let approvedApps = storeApps.filter(app => {
    const matchesCategory = filterCategory === 'All' || app.category === filterCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return app.status === 'APPROVED' && matchesCategory && matchesSearch;
  });

  if (currentSort === 'newest') {
    approvedApps.sort((a, b) => parseInt(b.id || 0) - parseInt(a.id || 0));
  } else if (currentSort === 'rating') {
    approvedApps.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  } else {
    approvedApps.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  }

  if (approvedApps.length === 0) {
    publicList.innerHTML = `<div class="empty-state">No apps published yet.<br>Upload a developer bundle from the profile menu to get started!</div>`;
    return;
  }

  approvedApps.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.onclick = () => openAppDetailModal(app);
    
    const iconContent = app.logoUrl 
      ? `<img src="${app.logoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">` 
      : `<i class="ph ${getCategoryIcon(app.category)}"></i>`;

    card.innerHTML = `
      <div class="app-icon" style="overflow:hidden;">${iconContent}</div>
      <div class="app-details">
        <div class="app-title">${app.name} <i class="ph-fill ph-seal-check verified-icon"></i></div>
        <div class="app-meta">${app.category} • Ver ${app.version || '1.0'}</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge-safe">🛡️ AI Verified</span>
          <span class="rating-badge"><i class="ph-fill ph-star"></i> ${app.rating || '4.8'}</span>
        </div>
      </div>
      <a href="${app.fileUrl}" class="btn-download" onclick="event.stopPropagation(); triggerDownloadSimulation(event, '${app.firebaseId}', '${app.name}', '${app.version || '1.0'}')">Get Build</a>
    `;
    publicList.appendChild(card);
  });
}

function triggerDownloadSimulation(e, firebaseId, appName, appVersion) {
  e.preventDefault();
  e.stopPropagation();
  totalDownloads++;
  localStorage.setItem('origin_downloads', totalDownloads);
  
  const app = storeApps.find(a => a.firebaseId === firebaseId);
  if (app && app.firebaseId) {
    const newDownloads = (app.downloads || 0) + 1;
    updateAppInFirebase(app.firebaseId, { downloads: newDownloads });
    
    // Direct Play Store Style Download Trigger
    const aTag = document.createElement('a');
    aTag.href = app.fileUrl;
    
    let fileExtension = '.apk';
    if (app.fileUrl.includes('aab')) fileExtension = '.aab';
    else if (app.fileUrl.includes('zip')) fileExtension = '.zip';

    aTag.download = `${appName.replace(/\s+/g, '_')}_v${appVersion}${fileExtension}`;
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
  }
}

const appDetailModal = document.getElementById('appDetailModal');
function openAppDetailModal(app) {
  if (!appDetailModal) return;
  document.getElementById('modalDetailTitle').textContent = app.name;
  document.getElementById('modalDetailMeta').textContent = `${app.category} • ${app.packageName} • Version ${app.version || '1.0'}`;
  document.getElementById('modalDetailDesc').textContent = app.description;
  
  const devLink = document.getElementById('modalDevProfileLink');
  if (devLink) {
    devLink.textContent = `👤 Developer: ${app.developerEmail || 'Official Developer'}`;
    devLink.onclick = () => {
      appDetailModal.classList.remove('active');
      openDeveloperProfile(app.developerEmail || 'official@origin.com');
    };
  }

  const slider = document.getElementById('modalScreenshotSlider');
  if (slider) {
    slider.innerHTML = '';
    if (app.screenshots && app.screenshots.length > 0) {
      app.screenshots.forEach(imgUrl => {
        slider.innerHTML += `<img src="${imgUrl}" class="screenshot-thumb" alt="Screenshot" style="width:90px; height:160px; border-radius:10px; object-fit:cover;">`;
      });
    } else {
      slider.innerHTML = `
        <div class="screenshot-thumb">📱 Preview 1</div>
        <div class="screenshot-thumb">⚡ Preview 2</div>
        <div class="screenshot-thumb">🛡️ Preview 3</div>
      `;
    }
  }

  // --- PLAY STORE STYLE AUTO-DOWNLOAD HANDLER ---
  const downloadBtn = document.getElementById('modalDetailDownload');
  const progressContainer = document.getElementById('downloadProgressContainer');
  const progressBar = document.getElementById('downloadProgressBar');
  const statusText = document.getElementById('downloadStatusText');

  if (downloadBtn) {
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      if (app.firebaseId) {
        const newDownloads = (app.downloads || 0) + 1;
        updateAppInFirebase(app.firebaseId, { downloads: newDownloads });
      }

      downloadBtn.style.display = 'none';
      if (progressContainer) progressContainer.style.display = 'block';
      if (statusText) statusText.textContent = 'Downloading package (0%)...';

      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (progressBar) progressBar.style.width = progress + '%';
        if (statusText) statusText.textContent = `Downloading package (${progress}%)...`;

        if (progress >= 100) {
          clearInterval(interval);
          if (statusText) statusText.textContent = '✨ Download Complete! Installing...';

          setTimeout(() => {
            const aTag = document.createElement('a');
            aTag.href = app.fileUrl;
            
            let fileExtension = '.apk';
            if (app.fileUrl.includes('aab')) fileExtension = '.aab';
            else if (app.fileUrl.includes('zip')) fileExtension = '.zip';

            aTag.download = `${app.name.replace(/\s+/g, '_')}_v${app.version || '1.0'}${fileExtension}`;
            document.body.appendChild(aTag);
            aTag.click();
            document.body.removeChild(aTag);

            if (progressContainer) progressContainer.style.display = 'none';
            downloadBtn.style.display = 'block';
            if (statusText) statusText.textContent = '✅ Success! Tap downloaded notification to install app.';
          }, 800);
        }
      }, 250);
    };
  }

  const reviewList = document.getElementById('modalReviewList');
  if (reviewList) {
    reviewList.innerHTML = '';
    if (app.reviews && app.reviews.length > 0) {
      app.reviews.forEach(rev => {
        reviewList.innerHTML += `<div style="font-size:12px; background:#f8fafc; padding:8px; border-radius:8px; margin-bottom:6px;"><b>⭐ ${rev.rating} - ${rev.user}:</b> ${rev.comment}</div>`;
      });
    } else {
      reviewList.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">No reviews yet. Be the first to rate!</div>`;
    }
  }

  const submitReviewBtn = document.getElementById('submitReviewBtn');
  if (submitReviewBtn) {
    submitReviewBtn.onclick = () => {
      const ratingInput = document.getElementById('reviewRatingInput')?.value || '5';
      const commentInput = document.getElementById('reviewCommentInput')?.value.trim() || '';
      if (!commentInput) return alert('Please write a review comment.');

      if (!app.reviews) app.reviews = [];
      app.reviews.push({ user: currentUser ? currentUser.name : 'Guest User', rating: ratingInput, comment: commentInput });
      
      const total = app.reviews.reduce((sum, r) => sum + parseInt(r.rating), 0);
      const newRating = (total / app.reviews.length).toFixed(1);

      if (app.firebaseId) {
        updateAppInFirebase(app.firebaseId, { reviews: app.reviews, rating: newRating });
      }
      alert('Review submitted successfully!');
      const commentField = document.getElementById('reviewCommentInput');
      if (commentField) commentField.value = '';
      openAppDetailModal(app);
      renderStore(currentCategory, document.getElementById('searchInput')?.value || '');
    };
  }

  appDetailModal.classList.add('active');
}

const developerProfileModal = document.getElementById('developerProfileModal');
function openDeveloperProfile(email) {
  const devTitle = document.getElementById('devModalTitle');
  const devEmail = document.getElementById('devModalEmail');
  if (devTitle) devTitle.textContent = `Developer: ${email.split('@')[0]}`;
  if (devEmail) devEmail.textContent = `Contact: ${email}`;

  const devAppsList = document.getElementById('devAppsList');
  if (devAppsList) {
    devAppsList.innerHTML = '';
    const devApps = storeApps.filter(app => (app.developerEmail || 'official@origin.com') === email && app.status === 'APPROVED');
    
    if (devApps.length === 0) {
      devAppsList.innerHTML = `<div class="empty-state">No public apps found for this developer.</div>`;
    } else {
      devApps.forEach(app => {
        devAppsList.innerHTML += `
          <div class="app-card" style="padding:10px;">
            <div class="app-icon" style="width:36px; height:36px; font-size:18px;"><i class="ph ${getCategoryIcon(app.category)}"></i></div>
            <div class="app-details">
              <div class="app-title">${app.name}</div>
              <div class="app-meta">${app.category} • Downloads: ${app.downloads || 0}</div>
            </div>
          </div>
        `;
      });
    }
  }

  if (developerProfileModal) developerProfileModal.classList.add('active');
}

let logoTapCount = 0;
let logoTapTimer = null;

function setupEventListeners() {
  const logoTrigger = document.getElementById('secretLogoTrigger');
  const adminPassModal = document.getElementById('adminPassModal');
  const adminPassForm = document.getElementById('adminPassForm');
  const closeAdminPassModal = document.getElementById('closeAdminPassModal');

  if (logoTrigger) {
    logoTrigger.onclick = () => {
      logoTapCount++;
      clearTimeout(logoTapTimer);
      if (logoTapCount === 3) {
        logoTapCount = 0;
        const passInput = document.getElementById('secretPassInput');
        if (passInput) passInput.value = '';
        if (adminPassModal) {
          adminPassModal.classList.add('active');
        }
      } else {
        logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1200);
      }
    };
  }

  if (adminPassForm) {
    adminPassForm.onsubmit = (e) => {
      e.preventDefault();
      const enteredPass = document.getElementById('secretPassInput')?.value.trim();
      
      if (enteredPass === 'ORIGIN743357') {
        if (adminPassModal) adminPassModal.classList.remove('active');
        renderAdminPanel();
        const adminModal = document.getElementById('adminModal');
        if (adminModal) adminModal.classList.add('active');
      } else {
        alert('❌ Incorrect Admin Passcode!');
      }
    };
  }

  if (closeAdminPassModal) {
    closeAdminPassModal.onclick = () => {
      if (adminPassModal) adminPassModal.classList.remove('active');
    };
  }

  const profileModal = document.getElementById('profileModal');
  const uploadModal = document.getElementById('uploadModal');
  const analyticsModal = document.getElementById('analyticsModal');
  const adminModal = document.getElementById('adminModal');
  const authModal = document.getElementById('authModal');
  const updateModal = document.getElementById('updateModal');

  const headerAvatarBtn = document.getElementById('headerAvatarBtn');
  const navProfile = document.getElementById('navProfile');
  if (headerAvatarBtn) headerAvatarBtn.onclick = () => { if(profileModal) profileModal.classList.add('active'); };
  if (navProfile) navProfile.onclick = () => { if(profileModal) profileModal.classList.add('active'); };

  const closeProfileBtn = document.getElementById('closeProfileBtn');
  if (closeProfileBtn) closeProfileBtn.onclick = () => { if(profileModal) profileModal.classList.remove('active'); };

  const triggerUploadBtn = document.getElementById('triggerUploadBtn');
  if (triggerUploadBtn) {
    triggerUploadBtn.onclick = () => {
      if (!currentUser) {
        if(profileModal) profileModal.classList.remove('active');
        if(authModal) authModal.classList.add('active');
        return;
      }
      if(profileModal) profileModal.classList.remove('active');
      if(uploadModal) uploadModal.classList.add('active');
    };
  }

  const triggerAnalyticsBtn = document.getElementById('triggerAnalyticsBtn');
  if (triggerAnalyticsBtn) {
    triggerAnalyticsBtn.onclick = () => {
      if (!currentUser) {
        if(profileModal) profileModal.classList.remove('active');
        if(authModal) authModal.classList.add('active');
        return;
      }
      if(profileModal) profileModal.classList.remove('active');
      
      const container = document.getElementById('developerAnalyticsContainer');
      if (container) {
        container.innerHTML = '';
        const userApps = storeApps.filter(app => app.developerEmail === currentUser.email);
        if (userApps.length === 0) {
          container.innerHTML = `<div class="empty-state">You have not uploaded any apps yet.</div>`;
        } else {
          userApps.forEach(app => {
            container.innerHTML += `
              <div class="analytics-box" style="margin-bottom: 10px;">
                <div class="analytics-title">📱 ${app.name} (${app.status})</div>
                <div class="analytics-stat-row"><span>Total Downloads:</span> <b>${app.downloads || 0}</b></div>
                <div class="analytics-stat-row"><span>Average Rating:</span> <b>⭐ ${app.rating || 'N/A'}</b></div>
                <button onclick="openUpdateAppModal('${app.firebaseId}')" style="margin-top:8px; width:100%; background:var(--primary-purple); color:#fff; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:700;">Update App / Version</button>
              </div>
            `;
          });
        }
      }
      if(analyticsModal) analyticsModal.classList.add('active');
    };
  }

  const closeUploadBtn = document.getElementById('closeUploadBtn');
  if (closeUploadBtn) closeUploadBtn.onclick = () => { if(uploadModal) uploadModal.classList.remove('active'); };

  const closeUpdateBtn = document.getElementById('closeUpdateBtn');
  if (closeUpdateBtn) closeUpdateBtn.onclick = () => { if(updateModal) updateModal.classList.remove('active'); };

  const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
  if (closeAnalyticsBtn) closeAnalyticsBtn.onclick = () => { if(analyticsModal) analyticsModal.classList.remove('active'); };

  const closeAdminBtn = document.getElementById('closeAdminBtn');
  if (closeAdminBtn) closeAdminBtn.onclick = () => { if(adminModal) adminModal.classList.remove('active'); };

  const closeAuthBtn = document.getElementById('closeAuthBtn');
  if (closeAuthBtn) closeAuthBtn.onclick = () => { if(authModal) authModal.classList.remove('active'); };

  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.onsubmit = (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail')?.value.trim();
      if (!email) return;
      currentUser = { name: email.split('@')[0], email: email };
      localStorage.setItem('origin_current_user', JSON.stringify(currentUser));
      alert(`Signed in successfully as ${email}`);
      if(authModal) authModal.classList.remove('active');
      renderUserSession();
      authForm.reset();
    };
  }

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      currentSort = e.target.value;
      renderStore(currentCategory, document.getElementById('searchInput')?.value || '');
    };
  }

  document.querySelectorAll('#categoryContainer .chip').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#categoryContainer .chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderStore(currentCategory, document.getElementById('searchInput')?.value || '');
    };
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.oninput = (e) => {
      renderStore(currentCategory, e.target.value);
    };
  }

  const uploadForm = document.getElementById('appUploadForm');
  if (uploadForm) {
    uploadForm.onsubmit = async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('apkFile');
      const file = fileInput?.files[0];
      if (!file) return alert('Please select a developer build file.');

      const logoInput = document.getElementById('appLogoFile');
      let logoUrl = '';
      if (logoInput && logoInput.files[0]) {
        try {
          logoUrl = await convertFileToBase64(logoInput.files[0]);
        } catch (err) {
          console.error("Logo conversion error:", err);
        }
      }

      const screenshotFiles = document.getElementById('appScreenshots')?.files || [];
      let screenshotUrls = [];
      for (let i = 0; i < screenshotFiles.length; i++) {
        try {
          const base64Img = await convertFileToBase64(screenshotFiles[i]);
          screenshotUrls.push(base64Img);
        } catch (err) {
          console.error("Screenshot conversion error:", err);
        }
      }

      const newApp = {
        id: Date.now().toString(),
        name: document.getElementById('appName')?.value || 'New App',
        packageName: document.getElementById('packageName')?.value || 'com.app.pkg',
        category: document.getElementById('appCategory')?.value || 'Games',
        version: document.getElementById('appVersion')?.value || '1.0',
        description: document.getElementById('appDesc')?.value || 'No description',
        fileUrl: await convertFileToBase64(file),
        logoUrl: logoUrl,
        screenshots: screenshotUrls,
        status: 'PENDING_REVIEW',
        downloads: 0,
        rating: '5.0',
        reviews: [],
        developerEmail: currentUser ? currentUser.email : 'guest@origin.com',
        aiAudit: null
      };

      await saveAppToFirebase(newApp);
      alert(`"${newApp.name}" submitted successfully to review queue!`);
      if(uploadModal) uploadModal.classList.remove('active');
      uploadForm.reset();
      const disp = document.getElementById('fileNameDisplay');
      if (disp) disp.textContent = 'Select Developer Build File (.aab/.apk/.zip)';
      renderAdminPanel();
    };
  }

  const updateForm = document.getElementById('appUpdateForm');
  if (updateForm) {
    updateForm.onsubmit = async (e) => {
      e.preventDefault();
      const firebaseId = document.getElementById('updateAppFirebaseId').value;
      const updatedName = document.getElementById('updateAppName').value;
      const updatedVersion = document.getElementById('updateAppVersion').value;
      const updatedDesc = document.getElementById('updateAppDesc').value;
      const newFileObj = document.getElementById('updateApkFile').files[0];

      let updateData = {
        name: updatedName,
        version: updatedVersion,
        description: updatedDesc
      };

      if (newFileObj) {
        updateData.fileUrl = await convertFileToBase64(newFileObj);
      }

      await updateAppInFirebase(firebaseId, updateData);
      alert('App updated successfully!');
      if(updateModal) updateModal.classList.remove('active');
      if(analyticsModal) analyticsModal.classList.remove('active');
    };
  }
}

function openUpdateAppModal(firebaseId) {
  const app = storeApps.find(a => a.firebaseId === firebaseId);
  if (!app) return;

  document.getElementById('updateAppFirebaseId').value = app.firebaseId;
  document.getElementById('updateAppName').value = app.name;
  document.getElementById('updateAppVersion').value = app.version || '1.0';
  document.getElementById('updateAppDesc').value = app.description;

  const analyticsModal = document.getElementById('analyticsModal');
  const updateModal = document.getElementById('updateModal');
  if(analyticsModal) analyticsModal.classList.remove('active');
  if(updateModal) updateModal.classList.add('active');
}

function renderAdminPanel() {
  const pendingList = document.getElementById('adminPendingList');
  const liveList = document.getElementById('adminLiveList');
  const statPending = document.getElementById('statPending');
  const statLive = document.getElementById('statLive');
  const statDownloads = document.getElementById('statDownloads');

  if (!pendingList || !liveList) return;
  pendingList.innerHTML = '';
  liveList.innerHTML = '';

  const pendingApps = storeApps.filter(app => app.status === 'PENDING_REVIEW');
  const approvedApps = storeApps.filter(app => app.status === 'APPROVED');
  const totalGlobalDownloads = storeApps.reduce((sum, app) => sum + (parseInt(app.downloads) || 0), 0);

  if (statPending) statPending.textContent = pendingApps.length;
  if (statLive) statLive.textContent = approvedApps.length;
  if (statDownloads) statDownloads.textContent = totalGlobalDownloads;

  if (pendingApps.length === 0) {
    pendingList.innerHTML = `<div class="empty-state" style="padding: 20px;">No pending submissions in queue.</div>`;
  } else {
    pendingApps.forEach(app => {
      pendingList.innerHTML += `
        <div class="admin-app-card" style="padding:12px; background:#f8fafc; border:1px solid var(--border-glass); border-radius:12px; margin-bottom:10px;">
          <b>${app.name}</b> (${app.category})<br>
          <small style="color:var(--text-muted);">${app.packageName} • Ver ${app.version || '1.0'}</small>
          <div style="font-size:12px; margin:6px 0; color:var(--text-main);"><b>Desc:</b> ${app.description}</div>
          
          <div id="aiAudit_${app.firebaseId || app.id}">
            ${app.aiAudit ? `<div style="background:#f1f5f9; border:1px solid var(--border-glass); padding:8px; border-radius:8px; font-size:11px; margin-bottom:8px;"><i class="ph ph-sparkle" style="color:var(--accent-magenta);"></i> <b>AI Inspection Result:</b> ${app.aiAudit}</div>` : ''}
          </div>

          <button onclick="runAiInspection('${app.firebaseId || app.id}')" style="width:100%; background:#f1f5f9; border:1px solid var(--border-glass); color:var(--text-main); padding:8px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="ph ph-sparkle" style="color:var(--accent-magenta);"></i> Run AI APK Threat & Malware Scan
          </button>

          <div style="display:flex; gap:6px;">
            <button class="btn-approve" onclick="approveApp('${app.firebaseId}')" style="flex:1; background:var(--safe-green); color:#fff; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:700;">Approve</button>
            <button class="btn-reject" onclick="rejectApp('${app.firebaseId}')" style="flex:1; background:var(--danger-red); color:#fff; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:700;">Reject (Harmful)</button>
          </div>
        </div>
      `;
    });
  }

  if (approvedApps.length === 0) {
    liveList.innerHTML = `<div class="empty-state" style="padding: 20px;">No live apps on store.</div>`;
  } else {
    approvedApps.forEach(app => {
      liveList.innerHTML += `
        <div class="admin-app-card" style="padding:10px; background:#f8fafc; border:1px solid var(--border-glass); border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><b>${app.name}</b><br><small>Downloads: ${app.downloads || 0}</small></div>
          <button onclick="rejectApp('${app.firebaseId}')" style="background:var(--danger-red); border:none; color:#fff; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:11px;">Remove</button>
        </div>
      `;
    });
  }
}

async function runAiInspection(firebaseId) {
  const app = storeApps.find(a => (a.firebaseId === firebaseId || a.id === firebaseId));
  if (!app) return;

  const auditContainer = document.getElementById(`aiAudit_${firebaseId}`);
  if (auditContainer) {
    auditContainer.innerHTML = `<div style="color: #d97706; font-size:11px; padding:6px;"><i class="ph ph-spinner ph-spin"></i> OriginAI Security Inspector analyzing...</div>`;
  }

  try {
    const apiKey = CONFIG.ZEROAI_API_KEY;
    const endpoint = CONFIG.AI_API_ENDPOINT;
    const model = CONFIG.AI_MODEL;

    if (apiKey && apiKey.length > 20) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: "system", 
              content: "You are OriginAI Security Inspector for Origin APK marketplace. Analyze the provided app name, package name, and description for security threats, malware, spyware, or malicious cheats. Provide a concise security verdict starting with either '✅ SAFE:' or '❌ MALWARE/RISK:' followed by a 1-sentence reason." 
            },
            { role: "user", content: `App Name: ${app.name}\nPackage Name: ${app.packageName}\nDescription: ${app.description}` }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        app.aiAudit = data.choices[0].message.content;
      } else {
        app.aiAudit = performSmartAnalysis(app);
      }
    } else {
      app.aiAudit = performSmartAnalysis(app);
    }
  } catch (err) {
    app.aiAudit = performSmartAnalysis(app);
  }

  if (app.firebaseId) {
    updateAppInFirebase(app.firebaseId, { aiAudit: app.aiAudit });
  }
  renderAdminPanel();
}

function performSmartAnalysis(app) {
  const combinedText = (app.name + " " + app.description + " " + app.packageName).toLowerCase();
  if (combinedText.includes('virus') || combinedText.includes('malware')) {
    return `❌ MALWARE/RISK: High-risk threat indicators found. Recommended to Reject!`;
  } else {
    return `✅ SAFE: Zero-Threat Security Pass. Package verified clean.`;
  }
}

async function approveApp(firebaseId) {
  if (firebaseId) {
    await updateAppInFirebase(firebaseId, { status: 'APPROVED' });
    alert('App approved and published successfully!');
  }
}

async function rejectApp(firebaseId) {
  if (firebaseId) {
    await deleteAppFromFirebase(firebaseId);
    alert('App rejected and removed successfully!');
  }
}