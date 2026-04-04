// ============================================================
//  LibraVault – Library Management System JavaScript
// ============================================================

// Temporary script to clear login/signup history for the user
if (!localStorage.getItem('lv_clear_hist_1')) {
  localStorage.removeItem('lv_users');
  localStorage.removeItem('lv_auth');
  localStorage.setItem('lv_clear_hist_1', 'true');
}

// ---- State ----
let auth = JSON.parse(localStorage.getItem('lv_auth')) || { loggedIn: false };
let users = JSON.parse(localStorage.getItem('lv_users')) || [];

let books = JSON.parse(localStorage.getItem('lv_books')) || [];
let members = JSON.parse(localStorage.getItem('lv_members')) || [];
let borrows = JSON.parse(localStorage.getItem('lv_borrows')) || [];
let activity = JSON.parse(localStorage.getItem('lv_activity')) || [];
let returnHistory = JSON.parse(localStorage.getItem('lv_returns')) || [];

let currentPage = 'dashboard';
let confirmCallback = null;
let editBookId = null;
let editMemberId = null;

// ---- Authentication Logic ----
const ADMIN_UID = "admin@libravault.com";
const ADMIN_PHONE = "9876543210";
const ADMIN_PASS = "admin123";
const FACULTY_PASS = "staff123";

function checkAuth() {
  const view = document.getElementById('loginView');
  if (!auth.loggedIn) {
    view.classList.add('active');
    if (typeof resetLoginView === 'function') resetLoginView();
  } else {
    view.classList.remove('active');
    // Set Dashboard Greeting
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
      if (auth.isNew) {
        welcomeName.textContent = `Welcome, ${auth.user}! 👋`;
      } else {
        welcomeName.textContent = `Welcome back, ${auth.user}! 👋`;
      }
    }

    // Set Sidebar User Info
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (avatarEl) {
      avatarEl.textContent = auth.user ? auth.user.charAt(0).toUpperCase() : 'U';
      if (typeof memberColor === 'function') {
        avatarEl.style.background = memberColor(auth.user || 'Unknown');
      }
    }
    
    const nameEl = document.getElementById('sidebarUserName');
    if (nameEl) nameEl.textContent = auth.user;
    
    const roleEl = document.getElementById('sidebarUserRole');
    if (roleEl) roleEl.textContent = auth.role || 'User';

    const isPrivileged = (auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff');
    const navMembers = document.getElementById('nav-members');
    if (navMembers) navMembers.style.display = isPrivileged ? 'flex' : 'none';
    
    const statMembers = document.getElementById('stat-members');
    if (statMembers) statMembers.style.display = isPrivileged ? 'flex' : 'none';

    // Dashboard grid visibility is handled by CSS classes and role-based display properties.

    // Show/hide Recent Activity card based on role
    const recentActivity = document.getElementById('recentActivityCard');
    if (recentActivity) recentActivity.style.display = isPrivileged ? '' : 'none';
  }
}

// Role Selection Logic
let selectedRole = null;

function resetLoginView() {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('roleSelection').classList.remove('hidden');
  document.getElementById('roleSelection').classList.remove('active-mode');
  document.getElementById('authContainer').classList.add('hidden');
  document.getElementById('authTitle').textContent = "Welcome to LibraVault";
  document.getElementById('authSubtitle').textContent = "Select your role to continue";
  
  // Reset tabs to Login
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  const loginTab = document.querySelector('.auth-tab[data-target="loginForm"]');
  if (loginTab) loginTab.classList.add('active');
  document.querySelectorAll('.login-form').forEach(f => f.classList.add('hidden'));
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.classList.remove('hidden');
}

document.getElementById('btnStudentRole').addEventListener('click', function() {
  selectRole('Student', this);
});
document.getElementById('btnFacultyRole').addEventListener('click', function() {
  selectRole('Faculty', this);
});
document.getElementById('backToRoles').addEventListener('click', resetLoginView);

function updateFacultyAuthVisibility() {
  const authGroup = document.getElementById('facultyAuthGroup');
  if (authGroup) {
    const activeTab = document.querySelector('.auth-tab.active');
    if (selectedRole === 'Faculty' && activeTab && activeTab.dataset.target === 'signupForm') {
      authGroup.style.display = 'flex';
    } else {
      authGroup.style.display = 'none';
    }
  }
}

function selectRole(role, btnElement) {
  selectedRole = role;
  
  // Remove active state from all role buttons
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  
  if (btnElement) {
    btnElement.classList.add('active');
  }

  // Instead of hiding the role selection, we shrink it and show auth below it
  document.getElementById('roleSelection').classList.add('active-mode');
  document.getElementById('authContainer').classList.remove('hidden');
  
  // Hide the back to roles button since they can just click the other role tab now
  document.getElementById('backToRoles').style.display = 'none';
  
  document.getElementById('authSubtitle').textContent = "Enter details to continue";

  // Retain appropriate title based on active tab
  const activeTab = document.querySelector('.auth-tab.active');
  if (activeTab && activeTab.dataset.target === 'signupForm') {
    document.getElementById('authTitle').textContent = `Create ${selectedRole} Account`;
  } else {
    document.getElementById('authTitle').textContent = `Welcome ${selectedRole}`;
  }
  updateFacultyAuthVisibility();
}

// Auth Tabs Logic
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    
    document.querySelectorAll('.login-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(e.target.dataset.target).classList.remove('hidden');

    // Update headers
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    if (e.target.dataset.target === 'signupForm') {
      title.textContent = `Create ${selectedRole || ''} Account`;
      subtitle.textContent = "Fill in your details to get started.";
    } else {
      title.textContent = `Welcome ${selectedRole || ''}`;
      subtitle.textContent = "Login to your account";
    }
    updateFacultyAuthVisibility();
  });
});

function validateEmail(email) {
  return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
}

function validatePhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

// Login
document.getElementById('performLogin').addEventListener('click', login);
document.getElementById('loginPass').addEventListener('keypress', (e) => { if(e.key === 'Enter') login(); });

function login() {
  const id = document.getElementById('loginId').value.trim();
  const pass = document.getElementById('loginPass').value;
  const idError = document.getElementById('loginIdError');
  const idInput = document.getElementById('loginId');
  
  idError.textContent = "";
  idInput.classList.remove('invalid');

  if (!id || !pass) {
    toast("Please enter both ID and Password", "error");
    return;
  }

  const isEmail = validateEmail(id);
  const isPhone = validatePhone(id);

  if (!isEmail && !isPhone) {
    idError.textContent = "Please enter a valid email or 10-digit phone number";
    idInput.classList.add('invalid');
    return;
  }

  // Check Admin
  if ((id === ADMIN_UID || id === ADMIN_PHONE) && pass === ADMIN_PASS) {
    authenticate("Administrator", "Admin", false, id);
    return;
  }

  // Check Local Users
  const user = users.find(u => u.id === id && u.pass === pass);
  if (user) {
    authenticate(user.name, user.role, false, user.id);
    return;
  }

  toast("Invalid credentials", "error");
}

