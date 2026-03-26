// API Configuration - will be set by config.js (window.API_BASE_URL)
// Use window.API_BASE_URL directly to avoid redeclaration errors
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
let currentUser = null;
let authToken = null;

// Mark that app.js is loaded
window.appJsLoaded = true;

// Centralized API fetch wrapper with 401 handling
async function apiFetch(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    };
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    });
    
    // Handle token expiration (401 Unauthorized)
    if (response.status === 401) {
        console.warn('Token expired or invalid, redirecting to login');
        // Clear session storage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        // Redirect to login
        window.location.href = 'index.html';
        // Throw error to stop execution
        throw new Error('Сесията ви е изтекла. Моля влезте отново.');
    }
    
    return response;
}

// Pagination and filters for manager view
let currentPage = 0;
let pageSize = 20;
let currentFilters = {};

// Pagination and filters for engineer view (all incidents)
let engineerCurrentPage = 0;
let engineerPageSize = 20;
let engineerCurrentFilters = {};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking for login form...');
    const loginForm = document.getElementById('loginForm');
    console.log('Login form found:', !!loginForm);
    
    if (loginForm) {
        console.log('Login form exists - index.html will handle it via inline handleLoginForm function');
        // index.html has its own handleLoginForm function and onsubmit handler
        // Don't interfere with it - let index.html handle the login
    } else {
        console.log('No login form found - this is app.html');
        // app.html will handle loading via its own script
        // Do not call loadMainApp here to prevent duplicate calls
    }
});

// Login handler
async function handleLogin(e) {
    // CRITICAL: Prevent form submission immediately
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
    
    console.log('handleLogin called!');
    
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const errorDiv = document.getElementById('loginError');
    
    // Show error if elements not found
    if (!usernameEl || !passwordEl) {
        console.error('Username or password field not found!');
        if (errorDiv) {
            errorDiv.textContent = 'Грешка: Липсват полета за вход';
            errorDiv.style.display = 'block';
            errorDiv.className = 'error-message show';
        } else {
            alert('Грешка: Липсват полета за вход');
        }
        return false;
    }
    
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    
    // Validate input
    if (!username || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Моля въведете потребителско име и парола';
            errorDiv.style.display = 'block';
            errorDiv.className = 'error-message show';
        } else {
            alert('Моля въведете потребителско име и парола');
        }
        return false;
    }
    
    console.log('Attempting login for:', username);
    
    // Clear previous errors
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        errorDiv.className = 'error-message';
        errorDiv.classList.remove('show');
    }

    try {
        console.log('Sending request to:', `${API_BASE_URL}/auth/login`);
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            let errorMessage = 'Невалидно потребителско име или парола';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
                console.error('Login error response:', errorData);
            } catch (parseError) {
                console.error('Could not parse error response:', parseError);
                errorMessage = `Грешка ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Login successful, user:', data.user?.username);
        
        // Store in sessionStorage
        try {
            sessionStorage.setItem('authToken', data.access_token);
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Verify storage worked
            const stored = sessionStorage.getItem('authToken');
            if (!stored) {
                throw new Error('Грешка при запазване на данните');
            }
        } catch (storageError) {
            console.error('Storage error:', storageError);
            throw new Error('Грешка при запазване на данните за сесия');
        }
        
        // Redirect to app page
        console.log('Redirecting to app.html');
        window.location.href = 'app.html';
        return false;
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error.message || 'Грешка при вход. Проверете конзолата за повече детайли.';
        
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            errorDiv.className = 'error-message show';
            // Scroll to error
            setTimeout(() => {
                errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            alert(errorMessage);
        }
        return false;
    }
}

// Load main application
let isAppLoading = false;
let isAppLoaded = false;

window.loadMainApp = function loadMainApp() {
    // Prevent multiple simultaneous calls (but allow if page was reloaded)
    if (isAppLoading) {
        console.log('App already loading, skipping duplicate call');
        return;
    }
    
    // Reset isAppLoaded if we're calling this again (page reload scenario)
    if (isAppLoaded) {
        console.log('Resetting app state for reload');
        isAppLoaded = false;
    }
    
    isAppLoading = true;
    
    try {
        if (window.DebugLogger) {
            window.DebugLogger.log('Loading main app...');
        }
        console.log('Loading main app...');
        // Get stored auth
        authToken = sessionStorage.getItem('authToken');
        const userStr = sessionStorage.getItem('currentUser');
        
        if (!authToken || !userStr) {
            console.warn('No auth token or user data found, redirecting to login');
            window.location.href = 'index.html';
            return;
        }
        
        try {
            currentUser = JSON.parse(userStr);
        } catch (parseError) {
            console.error('Error parsing user data:', parseError);
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('User loaded:', currentUser.username, 'role:', currentUser.role);
        
        // Load appropriate view based on role
        if (window.DebugLogger) {
            window.DebugLogger.log('Loading view for role', { role: currentUser.role });
        }
        
        if (currentUser.role === 'engineer') {
            if (window.DebugLogger) {
                window.DebugLogger.log('Calling loadEngineerView');
            }
            if (typeof loadEngineerView !== 'function') {
                throw new Error('loadEngineerView function not found');
            }
            loadEngineerView();
        } else if (currentUser.role === 'manager' || currentUser.role === 'admin') {
            if (window.DebugLogger) {
                window.DebugLogger.log('Calling loadManagerView');
            }
            if (typeof loadManagerView !== 'function') {
                throw new Error('loadManagerView function not found');
            }
            loadManagerView();
        } else {
            const error = new Error('Unknown user role: ' + currentUser.role);
            if (window.DebugLogger) {
                window.DebugLogger.error('Unknown user role', error);
            }
            console.error('Unknown user role:', currentUser.role);
            window.location.href = 'index.html';
        }
        
        // Mark as loaded
        isAppLoaded = true;
        isAppLoading = false;
    } catch (error) {
        isAppLoading = false;
        if (window.DebugLogger) {
            window.DebugLogger.error('Error loading main app', error);
        }
        console.error('Error loading main app:', error);
        alert('Грешка при зареждане на приложението. Моля опитайте отново.');
        window.location.href = 'index.html';
    }
}

// Engineer View
function loadEngineerView() {
    try {
        console.log('Loading engineer view');
        document.body.innerHTML = `
        <div class="container">
            <div class="app-header">
                <h1>On-Call Tracker - Инженер</h1>
                <div class="user-info">
                    <div class="user-account" onclick="toggleUserDropdown(event)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                            <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                        </svg>
                        <span class="user-account-name">${currentUser.username}</span>
                        <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div id="userDropdown" class="user-dropdown">
                        <div class="user-dropdown-header">
                            <div class="user-dropdown-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                    <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                                </svg>
                            </div>
                            <div class="user-dropdown-info">
                                <div class="user-dropdown-name">${currentUser.first_name && currentUser.last_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username || 'N/A'}</div>
                                <div class="user-dropdown-username" style="font-size: 12px; color: var(--dsk-gray); margin-top: 2px;">${currentUser.username || 'N/A'}</div>
                                <div class="user-dropdown-email">${currentUser.email || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <div class="user-dropdown-item">
                            <span class="user-dropdown-label">Роля:</span>
                            <span class="user-dropdown-value">${currentUser.role === 'engineer' ? 'Инженер' : currentUser.role === 'manager' ? 'Мениджър' : 'Администратор'}</span>
                        </div>
                        <div class="user-dropdown-item" id="engineerCurrentMonthHours" style="display: none;">
                            <span class="user-dropdown-label">On-call часове (текущ месец):</span>
                            <span class="user-dropdown-value" id="currentMonthHoursValue">Зареждане...</span>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <div class="user-dropdown-actions">
                            <button class="btn btn-secondary btn-block" onclick="logout()">Изход</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="main-content">
                <div class="tabs">
                    <button class="tab active" onclick="showTab('create')">Създай on-call инцидент</button>
                    <button class="tab" onclick="showTab('my-incidents')">Моите on-call инциденти</button>
                    <button class="tab" onclick="showTab('all-incidents')">Всички on-call инциденти</button>
                </div>
                
                <div id="create-tab" class="tab-content active">
                    <h2>Създай нов on-call инцидент</h2>
                    <form id="incidentForm" class="incident-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="incident_start">Начало на on-call инцидента:</label>
                                <input type="datetime-local" id="incident_start" name="incident_start" required>
                            </div>
                            <div class="form-group">
                                <label for="incident_end">Край на on-call инцидента:</label>
                                <input type="datetime-local" id="incident_end" name="incident_end" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="incident_type">Тип on-call инцидент:</label>
                                <select id="incident_type" name="incident_type" required>
                                    <option value="">Избери тип</option>
                                    <option value="Outage">Outage</option>
                                    <option value="Degradation">Degradation</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="severity">Приоритет:</label>
                                <select id="severity" name="severity" required>
                                    <option value="">Избери приоритет</option>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="description">Описание:</label>
                            <textarea id="description" name="description" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="resolution">Решение:</label>
                            <textarea id="resolution" name="resolution"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Създай on-call инцидент</button>
                            <button type="reset" class="btn btn-secondary">Изчисти</button>
                        </div>
                    </form>
                    <div id="formMessage"></div>
                </div>
                
            <div id="my-incidents-tab" class="tab-content">
                <h2>Моите on-call инциденти</h2>
                <div class="filters compact-filters" style="margin-bottom: 24px;">
                    <div class="filter-row" style="margin-bottom: 0;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="my_incidents_date_from" style="font-size: 13px; margin-bottom: 4px;">От дата:</label>
                            <input type="date" id="my_incidents_date_from" style="padding: 6px 10px; font-size: 14px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="my_incidents_date_to" style="font-size: 13px; margin-bottom: 4px;">До дата:</label>
                            <input type="date" id="my_incidents_date_to" style="padding: 6px 10px; font-size: 14px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="my_incidents_reviewed" style="font-size: 13px; margin-bottom: 4px;">Статус:</label>
                            <select id="my_incidents_reviewed" style="padding: 6px 10px; font-size: 14px;">
                                <option value="all">Всички</option>
                                <option value="true">Прегледани</option>
                                <option value="false">Непрегледани</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0; display: flex; align-items: center;">
                            <div class="filter-actions" style="margin-top: 0; gap: 8px;">
                                <button class="btn btn-primary" onclick="applyMyIncidentsFilters()" style="padding: 6px 16px; font-size: 13px;">Приложи</button>
                                <button class="btn btn-secondary" onclick="clearMyIncidentsFilters()" style="padding: 6px 16px; font-size: 13px;">Изчисти</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-grid" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <h3>Общо on-call часове (месец)</h3>
                            <p class="stat-value" id="myIncidentsTotalHours">0.00 ч.</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>Брой on-call инциденти</h3>
                            <p class="stat-value" id="myIncidentsTotalCount">0</p>
                        </div>
                    </div>
                </div>
                <div class="calendar-container" id="engineerCalendarContainer"></div>
            </div>
                
            <div id="all-incidents-tab" class="tab-content">
                <h2>Всички on-call инциденти</h2>
                    
                    <div class="filters">
                        <h3>Филтри</h3>
                        <div class="filter-row">
                            <div class="form-group">
                                <label for="engineer_filter_date_from">От дата:</label>
                                <input type="date" id="engineer_filter_date_from">
                            </div>
                            <div class="form-group">
                                <label for="engineer_filter_date_to">До дата:</label>
                                <input type="date" id="engineer_filter_date_to">
                            </div>
                            <div class="form-group">
                                <label for="engineer_filter_engineer">Инженер:</label>
                                <div class="engineer-filter-dropdown">
                                    <input type="hidden" id="engineer_filter_engineer" value="">
                                    <div class="engineer-filter-selected" onclick="toggleEngineerFilterDropdown('engineer')">
                                        <span class="engineer-filter-placeholder">Всички</span>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                    <div id="engineer_filter_dropdown" class="engineer-filter-options" style="display: none;"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="engineer_filter_type">Тип:</label>
                                <select id="engineer_filter_type">
                                    <option value="">Всички</option>
                                    <option value="Outage">Outage</option>
                                    <option value="Degradation">Degradation</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="engineer_filter_severity">Приоритет:</label>
                                <select id="engineer_filter_severity">
                                    <option value="">Всички</option>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 100%;">
                                <label for="engineer_filter_search">Търсене в описание/решение:</label>
                                <input type="text" id="engineer_filter_search" placeholder="Въведете текст за търсене...">
                            </div>
                        </div>
                        <div class="filter-actions">
                            <button class="btn btn-primary" onclick="applyEngineerFilters()">Приложи филтри</button>
                            <button class="btn btn-secondary" onclick="clearEngineerFilters()">Изчисти</button>
                        </div>
                    </div>
                    
                    <div id="engineerIncidentsTableContainer"></div>
                    <div id="engineerPagination"></div>
                </div>
            </div>
        </div>
        
        <!-- Modal for incident details -->
        <div id="incidentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Детайли на on-call инцидент</h2>
                    <span class="close" onclick="closeModal()">&times;</span>
                </div>
                <div id="incidentDetails"></div>
            </div>
        </div>
        
        <!-- Modal for user details -->
        <div id="userDetailsModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Детайли на потребител</h2>
                    <span class="close" onclick="closeUserDetailsModal()">&times;</span>
                </div>
                <div id="userDetails"></div>
            </div>
        </div>
    `;
    
        // Set default engineer name
        // Set default values: end = current time, start = 1 hour ago
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const formatDateTimeLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        
        // Function to set default values for incident form
        const setDefaultIncidentTimes = () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            // Format for datetime-local input (YYYY-MM-DDTHH:mm)
            const formatDateTimeLocal = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };
            
            const startInput = document.getElementById('incident_start');
            const endInput = document.getElementById('incident_end');
            
            if (startInput) {
                startInput.value = formatDateTimeLocal(oneHourAgo);
            }
            if (endInput) {
                endInput.value = formatDateTimeLocal(now);
            }
        };
        
        // Set default values
        setDefaultIncidentTimes();
        
        // Store function globally for use after form reset
        window.setDefaultIncidentTimes = setDefaultIncidentTimes;
        
        // Event listeners
        const form = document.getElementById('incidentForm');
        if (form) {
            form.addEventListener('submit', handleCreateIncident);
        } else {
            console.error('Incident form not found');
        }
        
        // Set default date filters for my incidents (current month)
        setDefaultMyIncidentsFilters();
        
        // Load incidents
        try {
            loadMyIncidents();
        } catch (error) {
            console.error('Error loading my incidents:', error);
        }
        
    // Initialize all incidents view
    engineerCurrentPage = 0;
    engineerCurrentFilters = {};
    
    // Set default date filters for engineer view
    setDefaultDateFiltersForEngineer();
    
    // Load engineers for filter
    loadEngineersForFilter();
    
    // Load incidents with default filters
    loadEngineerAllIncidents(0);
    
    // Show/hide and load current month hours for engineer profile
    setTimeout(() => {
        const hoursElement = document.getElementById('engineerCurrentMonthHours');
        if (hoursElement) {
            if (currentUser && currentUser.role === 'engineer') {
                hoursElement.style.display = 'flex';
                loadEngineerCurrentMonthHours();
            } else {
                hoursElement.style.display = 'none';
            }
        }
    }, 500);
    } catch (error) {
        console.error('Error loading engineer view:', error);
        if (window.DebugLogger) {
            window.DebugLogger.error('Error loading engineer view', error);
        }
        document.body.innerHTML = `
            <div class="container">
                <div class="error-message">
                    <h2>Грешка при зареждане на приложението</h2>
                    <p>${error.message || 'Неочаквана грешка'}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Опитай отново</button>
                </div>
            </div>
        `;
    }
}

// Load engineers for filter dropdown
async function loadEngineersForFilter() {
    try {
        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const dropdownEl = document.getElementById('engineer_filter_dropdown');
        const hiddenInput = document.getElementById('engineer_filter_engineer');
        if (!dropdownEl || !hiddenInput) {
            console.error('Engineer filter dropdown elements not found');
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/users/engineers`);
        
        if (!response.ok) {
            console.error('Failed to load engineers:', response.status, response.statusText);
            return;
        }
        
        const engineers = await response.json();
        
        if (!Array.isArray(engineers)) {
            console.error('Invalid engineers data:', engineers);
            return;
        }
        
        // Clear existing options
        dropdownEl.innerHTML = '';
        
        // Add "Всички" option
        const allOption = document.createElement('div');
        allOption.className = 'engineer-filter-option';
        allOption.onclick = (e) => {
            e.stopPropagation();
            selectEngineerFilter('engineer', '', 'Всички');
        };
        allOption.innerHTML = '<span class="engineer-filter-option-text">Всички</span>';
        dropdownEl.appendChild(allOption);
        
        // Add engineer badges
        if (engineers.length > 0) {
            engineers.forEach(engineer => {
                const option = document.createElement('div');
                option.className = 'engineer-filter-option';
                const displayName = engineer.first_name && engineer.last_name 
                    ? `${engineer.first_name} ${engineer.last_name}` 
                    : engineer.username;
                option.innerHTML = `
                    <span class="engineer-filter-option-text">${displayName}</span>
                `;
                option.onclick = (e) => {
                    e.stopPropagation();
                    selectEngineerFilter('engineer', engineer.username, displayName);
                };
                dropdownEl.appendChild(option);
            });
            console.log(`✅ Loaded ${engineers.length} engineers for filter`);
        } else {
            console.warn('No engineers found in database');
        }
    } catch (error) {
        console.error('Error loading engineers:', error);
        if (window.DebugLogger) {
            window.DebugLogger.error('Error loading engineers for filter', error);
        }
    }
}

// Manager View
function loadManagerView() {
    try {
        console.log('Loading manager view');
        document.body.innerHTML = `
        <div class="container">
            <div class="app-header">
                <h1>On-Call Tracker - ${currentUser.role === 'admin' ? 'Администратор' : 'Мениджър'}</h1>
                <div class="user-info">
                    <div class="user-account" onclick="toggleUserDropdown(event)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                            <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                        </svg>
                        <span class="user-account-name">${currentUser.username}</span>
                        <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div id="userDropdown" class="user-dropdown">
                        <div class="user-dropdown-header">
                            <div class="user-dropdown-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                    <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                                </svg>
                            </div>
                            <div class="user-dropdown-info">
                                <div class="user-dropdown-name">${currentUser.first_name && currentUser.last_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username || 'N/A'}</div>
                                <div class="user-dropdown-username" style="font-size: 12px; color: var(--dsk-gray); margin-top: 2px;">${currentUser.username || 'N/A'}</div>
                                <div class="user-dropdown-email">${currentUser.email || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <div class="user-dropdown-item">
                            <span class="user-dropdown-label">Роля:</span>
                            <span class="user-dropdown-value">${currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'manager' ? 'Мениджър' : 'Инженер'}</span>
                        </div>
                        <div class="user-dropdown-divider"></div>
                        <div class="user-dropdown-actions">
                            <button class="btn btn-secondary btn-block" onclick="logout()">Изход</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="main-content">
                ${currentUser.role === 'admin' ? `
                <div class="tabs">
                    <button class="tab active" onclick="showAdminTab('incidents')">Инциденти</button>
                    <button class="tab" onclick="showAdminTab('users')">Одобрение на потребители</button>
                    <button class="tab" onclick="showAdminTab('all-users')">Всички потребители</button>
                    <button class="tab" onclick="showAdminTab('password-resets')">Заявки за пароли</button>
                </div>
                ` : currentUser.role === 'manager' ? `
                <div class="tabs">
                    <button class="tab active" onclick="showManagerTab('dashboard')">Dashboard</button>
                    <button class="tab" onclick="showManagerTab('incidents')">On-call инциденти</button>
                </div>
                ` : ''}
                
                ${currentUser.role === 'manager' ? `
                <div id="manager-dashboard-tab" class="tab-content active" style="opacity: 0; transition: opacity 0.2s ease-in;">
                    <h2>Dashboard - Статистики</h2>
                    <div class="dashboard-filters">
                        <div class="filter-row">
                            <div class="form-group">
                                <label for="dashboard_date_from">От дата:</label>
                                <input type="date" id="dashboard_date_from">
                            </div>
                            <div class="form-group">
                                <label for="dashboard_date_to">До дата:</label>
                                <input type="date" id="dashboard_date_to">
                            </div>
                        </div>
                        <div class="dashboard-actions">
                            <button class="btn btn-primary" onclick="loadDashboardStats()">Обнови статистики</button>
                        </div>
                    </div>
                    <div id="dashboardStatsContainer"></div>
                </div>
                <div id="manager-incidents-tab" class="tab-content">
                    <h2>Всички on-call инциденти</h2>
                    <div class="filters">
                        <h3>Филтри</h3>
                        <div class="filter-row">
                            <div class="form-group">
                                <label for="filter_date_from">От дата:</label>
                                <input type="date" id="filter_date_from">
                            </div>
                            <div class="form-group">
                                <label for="filter_date_to">До дата:</label>
                                <input type="date" id="filter_date_to">
                            </div>
                            <div class="form-group">
                                <label for="manager_filter_engineer">Инженер:</label>
                                <div class="engineer-filter-dropdown">
                                    <input type="hidden" id="manager_filter_engineer" value="">
                                    <div class="engineer-filter-selected" onclick="toggleEngineerFilterDropdown('manager')">
                                        <span class="engineer-filter-placeholder">Всички</span>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                    <div id="manager_filter_engineer_dropdown" class="engineer-filter-options" style="display: none;"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="filter_reviewed">Статус:</label>
                                <select id="filter_reviewed">
                                    <option value="">Всички</option>
                                    <option value="false">Непрегледани</option>
                                    <option value="true">Прегледани</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="filter_severity">Приоритет:</label>
                                <select id="filter_severity">
                                    <option value="">Всички</option>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 100%;">
                                <label for="filter_search">Търсене в описание/решение:</label>
                                <input type="text" id="filter_search" placeholder="Въведете текст за търсене...">
                            </div>
                        </div>
                        <div class="filter-actions">
                            <button class="btn btn-primary" onclick="applyFilters()">Приложи филтри</button>
                            <button class="btn btn-secondary" onclick="clearFilters()">Изчисти</button>
                        </div>
                    </div>
                    <div id="incidentsTableContainer"></div>
                    <div id="pagination"></div>
                </div>
                ` : ''}
                
                ${currentUser.role === 'admin' ? `
                <div id="admin-incidents-tab" class="tab-content active">
                    <h2>Всички on-call инциденти</h2>
                    <div class="filters">
                        <h3>Филтри</h3>
                        <div class="filter-row">
                            <div class="form-group">
                                <label for="filter_date_from">От дата:</label>
                                <input type="date" id="filter_date_from">
                            </div>
                            <div class="form-group">
                                <label for="filter_date_to">До дата:</label>
                                <input type="date" id="filter_date_to">
                            </div>
                            <div class="form-group">
                                <label for="admin_filter_engineer">Инженер:</label>
                                <div class="engineer-filter-dropdown">
                                    <input type="hidden" id="admin_filter_engineer" value="">
                                    <div class="engineer-filter-selected" onclick="toggleEngineerFilterDropdown('admin')">
                                        <span class="engineer-filter-placeholder">Всички</span>
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                    <div id="admin_filter_engineer_dropdown" class="engineer-filter-options" style="display: none;"></div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="filter_reviewed">Статус:</label>
                                <select id="filter_reviewed">
                                    <option value="">Всички</option>
                                    <option value="false">Непрегледани</option>
                                    <option value="true">Прегледани</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="filter_severity">Приоритет:</label>
                                <select id="filter_severity">
                                    <option value="">Всички</option>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 100%;">
                                <label for="filter_search">Търсене в описание/решение:</label>
                                <input type="text" id="filter_search" placeholder="Въведете текст за търсене...">
                            </div>
                        </div>
                        <div class="filter-actions">
                            <button class="btn btn-primary" onclick="applyFilters()">Приложи филтри</button>
                            <button class="btn btn-secondary" onclick="clearFilters()">Изчисти</button>
                        </div>
                    </div>
                    <div id="incidentsTableContainer"></div>
                    <div id="pagination"></div>
                </div>
                
                <div id="admin-users-tab" class="tab-content">
                    <h2>Чакащи одобрение потребители</h2>
                    <div id="pendingUsersContainer"></div>
                </div>
                <div id="admin-all-users-tab" class="tab-content">
                    <h2>Всички потребители</h2>
                    <div id="allUsersContainer"></div>
                </div>
                <div id="admin-password-resets-tab" class="tab-content">
                    <h2>Заявки за промяна на пароли</h2>
                    <div id="passwordResetRequestsContainer"></div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Modal for incident details -->
        <div id="incidentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Детайли на on-call инцидент</h2>
                    <span class="close" onclick="closeModal()">&times;</span>
                </div>
                <div id="incidentDetails"></div>
            </div>
        </div>
        
        <!-- Modal for user details -->
        <div id="userDetailsModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Детайли на потребител</h2>
                    <span class="close" onclick="closeUserDetailsModal()">&times;</span>
                </div>
                <div id="userDetails"></div>
            </div>
        </div>
        
        <!-- Modal for editing user -->
        <div id="userEditModal" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Редактирай потребител</h2>
                    <span class="close" onclick="closeUserEditModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="userEditForm" onsubmit="return handleUserEditSubmit(event);">
                        <input type="hidden" id="edit_user_id">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit_user_username">Потребителско име:</label>
                                <input type="text" id="edit_user_username" required minlength="3" maxlength="50">
                            </div>
                            <div class="form-group">
                                <label for="edit_user_email">Имейл:</label>
                                <input type="email" id="edit_user_email" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit_user_first_name">Име:</label>
                                <input type="text" id="edit_user_first_name" maxlength="255">
                            </div>
                            <div class="form-group">
                                <label for="edit_user_last_name">Фамилия:</label>
                                <input type="text" id="edit_user_last_name" maxlength="255">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit_user_role">Роля:</label>
                                <select id="edit_user_role" required>
                                    <option value="engineer">Инженер</option>
                                    <option value="manager">Мениджър</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit_user_approved">Одобрен:</label>
                                <select id="edit_user_approved" required>
                                    <option value="true">Да</option>
                                    <option value="false">Не</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="edit_user_change_password" onchange="togglePasswordField()">
                                Промени парола
                            </label>
                        </div>
                        <div class="form-group" id="password_field_group" style="display: none;">
                            <label for="edit_user_password">Нова парола:</label>
                            <input type="password" id="edit_user_password" minlength="6" placeholder="Минимум 6 символа">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Запази промените</button>
                            <button type="button" class="btn btn-secondary" onclick="closeUserEditModal()">Отказ</button>
                        </div>
                    </form>
                    <div id="userEditError" class="error-message" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;
    
        // Wait for DOM to be fully ready and rendered before loading data
        // Use multiple requestAnimationFrame calls to ensure browser has fully painted
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Additional small delay to ensure smooth rendering
                setTimeout(() => {
                    try {
                        if (currentUser.role === 'manager') {
                            // Set default date filters for dashboard
                            setDefaultDashboardFilters();
                            // Load dashboard stats
                            loadDashboardStats();
                            // Load engineers for filter (for incidents tab)
                            loadEngineersForManagerFilter();
                        } else if (currentUser.role === 'admin') {
                            // For admin, load data for the active tab (incidents) only
                            setDefaultDateFilters();
                            loadEngineersForManagerFilter();
                            loadAllIncidents();
                        }
                    } catch (error) {
                        console.error('Error initializing view:', error);
                    }
                }, 100);
            });
        });
    } catch (error) {
        console.error('Error loading manager view:', error);
        document.body.innerHTML = `
            <div class="container">
                <div class="error-message">
                    <h2>Грешка при зареждане на приложението</h2>
                    <p>${error.message || 'Неочаквана грешка'}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">Опитай отново</button>
                </div>
            </div>
        `;
    }
}