function authenticate(name, role, isNew = false, loginId = null) {
  auth = { loggedIn: true, user: name, role: role || selectedRole || 'Student', isNew: isNew, loginId: loginId || (auth ? auth.loginId : null) };
  localStorage.setItem('lv_auth', JSON.stringify(auth));
  if (isNew) {
    toast(`Welcome, ${name}!`, "success");
  } else {
    toast(`Welcome back, ${name}!`, "success");
  }
  
  ['loginId', 'loginPass', 'signupName', 'signupId', 'signupPass', 'signupConfirmPass'].forEach(id => {
    document.getElementById(id).value = '';
  });

  checkAuth();
  init();
}

// Sign Up
document.getElementById('performSignup').addEventListener('click', signup);

function signup() {
  const name = document.getElementById('signupName').value.trim();
  const id = document.getElementById('signupId').value.trim();
  const pass = document.getElementById('signupPass').value;
  const confirmPass = document.getElementById('signupConfirmPass').value;
  
  const idError = document.getElementById('signupIdError');
  const passError = document.getElementById('signupPassError');
  const idInput = document.getElementById('signupId');

  idError.textContent = "";
  passError.textContent = "";
  idInput.classList.remove('invalid');

  if (!name || !id || !pass || !confirmPass) {
    toast("Please fill in all fields", "error");
    return;
  }

  const isEmail = validateEmail(id);
  const isPhone = validatePhone(id);

  if (!isEmail && !isPhone) {
    idError.textContent = "Please enter a valid email or 10-digit phone number";
    idInput.classList.add('invalid');
    return;
  }

  if (pass !== confirmPass) {
    passError.textContent = "Passwords do not match";
    return;
  }

  if (pass.length < 6) {
    passError.textContent = "Password must be at least 6 characters";
    return;
  }

  if (selectedRole === 'Faculty') {
    const authCode = document.getElementById('signupFacultyAuth').value;
    const authError = document.getElementById('facultyAuthError');
    if (authError) authError.textContent = "";
    if (authCode !== FACULTY_PASS && authCode !== ADMIN_PASS) {
      if (authError) authError.textContent = "Invalid Faculty passcode";
      toast("Invalid Faculty Authorization Code", "error");
      return;
    }
  }

  // Check if already exists (case-insensitive)
  if (id.toLowerCase() === ADMIN_UID.toLowerCase() || id === ADMIN_PHONE || users.some(u => u.id.toLowerCase() === id.toLowerCase())) {
    idError.textContent = "This email or phone number is already registered";
    idInput.classList.add('invalid');
    return;
  }

  // Save new user
  users.push({ id, name, pass, role: selectedRole || 'Student' });
  localStorage.setItem('lv_users', JSON.stringify(users));

  // Auto-add to member list
  if (!members.find(m => (m.email && m.email.toLowerCase() === id.toLowerCase()) || (m.phone && m.phone === id))) {
    const member = {
      id: memberUid(), 
      name: name, 
      email: isEmail ? id : '',
      phone: isPhone ? id : '',
      type: selectedRole || 'Student',
      address: '',
      status: 'active',
      joinedOn: today()
    };
    members.push(member);
    save();
    logActivity('add-member', `New member auto-registered: ${name}`);
  }
  
  toast("Account created successfully!", "success");
  authenticate(name, selectedRole || 'Student', true, id);
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  confirm("Logout", "Are you sure you want to log out?", () => {
    auth = { loggedIn: false };
    localStorage.removeItem('lv_auth');
    checkAuth();
  });
});

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
  input.setAttribute('type', type);
  btn.textContent = type === 'password' ? '👁️' : '🙈';
}

// ---- Forgot Password ----
let forgotTargetUser = null; // the user object whose password we're resetting

function showForgotPanel() {
  // Hide all login-forms
  document.querySelectorAll('.login-form').forEach(f => f.classList.add('hidden'));
  document.getElementById('forgotPanel').classList.remove('hidden');

  // Reset both steps
  document.getElementById('forgotStep1').classList.remove('hidden');
  document.getElementById('forgotStep2').classList.add('hidden');
  document.getElementById('forgotId').value = '';
  document.getElementById('forgotIdError').textContent = '';
  document.getElementById('forgotNewPass').value = '';
  document.getElementById('forgotConfirmPass').value = '';
  document.getElementById('forgotPassError').textContent = '';
  document.getElementById('forgotFoundBadge').innerHTML = '';
  forgotTargetUser = null;

  // Update header text
  document.getElementById('authTitle').textContent = 'Forgot Password';
  document.getElementById('authSubtitle').textContent = 'We\'ll help you reset it';

  // Hide auth tabs while in forgot mode
  document.querySelector('.auth-tabs').style.display = 'none';
}

function hideForgotPanel() {
  document.querySelectorAll('.login-form').forEach(f => f.classList.add('hidden'));
  document.getElementById('loginForm').classList.remove('hidden');
  document.querySelector('.auth-tabs').style.display = 'flex';

  // Restore header
  if (selectedRole) {
    document.getElementById('authTitle').textContent = `Welcome ${selectedRole}`;
  } else {
    document.getElementById('authTitle').textContent = 'Welcome to LibraVault';
  }
  document.getElementById('authSubtitle').textContent = 'Login to your account';
  forgotTargetUser = null;
}

document.getElementById('forgotPasswordLink').addEventListener('click', showForgotPanel);
document.getElementById('backToLoginFromForgot').addEventListener('click', hideForgotPanel);

document.getElementById('forgotFindBtn').addEventListener('click', () => {
  const id = document.getElementById('forgotId').value.trim();
  const idError = document.getElementById('forgotIdError');
  idError.textContent = '';

  if (!id) {
    idError.textContent = 'Please enter your email or phone number';
    return;
  }

  const isEmail = validateEmail(id);
  const isPhone = validatePhone(id);

  if (!isEmail && !isPhone) {
    idError.textContent = 'Please enter a valid email or 10-digit phone number';
    return;
  }

  // Check if admin
  if (id === ADMIN_UID || id === ADMIN_PHONE) {
    idError.textContent = 'Admin account password cannot be reset this way.';
    return;
  }

  // Find user
  const user = users.find(u => u.id.toLowerCase() === id.toLowerCase());
  if (!user) {
    idError.textContent = 'No account found with this email or phone number.';
    return;
  }

  // Found!
  forgotTargetUser = user;
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0, 2);
  document.getElementById('forgotFoundBadge').innerHTML = `
    <div class="forgot-found-card">
      <div class="forgot-found-avatar" style="background: ${typeof memberColor === 'function' ? memberColor(user.name) : '#7c6af7'}">${initials}</div>
      <div class="forgot-found-info">
        <span class="forgot-found-name">${user.name}</span>
        <span class="forgot-found-role">${user.role || 'Student'}</span>
      </div>
      <span class="forgot-found-tick">✅</span>
    </div>
  `;

  // Show step 2
  document.getElementById('forgotStep1').classList.add('hidden');
  document.getElementById('forgotStep2').classList.remove('hidden');
});