// Load engineers for manager filter dropdown
async function loadEngineersForManagerFilter() {
    try {
        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to find dropdown for manager or admin
        let dropdownEl = document.getElementById('manager_filter_engineer_dropdown');
        let hiddenInput = document.getElementById('manager_filter_engineer');
        let filterType = 'manager';
        
        // If not found, try admin
        if (!dropdownEl || !hiddenInput) {
            dropdownEl = document.getElementById('admin_filter_engineer_dropdown');
            hiddenInput = document.getElementById('admin_filter_engineer');
            filterType = 'admin';
        }
        
        if (!dropdownEl || !hiddenInput) {
            console.error('Manager/Admin filter dropdown elements not found');
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/users/engineers`);
        
        if (!response.ok) {
            console.error('Failed to load engineers:', response.status, response.statusText);
            return;
        }
        
        const engineers = await response.json();
        
        if (!Array.isArray(engineers)) {
            console.error('Invalid engineers data:', engineers);
            return;
        }
        
        // Clear existing options
        dropdownEl.innerHTML = '';
        
        // Add "Всички" option
        const allOption = document.createElement('div');
        allOption.className = 'engineer-filter-option';
        allOption.onclick = (e) => {
            e.stopPropagation();
            selectEngineerFilter(filterType, '', 'Всички');
        };
        allOption.innerHTML = '<span class="engineer-filter-option-text">Всички</span>';
        dropdownEl.appendChild(allOption);
        
        // Add engineer badges
        if (engineers.length > 0) {
            engineers.forEach(engineer => {
                const option = document.createElement('div');
                option.className = 'engineer-filter-option';
                const displayName = engineer.first_name && engineer.last_name 
                    ? `${engineer.first_name} ${engineer.last_name}` 
                    : engineer.username;
                option.innerHTML = `
                    <span class="engineer-filter-option-text">${displayName}</span>
                `;
                option.onclick = (e) => {
                    e.stopPropagation();
                    selectEngineerFilter(filterType, engineer.username, displayName);
                };
                dropdownEl.appendChild(option);
            });
            console.log(`✅ Loaded ${engineers.length} engineers for ${filterType} filter`);
        } else {
            console.warn('No engineers found in database');
        }
    } catch (error) {
        console.error('Error loading engineers:', error);
        if (window.DebugLogger) {
            window.DebugLogger.error('Error loading engineers for manager filter', error);
        }
    }
}

// Manager tab switching
function showManagerTab(tabName) {
    try {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const clickedTab = event?.target;
        if (clickedTab) {
            clickedTab.classList.add('active');
        } else {
            // Fallback: find tab by onclick attribute
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (tab.getAttribute('onclick')?.includes(tabName)) {
                    tab.classList.add('active');
                }
            });
        }
        
        const tabContent = document.getElementById(`manager-${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Load data when switching to specific tabs
        if (tabName === 'dashboard') {
            loadDashboardStats();
        } else if (tabName === 'incidents') {
            setDefaultDateFilters();
            loadEngineersForManagerFilter();
            loadAllIncidents();
        }
    } catch (error) {
        console.error('Error switching manager tab:', error);
    }
}

// Admin tab switching
function showAdminTab(tabName) {
    try {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const clickedTab = event?.target;
        if (clickedTab) {
            clickedTab.classList.add('active');
        } else {
            // Fallback: find tab by onclick attribute
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (tab.getAttribute('onclick')?.includes(tabName)) {
                    tab.classList.add('active');
                }
            });
        }
        
        const tabContent = document.getElementById(`admin-${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Load data when switching to specific tabs
        if (tabName === 'incidents') {
            setDefaultDateFilters();
            loadEngineersForManagerFilter();
            loadAllIncidents();
        } else if (tabName === 'users') {
            loadPendingUsers();
        } else if (tabName === 'all-users') {
            loadAllUsers();
        } else if (tabName === 'password-resets') {
            loadPasswordResetRequests();
        }
    } catch (error) {
        console.error('Error switching admin tab:', error);
    }
}

// Tab switching
function showTab(tabName) {
    try {
        if (!event || !event.target) {
            console.error('Event not available in showTab');
            return;
        }
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        event.target.classList.add('active');
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        } else {
            console.error(`Tab content not found: ${tabName}-tab`);
        }
        
        // Load data when switching to specific tabs
        if (tabName === 'my-incidents' && currentUser && currentUser.role === 'engineer') {
            try {
                loadMyIncidents();
            } catch (error) {
                console.error('Error loading my incidents:', error);
            }
        } else if (tabName === 'all-incidents' && currentUser && currentUser.role === 'engineer') {
            try {
                loadEngineerAllIncidents(0);
            } catch (error) {
                console.error('Error loading engineer all incidents:', error);
            }
        }
    } catch (error) {
        console.error('Error switching tab:', error);
    }
}

// Create incident
async function handleCreateIncident(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const messageDiv = document.getElementById('formMessage');
    
    if (!messageDiv) {
        console.error('Message div not found');
        return;
    }
    
    try {
        // Validate required fields
        const incidentStart = formData.get('incident_start');
        const incidentEnd = formData.get('incident_end');
        const incidentType = formData.get('incident_type');
        const severity = formData.get('severity');
        const description = formData.get('description');
        
        if (!incidentStart || !incidentEnd || !incidentType || !severity || !description) {
            throw new Error('Моля попълнете всички задължителни полета');
        }
        
        const incidentData = {
            incident_start: new Date(incidentStart).toISOString(),
            incident_end: new Date(incidentEnd).toISOString(),
            on_call_engineer: currentUser.username,
            incident_type: incidentType,
            severity: parseInt(severity),
            description: description,
            resolution: formData.get('resolution') || null
        };
        
        console.log('Creating incident:', incidentData);
        
        const response = await apiFetch(`${API_BASE_URL}/incidents`, {
            method: 'POST',
            body: JSON.stringify(incidentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при създаване на on-call инцидент');
        }
        
        const createdIncident = await response.json();
        console.log('Incident created successfully:', createdIncident.id);
        
        messageDiv.className = 'success-message';
        messageDiv.textContent = 'Инцидентът е създаден успешно!';
        messageDiv.style.display = 'block';
        form.reset();
        
        // Reset default values after form reset
        if (window.setDefaultIncidentTimes) {
            setTimeout(() => {
                window.setDefaultIncidentTimes();
            }, 100);
        }
        
        // Reload incidents list
        try {
            loadMyIncidents();
        } catch (reloadError) {
            console.error('Error reloading incidents:', reloadError);
        }
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error('Error creating incident:', error);
        messageDiv.className = 'error-message';
        messageDiv.textContent = error.message || 'Грешка при създаване на on-call инцидент';
        messageDiv.style.display = 'block';
    }
}

// My incidents filters
let myIncidentsFilters = {};

// Load my incidents (engineer view)
async function loadMyIncidents() {
    const container = document.getElementById('engineerCalendarContainer');
    if (!container) {
        console.error('engineerCalendarContainer not found');
        return;
    }
    
    try {
        console.log('Loading my incidents for:', currentUser.username);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('on_call_engineer', currentUser.username);
        params.append('limit', '1000');
        
        // Apply date filters if set
        if (myIncidentsFilters.date_from) {
            params.append('date_from', myIncidentsFilters.date_from);
        }
        if (myIncidentsFilters.date_to) {
            params.append('date_to', myIncidentsFilters.date_to);
        }
        // Apply reviewed status filter if set
        if (myIncidentsFilters.reviewed_status !== undefined && myIncidentsFilters.reviewed_status !== 'all') {
            params.append('manager_reviewed', myIncidentsFilters.reviewed_status === 'true');
        }
        
        const response = await apiFetch(`${API_BASE_URL}/incidents?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при зареждане на инциденти');
        }
        
        const data = await response.json();
        console.log('Loaded incidents:', data.items.length);
        renderEngineerCalendar(data.items);
    } catch (error) {
        console.error('Error loading my incidents:', error);
        if (container) {
            container.innerHTML = `<div class="error-message">${error.message || 'Грешка при зареждане на инциденти'}</div>`;
        }
    }
}

// Apply filters for my incidents
function applyMyIncidentsFilters() {
    try {
        myIncidentsFilters = {};
        
        const dateFromEl = document.getElementById('my_incidents_date_from');
        const dateToEl = document.getElementById('my_incidents_date_to');
        const reviewedEl = document.getElementById('my_incidents_reviewed');
        
        if (dateFromEl && dateFromEl.value) {
            myIncidentsFilters.date_from = dateFromEl.value;
        }
        if (dateToEl && dateToEl.value) {
            myIncidentsFilters.date_to = dateToEl.value;
        }
        if (reviewedEl && reviewedEl.value) {
            myIncidentsFilters.reviewed_status = reviewedEl.value;
        }
        
        console.log('My incidents filters applied:', myIncidentsFilters);
        loadMyIncidents();
    } catch (error) {
        console.error('Error applying my incidents filters:', error);
        alert('Грешка при прилагане на филтри');
    }
}

// Clear filters for my incidents
function clearMyIncidentsFilters() {
    try {
        const dateFromEl = document.getElementById('my_incidents_date_from');
        const dateToEl = document.getElementById('my_incidents_date_to');
        const reviewedEl = document.getElementById('my_incidents_reviewed');
        
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl) dateToEl.value = '';
        if (reviewedEl) reviewedEl.value = 'all';
        
        myIncidentsFilters = {};
        loadMyIncidents();
    } catch (error) {
        console.error('Error clearing my incidents filters:', error);
    }
}

// Render calendar for engineer with incidents count and total hours per day
function renderEngineerCalendar(incidents) {
    try {
        const container = document.getElementById('engineerCalendarContainer');
        if (!container) {
            console.error('engineerCalendarContainer not found');
            return;
        }
        
        // Calculate total hours and count for stats
        let totalHours = 0;
        let totalCount = incidents.length;
        
        if (!Array.isArray(incidents) || incidents.length === 0) {
            // Update stats cards even if no incidents
            const totalHoursEl = document.getElementById('myIncidentsTotalHours');
            const totalCountEl = document.getElementById('myIncidentsTotalCount');
            if (totalHoursEl) {
                totalHoursEl.textContent = '0.00 ч.';
            }
            if (totalCountEl) {
                totalCountEl.textContent = '0';
            }
            container.innerHTML = '<p>Няма създадени инциденти за избрания период.</p>';
            return;
        }
        
        // Group incidents by date and calculate hours per day
        const dayDataMap = {};
        incidents.forEach(incident => {
            if (!incident.incident_start) return;
            
            const date = new Date(incident.incident_start);
            const dateKey = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
            
            if (!dayDataMap[dateKey]) {
                dayDataMap[dateKey] = {
                    count: 0,
                    totalHours: 0
                };
            }
            
            dayDataMap[dateKey].count++;
            
            // Calculate hours if both start and end are available
            if (incident.incident_start && incident.incident_end) {
                const start = new Date(incident.incident_start);
                const end = new Date(incident.incident_end);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                    const diffMs = end - start;
                    const diffHours = diffMs / (1000 * 60 * 60);
                    dayDataMap[dateKey].totalHours += diffHours;
                    totalHours += diffHours;
                }
            }
        });
        
        // Update stats cards
        const totalHoursEl = document.getElementById('myIncidentsTotalHours');
        const totalCountEl = document.getElementById('myIncidentsTotalCount');
        if (totalHoursEl) {
            totalHoursEl.textContent = `${totalHours.toFixed(2)} ч.`;
        }
        if (totalCountEl) {
            totalCountEl.textContent = totalCount.toString();
        }
        
        if (!Array.isArray(incidents) || incidents.length === 0) {
            container.innerHTML = '<p>Няма създадени инциденти за избрания период.</p>';
            return;
        }
        
        // Group days by month
        const monthsData = {};
        Object.keys(dayDataMap).forEach(dateKey => {
            const [year, month, day] = dateKey.split('-').map(Number);
            const monthKey = `${year}-${month - 1}`;
            
            if (!monthsData[monthKey]) {
                const date = new Date(year, month - 1, 1);
                monthsData[monthKey] = {
                    year: year,
                    month: month - 1,
                    monthName: date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })
                };
            }
        });
        
        // Generate calendar HTML for each month
        let calendarHTML = '';
        Object.keys(monthsData).sort().forEach(monthKey => {
            const monthData = monthsData[monthKey];
            
            // Get first and last day of month
            const firstDay = new Date(monthData.year, monthData.month, 1);
            const lastDay = new Date(monthData.year, monthData.month + 1, 0);
            const daysInMonth = lastDay.getDate();
            
            // Find first day of week (0 = Sunday, 1 = Monday, etc.)
            // Convert to Monday-first (0 = Monday, 6 = Sunday)
            const firstDayOfWeek = firstDay.getDay();
            const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
            
            calendarHTML += `
                <div class="calendar-month">
                    <h4 class="calendar-month-title">${monthData.monthName}</h4>
                    <div class="calendar-grid">
                        <div class="calendar-weekday">Пн</div>
                        <div class="calendar-weekday">Вт</div>
                        <div class="calendar-weekday">Ср</div>
                        <div class="calendar-weekday">Чт</div>
                        <div class="calendar-weekday">Пт</div>
                        <div class="calendar-weekday">Сб</div>
                        <div class="calendar-weekday">Нд</div>
            `;
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < offset; i++) {
                calendarHTML += '<div class="calendar-day empty"></div>';
            }
            
            // Add cells for each day of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = monthData.year + '-' + 
                              String(monthData.month + 1).padStart(2, '0') + '-' + 
                              String(day).padStart(2, '0');
                const dayData = dayDataMap[dateKey] || { count: 0, totalHours: 0 };
                const hasIncidents = dayData.count > 0;
                const isToday = (() => {
                    const today = new Date();
                    return today.getFullYear() === monthData.year &&
                           today.getMonth() === monthData.month &&
                           today.getDate() === day;
                })();
                
                let dayClass = 'calendar-day';
                if (hasIncidents) {
                    dayClass += ' has-incidents';
                    // Add intensity class based on count
                    const intensity = Math.min(dayData.count, 5);
                    dayClass += ` intensity-${intensity}`;
                }
                if (isToday) {
                    dayClass += ' today';
                }
                
                const hoursText = dayData.totalHours > 0 
                    ? `${dayData.totalHours.toFixed(1)} ч.` 
                    : '';
                const countText = dayData.count > 0 ? `${dayData.count} инц.` : '';
                
                calendarHTML += `
                    <div class="${dayClass}">
                        <div class="calendar-day-number">${day}</div>
                        ${hasIncidents ? `
                            <div class="calendar-day-info">
                                <div class="calendar-day-count">${countText}</div>
                                ${hoursText ? `<div class="calendar-day-hours">${hoursText}</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            calendarHTML += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = calendarHTML;
    } catch (error) {
        console.error('Error rendering engineer calendar:', error);
        const container = document.getElementById('engineerCalendarContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при показване на календар: ${error.message}</div>`;
        }
    }
}