document.getElementById('forgotResetBtn').addEventListener('click', () => {
  if (!forgotTargetUser) return;

  const newPass = document.getElementById('forgotNewPass').value;
  const confirmPass = document.getElementById('forgotConfirmPass').value;
  const passError = document.getElementById('forgotPassError');
  passError.textContent = '';

  if (!newPass || !confirmPass) {
    passError.textContent = 'Please fill in both password fields';
    return;
  }
  if (newPass.length < 6) {
    passError.textContent = 'Password must be at least 6 characters';
    return;
  }
  if (newPass !== confirmPass) {
    passError.textContent = 'Passwords do not match';
    return;
  }

  // Update password in users array
  const idx = users.findIndex(u => u.id === forgotTargetUser.id);
  if (idx !== -1) {
    users[idx].pass = newPass;
    localStorage.setItem('lv_users', JSON.stringify(users));
    toast(`Password reset successfully for ${forgotTargetUser.name}!`, 'success');
    forgotTargetUser = null;
    hideForgotPanel();
  } else {
    passError.textContent = 'Something went wrong. Please try again.';
  }
});

// ---- Helpers ----
const uid = () => '_' + Math.random().toString(36).substr(2, 9);
const memberUid = () => 'LVM-' + Math.random().toString(36).substr(2, 8).toUpperCase();
const today = () => new Date().toISOString().split('T')[0];
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const daysDiff = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

function save() {
  localStorage.setItem('lv_books', JSON.stringify(books));
  localStorage.setItem('lv_members', JSON.stringify(members));
  localStorage.setItem('lv_borrows', JSON.stringify(borrows));
  localStorage.setItem('lv_activity', JSON.stringify(activity));
  localStorage.setItem('lv_returns', JSON.stringify(returnHistory));
}

// ---- Color palettes ----
const coverGradients = [
  ['#6366f1','#8b5cf6'], ['#10b981','#059669'], ['#f59e0b','#d97706'],
  ['#ec4899','#db2777'], ['#3b82f6','#2563eb'], ['#ef4444','#dc2626'],
  ['#8b5cf6','#6d28d9'], ['#06b6d4','#0891b2'], ['#f97316','#ea580c'],
  ['#84cc16','#65a30d']
];
const memberColors = [
  '#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444','#8b5cf6','#06b6d4'
];

function bookCoverGradient(title) {
  const idx = title.charCodeAt(0) % coverGradients.length;
  return `linear-gradient(135deg, ${coverGradients[idx][0]}, ${coverGradients[idx][1]})`;
}
function memberColor(name) {
  const idx = name.charCodeAt(0) % memberColors.length;
  return memberColors[idx];
}

// ---- Toast Notification ----
function toast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ---- Confirm Dialog ----
function confirm(title, message, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmDialog').classList.remove('hidden');
  confirmCallback = cb;
}
document.getElementById('confirmOk').addEventListener('click', () => {
  document.getElementById('confirmDialog').classList.add('hidden');
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});
document.getElementById('confirmCancel').addEventListener('click', () => {
  document.getElementById('confirmDialog').classList.add('hidden');
  confirmCallback = null;
});