// Load all incidents (manager view)
async function loadAllIncidents(page = 0) {
    currentPage = page;
    
    // Ensure default filters are applied if not set
    if (!currentFilters.date_from || !currentFilters.date_to) {
        setDefaultDateFilters();
    }
    
    const params = new URLSearchParams({
        skip: page * pageSize,
        limit: pageSize,
        sort_by: 'incident_start',
        sort_order: 'desc',
        ...currentFilters
    });
    
    try {
        const response = await apiFetch(`${API_BASE_URL}/incidents?${params}`);
        
        if (!response.ok) throw new Error('Грешка при зареждане на инциденти');
        
        const data = await response.json();
        displayAllIncidents(data.items, data.total);
    } catch (error) {
        document.getElementById('incidentsTableContainer').innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Display all incidents
function displayAllIncidents(incidents, total) {
    try {
        const container = document.getElementById('incidentsTableContainer');
        if (!container) {
            console.error('incidentsTableContainer not found');
            return;
        }
        
        if (!Array.isArray(incidents)) {
            console.error('Invalid incidents data:', incidents);
            container.innerHTML = '<div class="error-message">Невалидни данни</div>';
            return;
        }
        
        if (incidents.length === 0) {
            container.innerHTML = '<p>Няма намерени инциденти.</p>';
            return;
        }
    
        const table = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Инженер</th>
                        <th>Тип</th>
                        <th>Приоритет</th>
                        <th>Описание</th>
                        <th>Действия</th>
                        <th>Статус</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${incidents.map(incident => {
                        try {
                            return `
                                <tr>
                                    <td>${formatDate(incident.incident_start)}</td>
                                    <td>
                                        <div class="engineer-badge" onclick="showUserDetails('${incident.on_call_engineer || ''}')" title="Кликни за детайли" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                                            </svg>
                                            <span>${incident.on_call_engineer || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>${incident.incident_type || 'N/A'}</td>
                                    <td><span class="severity-badge severity-${incident.severity || 1}" title="${getPriorityLabel(incident.severity)}">${getPriorityLabel(incident.severity)}</span></td>
                                    <td>${truncateText(incident.description || '', 50)}</td>
                                    <td style="white-space: nowrap;">
                                        <div class="action-buttons">
                                            <button class="action-btn btn-view" onclick="viewIncident('${incident.id}')">Преглед</button>
                                            ${currentUser.role === 'admin' ? `<button class="action-btn btn-delete" onclick="deleteIncident('${incident.id}')">Изтрий</button>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-badge ${incident.manager_reviewed ? 'reviewed' : 'not-reviewed'}">
                                            ${incident.manager_reviewed ? 'Прегледан' : 'Непрегледан'}
                                        </span>
                                    </td>
                                    <td style="text-align: center; padding: 12px;">
                                        <input type="checkbox" 
                                               id="review-checkbox-${incident.id}"
                                               class="review-checkbox"
                                               ${incident.manager_reviewed ? 'checked' : ''} 
                                               onchange="reviewIncident('${incident.id}', this.checked)">
                                    </td>
                                </tr>
                            `;
                        } catch (err) {
                            console.error('Error rendering incident row:', err, incident);
                            return '<tr><td colspan="8">Грешка при показване на on-call инцидент</td></tr>';
                        }
                    }).join('')}
                </tbody>
            </table>
        `;
        
        // Wrap table in scrollable container
        container.innerHTML = `<div class="table-wrapper">${table}</div>`;
        
        // Pagination
        try {
            const totalPages = Math.ceil(total / pageSize) || 1;
            const pagination = document.getElementById('pagination');
            if (pagination) {
                pagination.innerHTML = `
                    <div class="pagination">
                        <button onclick="loadAllIncidents(0)" ${currentPage === 0 ? 'disabled' : ''}>Първа</button>
                        <button onclick="loadAllIncidents(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>Предишна</button>
                        <span class="pagination-info">Страница ${currentPage + 1} от ${totalPages} (Общо: ${total})</span>
                        <button onclick="loadAllIncidents(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Следваща</button>
                        <button onclick="loadAllIncidents(${totalPages - 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Последна</button>
                    </div>
                `;
            }
        } catch (paginationError) {
            console.error('Error rendering pagination:', paginationError);
        }
    } catch (error) {
        console.error('Error displaying all incidents:', error);
        const container = document.getElementById('incidentsTableContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при показване на инциденти: ${error.message}</div>`;
        }
    }
}

// Apply filters
function applyFilters() {
    try {
        console.log('Applying filters');
        currentFilters = {};
        
        const dateFromEl = document.getElementById('filter_date_from');
        const dateToEl = document.getElementById('filter_date_to');
        const engineerEl = document.getElementById('manager_filter_engineer') || document.getElementById('admin_filter_engineer') || document.getElementById('filter_engineer');
        const reviewedEl = document.getElementById('filter_reviewed');
        const severityEl = document.getElementById('filter_severity');
        const searchEl = document.getElementById('filter_search');
        
        if (dateFromEl && dateFromEl.value) currentFilters.date_from = dateFromEl.value;
        if (dateToEl && dateToEl.value) currentFilters.date_to = dateToEl.value;
        if (engineerEl && engineerEl.value) currentFilters.on_call_engineer = engineerEl.value;
        if (reviewedEl && reviewedEl.value !== '') currentFilters.manager_reviewed = reviewedEl.value === 'true';
        if (severityEl && severityEl.value) currentFilters.severity = severityEl.value;
        if (searchEl && searchEl.value.trim()) currentFilters.search_text = searchEl.value.trim();
        
        console.log('Filters applied:', currentFilters);
        loadAllIncidents(0);
    } catch (error) {
        console.error('Error applying filters:', error);
        alert('Грешка при прилагане на филтри');
    }
}

// Clear filters
function clearFilters() {
    try {
        console.log('Clearing filters');
        const dateFromEl = document.getElementById('filter_date_from');
        const dateToEl = document.getElementById('filter_date_to');
        const engineerEl = document.getElementById('manager_filter_engineer') || document.getElementById('admin_filter_engineer') || document.getElementById('filter_engineer');
        const reviewedEl = document.getElementById('filter_reviewed');
        const severityEl = document.getElementById('filter_severity');
        const searchEl = document.getElementById('filter_search');
        
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl) dateToEl.value = '';
        if (engineerEl) {
            engineerEl.value = '';
            const selectedEl = engineerEl.parentElement.querySelector('.engineer-filter-selected .engineer-filter-placeholder');
            if (selectedEl) selectedEl.textContent = 'Всички';
        }
        if (reviewedEl) reviewedEl.value = '';
        if (severityEl) severityEl.value = '';
        if (searchEl) searchEl.value = '';
        
        currentFilters = {};
        loadAllIncidents(0);
    } catch (error) {
        console.error('Error clearing filters:', error);
    }
}

// Load all incidents for engineer view
async function loadEngineerAllIncidents(page = 0) {
    const container = document.getElementById('engineerIncidentsTableContainer');
    if (!container) {
        console.error('engineerIncidentsTableContainer not found');
        return;
    }
    
    try {
        engineerCurrentPage = page;
        
        // Ensure default filters are applied if not set
        if (!engineerCurrentFilters.date_from || !engineerCurrentFilters.date_to) {
            setDefaultDateFiltersForEngineer();
        }
        
        console.log('Loading engineer all incidents, page:', page, 'filters:', engineerCurrentFilters);
        
        const params = new URLSearchParams({
            skip: page * engineerPageSize,
            limit: engineerPageSize,
            sort_by: 'incident_start',
            sort_order: 'desc',
            ...engineerCurrentFilters
        });
        
        const response = await apiFetch(`${API_BASE_URL}/incidents?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при зареждане на инциденти');
        }
        
        const data = await response.json();
        console.log('Loaded engineer incidents:', data.items.length, 'total:', data.total);
        displayEngineerAllIncidents(data.items, data.total);
    } catch (error) {
        console.error('Error loading engineer all incidents:', error);
        container.innerHTML = `<div class="error-message">${error.message || 'Грешка при зареждане на инциденти'}</div>`;
    }
}

// Display all incidents for engineer (with edit only for own incidents)
function displayEngineerAllIncidents(incidents, total) {
    try {
        const container = document.getElementById('engineerIncidentsTableContainer');
        if (!container) {
            console.error('engineerIncidentsTableContainer not found');
            return;
        }
        
        if (!Array.isArray(incidents)) {
            console.error('Invalid incidents data:', incidents);
            container.innerHTML = '<div class="error-message">Невалидни данни</div>';
            return;
        }
        
        if (incidents.length === 0) {
            container.innerHTML = '<p>Няма намерени инциденти.</p>';
            return;
        }
    
        const table = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Инженер</th>
                        <th>Тип</th>
                        <th>Приоритет</th>
                        <th>Описание</th>
                        <th>Действия</th>
                        <th>Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${incidents.map(incident => {
                        try {
                            return `
                                <tr>
                                    <td>${formatDate(incident.incident_start)}</td>
                                    <td>
                                        <div class="engineer-badge" onclick="showUserDetails('${incident.on_call_engineer || ''}')" title="Кликни за детайли" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
                                            </svg>
                                            <span>${incident.on_call_engineer || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>${incident.incident_type || 'N/A'}</td>
                                    <td><span class="severity-badge severity-${incident.severity || 1}" title="${getPriorityLabel(incident.severity)}">${getPriorityLabel(incident.severity)}</span></td>
                                    <td>${truncateText(incident.description || '', 50)}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn btn-view" onclick="viewIncident('${incident.id}')">Преглед</button>
                                            ${incident.on_call_engineer === currentUser.username && !incident.manager_reviewed ? 
                                                `<button class="action-btn btn-edit" onclick="editIncident('${incident.id}')">Редактирай</button>` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="status-badge ${incident.manager_reviewed ? 'reviewed' : 'not-reviewed'}">
                                            ${incident.manager_reviewed ? 'Прегледан' : 'Непрегледан'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        } catch (err) {
                            console.error('Error rendering incident row:', err, incident);
                            return '<tr><td colspan="7">Грешка при показване на on-call инцидент</td></tr>';
                        }
                    }).join('')}
                </tbody>
            </table>
        `;
        
        // Wrap table in scrollable container
        container.innerHTML = `<div class="table-wrapper">${table}</div>`;
        
        // Pagination
        try {
            const totalPages = Math.ceil(total / engineerPageSize) || 1;
            const pagination = document.getElementById('engineerPagination');
            if (pagination) {
                pagination.innerHTML = `
                    <div class="pagination">
                        <button onclick="loadEngineerAllIncidents(0)" ${engineerCurrentPage === 0 ? 'disabled' : ''}>Първа</button>
                        <button onclick="loadEngineerAllIncidents(${engineerCurrentPage - 1})" ${engineerCurrentPage === 0 ? 'disabled' : ''}>Предишна</button>
                        <span class="pagination-info">Страница ${engineerCurrentPage + 1} от ${totalPages} (Общо: ${total})</span>
                        <button onclick="loadEngineerAllIncidents(${engineerCurrentPage + 1})" ${engineerCurrentPage >= totalPages - 1 ? 'disabled' : ''}>Следваща</button>
                        <button onclick="loadEngineerAllIncidents(${totalPages - 1})" ${engineerCurrentPage >= totalPages - 1 ? 'disabled' : ''}>Последна</button>
                    </div>
                `;
            }
        } catch (paginationError) {
            console.error('Error rendering pagination:', paginationError);
        }
    } catch (error) {
        console.error('Error displaying engineer all incidents:', error);
        const container = document.getElementById('engineerIncidentsTableContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при показване на инциденти: ${error.message}</div>`;
        }
    }
}

// Apply filters for engineer view
function applyEngineerFilters() {
    try {
        console.log('Applying engineer filters');
        engineerCurrentFilters = {};
        
        const dateFromEl = document.getElementById('engineer_filter_date_from');
        const dateToEl = document.getElementById('engineer_filter_date_to');
        const engineerEl = document.getElementById('engineer_filter_engineer');
        const typeEl = document.getElementById('engineer_filter_type');
        const severityEl = document.getElementById('engineer_filter_severity');
        const searchEl = document.getElementById('engineer_filter_search');
        
        if (dateFromEl && dateFromEl.value) engineerCurrentFilters.date_from = dateFromEl.value;
        if (dateToEl && dateToEl.value) engineerCurrentFilters.date_to = dateToEl.value;
        if (engineerEl && engineerEl.value) engineerCurrentFilters.on_call_engineer = engineerEl.value;
        if (typeEl && typeEl.value) engineerCurrentFilters.incident_type = typeEl.value;
        if (severityEl && severityEl.value) engineerCurrentFilters.severity = severityEl.value;
        if (searchEl && searchEl.value.trim()) engineerCurrentFilters.search_text = searchEl.value.trim();
        
        console.log('Engineer filters applied:', engineerCurrentFilters);
        loadEngineerAllIncidents(0);
    } catch (error) {
        console.error('Error applying engineer filters:', error);
        alert('Грешка при прилагане на филтри');
    }
}

// Clear filters for engineer view
function clearEngineerFilters() {
    const dateFromEl = document.getElementById('engineer_filter_date_from');
    const dateToEl = document.getElementById('engineer_filter_date_to');
    const engineerEl = document.getElementById('engineer_filter_engineer');
    const typeEl = document.getElementById('engineer_filter_type');
    const severityEl = document.getElementById('engineer_filter_severity');
    const searchEl = document.getElementById('engineer_filter_search');
    
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl) dateToEl.value = '';
    if (engineerEl) engineerEl.value = '';
    if (typeEl) typeEl.value = '';
    if (severityEl) severityEl.value = '';
    if (searchEl) searchEl.value = '';
    
    engineerCurrentFilters = {};
    loadEngineerAllIncidents(0);
}

// View incident details
async function viewIncident(id) {
    try {
        console.log('Viewing incident:', id);
        const response = await apiFetch(`${API_BASE_URL}/incidents/${id}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при зареждане на детайли');
        }
        
        const incident = await response.json();
        console.log('Incident loaded:', incident.id);
        
        const details = `
            <div class="incident-details">
                <div class="detail-row">
                    <div class="detail-label">ID:</div>
                    <div class="detail-value">${incident.id}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Начало:</div>
                    <div class="detail-value">${formatDateTime(incident.incident_start)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Край:</div>
                    <div class="detail-value">${incident.incident_end ? formatDateTime(incident.incident_end) : 'Не е посочен'}</div>
                </div>
                ${incident.incident_start && incident.incident_end ? `
                <div class="detail-row">
                    <div class="detail-label">Времетраене:</div>
                    <div class="detail-value">${calculateDuration(incident.incident_start, incident.incident_end)}</div>
                </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Инженер:</div>
                    <div class="detail-value">${incident.on_call_engineer}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Тип:</div>
                    <div class="detail-value">${incident.incident_type}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Приоритет:</div>
                    <div class="detail-value"><span class="severity-badge severity-${incident.severity}">${getPriorityLabel(incident.severity)}</span></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Описание:</div>
                    <div class="detail-value">${incident.description}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Решение:</div>
                    <div class="detail-value">${incident.resolution || 'Не е посочено'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Прегледан:</div>
                    <div class="detail-value">
                        <span class="status-badge ${incident.manager_reviewed ? 'reviewed' : 'not-reviewed'}">
                            ${incident.manager_reviewed ? 'Да' : 'Не'}
                        </span>
                    </div>
                </div>
                ${incident.manager_reviewed ? `
                    <div class="detail-row">
                        <div class="detail-label">Прегледан от:</div>
                        <div class="detail-value">${incident.manager_name}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Прегледан на:</div>
                        <div class="detail-value">${formatDateTime(incident.manager_reviewed_at)}</div>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <div class="detail-label">Създаден:</div>
                    <div class="detail-value">${formatDateTime(incident.created_at)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Обновен:</div>
                    <div class="detail-value">${formatDateTime(incident.updated_at)}</div>
                </div>
            </div>
        `;
        
        const detailsDiv = document.getElementById('incidentDetails');
        const modal = document.getElementById('incidentModal');
        
        if (!detailsDiv || !modal) {
            throw new Error('Modal elements not found');
        }
        
        detailsDiv.innerHTML = details;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error viewing incident:', error);
        alert(error.message || 'Грешка при зареждане на детайли');
    }
}

// Close modal
function closeModal() {
    try {
        const modal = document.getElementById('incidentModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

// Review incident
async function reviewIncident(id, reviewed) {
    try {
        console.log('Reviewing incident:', id, 'reviewed:', reviewed);
        
        const response = await apiFetch(`${API_BASE_URL}/incidents/${id}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ reviewed })
        });
        
        if (!response.ok) {
            // Revert checkbox on error
            const checkbox = document.getElementById(`review-checkbox-${id}`);
            if (checkbox) {
                checkbox.checked = !reviewed;
            }
            
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при обновяване на статус');
        }
        
        console.log('Incident review updated successfully');
        
        // Update status badge in the table
        const checkbox = document.getElementById(`review-checkbox-${id}`);
        if (checkbox) {
            const row = checkbox.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = reviewed ? 'status-badge reviewed' : 'status-badge not-reviewed';
                    statusBadge.textContent = reviewed ? 'Прегледан' : 'Непрегледан';
                }
            }
        }
        
        // Reload to ensure consistency
        loadAllIncidents(currentPage);
    } catch (error) {
        console.error('Error reviewing incident:', error);
        alert(error.message || 'Грешка при обновяване на статус');
    }
}

// Delete incident
async function deleteIncident(id) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този on-call инцидент?')) {
        return;
    }
    
    try {
        console.log('Deleting incident:', id);
        const response = await apiFetch(`${API_BASE_URL}/incidents/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.text().catch(() => '');
            throw new Error(errorData || 'Грешка при изтриване');
        }
        
        console.log('Incident deleted successfully');
        loadAllIncidents(currentPage);
    } catch (error) {
        console.error('Error deleting incident:', error);
        alert(error.message || 'Грешка при изтриване');
    }
}

// Edit incident (engineer view)
async function editIncident(id) {
    try {
        console.log('Editing incident:', id);
        const response = await apiFetch(`${API_BASE_URL}/incidents/${id}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при зареждане на on-call инцидент');
        }
        
        const incident = await response.json();
        console.log('Incident loaded for editing:', incident.id);
        
        // Show edit form in modal
        const editForm = `
            <form id="editIncidentForm">
                <div class="form-group">
                    <label>Начало:</label>
                    <input type="datetime-local" id="edit_incident_start" value="${formatDateTimeLocal(incident.incident_start)}" required>
                </div>
                <div class="form-group">
                    <label>Край:</label>
                    <input type="datetime-local" id="edit_incident_end" value="${incident.incident_end ? formatDateTimeLocal(incident.incident_end) : ''}">
                </div>
                <div class="form-group">
                    <label>Тип:</label>
                    <select id="edit_incident_type" required>
                        <option value="Outage" ${incident.incident_type === 'Outage' ? 'selected' : ''}>Outage</option>
                        <option value="Degradation" ${incident.incident_type === 'Degradation' ? 'selected' : ''}>Degradation</option>
                        <option value="Other" ${incident.incident_type === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Приоритет:</label>
                    <select id="edit_severity" required>
                        <option value="">Избери приоритет</option>
                        <option value="1" ${incident.severity === 1 ? 'selected' : ''}>1 - Critical</option>
                        <option value="2" ${incident.severity === 2 ? 'selected' : ''}>2 - High</option>
                        <option value="3" ${incident.severity === 3 ? 'selected' : ''}>3 - Medium</option>
                        <option value="4" ${incident.severity === 4 ? 'selected' : ''}>4 - Low</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Описание:</label>
                    <textarea id="edit_description" required>${incident.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Решение:</label>
                    <textarea id="edit_resolution">${incident.resolution || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Запази</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Отказ</button>
                </div>
            </form>
        `;
        
        const detailsDiv = document.getElementById('incidentDetails');
        const modal = document.getElementById('incidentModal');
        
        if (!detailsDiv || !modal) {
            throw new Error('Modal elements not found');
        }
        
        detailsDiv.innerHTML = editForm;
        modal.style.display = 'block';
        
        const editFormEl = document.getElementById('editIncidentForm');
        if (editFormEl) {
            editFormEl.addEventListener('submit', async (e) => {
                e.preventDefault();
                await updateIncident(id);
            });
        } else {
            console.error('Edit form not found');
        }
    } catch (error) {
        console.error('Error editing incident:', error);
        alert(error.message || 'Грешка при зареждане на on-call инцидент');
    }
}

// Update incident
async function updateIncident(id) {
    try {
        const startEl = document.getElementById('edit_incident_start');
        const endEl = document.getElementById('edit_incident_end');
        const typeEl = document.getElementById('edit_incident_type');
        const severityEl = document.getElementById('edit_severity');
        const descEl = document.getElementById('edit_description');
        const resEl = document.getElementById('edit_resolution');
        
        if (!startEl || !typeEl || !severityEl || !descEl) {
            throw new Error('Липсват задължителни полета');
        }
        
        const updateData = {
            incident_start: new Date(startEl.value).toISOString(),
            incident_end: endEl && endEl.value ? new Date(endEl.value).toISOString() : null,
            incident_type: typeEl.value,
            severity: parseInt(severityEl.value),
            description: descEl.value,
            resolution: resEl ? resEl.value || null : null
        };
        
        console.log('Updating incident:', id, updateData);
        
        const response = await apiFetch(`${API_BASE_URL}/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при обновяване');
        }
        
        console.log('Incident updated successfully');
        closeModal();
        loadMyIncidents();
    } catch (error) {
        console.error('Error updating incident:', error);
        alert(error.message || 'Грешка при обновяване');
    }
}

// Set default date filters (first day of current month to today) for manager view
function setDefaultDateFilters() {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Format as YYYY-MM-DD using local time (not UTC)
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateFrom = formatDateLocal(firstDayOfMonth);
        const dateTo = formatDateLocal(today);
        
        const dateFromEl = document.getElementById('filter_date_from');
        const dateToEl = document.getElementById('filter_date_to');
        
        if (dateFromEl && !dateFromEl.value) {
            dateFromEl.value = dateFrom;
        }
        if (dateToEl && !dateToEl.value) {
            dateToEl.value = dateTo;
        }
        
        // Set default filters
        if (dateFromEl && dateFromEl.value) {
            currentFilters.date_from = dateFromEl.value;
        }
        if (dateToEl && dateToEl.value) {
            currentFilters.date_to = dateToEl.value;
        }
    } catch (error) {
        console.error('Error setting default date filters:', error);
    }
}

// Set default date filters for dashboard
function setDefaultDashboardFilters() {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Format as YYYY-MM-DD using local time (not UTC)
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateFrom = formatDateLocal(firstDayOfMonth);
        const dateTo = formatDateLocal(today);
        
        const dateFromEl = document.getElementById('dashboard_date_from');
        const dateToEl = document.getElementById('dashboard_date_to');
        
        if (dateFromEl && !dateFromEl.value) {
            dateFromEl.value = dateFrom;
        }
        if (dateToEl && !dateToEl.value) {
            dateToEl.value = dateTo;
        }
    } catch (error) {
        console.error('Error setting default dashboard filters:', error);
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const container = document.getElementById('dashboardStatsContainer');
        if (!container) {
            console.error('dashboardStatsContainer not found');
            return;
        }
        
        // Get date filters
        const dateFromEl = document.getElementById('dashboard_date_from');
        const dateToEl = document.getElementById('dashboard_date_to');
        
        const params = new URLSearchParams();
        if (dateFromEl && dateFromEl.value) {
            params.append('date_from', dateFromEl.value);
        }
        if (dateToEl && dateToEl.value) {
            params.append('date_to', dateToEl.value);
        }
        
        const response = await apiFetch(`${API_BASE_URL}/incidents/stats?${params}`);
        
        if (!response.ok) {
            throw new Error('Грешка при зареждане на статистики');
        }
        
        const stats = await response.json();
        
        // Build dashboard HTML
        const dashboardHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>Общо on-call инциденти</h3>
                            <p class="stat-value">${stats.total_incidents || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-content">
                            <h3>Чакащи преглед</h3>
                            <p class="stat-value">${stats.pending_review || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <h3>Средно време за разрешаване</h3>
                            <p class="stat-value">${stats.avg_resolution_time_hours ? stats.avg_resolution_time_hours.toFixed(1) + ' ч.' : 'N/A'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <h3>Прегледани</h3>
                            <p class="stat-value">${(stats.total_incidents - stats.pending_review) || 0}</p>
                        </div>
                    </div>
                </div>
                
                ${(stats.engineer_time_totals || []).length > 0 ? `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <h3>Общо on-call часове</h3>
                            <p class="stat-value">${stats.engineer_time_totals.reduce((sum, eng) => sum + eng.total_hours, 0).toFixed(2)} ч.</p>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="dashboard-section">
                <h3>On-call инциденти по приоритет</h3>
                <div class="priority-stats">
                    ${Object.entries(stats.by_priority || {}).map(([priority, count]) => {
                        const priorityClass = priority === 'Critical' ? 'severity-1' : 
                                            priority === 'High' ? 'severity-2' : 
                                            priority === 'Medium' ? 'severity-3' : 'severity-4';
                        return `
                            <div class="priority-stat-item">
                                <span class="severity-badge ${priorityClass}">${priority}</span>
                                <span class="priority-count">${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="dashboard-section">
                <h3>On-call инциденти по тип</h3>
                <div class="type-stats">
                    ${Object.entries(stats.by_type || {}).map(([type, count]) => `
                        <div class="type-stat-item">
                            <span class="type-label">${type}</span>
                            <span class="type-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="dashboard-section">
                <h3>Най-активни инженери</h3>
                <div class="engineers-stats">
                    ${(stats.top_engineers || []).length > 0 ? `
                        <table class="engineers-table">
                            <thead>
                                <tr>
                                    <th>Инженер</th>
                                    <th>Брой on-call инциденти</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.top_engineers.map(eng => `
                                    <tr>
                                        <td>${eng.engineer}</td>
                                        <td>${eng.count}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>Няма данни</p>'}
                </div>
            </div>
            
            <div class="dashboard-section">
                <h3>Общо време за on-call по инженери (за изплащане)</h3>
                <div class="engineers-stats">
                    ${(stats.engineer_time_totals || []).length > 0 ? `
                        <table class="engineers-table">
                            <thead>
                                <tr>
                                    <th>Инженер</th>
                                    <th>Брой on-call инциденти</th>
                                    <th>Общо часове</th>
                                    <th>Общо минути</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.engineer_time_totals.map(eng => {
                                    const totalMinutes = Math.round(eng.total_hours * 60);
                                    const hours = Math.floor(eng.total_hours);
                                    const minutes = Math.round((eng.total_hours - hours) * 60);
                                    return `
                                    <tr>
                                        <td><strong>${eng.engineer}</strong></td>
                                        <td>${eng.total_incidents}</td>
                                        <td><strong class="time-highlight">${eng.total_hours.toFixed(2)} ч.</strong></td>
                                        <td>${totalMinutes} мин.</td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : '<p>Няма данни за изчислено време</p>'}
                </div>
            </div>
            
            <div class="dashboard-section">
                <h3>On-call инциденти по дни</h3>
                <div class="calendar-container" id="calendarContainer"></div>
            </div>
        `;
        
        container.innerHTML = dashboardHTML;
        
        // Render calendar after HTML is inserted
        renderCalendar(stats);
        
        // Show the dashboard tab with fade-in effect
        const dashboardTab = document.getElementById('manager-dashboard-tab');
        if (dashboardTab) {
            requestAnimationFrame(() => {
                dashboardTab.style.opacity = '1';
            });
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        const container = document.getElementById('dashboardStatsContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при зареждане на статистики: ${error.message}</div>`;
        }
        // Show the dashboard tab even on error
        const dashboardTab = document.getElementById('manager-dashboard-tab');
        if (dashboardTab) {
            requestAnimationFrame(() => {
                dashboardTab.style.opacity = '1';
            });
        }
    }
}

// Render calendar view similar to Windows calendar
function renderCalendar(stats) {
    try {
        const container = document.getElementById('calendarContainer');
        if (!container) {
            console.error('calendarContainer not found');
            return;
        }
        
        if (!stats.incidents_by_day || stats.incidents_by_day.length === 0) {
            container.innerHTML = '<p>Няма данни</p>';
            return;
        }
        
        // Create a map of date to count for quick lookup
        const dateMap = {};
        stats.incidents_by_day.forEach(day => {
            const date = new Date(day.date);
            // Use YYYY-MM-DD format for key
            const dateKey = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
            dateMap[dateKey] = day.count;
        });
        
        // Group days by month
        const monthsData = {};
        stats.incidents_by_day.forEach(day => {
            const date = new Date(day.date);
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthKey = `${year}-${month}`;
            
            if (!monthsData[monthKey]) {
                monthsData[monthKey] = {
                    year: year,
                    month: month,
                    monthName: date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })
                };
            }
        });
        
        // Generate calendar HTML for each month
        let calendarHTML = '';
        Object.keys(monthsData).sort().forEach(monthKey => {
            const monthData = monthsData[monthKey];
            
            // Get first and last day of month
            const firstDay = new Date(monthData.year, monthData.month, 1);
            const lastDay = new Date(monthData.year, monthData.month + 1, 0);
            const daysInMonth = lastDay.getDate();
            
            // Find first day of week (0 = Sunday, 1 = Monday, etc.)
            // Convert to Monday-first (0 = Monday, 6 = Sunday)
            const firstDayOfWeek = firstDay.getDay();
            const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
            
            calendarHTML += `
                <div class="calendar-month">
                    <h4 class="calendar-month-title">${monthData.monthName}</h4>
                    <div class="calendar-grid">
                        <div class="calendar-weekday">Пн</div>
                        <div class="calendar-weekday">Вт</div>
                        <div class="calendar-weekday">Ср</div>
                        <div class="calendar-weekday">Чт</div>
                        <div class="calendar-weekday">Пт</div>
                        <div class="calendar-weekday">Сб</div>
                        <div class="calendar-weekday">Нд</div>
            `;
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < offset; i++) {
                calendarHTML += '<div class="calendar-day empty"></div>';
            }
            
            // Add cells for each day of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = monthData.year + '-' + 
                              String(monthData.month + 1).padStart(2, '0') + '-' + 
                              String(day).padStart(2, '0');
                const count = dateMap[dateKey] || 0;
                const hasIncidents = count > 0;
                const isToday = (() => {
                    const today = new Date();
                    return today.getFullYear() === monthData.year &&
                           today.getMonth() === monthData.month &&
                           today.getDate() === day;
                })();
                
                let dayClass = 'calendar-day';
                if (hasIncidents) {
                    dayClass += ' has-incidents';
                    // Add intensity class based on count
                    const intensity = Math.min(count, 5);
                    dayClass += ` intensity-${intensity}`;
                }
                if (isToday) {
                    dayClass += ' today';
                }
                
                const dateObj = new Date(monthData.year, monthData.month, day);
                const dateFormatted = dateObj.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
                
                calendarHTML += `
                    <div class="${dayClass}" title="${dateFormatted}: ${count} on-call ${count === 1 ? 'инцидент' : 'инцидента'}">
                        <span class="calendar-day-number">${day}</span>
                        ${hasIncidents ? `<span class="calendar-day-count">${count}</span>` : ''}
                    </div>
                `;
            }
            
            calendarHTML += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = calendarHTML;
    } catch (error) {
        console.error('Error rendering calendar:', error);
        const container = document.getElementById('calendarContainer');
        if (container) {
            container.innerHTML = '<p>Грешка при визуализация на календара</p>';
        }
    }
}

// Set default date filters for engineer view
function setDefaultDateFiltersForEngineer() {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Format as YYYY-MM-DD using local time (not UTC)
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateFrom = formatDateLocal(firstDayOfMonth);
        const dateTo = formatDateLocal(today);
        
        const dateFromEl = document.getElementById('engineer_filter_date_from');
        const dateToEl = document.getElementById('engineer_filter_date_to');
        
        if (dateFromEl && !dateFromEl.value) {
            dateFromEl.value = dateFrom;
        }
        if (dateToEl && !dateToEl.value) {
            dateToEl.value = dateTo;
        }
        
        // Set default filters
        if (dateFromEl && dateFromEl.value) {
            engineerCurrentFilters.date_from = dateFromEl.value;
        }
        if (dateToEl && dateToEl.value) {
            engineerCurrentFilters.date_to = dateToEl.value;
        }
    } catch (error) {
        console.error('Error setting default date filters for engineer:', error);
    }
}

// Set default date filters for my incidents (current month)
function setDefaultMyIncidentsFilters() {
    try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Format as YYYY-MM-DD using local time (not UTC)
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateFrom = formatDateLocal(firstDayOfMonth);
        const dateTo = formatDateLocal(today);
        
        const dateFromEl = document.getElementById('my_incidents_date_from');
        const dateToEl = document.getElementById('my_incidents_date_to');
        const reviewedEl = document.getElementById('my_incidents_reviewed');
        
        // Always set default values
        if (dateFromEl) {
            dateFromEl.value = dateFrom;
            myIncidentsFilters.date_from = dateFrom;
        }
        if (dateToEl) {
            dateToEl.value = dateTo;
            myIncidentsFilters.date_to = dateTo;
        }
        if (reviewedEl) {
            reviewedEl.value = 'all';
            myIncidentsFilters.reviewed_status = 'all';
        }
        
        console.log('Default my incidents filters set:', myIncidentsFilters);
    } catch (error) {
        console.error('Error setting default date filters for my incidents:', error);
    }
}