// ---- Navigation ----
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${page}`).classList.add('active');
  const titles = {
    dashboard: 'Dashboard', books: 'Book Catalog', members: 'Members',
    borrow: 'Borrowing', returns: 'Returns', reports: 'Reports'
  };
  document.getElementById('pageTitle').textContent = titles[page] || '';
  closeSidebar();
  renderPage(page);
}

document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(n.dataset.page);
  });
});

// ---- Sidebar Mobile ----
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('overlay').addEventListener('click', closeSidebar);

// ---- Modal Helpers ----
function openModal(id) {
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.getElementById(id).classList.add('hidden');
}
document.getElementById('modalBackdrop').addEventListener('click', () => {
  ['addBookModal','editBookModal','addMemberModal','editMemberModal'].forEach(closeModal);
});

// ---- Log Activity ----
function logActivity(type, message) {
  activity.unshift({ type, message, time: new Date().toISOString() });
  if (activity.length > 50) activity.pop();
  save();
  updateNotifBadge();
}

function updateNotifBadge() {
  const overdueCount = borrows.filter(b => b.status === 'active' && b.dueDate < today()).length;
  const badge = document.getElementById('notifBadge');
  badge.textContent = overdueCount;
  badge.style.display = overdueCount > 0 ? 'flex' : 'none';
}

// ---- Render Page ----
function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  else if (page === 'books') renderBooks();
  else if (page === 'members') renderMembers();
  else if (page === 'borrow') renderBorrow();
  else if (page === 'returns') renderReturns();
  else if (page === 'reports') renderReports();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const availableBooks = books.reduce((acc, b) => {
    const borrowed = borrows.filter(r => r.bookId === b.id && r.status === 'active').length;
    return acc + (b.copies - borrowed);
  }, 0);
  const activeBorrows = borrows.filter(b => b.status === 'active').length;
  const overdue = borrows.filter(b => b.status === 'active' && b.dueDate < today());

  document.getElementById('statTotalBooks').textContent = books.length;
  document.getElementById('statAvailable').textContent = availableBooks;
  document.getElementById('statBorrowed').textContent = activeBorrows;
  document.getElementById('statMembers').textContent = members.length;
  document.getElementById('statOverdue').textContent = overdue.length;

  // Activity list
  const actList = document.getElementById('activityList');
  document.getElementById('activityCount').textContent = `${activity.length} entries`;
  if (activity.length === 0) {
    actList.innerHTML = `<div class="empty-state"><span>📋</span><p>No recent activity yet.</p></div>`;
  } else {
    actList.innerHTML = activity.slice(0, 15).map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <span>${a.message}</span>
        <span class="activity-time">${timeAgo(a.time)}</span>
      </div>
    `).join('');
  }

  // Overdue list
  const oList = document.getElementById('overdueList');
  document.getElementById('overdueCount').textContent = overdue.length;
  if (overdue.length === 0) {
    oList.innerHTML = `<div class="empty-state"><span>🎉</span><p>No overdue books!</p></div>`;
  } else {
    oList.innerHTML = overdue.map(b => {
      const book = books.find(bk => bk.id === b.bookId);
      const member = members.find(m => m.id === b.memberId);
      const days = daysDiff(b.dueDate, today());
      return `
        <div class="overdue-item">
          <div>
            <div class="book-name">${book ? book.title : 'Unknown Book'}</div>
            <div class="member-name">${member ? member.name : 'Unknown Member'}</div>
          </div>
          <div class="overdue-days">${days}d overdue</div>
        </div>
      `;
    }).join('');
  }

  // Genre distribution
  const genreCounts = {};
  books.forEach(b => { genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1; });
  const max = Math.max(...Object.values(genreCounts), 1);
  const genreBars = document.getElementById('genreBars');
  if (Object.keys(genreCounts).length === 0) {
    genreBars.innerHTML = `<div class="empty-state"><span>📊</span><p>Add books to see genre distribution.</p></div>`;
  } else {
    genreBars.innerHTML = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => `
        <div class="genre-bar-item">
          <div class="genre-bar-label">${genre}</div>
          <div class="genre-bar-track">
            <div class="genre-bar-fill" style="width: ${(count/max)*100}%"></div>
          </div>
          <div class="genre-bar-count">${count}</div>
        </div>
      `).join('');
  }

  updateNotifBadge();
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ============================================================
// BOOKS
// ============================================================
function renderBooks() {
  const addBookBtn = document.getElementById('addBookBtn');
  if (addBookBtn) {
    addBookBtn.style.display = (auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff') ? 'inline-block' : 'none';
  }

  const q = document.getElementById('bookSearch').value.toLowerCase();
  const genre = document.getElementById('genreFilter').value;
  const status = document.getElementById('statusFilter').value;

  let filtered = books.filter(b => {
    const match = (b.title + b.author + (b.isbn||'')).toLowerCase().includes(q);
    const gMatch = !genre || b.genre === genre;
    const borrowed = borrows.filter(r => r.bookId === b.id && r.status === 'active').length;
    const available = b.copies - borrowed;
    const sMatch = !status
      || (status === 'available' && available > 0)
      || (status === 'borrowed' && available === 0);
    return match && gMatch && sMatch;
  });

  const grid = document.getElementById('booksGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state full-width"><span>📚</span><p>${books.length === 0 ? 'No books in the catalog yet. Add your first book!' : 'No books match your filter.'}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(b => {
    const borrowed = borrows.filter(r => r.bookId === b.id && r.status === 'active').length;
    const available = b.copies - borrowed;
    const statusClass = available === 0 ? 'unavailable' : 'available';
    const statusLabel = available === 0 ? 'Unavailable' : 'Available';
    return `
      <div class="book-card">
        <div class="book-cover" style="background: ${bookCoverGradient(b.title)}">
          ${b.title.charAt(0).toUpperCase()}
        </div>
        <div class="book-title">${b.title}</div>
        <div class="book-author">by ${b.author}</div>
        <div class="book-meta">
          <span class="book-genre">${b.genre}</span>
          <span class="book-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="book-copies">${available} / ${b.copies} copies available${b.year ? ' · ' + b.year : ''}</div>
        ${(auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff') ? `
        <div class="book-actions">
          <button class="btn-edit-book" onclick="openEditBook('${b.id}')">✏️ Edit</button>
          <button class="btn-delete-book" onclick="deleteBook('${b.id}')">🗑️ Delete</button>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

['bookSearch','genreFilter','statusFilter'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderBooks);
});

// Add Book
document.getElementById('addBookBtn').addEventListener('click', () => {
  ['bookTitle','bookAuthor','bookISBN','bookYear'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('bookGenre').value = '';
  document.getElementById('bookCopies').value = '1';
  openModal('addBookModal');
});
document.getElementById('closeAddBookModal').addEventListener('click', () => closeModal('addBookModal'));
document.getElementById('cancelAddBook').addEventListener('click', () => closeModal('addBookModal'));

document.getElementById('saveBook').addEventListener('click', () => {
  const title = document.getElementById('bookTitle').value.trim();
  const author = document.getElementById('bookAuthor').value.trim();
  const genre = document.getElementById('bookGenre').value;
  const copies = parseInt(document.getElementById('bookCopies').value) || 1;
  if (!title || !author || !genre) { toast('Please fill in required fields (Title, Author, Genre)', 'error'); return; }
  const book = {
    id: uid(), title, author,
    isbn: document.getElementById('bookISBN').value.trim(),
    genre,
    year: document.getElementById('bookYear').value,
    copies,
    addedOn: today()
  };
  books.push(book);
  save();
  logActivity('add-book', `Book added: "${title}"`);
  closeModal('addBookModal');
  toast(`"${title}" added to catalog!`, 'success');
  renderBooks();
  if (currentPage === 'dashboard') renderDashboard();
});

// Edit Book
function openEditBook(id) {
  const b = books.find(bk => bk.id === id);
  if (!b) return;
  editBookId = id;
  document.getElementById('editBookId').value = id;
  document.getElementById('editBookTitle').value = b.title;
  document.getElementById('editBookAuthor').value = b.author;
  document.getElementById('editBookISBN').value = b.isbn || '';
  document.getElementById('editBookGenre').value = b.genre;
  document.getElementById('editBookYear').value = b.year || '';
  document.getElementById('editBookCopies').value = b.copies;
  openModal('editBookModal');
}
document.getElementById('closeEditBookModal').addEventListener('click', () => closeModal('editBookModal'));
document.getElementById('cancelEditBook').addEventListener('click', () => closeModal('editBookModal'));

document.getElementById('updateBook').addEventListener('click', () => {
  const title = document.getElementById('editBookTitle').value.trim();
  const author = document.getElementById('editBookAuthor').value.trim();
  const genre = document.getElementById('editBookGenre').value;
  const copies = parseInt(document.getElementById('editBookCopies').value) || 1;
  if (!title || !author || !genre) { toast('Please fill in required fields', 'error'); return; }
  const idx = books.findIndex(b => b.id === editBookId);
  if (idx === -1) return;
  books[idx] = {
    ...books[idx], title, author,
    isbn: document.getElementById('editBookISBN').value.trim(),
    genre, year: document.getElementById('editBookYear').value,
    copies
  };
  save();
  logActivity('add-book', `Book updated: "${title}"`);
  closeModal('editBookModal');
  toast(`"${title}" updated!`, 'success');
  renderBooks();
  if (currentPage === 'dashboard') renderDashboard();
});

// Delete Book
function deleteBook(id) {
  const b = books.find(bk => bk.id === id);
  if (!b) return;
  const activeBorrow = borrows.find(r => r.bookId === id && r.status === 'active');
  if (activeBorrow) { toast('Cannot delete — book is currently borrowed!', 'error'); return; }
  confirm('Delete Book', `Are you sure you want to delete "${b.title}"? This cannot be undone.`, () => {
    books = books.filter(bk => bk.id !== id);
    save();
    logActivity('add-book', `Book deleted: "${b.title}"`);
    toast(`"${b.title}" removed from catalog.`, 'warning');
    renderBooks();
    if (currentPage === 'dashboard') renderDashboard();
  });
}

// ============================================================
// MEMBERS
// ============================================================
function renderMembers() {
  const addMemberBtn = document.getElementById('addMemberBtn');
  if (addMemberBtn) {
    addMemberBtn.style.display = (auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff') ? 'inline-block' : 'none';
  }

  const q = document.getElementById('memberSearch').value.toLowerCase();
  const typeFilter = document.getElementById('memberTypeFilter').value;

  let filtered = members.filter(m => {
    const match = (m.name + m.email + m.id).toLowerCase().includes(q);
    const tMatch = !typeFilter || (typeFilter === 'Student' ? m.type === 'Student' : m.type !== 'Student');
    return match && tMatch;
  });

  const grid = document.getElementById('membersGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state full-width"><span>👥</span><p>${members.length === 0 ? 'No members registered yet. Add your first member!' : 'No members match your filter.'}</p></div>`;
    return;
  }

  const buildCards = (list) => {
    return list.map(m => {
      const borrowCount = borrows.filter(b => b.memberId === m.id).length;
      const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0, 2);
      return `
        <div class="member-card">
          <div class="member-top">
            <div class="member-avatar-lg" style="background: ${memberColor(m.name)}">${initials}</div>
            <div class="member-name-block">
              <div class="name">${m.name}</div>
              <div class="member-id">ID: ${m.id}</div>
            </div>
            <span class="member-type-badge">${m.type}</span>
          </div>
          <div class="member-info">
            <div class="member-info-row"><span>📧</span><span>${m.email}</span></div>
            ${m.phone ? `<div class="member-info-row"><span>📞</span><span>${m.phone}</span></div>` : ''}
            ${m.address ? `<div class="member-info-row"><span>📍</span><span>${m.address}</span></div>` : ''}
            <div class="member-info-row"><span>📅</span><span>Joined ${fmt(m.joinedOn)}</span></div>
          </div>
          <div class="member-footer">
            <span class="member-status ${m.status}">${m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>
            <span class="member-borrow-count">${borrowCount} borrow${borrowCount !== 1 ? 's' : ''}</span>
            ${(auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff') ? `
            <div class="member-actions">
              <button class="btn-edit-member" onclick="openEditMember('${m.id}')">✏️</button>
              <button class="btn-delete-member" onclick="deleteMember('${m.id}')">🗑️</button>
            </div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  const students = filtered.filter(m => m.type === 'Student');
  const facultyStaff = filtered.filter(m => m.type !== 'Student');

  let html = '';

  if (students.length > 0) {
    html += `
      <div style="grid-column: 1 / -1; flex: 1 1 100%; width: 100%; padding-bottom: 0.5rem; margin-top: 0.5rem; border-bottom: 1px solid var(--border);">
        <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--text-dark); margin: 0;">🎓 Students</h2>
      </div>
    `;
    html += buildCards(students);
  }

  if (facultyStaff.length > 0) {
    html += `
      <div style="grid-column: 1 / -1; flex: 1 1 100%; width: 100%; padding-bottom: 0.5rem; margin-top: ${students.length > 0 ? '2rem' : '0.5rem'}; border-bottom: 1px solid var(--border);">
        <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--text-dark); margin: 0;">👨‍🏫 Faculty & Staff</h2>
      </div>
    `;
    html += buildCards(facultyStaff);
  }

  grid.innerHTML = html;
}

['memberSearch','memberTypeFilter'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderMembers);
});

// Add Member
document.getElementById('addMemberBtn').addEventListener('click', () => {
  ['memberName','memberEmail','memberPhone','memberAddress'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('memberType').value = 'Student';
  openModal('addMemberModal');
});
document.getElementById('closeAddMemberModal').addEventListener('click', () => closeModal('addMemberModal'));
document.getElementById('cancelAddMember').addEventListener('click', () => closeModal('addMemberModal'));

document.getElementById('saveMember').addEventListener('click', () => {
  const name = document.getElementById('memberName').value.trim();
  const email = document.getElementById('memberEmail').value.trim();
  if (!name || !email) { toast('Name and Email are required', 'error'); return; }
  if (members.find(m => m.email.toLowerCase() === email.toLowerCase())) {
    toast('A member with this email already exists', 'error'); return;
  }
  const member = {
    id: memberUid(), name, email,
    phone: document.getElementById('memberPhone').value.trim(),
    type: document.getElementById('memberType').value,
    address: document.getElementById('memberAddress').value.trim(),
    status: 'active',
    joinedOn: today()
  };
  members.push(member);
  save();
  logActivity('add-member', `New member registered: ${name}`);
  closeModal('addMemberModal');
  toast(`${name} registered as a member!`, 'success');
  renderMembers();
  if (currentPage === 'dashboard') renderDashboard();
});

// Edit Member
function openEditMember(id) {
  const m = members.find(mb => mb.id === id);
  if (!m) return;
  editMemberId = id;
  document.getElementById('editMemberId').value = id;
  document.getElementById('editMemberName').value = m.name;
  document.getElementById('editMemberEmail').value = m.email;
  document.getElementById('editMemberPhone').value = m.phone || '';
  document.getElementById('editMemberType').value = m.type;
  document.getElementById('editMemberStatus').value = m.status;
  document.getElementById('editMemberAddress').value = m.address || '';
  openModal('editMemberModal');
}
document.getElementById('closeEditMemberModal').addEventListener('click', () => closeModal('editMemberModal'));
document.getElementById('cancelEditMember').addEventListener('click', () => closeModal('editMemberModal'));

document.getElementById('updateMember').addEventListener('click', () => {
  const name = document.getElementById('editMemberName').value.trim();
  const email = document.getElementById('editMemberEmail').value.trim();
  if (!name || !email) { toast('Name and Email are required', 'error'); return; }
  const idx = members.findIndex(m => m.id === editMemberId);
  if (idx === -1) return;
  members[idx] = {
    ...members[idx], name, email,
    phone: document.getElementById('editMemberPhone').value.trim(),
    type: document.getElementById('editMemberType').value,
    status: document.getElementById('editMemberStatus').value,
    address: document.getElementById('editMemberAddress').value.trim()
  };
  save();
  logActivity('add-member', `Member updated: ${name}`);
  closeModal('editMemberModal');
  toast(`${name}'s profile updated!`, 'success');
  renderMembers();
  if (currentPage === 'dashboard') renderDashboard();
});

// Delete Member
function deleteMember(id) {
  const m = members.find(mb => mb.id === id);
  if (!m) return;
  confirm('Delete Member', `Remove "${m.name}" from the system and delete all their data?`, () => {
    // Remove from members
    members = members.filter(mb => mb.id !== id);
    
    // Remove from borrows
    borrows = borrows.filter(b => b.memberId !== id);
    
    // Remove from return history
    returnHistory = returnHistory.filter(r => r.memberName !== m.name);
    
    // Remove from users (credentials)
    users = users.filter(u => u.id !== m.email && u.id !== m.phone);
    localStorage.setItem('lv_users', JSON.stringify(users));
    
    save();
    logActivity('add-member', `Member and all data removed: ${m.name}`);
    toast(`${m.name} and their data removed from system.`, 'warning');
    
    // If the deleted member is the currently logged-in user, log them out
    if (auth.loginId && (auth.loginId === m.email || auth.loginId === m.phone)) {
      auth = { loggedIn: false };
      localStorage.removeItem('lv_auth');
      checkAuth();
      return;
    }

    renderMembers();
    if (currentPage === 'dashboard') renderDashboard();
  });
}

// ============================================================
// BORROW
// ============================================================
function renderBorrow() {
  // Simple text input for member (ID or Name)
  const mInput = document.getElementById('borrowMember');
  if (mInput) {
    mInput.value = '';
  }

  // Populate available book dropdown
  const bSel = document.getElementById('borrowBook');
  bSel.innerHTML = '<option value="">Select Available Book...</option>';
  books.forEach(b => {
    const borrowed = borrows.filter(r => r.bookId === b.id && r.status === 'active').length;
    const avail = b.copies - borrowed;
    if (avail > 0) {
      bSel.innerHTML += `<option value="${b.id}">${b.title} by ${b.author} (${avail} left)</option>`;
    }
  });

  // Default due date = 14 days from now
  const due = new Date();
  due.setDate(due.getDate() + 14);
  document.getElementById('borrowDueDate').value = due.toISOString().split('T')[0];
  document.getElementById('borrowDueDate').min = today();

  // Render active borrows table
  const activeBorrowsCard = document.getElementById('activeBorrowsCard');
  if (activeBorrowsCard) {
    const isPrivileged = (auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff');
    activeBorrowsCard.style.display = isPrivileged ? 'block' : 'none';
  }

  const activeBorrows = borrows.filter(b => b.status === 'active');
  document.getElementById('activeBorrowsCount').textContent = activeBorrows.length;
  const tbody = document.getElementById('activeBorrowsBody');
  if (activeBorrows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No active borrows.</td></tr>`;
    return;
  }
  tbody.innerHTML = activeBorrows.map(b => {
    const book = books.find(bk => bk.id === b.bookId);
    const member = members.find(m => m.id === b.memberId);
    const isOverdue = b.dueDate < today();
    return `
      <tr>
        <td><strong>${member ? member.name : 'Unknown'}</strong></td>
        <td>${book ? book.title : 'Unknown'}</td>
        <td>${fmt(b.issuedOn)}</td>
        <td>${fmt(b.dueDate)}</td>
        <td><span class="status-pill ${isOverdue ? 'overdue' : 'active'}">${isOverdue ? '⚠️ Overdue' : '🟡 Active'}</span></td>
        <td><button class="btn-return" onclick="navigateToReturns('${b.id}')">↩️ Return</button></td>
      </tr>
    `;
  }).join('');
}

function navigateToReturns(borrowId) {
  navigate('returns');
}

document.getElementById('issueBorrowBtn').addEventListener('click', () => {
  const memberSearchVal = document.getElementById('borrowMember').value.trim();
  const bookId = document.getElementById('borrowBook').value;
  const dueDate = document.getElementById('borrowDueDate').value;
  if (!memberSearchVal || !bookId || !dueDate) { toast('Please fill in all fields', 'error'); return; }

  // Resolve member by ID or Phone only
  const cleanSearch = memberSearchVal.replace(/\D/g, ''); 
  const member = members.find(m => m.status === 'active' && 
                                  (m.id.toLowerCase() === memberSearchVal.toLowerCase() || 
                                   (m.phone && cleanSearch.length >= 10 && m.phone.replace(/\D/g, '').includes(cleanSearch)) ||
                                   (m.phone === memberSearchVal)));
  if (!member) { toast('Active member not found with that ID or Phone Number', 'error'); return; }
  
  const memberId = member.id;

  // Check member's active borrows
  const memberBorrows = borrows.filter(b => b.memberId === memberId && b.status === 'active');
  if (memberBorrows.length >= 5) { toast('Member has reached the maximum borrow limit (5 books)', 'error'); return; }

  // Check if member already borrowed same book
  const alreadyBorrowed = borrows.find(b => b.memberId === memberId && b.bookId === bookId && b.status === 'active');
  if (alreadyBorrowed) { toast('Member has already borrowed this book', 'error'); return; }

  const borrow = { id: uid(), memberId, bookId, issuedOn: today(), dueDate, status: 'active' };
  borrows.push(borrow);
  save();

  const book = books.find(b => b.id === bookId);
  logActivity('borrow', `"${book ? book.title : ''}" borrowed by ${member.name}`);
  toast(`Book issued successfully! Due by ${fmt(dueDate)}`, 'success');
  renderBorrow();
  if (currentPage === 'dashboard') renderDashboard();
});

// ============================================================
// RETURNS
// ============================================================
function renderReturns() {
  let activeBorrows = borrows.filter(b => b.status === 'active');
  let filteredReturnHistory = returnHistory;
  const isPrivileged = (auth.role === 'Faculty' || auth.role === 'Admin' || auth.role === 'Staff');

  if (auth.role === 'Student' && auth.loginId) {
    const member = members.find(m => m.email === auth.loginId || m.phone === auth.loginId);
    if (member) {
      activeBorrows = activeBorrows.filter(b => b.memberId === member.id);
      filteredReturnHistory = returnHistory.filter(r => borrows.some(b => b.id === r.borrowId && b.memberId === member.id));
    } else {
      activeBorrows = [];
      filteredReturnHistory = [];
    }
  }

  document.getElementById('pendingReturnsCount').textContent = activeBorrows.length;

  const tbody = document.getElementById('returnsBody');
  if (activeBorrows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">👍 No pending returns.</td></tr>`;
  } else {
    tbody.innerHTML = activeBorrows.map(b => {
      const book = books.find(bk => bk.id === b.bookId);
      const member = members.find(m => m.id === b.memberId);
      const overdueDays = b.dueDate < today() ? daysDiff(b.dueDate, today()) : 0;
      const fine = overdueDays * 2;
      return `
        <tr>
          <td><strong>${member ? member.name : 'Unknown'}</strong></td>
          <td>${book ? book.title : 'Unknown'}</td>
          <td>${fmt(b.dueDate)}</td>
          <td>${overdueDays > 0 ? `<span style="color:var(--red-light)">${overdueDays} day${overdueDays !== 1 ? 's' : ''}</span>` : '<span style="color:var(--green-light)">On time</span>'}</td>
          <td>${fine > 0 ? `<span style="color:var(--red-light)">₹${fine}</span>` : '₹0'}</td>
          <td>${isPrivileged ? `<button class="btn-return" onclick="processReturn('${b.id}', ${fine})">↩️ Return Book</button>` : '-'}</td>
        </tr>
      `;
    }).join('');
  }

  // Return History
  const histBody = document.getElementById('returnHistoryBody');
  if (filteredReturnHistory.length === 0) {
    histBody.innerHTML = `<tr><td colspan="4" class="table-empty">No return history.</td></tr>`;
  } else {
    histBody.innerHTML = filteredReturnHistory.slice(0, 20).map(r => `
      <tr>
        <td>${r.memberName}</td>
        <td>${r.bookTitle}</td>
        <td>${fmt(r.returnedOn)}</td>
        <td>${r.fine > 0 ? `<span style="color:var(--amber-light)">₹${r.fine}</span>` : '₹0'}</td>
      </tr>
    `).join('');
  }
}

function processReturn(borrowId, fine) {
  const borrow = borrows.find(b => b.id === borrowId);
  if (!borrow) return;
  const book = books.find(bk => bk.id === borrow.bookId);
  const member = members.find(m => m.id === borrow.memberId);
  const msg = fine > 0
    ? `Return "${book ? book.title : ''}" — Fine: ₹${fine}. Confirm?`
    : `Return "${book ? book.title : ''}" with no fine. Confirm?`;
  confirm('Return Book', msg, () => {
    borrow.status = 'returned';
    borrow.returnedOn = today();
    borrow.fine = fine;
    returnHistory.unshift({
      borrowId, memberName: member ? member.name : 'Unknown',
      bookTitle: book ? book.title : 'Unknown',
      returnedOn: today(), fine
    });
    save();
    logActivity('return', `"${book ? book.title : ''}" returned by ${member ? member.name : ''}`);
    toast(`Book returned successfully!${fine > 0 ? ` Fine collected: ₹${fine}` : ''}`, 'success');
    renderReturns();
    if (currentPage === 'dashboard') renderDashboard();
  });
}

// ============================================================
// REPORTS
// ============================================================
function renderReports() {
  let scopeBorrows = borrows;
  let scopeReturnHistory = returnHistory;

  if (auth.role === 'Student' && auth.loginId) {
    const member = members.find(m => m.email === auth.loginId || m.phone === auth.loginId);
    if (member) {
      scopeBorrows = borrows.filter(b => b.memberId === member.id);
      scopeReturnHistory = returnHistory.filter(r => borrows.some(b => b.id === r.borrowId && b.memberId === member.id));
    } else {
      scopeBorrows = [];
      scopeReturnHistory = [];
    }
  }

  const totalIssued = scopeBorrows.length;
  const totalReturned = scopeBorrows.filter(b => b.status === 'returned').length;
  const totalOverdue = scopeBorrows.filter(b => b.status === 'active' && b.dueDate < today()).length;
  const totalFines = scopeReturnHistory.reduce((acc, r) => acc + (r.fine || 0), 0);

  document.getElementById('repTotalIssued').textContent = totalIssued;
  document.getElementById('repTotalReturned').textContent = totalReturned;
  document.getElementById('repTotalOverdue').textContent = totalOverdue;
  document.getElementById('repTotalFines').textContent = `₹${totalFines}`;

  // Most borrowed books
  const bookCount = {};
  scopeBorrows.forEach(b => { bookCount[b.bookId] = (bookCount[b.bookId] || 0) + 1; });
  const sortedBooks = Object.entries(bookCount).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const mbList = document.getElementById('mostBorrowedList');
  if (sortedBooks.length === 0) {
    mbList.innerHTML = `<div class="empty-state"><span>📊</span><p>No data yet.</p></div>`;
  } else {
    mbList.innerHTML = sortedBooks.map(([bookId, count], i) => {
      const book = books.find(b => b.id === bookId);
      return `
        <div class="rank-item">
          <div class="rank-number">${i + 1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${book ? book.title : 'Unknown'}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${book ? book.author : ''}</div>
          </div>
          <div class="rank-count">${count} time${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
  }

  // Most active members
  const memberCount = {};
  scopeBorrows.forEach(b => { memberCount[b.memberId] = (memberCount[b.memberId] || 0) + 1; });
  const sortedMembers = Object.entries(memberCount).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const mamList = document.getElementById('mostActiveMembersList');
  if (sortedMembers.length === 0) {
    mamList.innerHTML = `<div class="empty-state"><span>👤</span><p>No data yet.</p></div>`;
  } else {
    mamList.innerHTML = sortedMembers.map(([memberId, count], i) => {
      const member = members.find(m => m.id === memberId);
      const initials = member ? member.name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0, 2) : '?';
      return `
        <div class="rank-item">
          <div class="rank-number">${i + 1}</div>
          <div style="width:32px;height:32px;border-radius:50%;background:${member ? memberColor(member.name) : '#6366f1'};display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;color:white;flex-shrink:0">${initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.85rem">${member ? member.name : 'Unknown'}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${member ? member.type : ''}</div>
          </div>
          <div class="rank-count">${count} book${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
  }
}





// ============================================================
// SEED / DEMO DATA (optional on first load)
// ============================================================
function loadDemoData() {
  if (books.length > 0 || members.length > 0) return;

  const demoBooks = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '978-0-7432-7356-5', genre: 'Fiction', year: '1925', copies: 3, desc: 'A novel about the decadence of the Jazz Age.' },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '978-0-06-112008-4', genre: 'Fiction', year: '1960', copies: 2, desc: 'A Pulitzer Prize-winning classic.' },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0-553-38016-3', genre: 'Science', year: '1988', copies: 4, desc: 'Landmark volume in science writing.' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '978-0-06-231609-7', genre: 'History', year: '2011', copies: 3, desc: 'A brief history of humankind.' },
    { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '978-0-06-112241-5', genre: 'Fiction', year: '1988', copies: 5, desc: 'A philosophical novel about following your dreams.' },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0-13-235088-4', genre: 'Technology', year: '2008', copies: 2, desc: 'A handbook of agile software craftsmanship.' },
    { title: 'Steve Jobs', author: 'Walter Isaacson', isbn: '978-1-4516-4853-9', genre: 'Biography', year: '2011', copies: 2, desc: 'The exclusive biography of Apple co-founder Steve Jobs.' },
    { title: 'The Name of the Wind', author: 'Patrick Rothfuss', isbn: '978-0-7564-0407-9', genre: 'Fantasy', year: '2007', copies: 3, desc: 'Epic fantasy novel set in a world of silence.' },
  ];

  demoBooks.forEach(b => books.push({ id: uid(), ...b, addedOn: today() }));

  const demoMembers = [
    { name: 'Arjun Sharma', email: 'arjun@example.com', phone: '+91 98765 43210', type: 'Student', address: 'Mumbai, Maharashtra' },
    { name: 'Priya Nair', email: 'priya@example.com', phone: '+91 87654 32109', type: 'Faculty', address: 'Pune, Maharashtra' },
    { name: 'Rahul Verma', email: 'rahul@example.com', phone: '+91 76543 21098', type: 'Student', address: 'Delhi, NCT' },
  ];
  demoMembers.forEach(m => members.push({ id: memberUid(), ...m, status: 'active', joinedOn: today() }));

  save();
  toast('Welcome to LibraVault! Demo data loaded.', 'info');
}

// ============================================================
// INIT
// ============================================================
function init() {
  checkAuth();
  if (auth.loggedIn) {
    loadDemoData();
    updateNotifBadge();
    renderDashboard();
  }
}

// Add extra demo data one time
if (!localStorage.getItem('lv_extra_data_v1')) {
  const extraBooks = [
    { id: uid(), title: 'Atomic Habits', author: 'James Clear', isbn: '978-0735211292', genre: 'Non-Fiction', year: '2018', copies: 5, addedOn: today() },
    { id: uid(), title: '1984', author: 'George Orwell', isbn: '978-0451524935', genre: 'Fiction', year: '1949', copies: 3, addedOn: today() },
    { id: uid(), title: 'Dune', author: 'Frank Herbert', isbn: '978-0441172719', genre: 'Fantasy', year: '1965', copies: 2, addedOn: today() },
    { id: uid(), title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '978-0141439518', genre: 'Romance', year: '1813', copies: 4, addedOn: today() },
    { id: uid(), title: 'The Silent Patient', author: 'Alex Michaelides', isbn: '978-1250301697', genre: 'Mystery', year: '2019', copies: 2, addedOn: today() },
    { id: uid(), title: 'Meditations', author: 'Marcus Aurelius', isbn: '978-0812968255', genre: 'Philosophy', year: '0180', copies: 3, addedOn: today() }
  ];
  extraBooks.forEach(b => books.push(b));

  const extraMembers = [
    { id: memberUid(), name: 'Neha Gupta', email: 'neha.gupta@example.com', phone: '9988776655', type: 'Student', address: 'Bangalore, Karnataka', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone: '8877665544', type: 'Faculty', address: 'Hyderabad, Telangana', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Sneha Reddy', email: 'sneha.reddy@example.com', phone: '7766554433', type: 'Student', address: 'Chennai, Tamil Nadu', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '6655443322', type: 'Staff', address: 'Noida, UP', status: 'active', joinedOn: today() }
  ];
  extraMembers.forEach(m => members.push(m));
  
  save();
  localStorage.setItem('lv_extra_data_v1', 'true');
}

init();

// --- Dashboard Tab Switching Logic ---
document.querySelectorAll('.dash-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const target = tab.dataset.target;
    const cards = ['recentActivityCard', 'overduePanel'];
    
    cards.forEach(cardId => {
      const card = document.getElementById(cardId);
      if (card) {
        if (cardId === target) {
          card.classList.remove('mobile-hidden');
        } else {
          card.classList.add('mobile-hidden');
        }
      }
    });
  });
});

// Trigger initial state
const activeDashTab = document.querySelector('.dash-tab.active');
if (activeDashTab) activeDashTab.click();



// Second batch of extra demo data
if (!localStorage.getItem('lv_extra_data_v2')) {
  const batch2Books = [
    { id: uid(), title: 'The Power of Now', author: 'Eckhart Tolle', isbn: '978-1577311522', genre: 'Philosophy', year: '1997', copies: 3, addedOn: today() },
    { id: uid(), title: 'Harry Potter & The Sorcerer\'s Stone', author: 'J.K. Rowling', isbn: '978-0590353427', genre: 'Fantasy', year: '1997', copies: 5, addedOn: today() },
    { id: uid(), title: 'The Lean Startup', author: 'Eric Ries', isbn: '978-0307887894', genre: 'Technology', year: '2011', copies: 2, addedOn: today() },
    { id: uid(), title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', isbn: '978-0374533557', genre: 'Science', year: '2011', copies: 3, addedOn: today() },
    { id: uid(), title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', isbn: '978-0307454546', genre: 'Mystery', year: '2005', copies: 2, addedOn: today() },
    { id: uid(), title: 'Becoming', author: 'Michelle Obama', isbn: '978-1524763138', genre: 'Biography', year: '2018', copies: 4, addedOn: today() },
    { id: uid(), title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', isbn: '978-1612680194', genre: 'Non-Fiction', year: '1997', copies: 4, addedOn: today() },
    { id: uid(), title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '978-0547928227', genre: 'Fantasy', year: '1937', copies: 3, addedOn: today() },
    { id: uid(), title: 'The Art of War', author: 'Sun Tzu', isbn: '978-1590302255', genre: 'History', year: '-500', copies: 5, addedOn: today() },
    { id: uid(), title: 'Freakonomics', author: 'Steven Levitt', isbn: '978-0060731335', genre: 'Non-Fiction', year: '2005', copies: 2, addedOn: today() },
  ];
  batch2Books.forEach(b => books.push(b));

  const batch2Members = [
    { id: memberUid(), name: 'Aarav Mehta', email: 'aarav.mehta@example.com', phone: '9876512340', type: 'Student', address: 'Ahmedabad, Gujarat', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Kavya Iyer', email: 'kavya.iyer@example.com', phone: '8765412309', type: 'Student', address: 'Kochi, Kerala', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Dr. Anil Bhatt', email: 'anil.bhatt@example.com', phone: '7654312098', type: 'Faculty', address: 'Jaipur, Rajasthan', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Pooja Sharma', email: 'pooja.sharma@example.com', phone: '6543212987', type: 'Student', address: 'Bhopal, MP', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Prof. R. Krishnan', email: 'r.krishnan@example.com', phone: '5432112876', type: 'Faculty', address: 'Coimbatore, TN', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Rohan Das', email: 'rohan.das@example.com', phone: '9123456780', type: 'Student', address: 'Kolkata, WB', status: 'active', joinedOn: today() },
    { id: memberUid(), name: 'Meena Patil', email: 'meena.patil@example.com', phone: '8012345679', type: 'Staff', address: 'Nagpur, Maharashtra', status: 'active', joinedOn: today() },
  ];
  batch2Members.forEach(m => members.push(m));

  save();
  localStorage.setItem('lv_extra_data_v2', 'true');
}