// Load current month on-call hours for engineer profile
async function loadEngineerCurrentMonthHours() {
    try {
        console.log('Loading current month hours for engineer:', currentUser?.username);
        
        const hoursContainerEl = document.getElementById('engineerCurrentMonthHours');
        const hoursValueEl = document.getElementById('currentMonthHoursValue');
        
        if (!hoursContainerEl || !hoursValueEl) {
            console.log('Hours elements not found');
            return; // Element not found, probably not in engineer view
        }
        
        if (!currentUser || currentUser.role !== 'engineer') {
            console.log('Not an engineer, hiding hours element');
            hoursContainerEl.style.display = 'none';
            return; // Not an engineer
        }
        
        // Show the element
        hoursContainerEl.style.display = 'flex';
        
        // Show loading state
        hoursValueEl.textContent = 'Зареждане...';
        
        // Get current month date range
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Format as YYYY-MM-DD
        const formatDateLocal = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const dateFrom = formatDateLocal(firstDayOfMonth);
        const dateTo = formatDateLocal(today);
        
        console.log('Fetching incidents from', dateFrom, 'to', dateTo, 'for engineer', currentUser.username);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('date_from', dateFrom);
        params.append('date_to', dateTo);
        params.append('on_call_engineer', currentUser.username);
        params.append('limit', '1000'); // Get all incidents for the month
        
        // Fetch incidents
        const response = await apiFetch(`${API_BASE_URL}/incidents?${params}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
            throw new Error('Грешка при зареждане на данни');
        }
        
        const data = await response.json();
        const incidents = data.items || [];
        
        console.log('Found', incidents.length, 'incidents for current month');
        
        // Calculate total hours from incidents that have both start and end times
        let totalHours = 0;
        let incidentCount = 0;
        
        incidents.forEach(incident => {
            if (incident.incident_start && incident.incident_end) {
                const start = new Date(incident.incident_start);
                const end = new Date(incident.incident_end);
                const diffMs = end - start;
                const diffHours = diffMs / (1000 * 60 * 60);
                totalHours += diffHours;
                incidentCount++;
            }
        });
        
        console.log('Total hours calculated:', totalHours, 'from', incidentCount, 'incidents');
        
        // Display result
        if (incidentCount === 0) {
            hoursValueEl.textContent = '0.00 ч.';
        } else {
            hoursValueEl.textContent = `${totalHours.toFixed(2)} ч.`;
        }
        
    } catch (error) {
        console.error('Error loading current month hours:', error);
        const hoursValueEl = document.getElementById('currentMonthHoursValue');
        if (hoursValueEl) {
            hoursValueEl.textContent = 'Грешка';
        }
    }
}

// Utility functions
function getPriorityLabel(priority) {
    const labels = {
        1: '1 - Critical',
        2: '2 - High',
        3: '3 - Medium',
        4: '4 - Low'
    };
    return labels[priority] || priority || 'N/A';
}

function formatDate(dateString) {
    try {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('bg-BG') + ' ' + date.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

function formatDateTime(dateString) {
    try {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleString('bg-BG');
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return 'Invalid date';
    }
}

function calculateDuration(startString, endString) {
    try {
        if (!startString || !endString) return 'N/A';
        
        const start = new Date(startString);
        const end = new Date(endString);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return 'Невалидна дата';
        }
        
        if (end < start) {
            return 'Невалидно време';
        }
        
        const diffMs = end - start;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const remainingMinutes = diffMinutes % 60;
        const remainingSeconds = diffSeconds % 60;
        
        let duration = '';
        
        if (diffHours > 0) {
            duration += `${diffHours} ${diffHours === 1 ? 'час' : 'часа'}`;
            if (remainingMinutes > 0) {
                duration += ` и ${remainingMinutes} ${remainingMinutes === 1 ? 'минута' : 'минути'}`;
            }
        } else if (diffMinutes > 0) {
            duration += `${diffMinutes} ${diffMinutes === 1 ? 'минута' : 'минути'}`;
            if (remainingSeconds > 0) {
                duration += ` и ${remainingSeconds} ${remainingSeconds === 1 ? 'секунда' : 'секунди'}`;
            }
        } else {
            duration += `${remainingSeconds} ${remainingSeconds === 1 ? 'секунда' : 'секунди'}`;
        }
        
        return duration;
    } catch (error) {
        console.error('Error calculating duration:', error);
        return 'Грешка при изчисляване';
    }
}

function formatDateTimeLocal(dateString) {
    try {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting datetime local:', error);
        return '';
    }
}

function truncateText(text, maxLength) {
    try {
        if (!text) return '';
        if (typeof text !== 'string') text = String(text);
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    } catch (error) {
        console.error('Error truncating text:', error);
        return text || '';
    }
}

// Load pending users for admin approval
async function loadPendingUsers() {
    try {
        const container = document.getElementById('pendingUsersContainer');
        if (!container) {
            console.error('pendingUsersContainer not found');
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/users/pending`);
        
        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = '<div class="error-message">Нямаш права за достъп до тази страница</div>';
            } else {
                throw new Error('Грешка при зареждане на чакащи потребители');
            }
            return;
        }
        
        const users = await response.json();
        
        if (!Array.isArray(users)) {
            console.error('Invalid users data:', users);
            container.innerHTML = '<div class="error-message">Невалидни данни</div>';
            return;
        }
        
        if (users.length === 0) {
            container.innerHTML = '<p>Няма чакащи одобрение потребители.</p>';
            return;
        }
        
        const table = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Потребителско име</th>
                        <th>Имейл</th>
                        <th>Роля</th>
                        <th>Дата на регистрация</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username || 'N/A'}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td><span class="user-badge ${user.role}">${user.role === 'engineer' ? 'Инженер' : user.role === 'manager' ? 'Мениджър' : 'Админ'}</span></td>
                            <td>${formatDate(user.created_at)}</td>
                            <td class="action-buttons">
                                <button class="btn btn-primary" onclick="approveUser('${user.id}', true); return false;">Одобри</button>
                                <button class="btn btn-secondary" onclick="approveUser('${user.id}', false); return false;">Отхвърли</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading pending users:', error);
        const container = document.getElementById('pendingUsersContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при зареждане: ${error.message}</div>`;
        }
    }
}

// Load all users for admin management
async function loadAllUsers() {
    try {
        const container = document.getElementById('allUsersContainer');
        if (!container) {
            console.error('allUsersContainer not found');
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/users/all`);
        
        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = '<div class="error-message">Нямаш права за достъп до тази страница</div>';
            } else {
                throw new Error('Грешка при зареждане на потребители');
            }
            return;
        }
        
        const users = await response.json();
        
        if (!Array.isArray(users)) {
            console.error('Invalid users data:', users);
            container.innerHTML = '<div class="error-message">Невалидни данни</div>';
            return;
        }
        
        if (users.length === 0) {
            container.innerHTML = '<p>Няма потребители в системата.</p>';
            return;
        }
        
        const table = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Потребителско име</th>
                        <th>Имейл</th>
                        <th>Роля</th>
                        <th>Одобрен</th>
                        <th>Дата на създаване</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username || 'N/A'}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td><span class="user-badge ${user.role}">${user.role === 'engineer' ? 'Инженер' : user.role === 'manager' ? 'Мениджър' : 'Админ'}</span></td>
                            <td>${user.approved ? '<span style="color: green;">✓ Одобрен</span>' : '<span style="color: orange;">⏳ Чака одобрение</span>'}</td>
                            <td>${formatDate(user.created_at)}</td>
                            <td class="action-buttons">
                                <button class="btn btn-primary" onclick="editUser('${user.id}')">Редактирай</button>
                                <button class="btn btn-secondary" onclick="deleteUser('${user.id}', '${user.username}')" ${user.id === currentUser.id ? 'disabled title="Не можеш да изтриеш собствения си акаунт"' : ''}>Изтрий</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading all users:', error);
        const container = document.getElementById('allUsersContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при зареждане: ${error.message}</div>`;
        }
    }
}

// Approve or reject a user
async function approveUser(userId, approved) {
    try {
        // Ensure approved is a boolean
        approved = approved === true || approved === 'true';
        
        const action = approved ? 'одобряване' : 'отхвърляне';
        if (!confirm(`Сигурен ли си, че искаш да ${action} този потребител?`)) {
            return;
        }
        
        console.log(`Attempting to ${action} user ${userId} with approved=${approved} (type: ${typeof approved})`);
        
        const response = await apiFetch(`${API_BASE_URL}/users/${userId}/approve`, {
            method: 'PATCH',
            body: JSON.stringify({ approved: approved })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Грешка при ${action}`);
        }
        
        // If approved, get user data; if rejected, response is 204 No Content
        if (approved) {
            const user = await response.json();
            console.log(`User ${user.username} approved`);
        } else {
            console.log(`User ${userId} rejected and deleted`);
        }
        
        // Reload pending users list and all users list
        loadPendingUsers();
        loadAllUsers();
    } catch (error) {
        console.error(`Error ${approved ? 'approving' : 'rejecting'} user:`, error);
        alert(`Грешка: ${error.message}`);
    }
}

// Edit user - open modal
async function editUser(userId) {
    try {
        // Fetch user data
        const response = await apiFetch(`${API_BASE_URL}/users/all`);
        
        if (!response.ok) throw new Error('Грешка при зареждане на данни');
        
        const users = await response.json();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            alert('Потребителят не е намерен');
            return;
        }
        
        // Populate form fields
        document.getElementById('edit_user_id').value = user.id;
        document.getElementById('edit_user_username').value = user.username;
        document.getElementById('edit_user_email').value = user.email;
        document.getElementById('edit_user_first_name').value = user.first_name || '';
        document.getElementById('edit_user_last_name').value = user.last_name || '';
        document.getElementById('edit_user_role').value = user.role;
        document.getElementById('edit_user_approved').value = user.approved ? 'true' : 'false';
        document.getElementById('edit_user_change_password').checked = false;
        document.getElementById('edit_user_password').value = '';
        document.getElementById('password_field_group').style.display = 'none';
        
        // Clear error message
        const errorDiv = document.getElementById('userEditError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        
        // Show modal
        const modal = document.getElementById('userEditModal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user for edit:', error);
        alert(`Грешка: ${error.message}`);
    }
}

// Toggle password field visibility
function togglePasswordField() {
    const checkbox = document.getElementById('edit_user_change_password');
    const passwordGroup = document.getElementById('password_field_group');
    const passwordField = document.getElementById('edit_user_password');
    
    if (checkbox && passwordGroup && passwordField) {
        if (checkbox.checked) {
            passwordGroup.style.display = 'block';
            passwordField.required = true;
        } else {
            passwordGroup.style.display = 'none';
            passwordField.required = false;
            passwordField.value = '';
        }
    }
}

// Close user edit modal
function closeUserEditModal() {
    const modal = document.getElementById('userEditModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reset form
    const form = document.getElementById('userEditForm');
    if (form) {
        form.reset();
    }
    const errorDiv = document.getElementById('userEditError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

// Handle user edit form submission
async function handleUserEditSubmit(event) {
    if (event) {
        event.preventDefault();
    }
    
    try {
        const userId = document.getElementById('edit_user_id').value;
        const username = document.getElementById('edit_user_username').value.trim();
        const email = document.getElementById('edit_user_email').value.trim();
        const firstName = document.getElementById('edit_user_first_name').value.trim();
        const lastName = document.getElementById('edit_user_last_name').value.trim();
        const role = document.getElementById('edit_user_role').value;
        const approved = document.getElementById('edit_user_approved').value === 'true';
        const changePassword = document.getElementById('edit_user_change_password').checked;
        const password = document.getElementById('edit_user_password').value;
        
        const errorDiv = document.getElementById('userEditError');
        
        // Validation
        if (!username || username.length < 3) {
            if (errorDiv) {
                errorDiv.textContent = 'Потребителското име трябва да е поне 3 символа';
                errorDiv.style.display = 'block';
            }
            return false;
        }
        
        if (!email) {
            if (errorDiv) {
                errorDiv.textContent = 'Имейлът е задължителен';
                errorDiv.style.display = 'block';
            }
            return false;
        }
        
        if (changePassword && password && password.length < 6) {
            if (errorDiv) {
                errorDiv.textContent = 'Паролата трябва да е поне 6 символа';
                errorDiv.style.display = 'block';
            }
            return false;
        }
        
        // Clear error
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        
        // Prepare update data
        const updateData = {
            username,
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            role,
            approved
        };
        
        if (changePassword && password) {
            updateData.password = password;
        }
        
        // Disable submit button
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Запазване...';
        }
        
        // Send update request
        const response = await apiFetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || 'Грешка при обновяване';
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
                errorDiv.style.display = 'block';
            }
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Запази промените';
            }
            return false;
        }
        
        const updatedUser = await response.json();
        console.log(`User ${updatedUser.username} updated`);
        
        // Close modal
        closeUserEditModal();
        
        // Show success message
        alert('Потребителят е обновен успешно!');
        
        // Reload all users list
        loadAllUsers();
        loadPendingUsers();
        
        return false;
    } catch (error) {
        console.error('Error updating user:', error);
        const errorDiv = document.getElementById('userEditError');
        if (errorDiv) {
            errorDiv.textContent = `Грешка: ${error.message}`;
            errorDiv.style.display = 'block';
        }
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Запази промените';
        }
        return false;
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const userEditModal = document.getElementById('userEditModal');
    const userDetailsModal = document.getElementById('userDetailsModal');
    if (event.target === userEditModal) {
        closeUserEditModal();
    }
    if (event.target === userDetailsModal) {
        closeUserDetailsModal();
    }
}

// Load password reset requests for admin
async function loadPasswordResetRequests() {
    try {
        const container = document.getElementById('passwordResetRequestsContainer');
        if (!container) {
            console.error('passwordResetRequestsContainer not found');
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/password-reset-requests`);
        
        if (!response.ok) {
            if (response.status === 403) {
                container.innerHTML = '<div class="error-message">Нямаш права за достъп до тази страница</div>';
            } else {
                throw new Error('Грешка при зареждане на заявки');
            }
            return;
        }
        
        const requests = await response.json();
        
        if (!Array.isArray(requests)) {
            console.error('Invalid requests data:', requests);
            container.innerHTML = '<div class="error-message">Невалидни данни</div>';
            return;
        }
        
        if (requests.length === 0) {
            container.innerHTML = '<p>Няма заявки за промяна на пароли.</p>';
            return;
        }
        
        const table = `
            <table class="incidents-table">
                <thead>
                    <tr>
                        <th>Потребител</th>
                        <th>Имейл</th>
                        <th>Статус</th>
                        <th>Дата на заявка</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(req => {
                        const statusBadge = req.status === 'pending' 
                            ? '<span style="color: orange;">⏳ Чака одобрение</span>'
                            : req.status === 'approved'
                            ? '<span style="color: green;">✓ Одобрена</span>'
                            : '<span style="color: red;">✗ Отхвърлена</span>';
                        
                        return `
                            <tr>
                                <td>${req.username || 'N/A'}</td>
                                <td>${req.email || 'N/A'}</td>
                                <td>${statusBadge}</td>
                                <td>${formatDate(req.requested_at)}</td>
                                <td class="action-buttons">
                                    ${req.status === 'pending' ? `
                                        <button class="btn btn-primary" onclick="reviewPasswordReset('${req.id}', true)">Одобри</button>
                                        <button class="btn btn-secondary" onclick="reviewPasswordReset('${req.id}', false)">Отхвърли</button>
                                    ` : '-'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = table;
    } catch (error) {
        console.error('Error loading password reset requests:', error);
        const container = document.getElementById('passwordResetRequestsContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Грешка при зареждане: ${error.message}</div>`;
        }
    }
}

// Review password reset request
async function reviewPasswordReset(requestId, approved) {
    try {
        const action = approved ? 'одобряване' : 'отхвърляне';
        if (!confirm(`Сигурен ли си, че искаш да ${action} тази заявка за промяна на парола?`)) {
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/password-reset-requests/${requestId}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ approved })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Грешка при ${action}`);
        }
        
        const result = await response.json();
        console.log(`Password reset request ${approved ? 'approved' : 'rejected'} for user: ${result.username}`);
        
        alert(`Заявката е ${approved ? 'одобрена' : 'отхвърлена'} успешно!`);
        
        // Reload requests list
        loadPasswordResetRequests();
    } catch (error) {
        console.error(`Error ${approved ? 'approving' : 'rejecting'} password reset request:`, error);
        alert(`Грешка: ${error.message}`);
    }
}

// Delete user
async function deleteUser(userId, username) {
    try {
        if (!confirm(`Сигурен ли си, че искаш да изтриеш потребителя "${username}"? Това действие не може да бъде отменено!`)) {
            return;
        }
        
        const response = await apiFetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Грешка при изтриване');
        }
        
        console.log(`User ${username} deleted`);
        alert('Потребителят е изтрит успешно!');
        
        // Reload all users list
        loadAllUsers();
        loadPendingUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Грешка: ${error.message}`);
    }
}

// Toggle user dropdown
function toggleUserDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        const isOpening = !dropdown.classList.contains('active');
        dropdown.classList.toggle('active');
        // If opening dropdown and user is engineer, show and load current month hours
        if (isOpening && currentUser && currentUser.role === 'engineer') {
            const hoursElement = document.getElementById('engineerCurrentMonthHours');
            if (hoursElement) {
                hoursElement.style.display = 'flex';
            }
            loadEngineerCurrentMonthHours();
        }
    }
}

// Toggle engineer filter dropdown
function toggleEngineerFilterDropdown(type) {
    let dropdownId;
    if (type === 'engineer') {
        dropdownId = 'engineer_filter_dropdown';
    } else if (type === 'manager') {
        dropdownId = 'manager_filter_engineer_dropdown';
    } else if (type === 'admin') {
        dropdownId = 'admin_filter_engineer_dropdown';
    }
    
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        const isOpen = dropdown.style.display !== 'none';
        // Close all dropdowns first
        document.querySelectorAll('.engineer-filter-options').forEach(el => {
            el.style.display = 'none';
        });
        // Toggle current dropdown
        dropdown.style.display = isOpen ? 'none' : 'block';
    }
}

// Select engineer from filter dropdown
function selectEngineerFilter(type, username, displayName) {
    let hiddenInputId, dropdownId, selectedEl;
    
    if (type === 'engineer') {
        hiddenInputId = 'engineer_filter_engineer';
        dropdownId = 'engineer_filter_dropdown';
        const hiddenInput = document.getElementById(hiddenInputId);
        selectedEl = hiddenInput ? hiddenInput.parentElement.querySelector('.engineer-filter-selected .engineer-filter-placeholder') : null;
    } else if (type === 'manager') {
        hiddenInputId = 'manager_filter_engineer';
        dropdownId = 'manager_filter_engineer_dropdown';
        const hiddenInput = document.getElementById(hiddenInputId);
        selectedEl = hiddenInput ? hiddenInput.parentElement.querySelector('.engineer-filter-selected .engineer-filter-placeholder') : null;
    } else if (type === 'admin') {
        hiddenInputId = 'admin_filter_engineer';
        dropdownId = 'admin_filter_engineer_dropdown';
        const hiddenInput = document.getElementById(hiddenInputId);
        selectedEl = hiddenInput ? hiddenInput.parentElement.querySelector('.engineer-filter-selected .engineer-filter-placeholder') : null;
    }
    
    const hiddenInput = document.getElementById(hiddenInputId);
    const dropdown = document.getElementById(dropdownId);
    
    if (hiddenInput && selectedEl) {
        hiddenInput.value = username || '';
        selectedEl.textContent = displayName || 'Всички';
    }
    
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.engineer-filter-dropdown')) {
        document.querySelectorAll('.engineer-filter-options').forEach(el => {
            el.style.display = 'none';
        });
    }
});

// Show user details modal
async function showUserDetails(username) {
    if (!username) {
        alert('Име на потребител не е посочено');
        return;
    }
    
    try {
        // Fetch user details by username
        const response = await apiFetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                alert('Потребителят не е намерен');
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || 'Грешка при зареждане на данни';
            console.error('Error fetching user details:', response.status, errorMessage);
            alert(`Грешка: ${errorMessage}`);
            return;
        }
        
        const user = await response.json();
        
        if (!user) {
            alert('Потребителят не е намерен');
            return;
        }
        
        // Populate modal with user details
        const details = `
            <div class="user-details">
                <div class="detail-row">
                    <div class="detail-label">Потребителско име:</div>
                    <div class="detail-value">${user.username || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Име:</div>
                    <div class="detail-value">${user.first_name || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Фамилия:</div>
                    <div class="detail-value">${user.last_name || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Имейл:</div>
                    <div class="detail-value">${user.email || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Роля:</div>
                    <div class="detail-value">
                        <span class="user-badge ${user.role}">${user.role === 'engineer' ? 'Инженер' : user.role === 'manager' ? 'Мениджър' : 'Администратор'}</span>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.getElementById('userDetailsModal');
        const detailsContainer = document.getElementById('userDetails');
        if (modal && detailsContainer) {
            detailsContainer.innerHTML = details;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        alert(`Грешка: ${error.message}`);
    }
}

// Close user details modal
function closeUserDetailsModal() {
    const modal = document.getElementById('userDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const userAccount = document.querySelector('.user-account');
    if (dropdown && userAccount && !userAccount.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

function logout() {
    try {
        console.log('Logging out user:', currentUser?.username);
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        authToken = null;
        currentUser = null;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Force redirect even if there's an error
        window.location.href = 'index.html';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('incidentModal');
    if (event.target === modal) {
        closeModal();
    }
}

