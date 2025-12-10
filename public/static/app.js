// APD OASIS Warehouse Logistic System - Frontend Application
// Version: 1.1.28 - A Code Logic Implementation (Box & Container Tracking)
console.log('%c🚀 APD OASIS v1.1.28 LOADED', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;')
console.log('✅ A Code Scanning: ENABLED')
console.log('✅ Box & Container Tracking: ENABLED')
console.log('✅ Dashboard Separate Counts: ENABLED')

// ============ Simple Storage Helper ============
// Simple wrapper that just uses localStorage (works in Capacitor webview)
const Storage = {
    get(key) {
        try {
            const value = localStorage.getItem(key)
            console.log('Storage GET:', key, '=', value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null')
            return value
        } catch (e) {
            console.error('Storage get error:', e)
            return null
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value)
            console.log('Storage SET:', key, '=', value ? (value.length > 50 ? 'saved (' + value.length + ' chars)' : value) : 'empty')
            // Verify it was saved
            const verify = localStorage.getItem(key)
            console.log('Storage VERIFY:', key, 'exists after save:', !!verify)
        } catch (e) {
            console.error('Storage set error:', e)
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key)
            console.log('Storage REMOVE:', key)
        } catch (e) {
            console.error('Storage remove error:', e)
        }
    }
}

// ============ State Management ============
const state = {
    user: null,
    token: null,
    currentPage: 'login',
    outlets: [],
    users: [],
    parcels: [],
    transfers: [],
    scannedItems: [],
    selectedOutlet: null,
    errors: [],
    cachedContainerInventory: null // OPTIMIZATION: Cache for container inventory API
}

// Permission helper functions
function canDelete() {
    return state.user && ['admin', 'warehouse_supervisor'].includes(state.user.role)
}

function canAmend() {
    return state.user && ['admin', 'warehouse_supervisor'].includes(state.user.role)
}

function isAdmin() {
    return state.user && state.user.role === 'admin'
}

function isSupervisor() {
    return state.user && state.user.role === 'warehouse_supervisor'
}

// ============ API Configuration ============
// Use production backend for mobile app
// Check multiple conditions for mobile environment
const isMobile = window.location.origin.startsWith('capacitor://') || 
                 window.location.origin.startsWith('file://') ||
                 window.location.origin.includes('localhost') ||
                 window.location.hostname === 'app' ||
                 window.location.protocol === 'capacitor:' ||
                 window.location.protocol === 'file:'

const API_BASE = isMobile ? 'https://apd-oasis.pages.dev' : window.location.origin

console.log('Window location origin:', window.location.origin)
console.log('Window location protocol:', window.location.protocol)
console.log('Is mobile detected:', isMobile)
console.log('API Base URL:', API_BASE)

axios.defaults.baseURL = API_BASE
axios.defaults.headers.common['Content-Type'] = 'application/json'
axios.defaults.headers.common['Accept'] = 'application/json'

// Ensure Axios always expects JSON responses
axios.defaults.responseType = 'json'

// Initialize app with stored token
const storedToken = Storage.get('token')
const storedUser = Storage.get('user')
console.log('Initializing app - Token:', !!storedToken, 'User:', !!storedUser)

// Check if there's a hash in URL
const initialHash = window.location.hash.substring(1)
console.log('Initial hash:', initialHash)

if (storedToken && storedUser) {
    try {
        state.token = storedToken
        state.user = JSON.parse(storedUser)
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        console.log('User loaded from storage:', state.user)
        
        // If hash exists, use it, otherwise go to default page
        const targetPage = initialHash || getDefaultPage()
        navigateTo(targetPage)
    } catch (error) {
        console.log('Failed to parse stored user:', error)
        Storage.remove('token')
        Storage.remove('user')
        navigateTo('login')
    }
} else {
    console.log('No stored credentials, showing login')
    navigateTo('login')
}

// ============ Helper Functions ============
function getDefaultPage() {
    if (!state.user) return 'login'
    
    switch(state.user.role) {
        case 'admin': return 'dashboard'
        case 'warehouse': return 'dashboard'
        case 'warehouse_staff': return 'dashboard'
        case 'warehouse_supervisor': return 'dashboard'
        case 'driver': return 'dashboard'
        case 'outlet': return 'outlet'
        default: return 'dashboard'
    }
}

function formatDate(dateString) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString()
}

function playBeep(success = true) {
    if (success) {
        // Success beep - pleasant tone
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBg==')
        audio.play().catch(() => {})
    } else {
        // Error sound - three short alert beeps
        const context = new (window.AudioContext || window.webkitAudioContext)()
        const beeps = [0, 0.15, 0.3] // Three beeps at 0ms, 150ms, 300ms
        
        beeps.forEach(time => {
            const oscillator = context.createOscillator()
            const gainNode = context.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(context.destination)
            
            oscillator.frequency.value = 800 // Higher pitch for alert
            oscillator.type = 'square' // Harsher sound
            
            gainNode.gain.setValueAtTime(0.3, context.currentTime + time)
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + time + 0.1)
            
            oscillator.start(context.currentTime + time)
            oscillator.stop(context.currentTime + time + 0.1)
        })
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
        toast.remove()
    }, 3000)
}

// ============ Navigation ============
function navigateTo(page) {
    console.log('navigateTo called:', page)
    state.currentPage = page
    // Use hash-based routing for better mobile compatibility
    window.location.hash = page
    render()
}

// Listen for hash changes (back button support)
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1) || 'login'
    console.log('Hash changed to:', hash)
    if (hash !== state.currentPage) {
        state.currentPage = hash
        render()
    }
})

function logout() {
    Storage.remove('token')
    Storage.remove('user')
    state.token = null
    state.user = null
    delete axios.defaults.headers.common['Authorization']
    window.location.reload()
}

// ============ Login Page ============
function renderLogin() {
    return `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div class="text-center mb-8">
                    <div class="inline-block bg-blue-500 text-white p-4 rounded-full mb-4">
                        <i class="fas fa-truck text-4xl"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800">APD OASIS</h1>
                    <p class="text-gray-600 mt-2">Warehouse Logistic System</p>
                </div>
                
                <form onsubmit="handleLogin(event)" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input type="text" id="username" required 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter username">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input type="password" id="password" required 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter password">
                    </div>
                    
                    <button type="submit" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition duration-200 transform hover:scale-105">
                        <i class="fas fa-sign-in-alt mr-2"></i> Login
                    </button>
                </form>
            </div>
        </div>
    `
}

async function handleLogin(event) {
    event.preventDefault()
    
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    
    try {
        console.log('Attempting login for:', username)
        console.log('API URL:', axios.defaults.baseURL + '/api/login')
        
        const response = await axios.post('/api/login', 
            { username, password },
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        )
        
        console.log('Login API response received')
        console.log('Response type:', typeof response.data)
        console.log('Response data:', response.data)
        
        // Check if response is actually JSON
        if (typeof response.data === 'string' || !response.data.token) {
            console.error('API returned non-JSON response:', response.data)
            showToast('Backend error - please check server configuration', 'error')
            return
        }
        
        // CRITICAL: Set state FIRST before storage
        state.token = response.data.token
        state.user = response.data.user
        axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        
        // Then save to storage
        Storage.set('token', response.data.token)
        Storage.set('user', JSON.stringify(response.data.user))
        
        console.log('State set:', state.user)
        console.log('Storage saved')
        
        showToast('Login successful!', 'success')
        
        // NO RELOAD, NO LOCATION.HREF - Pure DOM navigation
        setTimeout(() => {
            const targetPage = state.user.role === 'outlet' ? 'outlet' : 'dashboard'
            console.log('=== NAVIGATING TO:', targetPage, '===')
            console.log('Current state.user:', state.user)
            console.log('Current state.token:', state.token ? 'exists' : 'missing')
            
            // Set page and hash
            state.currentPage = targetPage
            window.location.hash = targetPage
            
            // FORCE COMPLETE DOM REPLACEMENT
            const app = document.getElementById('app')
            console.log('Clearing app DOM')
            app.innerHTML = ''
            
            console.log('Calling render()')
            render()
            
            console.log('=== NAVIGATION COMPLETE ===')
            console.log('Final state.currentPage:', state.currentPage)
            console.log('Final app.innerHTML length:', app.innerHTML.length)
        }, 100)
    } catch (error) {
        console.error('Login error:', error)
        showToast(error.response?.data?.error || 'Login failed', 'error')
    }
}

// ============ Navigation Bar ============
function renderNavBar() {
    if (!state.user) return ''
    
    // Mobile APK version: Show only Dashboard, Warehouse, Outlet
    // Web version: Show all tabs including Admin, Import, Reports, Profile
    const showAllTabs = !isMobile
    
    return `
        <nav class="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
            <div class="container mx-auto px-4 py-3">
                <!-- First Row: App Info and Logout -->
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-truck text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-bold">APD OASIS</h1>
                            <p class="text-xs text-blue-200">${state.user.full_name} (${state.user.role})</p>
                        </div>
                    </div>
                    
                    <button onclick="logout()" 
                        class="px-4 py-2 bg-red-500 hover:bg-red-600 rounded">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>
                
                <!-- Second Row: Navigation Tabs -->
                <div class="flex flex-wrap gap-2">
                    ${showAllTabs && state.user.role === 'admin' ? `
                        <button onclick="navigateTo('admin')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'admin' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-cog mr-2"></i>Admin
                        </button>
                    ` : ''}
                    
                    ${showAllTabs && ['admin', 'warehouse_supervisor'].includes(state.user.role) ? `
                        <button onclick="navigateTo('import')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'import' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-upload mr-2"></i>Import
                        </button>
                    ` : ''}
                    
                    ${['admin', 'warehouse', 'warehouse_staff', 'warehouse_supervisor', 'driver'].includes(state.user.role) ? `
                        <button onclick="navigateTo('dashboard')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'dashboard' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-tachometer-alt mr-2"></i>Dashboard
                        </button>
                        <button onclick="navigateTo('warehouse')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'warehouse' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-warehouse mr-2"></i>Warehouse
                        </button>
                    ` : ''}
                    
                    ${['admin', 'warehouse_staff', 'warehouse_supervisor', 'outlet', 'driver'].includes(state.user.role) ? `
                        <button onclick="navigateTo('outlet')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'outlet' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-store mr-2"></i>Outlet
                        </button>
                    ` : ''}
                    
                    ${['admin', 'warehouse_staff', 'warehouse_supervisor', 'outlet', 'driver'].includes(state.user.role) ? `
                        <button onclick="navigateTo('containers')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'containers' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-recycle mr-2"></i>Containers
                        </button>
                    ` : ''}
                    
                    ${showAllTabs ? `
                        <button onclick="navigateTo('reports')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'reports' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-chart-bar mr-2"></i>Reports
                        </button>
                        
                        <button onclick="navigateTo('profile')" 
                            class="flex-1 min-w-[120px] px-4 py-2 rounded ${state.currentPage === 'profile' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-user mr-2"></i>Profile
                        </button>
                    ` : ''}
                </div>
            </div>
        </nav>
    `
}

// ============ Admin Page ============
function renderAdmin() {
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-4 py-6 flex-1 overflow-y-auto">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-cog text-blue-600 mr-3"></i>Admin Configuration
            </h2>
            
            <div class="grid md:grid-cols-2 gap-6">
                <!-- User Management -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-users text-blue-600 mr-2"></i>User Management
                    </h3>
                    
                    <button onclick="showAddUserModal()" 
                        class="mb-4 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Add New User
                    </button>
                    
                    <!-- User Search -->
                    <div class="mb-4">
                        <div class="relative">
                            <input type="text" id="userSearchInput" 
                                placeholder="Search by username, full name, or role..." 
                                oninput="filterUsers()"
                                class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    
                    <div id="usersList" class="space-y-2 max-h-96 overflow-y-auto">
                        <p class="text-gray-500 text-center py-4">Loading users...</p>
                    </div>
                </div>
                
                <!-- Outlet Management -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-store text-blue-600 mr-2"></i>Outlet Management
                    </h3>
                    
                    <button onclick="showAddOutletModal()" 
                        class="mb-4 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>Add New Outlet
                    </button>
                    
                    <div id="outletsList" class="space-y-2 max-h-96 overflow-y-auto">
                        <p class="text-gray-500 text-center py-4">Loading outlets...</p>
                    </div>
                </div>
            </div>
        </div>
        </div>
    `
}

async function loadUsers() {
    try {
        const response = await axios.get('/api/admin/users')
        state.users = response.data.users
        renderUsersList(state.users)
    } catch (error) {
        console.error('Error loading users:', error)
    }
}

function renderUsersList(users) {
    const usersList = document.getElementById('usersList')
    if (!usersList) return
    
    if (users.length === 0) {
        usersList.innerHTML = '<p class="text-gray-500 text-center py-4">No users found</p>'
        return
    }
    
    // Helper function to format role display
    const formatRole = (role) => {
        const roleMap = {
            'admin': 'Admin',
            'warehouse': 'Warehouse Staff',
            'warehouse_staff': 'Warehouse Staff',
            'warehouse_supervisor': 'Warehouse Supervisor',
            'driver': 'Driver',
            'delivery_staff': 'Driver',
            'outlet': 'Outlet'
        }
        return roleMap[role] || role
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-semibold">${user.full_name}</p>
                    <p class="text-sm text-gray-600">@${user.username} - ${formatRole(user.role)}</p>
                    ${user.outlet_code ? `<p class="text-sm text-blue-600">Outlet: ${user.outlet_code}</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button onclick="showEditUserModal('${user.id}')" 
                        class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="resetUserPassword('${user.id}')" 
                        class="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
                        title="Reset password to Alpro@123">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="toggleUserStatus('${user.id}', ${!user.is_active})" 
                        class="px-3 py-1 rounded text-sm ${user.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onclick="deleteUser('${user.id}')" 
                        class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('')
}

function filterUsers() {
    const searchInput = document.getElementById('userSearchInput')
    if (!searchInput) return
    
    const searchTerm = searchInput.value.toLowerCase().trim()
    
    if (!searchTerm) {
        renderUsersList(state.users)
        return
    }
    
    const filteredUsers = state.users.filter(user => {
        const username = user.username.toLowerCase()
        const fullName = user.full_name.toLowerCase()
        const role = user.role.toLowerCase()
        const outletCode = (user.outlet_code || '').toLowerCase()
        
        return username.includes(searchTerm) || 
               fullName.includes(searchTerm) || 
               role.includes(searchTerm) ||
               outletCode.includes(searchTerm)
    })
    
    renderUsersList(filteredUsers)
}

async function loadOutlets() {
    try {
        const response = await axios.get('/api/admin/outlets')
        state.outlets = response.data.outlets
        
        const outletsList = document.getElementById('outletsList')
        if (!outletsList) return
        
        if (state.outlets.length === 0) {
            outletsList.innerHTML = '<p class="text-gray-500 text-center py-4">No outlets found</p>'
            return
        }
        
        outletsList.innerHTML = state.outlets.map(outlet => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${outlet.outlet_code} - ${outlet.outlet_name}</p>
                        <p class="text-sm text-gray-600">${outlet.address || 'No address'}</p>
                    </div>
                    <span class="px-3 py-1 rounded text-sm ${outlet.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${outlet.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        `).join('')
    } catch (error) {
        console.error('Error loading outlets:', error)
    }
}

function showAddUserModal() {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">Add New User</h3>
            <form onsubmit="handleAddUser(event)">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Username</label>
                        <input type="text" id="new_username" required class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Password</label>
                        <input type="password" id="new_password" required class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Full Name</label>
                        <input type="text" id="new_full_name" required class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Role</label>
                        <select id="new_role" required class="w-full px-3 py-2 border rounded-lg" onchange="toggleOutletField()">
                            <option value="admin">Admin</option>
                            <option value="warehouse_supervisor">Warehouse Supervisor</option>
                            <option value="warehouse_staff">Warehouse Staff</option>
                            <option value="delivery_staff">Driver</option>
                            <option value="outlet">Outlet</option>
                        </select>
                    </div>
                    <div id="outlet_field" style="display: none;">
                        <label class="block text-sm font-medium mb-1">Outlet Code</label>
                        <select id="new_outlet_code" class="w-full px-3 py-2 border rounded-lg">
                            <option value="">Select Outlet</option>
                            ${state.outlets.map(o => `<option value="${o.outlet_code}">${o.outlet_code} - ${o.outlet_name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="flex space-x-3 mt-6">
                    <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Add User
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
}

function toggleOutletField() {
    const role = document.getElementById('new_role').value
    const outletField = document.getElementById('outlet_field')
    outletField.style.display = role === 'outlet' ? 'block' : 'none'
}

async function handleAddUser(event) {
    event.preventDefault()
    
    const userData = {
        username: document.getElementById('new_username').value,
        password: document.getElementById('new_password').value,
        full_name: document.getElementById('new_full_name').value,
        role: document.getElementById('new_role').value,
        outlet_code: document.getElementById('new_outlet_code').value || null
    }
    
    try {
        await axios.post('/api/admin/users', userData)
        showToast('User added successfully', 'success')
        document.querySelector('.fixed').remove()
        loadUsers()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to add user', 'error')
    }
}

async function toggleUserStatus(userId, isActive) {
    try {
        await axios.patch(`/api/admin/users/${userId}`, { is_active: isActive })
        showToast(`User ${isActive ? 'activated' : 'deactivated'}`, 'success')
        loadUsers()
    } catch (error) {
        showToast('Failed to update user', 'error')
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
        await axios.delete(`/api/admin/users/${userId}`)
        showToast('User deleted', 'success')
        loadUsers()
    } catch (error) {
        showToast('Failed to delete user', 'error')
    }
}

async function showEditUserModal(userId) {
    // Fetch user data
    try {
        const response = await axios.get(`/api/admin/users/${userId}`)
        const user = response.data
        
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 class="text-xl font-bold mb-4">Edit User</h3>
                <form onsubmit="handleEditUser(event, '${userId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Username</label>
                            <input type="text" id="edit_username" value="${user.username}" required
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Full Name</label>
                            <input type="text" id="edit_full_name" value="${user.full_name}" required
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Role</label>
                            <select id="edit_role" onchange="toggleEditOutletField()" required
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="warehouse_supervisor" ${user.role === 'warehouse_supervisor' ? 'selected' : ''}>Warehouse Supervisor</option>
                                <option value="warehouse_staff" ${user.role === 'warehouse_staff' || user.role === 'warehouse' ? 'selected' : ''}>Warehouse Staff</option>
                                <option value="delivery_staff" ${user.role === 'delivery_staff' || user.role === 'driver' ? 'selected' : ''}>Driver</option>
                                <option value="outlet" ${user.role === 'outlet' ? 'selected' : ''}>Outlet</option>
                            </select>
                        </div>
                        
                        <div id="edit_outlet_field" style="display: ${user.role === 'outlet' ? 'block' : 'none'}">
                            <label class="block text-sm font-medium mb-1">Outlet Code</label>
                            <input type="text" id="edit_outlet_code" value="${user.outlet_code || ''}"
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">
                                Password 
                                <span class="text-gray-500 text-xs">(leave empty to keep unchanged)</span>
                            </label>
                            <input type="password" id="edit_password" placeholder="New password (optional)"
                                class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div class="flex space-x-2 pt-4">
                            <button type="submit" 
                                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold">
                                <i class="fas fa-save mr-2"></i>Save Changes
                            </button>
                            <button type="button" onclick="this.closest('.fixed').remove()"
                                class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded font-semibold">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `
        document.body.appendChild(modal)
    } catch (error) {
        showToast('Failed to load user data', 'error')
    }
}

function toggleEditOutletField() {
    const role = document.getElementById('edit_role').value
    const outletField = document.getElementById('edit_outlet_field')
    outletField.style.display = role === 'outlet' ? 'block' : 'none'
}

async function handleEditUser(event, userId) {
    event.preventDefault()
    
    const userData = {
        username: document.getElementById('edit_username').value,
        full_name: document.getElementById('edit_full_name').value,
        role: document.getElementById('edit_role').value,
        outlet_code: document.getElementById('edit_outlet_code').value || null
    }
    
    // Only include password if it's been changed
    const password = document.getElementById('edit_password').value
    if (password && password.trim() !== '') {
        userData.password = password
    }
    
    try {
        await axios.patch(`/api/admin/users/${userId}`, userData)
        showToast('User updated successfully', 'success')
        document.querySelector('.fixed').remove()
        loadUsers()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to update user', 'error')
    }
}

async function resetUserPassword(userId) {
    if (!confirm('Reset this user\'s password to "Alpro@123"?')) return
    
    try {
        await axios.post(`/api/admin/reset-password/${userId}`)
        showToast('Password reset to Alpro@123', 'success')
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to reset password', 'error')
    }
}

function showAddOutletModal() {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">Add New Outlet</h3>
            <form onsubmit="handleAddOutlet(event)">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Outlet Code</label>
                        <input type="text" id="new_outlet_code" required class="w-full px-3 py-2 border rounded-lg" placeholder="e.g., A001">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Outlet Name</label>
                        <input type="text" id="new_outlet_name" required class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Address</label>
                        <textarea id="new_outlet_address" class="w-full px-3 py-2 border rounded-lg" rows="3"></textarea>
                    </div>
                </div>
                <div class="flex space-x-3 mt-6">
                    <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Add Outlet
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
}

async function handleAddOutlet(event) {
    event.preventDefault()
    
    const outletData = {
        outlet_code: document.getElementById('new_outlet_code').value,
        outlet_name: document.getElementById('new_outlet_name').value,
        address: document.getElementById('new_outlet_address').value,
        is_active: true
    }
    
    try {
        await axios.post('/api/admin/outlets', outletData)
        showToast('Outlet added successfully', 'success')
        document.querySelector('.fixed').remove()
        loadOutlets()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to add outlet', 'error')
    }
}

// ============ Import Page ============
function renderImport() {
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-4 py-6 flex-1 overflow-y-auto">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-upload text-blue-600 mr-3"></i>Import Pick & Pack Report
            </h2>
            
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-2">Instructions:</h3>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>Format:</strong> Pick & Pack Report from DC system</li>
                        <li><strong>Header Row:</strong> Row 15 (will be detected automatically)</li>
                        <li><strong>Data Starts:</strong> Row 16 onwards</li>
                        <li><strong>Required Columns:</strong></li>
                        <ul class="list-disc list-inside ml-6 mt-1">
                            <li>Column E: Store Code</li>
                            <li>Column F: Store Name</li>
                            <li>Column G: Pallet ID</li>
                            <li>Column V: Transfer No</li>
                        </ul>
                        <li><strong>Grouping:</strong> Same Pallet ID = One Parcel (multiple transfer numbers)</li>
                    </ul>
                </div>
                
                <div class="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <div class="flex items-start">
                        <i class="fas fa-exclamation-triangle text-yellow-500 mt-1 mr-3"></i>
                        <div class="flex-1">
                            <p class="font-semibold text-gray-800 mb-1">Re-importing Data?</p>
                            <p class="text-sm text-gray-700 mb-3">
                                If you're importing data that was already imported before, you need to clear the old data first to avoid duplicate errors.
                            </p>
                            <button onclick="confirmClearDatabase()" 
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                                <i class="fas fa-trash-alt mr-2"></i>Clear All Data
                            </button>
                            <p class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>This will delete all parcels, transfers, and audit logs. Use before re-importing.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input type="file" id="excelFile" accept=".xlsx,.xls" class="hidden" onchange="handleFileSelect(event)">
                    <label for="excelFile" class="cursor-pointer">
                        <i class="fas fa-file-excel text-6xl text-green-500 mb-4"></i>
                        <p class="text-lg font-semibold mb-2">Click to select Excel file</p>
                        <p class="text-sm text-gray-500">Supports .xlsx and .xls files</p>
                    </label>
                </div>
                
                <div id="importPreview" class="mt-6 hidden">
                    <h3 class="text-lg font-semibold mb-3">Preview:</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border" id="previewTable">
                        </table>
                    </div>
                    
                    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-calendar mr-2"></i>Delivery Date for this Import *
                        </label>
                        <input type="date" id="importDeliveryDate" 
                            class="w-full px-4 py-2 border-2 border-blue-300 rounded-lg"
                            value="${new Date().toISOString().split('T')[0]}">
                        <p class="text-xs text-gray-600 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            Select the delivery date for these parcels. Example: Import tonight for tomorrow's delivery.
                        </p>
                    </div>
                    
                    <div class="mt-6 flex space-x-3">
                        <button onclick="confirmImport()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
                            <i class="fas fa-check mr-2"></i>Confirm Import
                        </button>
                        <button onclick="cancelImport()" class="flex-1 bg-gray-300 hover:bg-gray-400 px-6 py-3 rounded-lg font-semibold">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
}

let importData = []

function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
            
            // Parse data (header at row 15, data starts at row 16)
            // In array: row 15 = index 14 (header), row 16 = index 15 (first data)
            console.log('=== EXCEL PARSING DEBUG ===')
            console.log('Total rows in Excel:', jsonData.length)
            console.log('Header row (index 14):', jsonData[14])
            console.log('First data row (index 15):', jsonData[15])
            console.log('Columns to extract: E(4), F(5), G(6), V(21)')
            
            importData = []
            for (let i = 15; i < jsonData.length; i++) {  // Start from index 15 (row 16)
                const row = jsonData[i]
                console.log(`\nProcessing row ${i}:`, {
                    'E(4)': row[4],
                    'F(5)': row[5],
                    'G(6)': row[6],
                    'V(21)': row[21]
                })
                
                if (row[4] && row[6] && row[21]) { // Check if required columns exist (E, G, V)
                    // Column E: Numeric outlet code (e.g., "0001")
                    let outletCode = String(row[4]).trim()
                    // Column F: Format "SHORTCODE - FULL NAME" (e.g., "JKJSTT1 - APOTEK ALPRO TEBET TIMUR")
                    let fullStoreName = String(row[5] || '').trim()
                    let outletCodeShort = ''
                    let outletName = fullStoreName
                    
                    // Extract short code from Column F (before " - ")
                    if (fullStoreName.includes(' - ')) {
                        const parts = fullStoreName.split(' - ')
                        outletCodeShort = parts[0].trim()  // Short code (e.g., "JKJSTT1")
                        outletName = parts[1] ? parts[1].trim() : fullStoreName  // Full name
                    }
                    
                    importData.push({
                        outlet_code: outletCode, // Column E - Numeric (e.g., "0001")
                        outlet_code_short: outletCodeShort, // From Column F - Short (e.g., "JKJSTT1")
                        outlet_name: outletName, // From Column F - Full name
                        pallet_id: String(row[6]).trim(), // Column G
                        transfer_number: String(row[21]).trim() // Column V
                    })
                }
            }
            
            console.log(`Parsed ${importData.length} rows from Excel`)
            console.log('Sample rows:', importData.slice(0, 3))
            
            if (importData.length === 0) {
                showToast('No valid data found in Excel file', 'error')
                return
            }
            
            // Show preview
            const preview = document.getElementById('importPreview')
            preview.classList.remove('hidden')
            
            // Group by pallet ID for preview (backend will also do this)
            const palletMap = new Map()
            importData.forEach(item => {
                if (!palletMap.has(item.pallet_id)) {
                    palletMap.set(item.pallet_id, {
                        ...item,
                        transfer_count: 0,
                        transfer_numbers: new Set()
                    })
                }
                const pallet = palletMap.get(item.pallet_id)
                pallet.transfer_numbers.add(item.transfer_number) // Use Set to avoid counting duplicates
                pallet.transfer_count = pallet.transfer_numbers.size
            })
            
            const previewData = Array.from(palletMap.values()).slice(0, 10)
            
            const table = document.getElementById('previewTable')
            table.innerHTML = `
                <thead class="bg-gray-100">
                    <tr>
                        <th class="border px-4 py-2">Outlet Short Code</th>
                        <th class="border px-4 py-2">Outlet Name</th>
                        <th class="border px-4 py-2">Pallet ID</th>
                        <th class="border px-4 py-2">Transfer Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${previewData.map(item => `
                        <tr>
                            <td class="border px-4 py-2 font-semibold">${item.outlet_code_short || item.outlet_code}</td>
                            <td class="border px-4 py-2">${item.outlet_name}</td>
                            <td class="border px-4 py-2 font-mono">${item.pallet_id}</td>
                            <td class="border px-4 py-2 text-center">${item.transfer_count}</td>
                        </tr>
                    `).join('')}
                    ${palletMap.size > 10 ? `
                        <tr>
                            <td colspan="4" class="border px-4 py-2 text-center text-gray-500">
                                ... and ${palletMap.size - 10} more parcels
                            </td>
                        </tr>
                    ` : ''}
                </tbody>
            `
            
            showToast(`Loaded ${importData.length} transfer numbers (${palletMap.size} parcels)`, 'success')
        } catch (error) {
            console.error('Error reading Excel:', error)
            showToast('Failed to read Excel file', 'error')
        }
    }
    
    reader.readAsArrayBuffer(file)
}

async function confirmImport() {
    if (importData.length === 0) return
    
    // DEBUG: Log what we're sending
    console.log('=== FRONTEND IMPORT DATA ===')
    console.log('Total rows to import:', importData.length)
    console.log('Sample rows:', importData.slice(0, 3))
    console.log('\nDetailed first row:')
    if (importData[0]) {
        console.log('  outlet_code:', importData[0].outlet_code)
        console.log('  outlet_code_short:', importData[0].outlet_code_short)
        console.log('  outlet_name:', importData[0].outlet_name)
        console.log('  pallet_id:', importData[0].pallet_id)
        console.log('  transfer_number:', importData[0].transfer_number)
    }
    
    // Show loading indicator
    showToast('Importing data, please wait...', 'info')
    
    // Disable confirm button to prevent double-clicks
    const confirmBtn = document.querySelector('[onclick="confirmImport()"]')
    if (confirmBtn) {
        confirmBtn.disabled = true
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Importing...'
    }
    
    try {
        // Get delivery date from input
        const deliveryDateInput = document.getElementById('importDeliveryDate')
        const deliveryDate = deliveryDateInput ? deliveryDateInput.value : new Date().toISOString().split('T')[0]
        
        if (!deliveryDate) {
            showToast('Please select a delivery date', 'error')
            if (confirmBtn) {
                confirmBtn.disabled = false
                confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Confirm Import'
            }
            return
        }
        
        // OPTIMIZED: Single batch upload with backend optimization
        // Backend processes ALL data at once using batch inserts (2 API calls total)
        // Much faster than chunked approach - completes in 3-5 seconds
        
        console.log('🚀 Starting import...')
        console.log(`Total rows: ${importData.length}`)
        
        // Show processing message
        showToast(`Processing ${importData.length} rows, please wait...`, 'info')
        
        const response = await axios.post('/api/import', {
            data: importData,
            import_date: new Date().toISOString().split('T')[0],
            delivery_date: deliveryDate
        }, {
            timeout: 60000  // 60 second timeout for large imports
        })
        
        console.log('✅ Import response:', response.data)
        
        // Show success message
        const totalParcels = response.data.total_parcels || importData.length
        const successMsg = `Successfully imported ${totalParcels} parcels for ${deliveryDate}!`
        showToast(successMsg, 'success')
        
        // Update UI to show success state
        if (confirmBtn) {
            confirmBtn.disabled = false
            confirmBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Import Complete!'
            confirmBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600')
            confirmBtn.classList.add('bg-green-500', 'hover:bg-green-600')
            
            // Add "Go to Warehouse" button next to it
            const warehouseBtn = document.createElement('button')
            warehouseBtn.className = 'ml-3 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg'
            warehouseBtn.innerHTML = '<i class="fas fa-warehouse mr-2"></i>Go to Warehouse'
            warehouseBtn.onclick = () => navigateTo('warehouse')
            confirmBtn.parentElement.appendChild(warehouseBtn)
        }
        
        cancelImport()
        // Don't auto-navigate to prevent triggering additional API calls that cause "Too Many Subrequests"
    } catch (error) {
        // Log full error details to console for debugging
        console.error('❌ IMPORT ERROR - Full Details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        })
        
        // Show detailed error message to user
        const errorData = error.response?.data
        let errorMsg = 'Import failed'
        
        if (errorData) {
            if (errorData.message) {
                errorMsg = errorData.message
                console.error('💥 Backend Error Message:', errorData.message)
            } else if (errorData.error) {
                errorMsg = errorData.error
            }
            
            // Log stack trace if available
            if (errorData.details) {
                console.error('📋 Backend Stack Trace:', errorData.details)
            }
        }
        
        showToast(errorMsg, 'error')
        
        // Re-enable button on error
        if (confirmBtn) {
            confirmBtn.disabled = false
            confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Confirm Import'
        }
    }
}

function cancelImport() {
    importData = []
    document.getElementById('excelFile').value = ''
    document.getElementById('importPreview').classList.add('hidden')
}

async function confirmClearDatabase() {
    // Show confirmation dialog
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete ALL operational data!\n\n' +
        'This will DELETE:\n' +
        '• All parcels (F-codes)\n' +
        '• All containers (A-codes)\n' +
        '• All transfer details\n' +
        '• All imports\n' +
        '• All scanned items in warehouse\n\n' +
        'This will PRESERVE:\n' +
        '• User accounts (login)\n' +
        '• System logs\n\n' +
        'Are you absolutely sure you want to continue?'
    )
    
    if (!confirmed) return
    
    try {
        showToast('Clearing database...', 'info')
        
        const response = await axios.post('/api/admin/clear-database')
        
        if (response.data.success) {
            // Clear frontend state to reflect database clear
            state.scannedItems = []
            state.parcels = []
            state.availablePallets = []
            state.availableACodeContainers = []
            state.outletScannedACodes = []
            state.outletScannedFCodes = []
            
            showToast(
                `✅ Database cleared successfully!\n` +
                `Deleted: ${response.data.deleted.parcels} parcels, ` +
                `${response.data.deleted.containers} containers, ` +
                `${response.data.deleted.transfer_details} transfers, ` +
                `${response.data.deleted.imports} imports\n` +
                `Preserved: Users & Logs`,
                'success'
            )
            
            // Reload current view to show empty state
            render()
        }
    } catch (error) {
        console.error('❌ CLEAR DATABASE ERROR:', error.response?.data)
        const errorMsg = error.response?.data?.message || 'Failed to clear database'
        showToast(errorMsg, 'error')
    }
}

// ============ Dashboard Page ============
function renderDashboard() {
    // Initialize dashboard date if not set
    if (!state.dashboardDate) {
        state.dashboardDate = new Date().toISOString().split('T')[0] // Today
    }
    
    // Calculate 5 days: 2 days before, today, 2 days after
    const today = new Date()
    
    const twoDaysBeforeYesterday = new Date(today)
    twoDaysBeforeYesterday.setDate(twoDaysBeforeYesterday.getDate() - 2)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const twoDaysAfterTomorrow = new Date(today)
    twoDaysAfterTomorrow.setDate(twoDaysAfterTomorrow.getDate() + 2)
    
    const twoDaysBeforeYesterdayStr = twoDaysBeforeYesterday.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const twoDaysAfterTomorrowStr = twoDaysAfterTomorrow.toISOString().split('T')[0]
    
    const selectedDate = state.dashboardDate
    
    // Format date labels
    const formatDateLabel = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    return `
        <div class="h-full flex flex-col">
            <div class="container mx-auto px-3 py-4 flex-1 overflow-y-auto" style="max-height: 100vh;">
                <h2 class="text-xl md:text-3xl font-bold mb-4 text-gray-800">
                    <i class="fas fa-tachometer-alt text-blue-600 mr-2"></i>Live Dashboard
                </h2>
                
                <!-- Date Selection Tabs (5 Days) -->
                <div class="bg-white rounded-lg shadow-lg mb-4 p-3">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex gap-1.5 flex-wrap">
                            <button onclick="setDashboardDate('${twoDaysBeforeYesterdayStr}')" 
                                class="px-2 py-1 text-[10px] rounded-lg font-semibold transition ${selectedDate === twoDaysBeforeYesterdayStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                                <i class="fas fa-angle-double-left mr-1"></i>-2 Days<br/><span class="text-[8px]">(${formatDateLabel(twoDaysBeforeYesterdayStr)})</span>
                            </button>
                            <button onclick="setDashboardDate('${yesterdayStr}')" 
                                class="px-2 py-1 text-xs rounded-lg font-semibold transition ${selectedDate === yesterdayStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                                <i class="fas fa-chevron-left mr-1"></i>Yesterday<br/><span class="text-[9px]">(${formatDateLabel(yesterdayStr)})</span>
                            </button>
                            <button onclick="setDashboardDate('${todayStr}')" 
                                class="px-2 py-1 text-xs rounded-lg font-semibold transition ${selectedDate === todayStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                                <i class="fas fa-calendar-day mr-1"></i>Today<br/><span class="text-[9px]">(${formatDateLabel(todayStr)})</span>
                            </button>
                            <button onclick="setDashboardDate('${tomorrowStr}')" 
                                class="px-2 py-1 text-xs rounded-lg font-semibold transition ${selectedDate === tomorrowStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                                Tomorrow<br/><span class="text-[9px]">(${formatDateLabel(tomorrowStr)})</span><i class="fas fa-chevron-right ml-1"></i>
                            </button>
                            <button onclick="setDashboardDate('${twoDaysAfterTomorrowStr}')" 
                                class="px-2 py-1 text-[10px] rounded-lg font-semibold transition ${selectedDate === twoDaysAfterTomorrowStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                                +2 Days<br/><span class="text-[8px]">(${formatDateLabel(twoDaysAfterTomorrowStr)})</span><i class="fas fa-angle-double-right ml-1"></i>
                            </button>
                        </div>
                        <button onclick="loadDashboardData()" 
                            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 text-xs md:text-sm rounded-lg">
                            <i class="fas fa-sync mr-1"></i>Refresh
                        </button>
                    </div>
                </div>
            
            <!-- Statistics Cards -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Total Outlets</p>
                            <i class="fas fa-store text-2xl text-blue-200"></i>
                        </div>
                        <p id="dash-total-outlets" class="text-2xl font-bold text-blue-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Total TN</p>
                            <i class="fas fa-pallet text-2xl text-purple-200"></i>
                        </div>
                        <p id="dash-total-pallets" class="text-2xl font-bold text-purple-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">TN Scanned</p>
                            <i class="fas fa-barcode text-2xl text-orange-200"></i>
                        </div>
                        <p id="dash-tn-scanned" class="text-2xl font-bold text-orange-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Outlet Loaded</p>
                            <i class="fas fa-warehouse text-2xl text-indigo-200"></i>
                        </div>
                        <p id="dash-outlet-loaded" class="text-2xl font-bold text-indigo-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Boxes Loaded</p>
                            <i class="fas fa-box text-2xl text-green-200"></i>
                        </div>
                        <p id="dash-loaded-boxes" class="text-2xl font-bold text-green-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Containers Loaded</p>
                            <i class="fas fa-cubes text-2xl text-teal-200"></i>
                        </div>
                        <p id="dash-loaded-containers" class="text-2xl font-bold text-teal-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Containers to Pickup</p>
                            <i class="fas fa-hand-holding text-2xl text-amber-200"></i>
                        </div>
                        <p id="dash-containers-pickup" class="text-2xl font-bold text-amber-600">-</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-4">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-gray-500 text-xs">Returning to Warehouse</p>
                            <i class="fas fa-undo-alt text-2xl text-purple-200"></i>
                        </div>
                        <p id="dash-containers-returning" class="text-2xl font-bold text-purple-600">-</p>
                    </div>
                </div>
            </div>
            
            <!-- Containers to Pickup Section -->
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="mb-4 flex items-center justify-between">
                    <h3 class="text-xl font-bold">
                        <i class="fas fa-hand-holding text-amber-600 mr-2"></i>
                        Containers Available for Pickup
                    </h3>
                    <span id="dash-pickup-date" class="text-sm text-gray-500"></span>
                </div>
                
                <div id="dash-containers-pickup-table" class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left">Outlet Code</th>
                                <th class="px-4 py-2 text-left">Outlet Name</th>
                                <th class="px-4 py-2 text-center">Containers Ready</th>
                                <th class="px-4 py-2 text-center">Delivered Today</th>
                                <th class="px-4 py-2 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody id="dash-pickup-table-body">
                            <tr>
                                <td colspan="5" class="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Containers Returning to Warehouse Section -->
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div class="mb-4 flex items-center justify-between">
                    <h3 class="text-xl font-bold">
                        <i class="fas fa-undo-alt text-purple-600 mr-2"></i>
                        Containers Returning to Warehouse
                    </h3>
                    <span id="dash-returning-date" class="text-sm text-gray-500"></span>
                </div>
                <p class="text-sm text-gray-600 mb-4">
                    <i class="fas fa-info-circle mr-1"></i>
                    Containers that have been picked up by drivers (signed off) and are on their way back to warehouse
                </p>
                
                <div id="dash-containers-returning-table" class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left">Outlet Code</th>
                                <th class="px-4 py-2 text-left">Outlet Name</th>
                                <th class="px-4 py-2 text-center">Containers Collected</th>
                                <th class="px-4 py-2 text-center">Collection Time</th>
                                <th class="px-4 py-2 text-left">Collected By</th>
                                <th class="px-4 py-2 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody id="dash-returning-table-body">
                            <tr>
                                <td colspan="6" class="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Progress Overview -->
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4">Loading Progress</h3>
                    <div class="mb-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Loaded</span>
                            <span id="dash-loading-percent">0%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div id="dash-loading-bar" class="bg-green-500 h-4 rounded-full" style="width: 0%"></div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <span id="dash-loading-text">0 / 0 containers loaded</span>
                    </p>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4">Delivery Progress</h3>
                    <div class="mb-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>Delivered</span>
                            <span id="dash-delivery-percent">0%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div id="dash-delivery-bar" class="bg-teal-500 h-4 rounded-full" style="width: 0%"></div>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">
                        <span id="dash-delivery-text">0 / 0 containers delivered</span>
                    </p>
                </div>
            </div>
            
            <!-- Outlet Status Table -->
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="mb-4">
                    <h3 class="text-xl font-bold">Outlet Status</h3>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left">Outlet Code</th>
                                <th class="px-4 py-2 text-left">Outlet Name</th>
                                <th class="px-4 py-2 text-center">Total TN</th>
                                <th class="px-4 py-2 text-center">Loaded TN</th>
                                <th class="px-4 py-2 text-center">Loaded Container</th>
                                <th class="px-4 py-2 text-center">Delivered</th>
                                <th class="px-4 py-2 text-center">Status</th>
                                <th class="px-4 py-2 text-center">Loaded At</th>
                                <th class="px-4 py-2 text-center">Delivered At</th>
                                <th class="px-4 py-2 text-left">Receiver</th>
                            </tr>
                        </thead>
                        <tbody id="dash-outlet-table">
                            <tr>
                                <td colspan="10" class="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
}

function setDashboardDate(date) {
    state.dashboardDate = date
    render()
    setTimeout(() => loadDashboardData(), 100)
}

async function loadDashboardData() {
    try {
        // Get selected date (default to today)
        const selectedDate = state.dashboardDate || new Date().toISOString().split('T')[0]
        
        // OPTIMIZATION: Cache container inventory to reduce subrequests
        let containersResponse
        if (state.cachedContainerInventory && Date.now() - state.cachedContainerInventory.timestamp < 30000) {
            // Use cached data if less than 30 seconds old
            containersResponse = state.cachedContainerInventory
        } else {
            containersResponse = await axios.get('/api/containers/inventory')
            state.cachedContainerInventory = {
                ...containersResponse,
                timestamp: Date.now()
            }
        }
        
        // Fetch parcels for selected date
        const parcelsResponse = await axios.get(`/api/dashboard/parcels?delivery_date=${selectedDate}`)
        
        const parcels = parcelsResponse.data.parcels || []
        const allContainers = containersResponse.data.containers || []
        
        // Group by outlet
        const outletMap = new Map()
        let totalPallets = 0
        let loadedPallets = 0
        let deliveredPallets = 0
        let totalLoadedContainers = 0
        let totalDeliveredContainers = 0
        let totalLoadedBoxes = 0 // NEW: Total boxes loaded (counted once per outlet)
        let totalLoadedACodeContainers = 0 // NEW: Total A-code containers loaded (counted once per outlet)
        let totalTNScanned = 0 // NEW: Count total transfer numbers scanned
        const outletsLoaded = new Set() // NEW: Track unique outlets that have been loaded
        const outletBoxCounts = new Map() // NEW: Track box counts per outlet (avoid double-counting)
        const outletContainerCounts = new Map() // NEW: Track container counts per outlet (avoid double-counting)
        
        parcels.forEach(parcel => {
            // Skip invalid parcels
            if (!parcel.outlet_code || !parcel.outlet_name) return
            if (parcel.outlet_code.toUpperCase().trim() === 'STORE CODE' && 
                parcel.outlet_name.toUpperCase().trim() === 'STORE NAME') return
            
            totalPallets++
            if (parcel.status === 'loaded') loadedPallets++
            if (parcel.status === 'delivered') deliveredPallets++
            
            // NEW: Count total transfer numbers (TN) scanned (loaded or delivered)
            if (parcel.status === 'loaded' || parcel.status === 'delivered') {
                totalTNScanned += (parcel.total_count || 0)
                // NEW: Track outlet has been loaded
                outletsLoaded.add(parcel.outlet_code)
            }
            
            if (!outletMap.has(parcel.outlet_code)) {
                outletMap.set(parcel.outlet_code, {
                    code: parcel.outlet_code,
                    code_short: parcel.outlet_code_short || parcel.outlet_code,
                    name: parcel.outlet_name,
                    total: 0,
                    loaded: 0,
                    delivered: 0,
                    container_count_loaded: null,
                    container_count_delivered: null,
                    last_loaded_at: null,
                    last_delivered_at: null,
                    last_receiver: null
                })
            }
            const outlet = outletMap.get(parcel.outlet_code)
            outlet.total++
            
            // Track loaded status and timestamp
            if (parcel.status === 'loaded' || parcel.status === 'delivered') {
                outlet.loaded++
                // Store latest loaded timestamp
                if (parcel.loaded_at && (!outlet.last_loaded_at || parcel.loaded_at > outlet.last_loaded_at)) {
                    outlet.last_loaded_at = parcel.loaded_at
                }
                // Track container count (use first non-null value from outlet)
                if (parcel.container_count_loaded && !outlet.container_count_loaded) {
                    outlet.container_count_loaded = parcel.container_count_loaded
                }
                // NEW: Track box_count and container_count ONCE per outlet (not per parcel)
                if (parcel.box_count && !outletBoxCounts.has(parcel.outlet_code)) {
                    outletBoxCounts.set(parcel.outlet_code, parcel.box_count)
                    totalLoadedBoxes += parcel.box_count
                }
                if (parcel.container_count && !outletContainerCounts.has(parcel.outlet_code)) {
                    outletContainerCounts.set(parcel.outlet_code, parcel.container_count)
                    totalLoadedACodeContainers += parcel.container_count
                }
            }
            
            // Track delivered status and info
            if (parcel.status === 'delivered') {
                outlet.delivered++
                // Store latest delivery info
                if (!outlet.last_delivered_at || parcel.delivered_at > outlet.last_delivered_at) {
                    outlet.last_delivered_at = parcel.delivered_at
                    outlet.last_receiver = parcel.received_by_name
                }
                // Track container count delivered
                if (parcel.container_count_delivered && !outlet.container_count_delivered) {
                    outlet.container_count_delivered = parcel.container_count_delivered
                }
            }
        })
        
        // Calculate total container counts from outlets
        outletMap.forEach(outlet => {
            if (outlet.container_count_loaded) {
                totalLoadedContainers += outlet.container_count_loaded
            }
            if (outlet.container_count_delivered) {
                totalDeliveredContainers += outlet.container_count_delivered
            }
        })
        
        // NEW LOGIC: Get outlets that have parcels scheduled for today
        const outletsScheduledToday = new Set()
        parcels.forEach(parcel => {
            if (parcel.outlet_code) {
                outletsScheduledToday.add(parcel.outlet_code)
            }
        })
        
        // Filter containers for pickup:
        // 1. Must have status='delivered' (ready for collection)
        // 2. Must belong to outlets scheduled for delivery today
        const containersForPickup = allContainers.filter(c => {
            return c.status === 'delivered' && outletsScheduledToday.has(c.outlet_code)
        })
        
        console.log(`📦 Containers for Pickup Logic:`)
        console.log(`   - Outlets scheduled today: ${outletsScheduledToday.size}`)
        console.log(`   - Total containers with status='delivered': ${allContainers.filter(c => c.status === 'delivered').length}`)
        console.log(`   - Containers for pickup (at scheduled outlets): ${containersForPickup.length}`)
        
        // Group containers by outlet for pickup table
        const pickupByOutlet = new Map()
        containersForPickup.forEach(container => {
            if (!pickupByOutlet.has(container.outlet_code)) {
                pickupByOutlet.set(container.outlet_code, {
                    outlet_code: container.outlet_code,
                    outlet_name: container.outlet_name,
                    containers: []
                })
            }
            pickupByOutlet.get(container.outlet_code).containers.push(container)
        })
        
        // Update statistics - use container counts if available, fallback to pallet counts
        document.getElementById('dash-total-outlets').textContent = outletMap.size
        document.getElementById('dash-total-pallets').textContent = totalPallets
        document.getElementById('dash-tn-scanned').textContent = totalTNScanned // NEW: Total TN Scanned
        document.getElementById('dash-outlet-loaded').textContent = outletsLoaded.size // NEW: Total Outlet Loaded
        document.getElementById('dash-loaded-boxes').textContent = totalLoadedBoxes // NEW: Total Boxes Loaded
        document.getElementById('dash-loaded-containers').textContent = totalLoadedACodeContainers // NEW: Total A-Code Containers Loaded
        document.getElementById('dash-containers-pickup').textContent = containersForPickup.length
        
        // Update pickup date display
        const dateLabel = new Date(selectedDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
        document.getElementById('dash-pickup-date').textContent = `As of ${dateLabel}`
        
        // Update containers pickup table
        const pickupTableBody = document.getElementById('dash-pickup-table-body')
        if (pickupByOutlet.size === 0) {
            pickupTableBody.innerHTML = '<tr><td colspan=\"5\" class=\"text-center py-4 text-gray-500\">No containers available for pickup</td></tr>'
        } else {
            pickupTableBody.innerHTML = Array.from(pickupByOutlet.values())
                .sort((a, b) => b.containers.length - a.containers.length)
                .map(outlet => {
                    const containerCount = outlet.containers.length
                    return `
                        <tr class=\"border-b hover:bg-gray-50\">
                            <td class=\"px-4 py-3\">
                                <span class=\"font-mono font-semibold\">${outlet.outlet_code}</span>
                            </td>
                            <td class=\"px-4 py-3\">${outlet.outlet_name}</td>
                            <td class=\"px-4 py-3 text-center\">
                                <span class=\"inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold\">
                                    ${containerCount}
                                </span>
                            </td>
                            <td class=\"px-4 py-3 text-center\">
                                <i class=\"fas fa-check-circle text-green-500\"></i> Yes
                            </td>
                            <td class=\"px-4 py-3\">
                                <span class=\"inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold\">
                                    <i class=\"fas fa-clock mr-1\"></i>Ready for Pickup
                                </span>
                            </td>
                        </tr>
                    `
                }).join('')
        }
        
        // Count containers returning to warehouse (status = 'collected')
        // Filter by collected_at date (when driver collected the container)
        const containersReturning = allContainers.filter(c => {
            if (c.status !== 'collected') return false
            if (!c.collected_at) return false
            const collectedDate = new Date(c.collected_at).toISOString().split('T')[0]
            return collectedDate === selectedDate
        })
        
        // Update containers returning statistic
        document.getElementById('dash-containers-returning').textContent = containersReturning.length
        document.getElementById('dash-returning-date').textContent = `As of ${dateLabel}`
        
        // Group returning containers by outlet
        const returningByOutlet = new Map()
        containersReturning.forEach(container => {
            if (!returningByOutlet.has(container.outlet_code)) {
                returningByOutlet.set(container.outlet_code, {
                    outlet_code: container.outlet_code,
                    outlet_name: container.outlet_name,
                    containers: []
                })
            }
            returningByOutlet.get(container.outlet_code).containers.push(container)
        })
        
        // Update containers returning table
        const returningTableBody = document.getElementById('dash-returning-table-body')
        if (returningByOutlet.size === 0) {
            returningTableBody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center py-4 text-gray-500\">No containers returning to warehouse</td></tr>'
        } else {
            returningTableBody.innerHTML = Array.from(returningByOutlet.values())
                .sort((a, b) => b.containers.length - a.containers.length)
                .map(outlet => {
                    const containerCount = outlet.containers.length
                    // Get latest collection time
                    const latestCollection = outlet.containers.reduce((latest, c) => {
                        return !latest || new Date(c.collected_at) > new Date(latest.collected_at) ? c : latest
                    }, null)
                    
                    const collectionTime = latestCollection?.collected_at ? 
                        new Date(latestCollection.collected_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'
                    const collectedBy = latestCollection?.collected_by_name || '-'
                    
                    return `
                        <tr class=\"border-b hover:bg-gray-50\">
                            <td class=\"px-4 py-3\">
                                <span class=\"font-mono font-semibold\">${outlet.outlet_code}</span>
                            </td>
                            <td class=\"px-4 py-3\">${outlet.outlet_name}</td>
                            <td class=\"px-4 py-3 text-center\">
                                <span class=\"inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold\">
                                    ${containerCount}
                                </span>
                            </td>
                            <td class=\"px-4 py-3 text-center text-sm\">
                                ${collectionTime}
                            </td>
                            <td class=\"px-4 py-3 text-sm\">
                                ${collectedBy}
                            </td>
                            <td class=\"px-4 py-3\">
                                <span class=\"inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold\">
                                    <i class=\"fas fa-truck mr-1\"></i>In Transit
                                </span>
                            </td>
                        </tr>
                    `
                }).join('')
        }
        
        // Update loading progress - show percentage based on TN, but text shows containers
        const loadingPercent = totalPallets > 0 ? Math.round((loadedPallets / totalPallets) * 100) : 0
        document.getElementById('dash-loading-percent').textContent = loadingPercent + '%'
        document.getElementById('dash-loading-bar').style.width = loadingPercent + '%'
        
        // Only show container count in text if containers have been recorded
        if (totalLoadedContainers > 0) {
            document.getElementById('dash-loading-text').textContent = `${totalLoadedContainers} container${totalLoadedContainers !== 1 ? 's' : ''} loaded`
        } else {
            document.getElementById('dash-loading-text').textContent = `0 containers loaded (${loadedPallets} / ${totalPallets} TN loaded)`
        }
        
        // Update delivery progress - show percentage based on TN, but text shows containers
        const deliveryPercent = totalPallets > 0 ? Math.round((deliveredPallets / totalPallets) * 100) : 0
        document.getElementById('dash-delivery-percent').textContent = deliveryPercent + '%'
        document.getElementById('dash-delivery-bar').style.width = deliveryPercent + '%'
        
        // Only show container count in text if containers have been recorded
        if (totalDeliveredContainers > 0) {
            document.getElementById('dash-delivery-text').textContent = `${totalDeliveredContainers} container${totalDeliveredContainers !== 1 ? 's' : ''} delivered`
        } else {
            document.getElementById('dash-delivery-text').textContent = `0 containers delivered (${deliveredPallets} / ${totalPallets} TN delivered)`
        }
        
        // Update outlet table
        const tableBody = document.getElementById('dash-outlet-table')
        if (outletMap.size === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">No data available</td></tr>'
            return
        }
        
        // Helper function to format timestamp with date
        const formatDateTime = (timestamp) => {
            if (!timestamp) return '-'
            const date = new Date(timestamp)
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const timeStr = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            })
            return `${dateStr}<br/>${timeStr}`
        }
        
        tableBody.innerHTML = Array.from(outletMap.values()).map(outlet => {
            const loadedPercent = outlet.total > 0 ? Math.round((outlet.loaded / outlet.total) * 100) : 0
            const deliveredPercent = outlet.total > 0 ? Math.round((outlet.delivered / outlet.total) * 100) : 0
            let status = 'Pending'
            let statusClass = 'bg-gray-200 text-gray-800'
            
            if (outlet.delivered === outlet.total) {
                status = 'Completed'
                statusClass = 'bg-green-200 text-green-800'
            } else if (outlet.loaded === outlet.total) {
                status = 'In Transit'
                statusClass = 'bg-blue-200 text-blue-800'
            } else if (outlet.loaded > 0) {
                status = 'Loading'
                statusClass = 'bg-yellow-200 text-yellow-800'
            }
            
            // Format loaded and delivered timestamps
            const loadedTimeStr = formatDateTime(outlet.last_loaded_at)
            const deliveredTimeStr = formatDateTime(outlet.last_delivered_at)
            const receiverStr = outlet.last_receiver || '-'
            
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3 font-mono">${outlet.code_short}</td>
                    <td class="px-4 py-3">${outlet.name}</td>
                    <td class="px-4 py-3 text-center font-bold">${outlet.total}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="text-green-600 font-semibold">${outlet.loaded}</span>
                        <span class="text-gray-400 text-sm"> (${loadedPercent}%)</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="text-blue-600 font-bold text-lg">${outlet.container_count_loaded || '-'}</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="text-teal-600 font-semibold">${outlet.delivered}</span>
                        <span class="text-gray-400 text-sm"> (${deliveredPercent}%)</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center text-xs ${outlet.last_loaded_at ? 'text-green-600 font-medium' : 'text-gray-400'}">
                        ${loadedTimeStr}
                    </td>
                    <td class="px-4 py-3 text-center text-xs ${outlet.last_delivered_at ? 'text-teal-600 font-medium' : 'text-gray-400'}">
                        ${deliveredTimeStr}
                    </td>
                    <td class="px-4 py-3 text-sm ${outlet.last_receiver ? 'text-gray-700' : 'text-gray-400'}">
                        ${receiverStr}
                    </td>
                </tr>
            `
        }).join('')
    } catch (error) {
        console.error('Error loading dashboard data:', error)
        showToast('Failed to load dashboard data', 'error')
    }
}

// Auto-refresh dashboard every 30 seconds
// Auto-refresh dashboard disabled to prevent "Too Many Subrequests" errors
// Dashboard will only load when user navigates to it or manually refreshes
// setInterval(() => {
//     if (state.currentPage === 'dashboard') {
//         loadDashboardData()
//     }
// }, 30000)

// ============ Warehouse Page ============
function renderWarehouse() {
    console.log('🏭 renderWarehouse() called')
    // Initialize warehouse delivery date if not set
    if (!state.warehouseDeliveryDate) {
        state.warehouseDeliveryDate = new Date().toISOString().split('T')[0]
        console.log('📅 Initialized warehouse delivery date:', state.warehouseDeliveryDate)
    } else {
        console.log('📅 Using existing warehouse delivery date:', state.warehouseDeliveryDate)
    }
    
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-2 py-2 flex-1 overflow-y-auto" style="max-height: 100vh;">
            <!-- Mobile-optimized header - smaller on small screens -->
            <h2 class="text-lg sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4 md:mb-6 text-gray-800">
                <i class="fas fa-warehouse text-blue-600 mr-2"></i>Warehouse Loading
            </h2>
            
            <!-- Delivery Date Selection - Compact for mobile -->
            <div class="bg-white rounded-lg shadow-lg mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <label class="text-sm sm:text-base font-semibold text-gray-700 whitespace-nowrap">
                        <i class="fas fa-calendar mr-1 sm:mr-2"></i>Delivery Date:
                    </label>
                    <input type="date" id="warehouseDeliveryDate" 
                        class="w-full sm:w-auto px-3 py-2 border-2 border-blue-300 rounded-lg text-sm sm:text-base font-semibold"
                        value="${state.warehouseDeliveryDate}"
                        onchange="setWarehouseDeliveryDate(this.value)">
                    <p class="text-xs sm:text-sm text-gray-600 hidden sm:block">
                        <i class="fas fa-info-circle mr-1"></i>
                        Select the delivery date to view and load parcels
                    </p>
                </div>
            </div>
            
            <div class="grid lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                <!-- Scanning Panel - Mobile optimized -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
                        <h3 class="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 md:mb-4">
                            <i class="fas fa-pallet mr-2 text-blue-600"></i>Scan Pallet ID
                        </h3>
                        
                        <div class="mb-3 sm:mb-4">
                            <input type="text" id="warehouseScanInput" 
                                class="w-full px-3 py-2 sm:px-4 sm:py-3 border-4 border-blue-500 rounded-lg text-base sm:text-lg scan-input"
                                placeholder="Scan Pallet ID..."
                                autofocus
                                onkeydown="if(event.key==='Enter' || event.keyCode===13) { event.preventDefault(); handleWarehouseScan(); }"
                                onkeypress="if(event.key==='Enter') handleWarehouseScan()">
                        </div>
                        
                        <div class="bg-blue-50 border-l-4 border-blue-500 p-2 sm:p-3 mb-3 sm:mb-4">
                            <p class="text-xs sm:text-sm text-blue-800">
                                <i class="fas fa-info-circle mr-1 sm:mr-2"></i>
                                <strong>New!</strong> Scan Pallet ID to mark all transfers as loaded.
                            </p>
                        </div>
                        
                        ${!canDelete() ? `
                            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4">
                                <p class="text-sm text-yellow-800">
                                    <i class="fas fa-lock mr-2"></i>
                                    <strong>Note:</strong> Only supervisors and admins can delete transfers. Contact your supervisor if you need to remove records.
                                </p>
                            </div>
                        ` : ''}
                        
                        <button onclick="handleWarehouseScan()" 
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg mb-4">
                            <i class="fas fa-barcode mr-2"></i>Scan Pallet ID
                        </button>
                        
                        <!-- Scanned Items -->
                        <div class="mt-6">
                            <h4 class="font-semibold mb-3">Scanned Items (${state.scannedItems.length})</h4>
                            <div id="scannedItemsList" class="space-y-2 max-h-96 overflow-y-auto">
                                <p class="text-gray-500 text-center py-4">No items scanned yet</p>
                            </div>
                        </div>
                        
                        <!-- Complete Loading Button -->
                        <div class="mt-6">
                            <button onclick="showCompleteLoadingModal()" 
                                class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                                <i class="fas fa-check-circle mr-2"></i>Complete Loading Process
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Outlets Summary -->
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold mb-4">Outlets Summary</h3>
                        <div id="outletsSummary" class="space-y-3">
                            <p class="text-gray-500 text-center py-4">Loading...</p>
                        </div>
                        
                        <button onclick="loadWarehouseData()" 
                            class="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-sync mr-2"></i>Refresh
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
}

function setWarehouseDeliveryDate(date) {
    console.log('🗓️ Warehouse delivery date changed to:', date)
    state.warehouseDeliveryDate = date
    console.log('✓ State updated, warehouseDeliveryDate =', state.warehouseDeliveryDate)
    loadWarehouseData()
}

function setOutletDeliveryDate(date) {
    state.outletDeliveryDate = date
    // Refresh outlet pallets if outlet is selected
    if (state.selectedOutlet) {
        loadOutletPallets()
    }
}

async function loadWarehouseData() {
    try {
        // Get selected delivery date (default to today)
        const deliveryDate = state.warehouseDeliveryDate || new Date().toISOString().split('T')[0]
        
        const response = await axios.get(`/api/warehouse/parcels?delivery_date=${deliveryDate}`)
        state.parcels = response.data.parcels
        
        console.log('Loaded parcels:', state.parcels.length)
        
        // IMPORTANT: Load previously scanned pallets (status='loaded' but not confirmed yet)
        // This allows users to see scanned list even after logout/refresh/user change
        const scannedParcels = state.parcels.filter(p => p.status === 'loaded')
        if (scannedParcels.length > 0 && state.scannedItems.length === 0) {
            console.log(`📦 Restoring ${scannedParcels.length} previously scanned pallets`)
            state.scannedItems = scannedParcels.map(p => ({
                pallet_id: p.pallet_id,
                outlet_code: p.outlet_code,
                outlet_code_short: p.outlet_code_short,
                outlet_name: p.outlet_name,
                transfer_count: p.total_count,
                delivery_date: p.delivery_date,
                time: p.loaded_at ? new Date(p.loaded_at).toLocaleTimeString() : 'Previously scanned'
            }))
            updateScannedItemsList()
            console.log('✅ Scanned items restored from database')
        }
        
        // Group by outlet - using parcels instead of transfers for accurate pallet counting
        const outletMap = new Map()
        state.parcels.forEach(parcel => {
            // Skip ONLY if outlet_code AND outlet_name BOTH match header pattern exactly
            // This prevents filtering out legitimate data that happens to have "STORE CODE" in the name
            if (!parcel.outlet_code || !parcel.outlet_name) {
                console.log('Skipping parcel with missing data:', parcel.outlet_code, parcel.outlet_name)
                return // Skip this parcel
            }
            
            // Only skip if BOTH fields are exactly "STORE CODE" and "STORE NAME" (header row)
            if (parcel.outlet_code.toUpperCase().trim() === 'STORE CODE' && 
                parcel.outlet_name.toUpperCase().trim() === 'STORE NAME') {
                console.log('Skipping header row:', parcel.outlet_code, parcel.outlet_name)
                return // Skip this parcel
            }
            
            if (!outletMap.has(parcel.outlet_code)) {
                outletMap.set(parcel.outlet_code, {
                    code: parcel.outlet_code,
                    code_short: parcel.outlet_code_short || parcel.outlet_code,
                    name: parcel.outlet_name,
                    total: 0,
                    scanned: 0
                })
            }
            const outlet = outletMap.get(parcel.outlet_code)
            outlet.total++
            if (parcel.status === 'loaded' || parcel.status === 'delivered') {
                outlet.scanned++
            }
        })
        
        console.log('Outlet map size:', outletMap.size)
        
        const summary = document.getElementById('outletsSummary')
        if (!summary) return
        
        if (state.parcels.length === 0) {
            summary.innerHTML = '<p class="text-gray-500 text-center py-4">No parcels in database</p>'
            return
        }
        
        if (outletMap.size === 0) {
            summary.innerHTML = '<p class="text-gray-500 text-center py-4">All parcels filtered (check data quality)</p>'
            return
        }
        
        // Check if outlets are delivered or completed loading
        const outlets = Array.from(outletMap.values()).map(outlet => {
            const percentage = outlet.total > 0 ? Math.round((outlet.scanned / outlet.total) * 100) : 0
            const isComplete = outlet.scanned === outlet.total
            
            // Check if all parcels for this outlet are delivered (not just loaded)
            const outletParcels = state.parcels.filter(p => p.outlet_code === outlet.code)
            const allDelivered = outletParcels.every(p => p.status === 'delivered')
            
            // Check if loading is completed (has loaded_at timestamp AND is fully loaded)
            const loadingCompleted = outletParcels.every(p => p.status === 'loaded' && p.loaded_at)
            
            return { ...outlet, percentage, isComplete, allDelivered, loadingCompleted }
        })
        
        // Separate into pending, completed loading, and delivered outlets
        // Only show pending outlets (not completed loading or delivered)
        const pendingOutlets = outlets.filter(o => !o.loadingCompleted && !o.allDelivered)
        const deliveredOutlets = outlets.filter(o => o.allDelivered)
        
        // Render function for outlet card
        const renderOutletCard = (outlet) => {
            const badgeColor = outlet.allDelivered ? 'bg-purple-500' : (outlet.isComplete ? 'bg-green-500' : 'bg-blue-500')
            const badgeText = outlet.allDelivered ? 'Delivered' : (outlet.isComplete ? 'Loaded' : 'Pending')
            const borderColor = outlet.allDelivered ? 'border-purple-500 bg-purple-50' : (outlet.isComplete ? 'border-green-500 bg-green-50' : 'border-gray-300')
            
            return `
                <div class="border-2 ${borderColor} rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <p class="font-bold text-lg">${outlet.code_short}</p>
                                <span class="${badgeColor} text-white text-xs px-2 py-1 rounded-full">
                                    ${badgeText}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600">${outlet.name}</p>
                            <p class="text-xs text-gray-500">Code: ${outlet.code}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${outlet.isComplete ? '<i class="fas fa-check-circle text-green-500 text-2xl"></i>' : ''}
                        </div>
                    </div>
                    <div class="mt-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>${outlet.scanned} / ${outlet.total} pallets</span>
                            <span>${outlet.percentage}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="${outlet.allDelivered ? 'bg-purple-500' : 'bg-blue-500'} h-2 rounded-full" style="width: ${outlet.percentage}%"></div>
                        </div>
                    </div>
                    <div class="mt-3 flex space-x-2">
                        <button onclick="showOutletDetails('${outlet.code}')" 
                            class="${canDelete() ? 'flex-1' : 'w-full'} bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm">
                            <i class="fas fa-list mr-1"></i>Details
                        </button>
                        ${canDelete() ? `
                            <button onclick="confirmDeleteOutlet('${outlet.code}')" 
                                class="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm">
                                <i class="fas fa-trash mr-1"></i>Delete All
                            </button>
                        ` : ''}
                    </div>
                </div>
            `
        }
        
        // Build HTML: Pending first, then delivered with separator
        let html = ''
        
        // Pending outlets
        if (pendingOutlets.length > 0) {
            html += pendingOutlets.map(renderOutletCard).join('')
        }
        
        // Delivered outlets with separator
        if (deliveredOutlets.length > 0) {
            if (pendingOutlets.length > 0) {
                html += `
                    <div class="my-4 border-t-2 border-gray-300 pt-4">
                        <p class="text-sm text-gray-600 font-semibold mb-3">
                            <i class="fas fa-check-double mr-2"></i>Delivered (${deliveredOutlets.length})
                        </p>
                    </div>
                `
            }
            html += deliveredOutlets.map(renderOutletCard).join('')
        }
        
        summary.innerHTML = html
    } catch (error) {
        console.error('Error loading warehouse data:', error)
    }
}

// Debounce scanner to prevent double-scan
let warehouseScanTimeout = null

async function handleWarehouseScan() {
    const input = document.getElementById('warehouseScanInput')
    const palletId = input.value.trim().toUpperCase()
    
    if (!palletId) return
    
    // Get selected delivery date (check both input field and state for APK compatibility)
    const deliveryDateInput = document.getElementById('warehouseDeliveryDate')
    const deliveryDate = deliveryDateInput?.value || state.warehouseDeliveryDate
    
    // 🐛 DEBUG: Log date selection details for APK debugging
    console.log('=== WAREHOUSE SCAN DEBUG ===')
    console.log('Input element exists:', !!deliveryDateInput)
    console.log('Input element value:', deliveryDateInput?.value)
    console.log('State delivery date:', state.warehouseDeliveryDate)
    console.log('Final delivery date:', deliveryDate)
    console.log('Pallet ID:', palletId)
    console.log('===========================')
    
    if (!deliveryDate) {
        console.error('❌ No delivery date found!')
        playBeep(false)
        showToast('⚠️ Please select a delivery date first', 'error')
        input.value = ''
        input.focus()
        return
    }
    
    // Clear input immediately to prevent scanner double-scan
    input.value = ''
    
    // Debounce: prevent double-scan within 500ms
    if (warehouseScanTimeout) {
        console.log('Debounced duplicate scan')
        return
    }
    warehouseScanTimeout = setTimeout(() => {
        warehouseScanTimeout = null
    }, 500)
    
    console.log('✓ Scanning with delivery date:', deliveryDate)
    
    // Check for duplicate scan in current session
    const alreadyScanned = state.scannedItems.find(item => item.pallet_id === palletId)
    if (alreadyScanned) {
        playBeep(false)
        showToast(`⚠️ Duplicate scan! Pallet ${palletId} was already scanned at ${alreadyScanned.time}`, 'error')
        input.value = ''
        input.focus()
        return
    }
    
    try {
        // 🐛 DEBUG: Log the API request payload
        const payload = { 
            pallet_id: palletId,
            delivery_date: deliveryDate
        }
        console.log('📤 Sending API request:', payload)
        
        // NEW: Scan pallet ID (scans entire pallet at once) with delivery date validation
        const response = await axios.post('/api/warehouse/scan-pallet', payload)
        
        // 🐛 DEBUG: Log the API response
        console.log('📥 API response:', response.data)
        
        if (response.data.success) {
            console.log('✅ Scan successful!')
            playBeep(true)
            const outletDisplay = response.data.outlet_code_short || response.data.outlet_code
            showToast(`✓ Pallet ${palletId} loaded - ${outletDisplay} (${response.data.transfer_count} transfers)`, 'success')
            
            // Add to scanned items
            state.scannedItems.push({
                pallet_id: palletId,
                outlet_code: response.data.outlet_code,
                outlet_code_short: response.data.outlet_code_short,
                outlet_name: response.data.outlet_name,
                transfer_count: response.data.transfer_count,
                delivery_date: deliveryDate,
                time: new Date().toLocaleTimeString()
            })
            
            updateScannedItemsList()
            
            // CRITICAL: Wait for warehouse data to load before checking completion
            await loadWarehouseData()
            
            // Check if this outlet is now fully scanned
            await checkOutletCompletionAndPromptContainerCount(response.data.outlet_code)
        } else {
            console.error('❌ Scan failed:', response.data.error)
            playBeep(false)
            showToast(`✗ ${response.data.error}`, 'error')
        }
    } catch (error) {
        console.error('❌ API error:', error)
        console.error('Error response:', error.response?.data)
        playBeep(false)
        showToast(error.response?.data?.error || 'Scan failed', 'error')
    }
    
    // Re-focus input
    setTimeout(() => input.focus(), 100)
}

function updateScannedItemsList() {
    const list = document.getElementById('scannedItemsList')
    if (!list) return
    
    if (state.scannedItems.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No items scanned yet</p>'
        return
    }
    
    list.innerHTML = state.scannedItems.slice().reverse().map((item, reversedIndex) => {
        // Calculate actual index in original array
        const actualIndex = state.scannedItems.length - 1 - reversedIndex
        
        return `
        <div class="border-l-4 border-green-500 bg-green-50 p-3 rounded">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold">
                        <i class="fas fa-pallet mr-1 text-green-600"></i>${item.pallet_id}
                    </p>
                    <p class="text-sm text-gray-600">
                        ${item.outlet_code_short || item.outlet_code} - ${item.outlet_name}
                    </p>
                    <p class="text-xs text-gray-500">
                        ${item.transfer_count} transfers
                    </p>
                </div>
                <div class="flex items-start space-x-2">
                    <span class="text-sm text-gray-500">${item.time}</span>
                    ${canDelete() ? `
                        <button onclick="confirmDeleteScannedItem(${actualIndex}, 'warehouse')" 
                            class="text-red-500 hover:text-red-700 ml-2"
                            title="Delete this scan">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('')
}

// Check if outlet is fully scanned and prompt for container count
async function checkOutletCompletionAndPromptContainerCount(outletCode) {
    console.log(`🔍 Checking completion for outlet: ${outletCode}`)
    console.log(`📦 Total parcels in state: ${state.parcels?.length || 0}`)
    
    // Get all parcels for this outlet
    const outletParcels = state.parcels.filter(p => p.outlet_code === outletCode)
    console.log(`🏪 Parcels for outlet ${outletCode}: ${outletParcels.length}`)
    
    if (outletParcels.length === 0) {
        console.warn(`⚠️ No parcels found for outlet ${outletCode} in state.parcels`)
        console.log(`📋 Available outlet codes in parcels:`, [...new Set(state.parcels.map(p => p.outlet_code))])
        return
    }
    
    // Count scanned pallets for this outlet
    const scannedPallets = state.scannedItems.filter(item => item.outlet_code === outletCode)
    const totalPallets = outletParcels.length
    const scannedCount = scannedPallets.length
    
    console.log(`✅ Outlet ${outletCode}: ${scannedCount}/${totalPallets} pallets scanned`)
    
    // Check if outlet is fully scanned
    if (scannedCount === totalPallets && scannedCount > 0) {
        // Check if we already prompted for this outlet
        if (!state.outletContainerCounts) state.outletContainerCounts = {}
        if (state.outletContainerCounts[outletCode]) {
            console.log(`⏭️ Already recorded container count for ${outletCode}`)
            return
        }
        
        // Get outlet name
        const outletName = outletParcels[0].outlet_name || outletCode
        const outletShortCode = outletParcels[0].outlet_code_short || outletCode
        
        console.log(`🎉 Outlet ${outletCode} FULLY SCANNED! Showing modal...`)
        
        // Show container count popup
        showContainerCountModal(outletCode, outletShortCode, outletName, totalPallets)
    } else {
        console.log(`⏳ Outlet ${outletCode} not fully scanned yet (${scannedCount}/${totalPallets})`)
    }
}

// Show modal to input box and container counts for completed outlet
function showContainerCountModal(outletCode, outletShortCode, outletName, palletCount) {
    const modal = document.createElement('div')
    modal.id = `container-modal-${outletCode}`
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="mb-4 text-center">
                <i class="fas fa-box-open text-green-500 text-4xl mb-3"></i>
                <h3 class="text-xl font-bold text-green-600">Outlet Fully Loaded!</h3>
            </div>
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p class="font-semibold text-lg">${outletShortCode} - ${outletName}</p>
                <p class="text-sm text-gray-600 mt-1">
                    <i class="fas fa-pallet mr-1"></i>${palletCount} pallet${palletCount > 1 ? 's' : ''} scanned
                </p>
            </div>
            <form onsubmit="handleBoxContainerSubmit(event, '${outletCode}', '${outletShortCode}', '${outletName}')">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">
                        <i class="fas fa-box mr-1"></i>How many boxes?
                    </label>
                    <input type="number" id="box_count_${outletCode}" required 
                        min="0"
                        class="w-full px-3 py-2 border rounded-lg text-center text-2xl font-bold"
                        placeholder="0"
                        value="0">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">
                        <i class="fas fa-container-storage mr-1"></i>How many A-code containers?
                        <span class="text-xs text-gray-500 block mt-1">
                            (If > 0, you'll need to scan A codes next)
                        </span>
                    </label>
                    <input type="number" id="container_count_${outletCode}" required 
                        min="0"
                        class="w-full px-3 py-2 border rounded-lg text-center text-2xl font-bold"
                        placeholder="0"
                        value="0">
                </div>
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-check mr-2"></i>Continue
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" 
                        class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
    
    // Focus on box count input field
    setTimeout(() => {
        const input = document.getElementById(`box_count_${outletCode}`)
        if (input) {
            input.focus()
            input.select()
        }
    }, 100)
}

// Handle box and container count submission
async function handleBoxContainerSubmit(event, outletCode, outletShortCode, outletName) {
    event.preventDefault()
    
    const boxCount = parseInt(document.getElementById(`box_count_${outletCode}`).value) || 0
    const containerCount = parseInt(document.getElementById(`container_count_${outletCode}`).value) || 0
    
    if (boxCount < 0 || containerCount < 0) {
        showToast('Please enter valid counts', 'error')
        return
    }
    
    // Close the modal
    const modal = document.getElementById(`container-modal-${outletCode}`)
    if (modal) modal.remove()
    
    try {
        // Save box and container counts to backend
        await axios.post('/api/warehouse/set-box-container-count', {
            outlet_code: outletCode,
            box_count: boxCount,
            container_count: containerCount
        })
        
        // Record in state
        if (!state.outletContainerCounts) state.outletContainerCounts = {}
        state.outletContainerCounts[outletCode] = { boxes: boxCount, containers: containerCount }
        
        showToast(`✓ Recorded: ${boxCount} boxes, ${containerCount} containers`, 'success')
        
        // If containers > 0, prompt to scan A codes
        if (containerCount > 0) {
            showACodeScanningModal(outletCode, outletShortCode, outletName, containerCount)
        } else {
            // No A codes needed, refresh data
            loadWarehouseData()
        }
    } catch (error) {
        console.error('Error saving counts:', error)
        showToast('Failed to save counts', 'error')
    }
}

// OLD FUNCTION (LEGACY - KEEP FOR BACKWARD COMPATIBILITY)
async function handleContainerCountSubmit(event, outletCode) {
    event.preventDefault()
    
    const containerCount = parseInt(document.getElementById(`container_count_${outletCode}`).value)
    
    if (!containerCount || containerCount < 1) {
        showToast('Please enter a valid container count', 'error')
        return
    }
    
    try {
        // Save container count to backend (legacy endpoint)
        await axios.post('/api/warehouse/set-container-count', {
            outlet_code: outletCode,
            container_count: containerCount
        })
        
        // Record in state to prevent duplicate prompts
        if (!state.outletContainerCounts) state.outletContainerCounts = {}
        state.outletContainerCounts[outletCode] = containerCount
        
        showToast(`✓ Container count recorded: ${containerCount} container${containerCount > 1 ? 's' : ''}`, 'success')
        
        // Close modal
        const modal = document.getElementById(`container-modal-${outletCode}`)
        if (modal) modal.remove()
        
        // Reload data to reflect changes
        loadWarehouseData()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to save container count', 'error')
    }
}

// Show modal to scan A codes for containers
function showACodeScanningModal(outletCode, outletShortCode, outletName, containerCount) {
    const modal = document.createElement('div')
    modal.id = `acode-modal-${outletCode}`
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    
    // Initialize A code scanning state
    if (!state.aCodeScans) state.aCodeScans = {}
    if (!state.aCodeScans[outletCode]) state.aCodeScans[outletCode] = []
    
    // Store outlet info for use during scanning
    if (!state.aCodeOutletInfo) state.aCodeOutletInfo = {}
    state.aCodeOutletInfo[outletCode] = {
        outletCode: outletCode,
        outletShortCode: outletShortCode,
        outletName: outletName
    }
    
    const renderModal = () => {
        const scannedCount = state.aCodeScans[outletCode].length
        const remaining = containerCount - scannedCount
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <div class="mb-4 text-center">
                    <i class="fas fa-qrcode text-blue-500 text-4xl mb-3"></i>
                    <h3 class="text-xl font-bold">Scan A-Code Containers</h3>
                </div>
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="font-semibold text-lg">${outletShortCode} - ${outletName}</p>
                    <p class="text-sm text-gray-600 mt-1">
                        <i class="fas fa-box mr-1"></i>
                        ${scannedCount} / ${containerCount} containers scanned
                    </p>
                    ${remaining > 0 ? `
                        <p class="text-lg font-bold text-blue-600 mt-2">
                            ${remaining} container${remaining > 1 ? 's' : ''} remaining
                        </p>
                    ` : `
                        <p class="text-lg font-bold text-green-600 mt-2">
                            <i class="fas fa-check-circle mr-1"></i>All containers scanned!
                        </p>
                    `}
                </div>
                ${scannedCount > 0 ? `
                    <div class="mb-4 max-h-32 overflow-y-auto border rounded-lg p-2">
                        <p class="text-xs font-semibold text-gray-600 mb-2">Scanned A-Codes:</p>
                        ${state.aCodeScans[outletCode].map(code => `
                            <div class="text-sm bg-green-50 border-l-4 border-green-500 px-2 py-1 mb-1">
                                <i class="fas fa-check text-green-600 mr-1"></i>${code}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${remaining > 0 ? `
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Scan A-Code:</label>
                        <input type="text" id="acode_scan_${outletCode}" 
                            class="w-full px-3 py-2 border rounded-lg text-center text-xl font-mono uppercase"
                            placeholder="Scan or enter A code"
                            onkeypress="if(event.key==='Enter') handleACodeScan('${outletCode}', ${containerCount}, '${outletName}')">
                    </div>
                    <button type="button" onclick="handleACodeScan('${outletCode}', ${containerCount}, '${outletName}')"
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-2">
                        <i class="fas fa-plus mr-2"></i>Add Container
                    </button>
                ` : ''}
                <button type="button" onclick="completeACodeScanning('${outletCode}')" 
                    class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg ${remaining > 0 ? 'opacity-50' : ''}"
                    ${remaining > 0 ? 'disabled title="Please scan all containers first"' : ''}>
                    <i class="fas fa-check mr-2"></i>Complete
                </button>
            </div>
        `
    }
    
    renderModal()
    document.body.appendChild(modal)
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById(`acode_scan_${outletCode}`)
        if (input) input.focus()
    }, 100)
}

// Handle A code scan
async function handleACodeScan(outletCode, expectedCount, outletName = '') {
    const input = document.getElementById(`acode_scan_${outletCode}`)
    const aCode = input.value.trim().toUpperCase()
    
    if (!aCode) {
        showToast('Please scan or enter an A code', 'error')
        return
    }
    
    // Validate A code format (starts with 'A')
    if (!aCode.startsWith('A')) {
        playBeep(false)
        showToast('Invalid A code! Must start with "A"', 'error')
        input.value = ''
        input.focus()
        return
    }
    
    // Check for duplicates
    if (state.aCodeScans[outletCode].includes(aCode)) {
        playBeep(false)
        showToast('Duplicate A code!', 'error')
        input.value = ''
        input.focus()
        return
    }
    
    // Add to scanned list
    state.aCodeScans[outletCode].push(aCode)
    
    try {
        // Get delivery date from state
        const deliveryDate = state.warehouseDeliveryDate
        if (!deliveryDate) {
            throw new Error('No delivery date set')
        }
        
        // Send A code to backend
        console.log('📤 Sending A-code to backend:', {
            container_id: aCode,
            outlet_code: outletCode,
            outlet_name: outletName,
            delivery_date: deliveryDate
        })
        
        const response = await axios.post('/api/warehouse/scan-container', {
            container_id: aCode,
            outlet_code: outletCode,
            outlet_name: outletName,
            delivery_date: deliveryDate
        })
        
        console.log('✅ A-code saved successfully:', response.data)
        
        playBeep(true)
        showToast(`✓ Container ${aCode} scanned`, 'success')
        
        // Clear input
        input.value = ''
        
        // Re-render modal
        const modal = document.getElementById(`acode-modal-${outletCode}`)
        if (modal) {
            const scannedCount = state.aCodeScans[outletCode].length
            const remaining = expectedCount - scannedCount
            const outletInfo = state.aCodeOutletInfo[outletCode] || {}
            const savedOutletName = outletInfo.outletName || outletName || ''
            
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 w-full max-w-md">
                    <div class="mb-4 text-center">
                        <i class="fas fa-qrcode text-blue-500 text-4xl mb-3"></i>
                        <h3 class="text-xl font-bold">Scan A-Code Containers</h3>
                    </div>
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <p class="font-semibold text-lg">${state.aCodeScans[outletCode][0] ? document.getElementById(`acode-modal-${outletCode}`).querySelector('.font-semibold.text-lg').textContent : `Outlet ${outletCode}`}</p>
                        <p class="text-sm text-gray-600 mt-1">
                            <i class="fas fa-box mr-1"></i>
                            ${scannedCount} / ${expectedCount} containers scanned
                        </p>
                        ${remaining > 0 ? `
                            <p class="text-lg font-bold text-blue-600 mt-2">
                                ${remaining} container${remaining > 1 ? 's' : ''} remaining
                            </p>
                        ` : `
                            <p class="text-lg font-bold text-green-600 mt-2">
                                <i class="fas fa-check-circle mr-1"></i>All containers scanned!
                            </p>
                        `}
                    </div>
                    <div class="mb-4 max-h-32 overflow-y-auto border rounded-lg p-2">
                        <p class="text-xs font-semibold text-gray-600 mb-2">Scanned A-Codes:</p>
                        ${state.aCodeScans[outletCode].map(code => `
                            <div class="text-sm bg-green-50 border-l-4 border-green-500 px-2 py-1 mb-1">
                                <i class="fas fa-check text-green-600 mr-1"></i>${code}
                            </div>
                        `).join('')}
                    </div>
                    ${remaining > 0 ? `
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Scan A-Code:</label>
                            <input type="text" id="acode_scan_${outletCode}" 
                                class="w-full px-3 py-2 border rounded-lg text-center text-xl font-mono uppercase"
                                placeholder="Scan or enter A code"
                                onkeypress="if(event.key==='Enter') handleACodeScan('${outletCode}', ${expectedCount}, '${savedOutletName}')">
                        </div>
                        <button type="button" onclick="handleACodeScan('${outletCode}', ${expectedCount}, '${savedOutletName}')"
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mb-2">
                            <i class="fas fa-plus mr-2"></i>Add Container
                        </button>
                    ` : ''}
                    <button type="button" onclick="completeACodeScanning('${outletCode}')" 
                        class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg ${remaining > 0 ? 'opacity-50' : ''}"
                        ${remaining > 0 ? 'disabled title="Please scan all containers first"' : ''}>
                        <i class="fas fa-check mr-2"></i>Complete
                    </button>
                </div>
            `
            
            // Re-focus input
            setTimeout(() => {
                const newInput = document.getElementById(`acode_scan_${outletCode}`)
                if (newInput) newInput.focus()
            }, 100)
        }
    } catch (error) {
        console.error('❌ Error scanning A code:', error)
        console.error('❌ Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            container_id: aCode,
            outlet_code: outletCode,
            delivery_date: state.warehouseDeliveryDate
        })
        // Remove from local state if backend fails
        state.aCodeScans[outletCode] = state.aCodeScans[outletCode].filter(c => c !== aCode)
        playBeep(false)
        showToast(error.response?.data?.error || 'Failed to scan container', 'error')
        input.value = ''
        input.focus()
    }
}

// Complete A code scanning
function completeACodeScanning(outletCode) {
    const modal = document.getElementById(`acode-modal-${outletCode}`)
    if (modal) modal.remove()
    
    const scannedCount = state.aCodeScans[outletCode]?.length || 0
    showToast(`✓ ${scannedCount} A-code container${scannedCount > 1 ? 's' : ''} linked to outlet`, 'success')
    
    // Reload warehouse data
    loadWarehouseData()
}

function showCompleteLoadingModal() {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">Complete Loading Process</h3>
            <form onsubmit="handleCompleteLoading(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Outbound Team Name/Signature</label>
                    <input type="text" id="loading_signature" required 
                        class="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter name">
                </div>
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-check mr-2"></i>Complete
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" 
                        class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
}

async function handleCompleteLoading(event) {
    event.preventDefault()
    
    const signatureName = document.getElementById('loading_signature').value
    
    // Get unique outlets from scanned items
    const outlets = [...new Set(state.scannedItems.map(item => item.outlet_code))]
    
    try {
        for (const outlet of outlets) {
            await axios.post('/api/warehouse/complete', {
                outlet_code: outlet,
                signature_name: signatureName
            })
        }
        
        showToast('Loading process completed!', 'success')
        document.querySelector('.fixed').remove()
        
        // CRITICAL: Clear ALL warehouse state after completion
        state.scannedItems = []
        state.availablePallets = []
        state.availableACodeContainers = []
        state.selectedOutlet = null
        state.parcels = []
        state.outletContainerCounts = {} // Clear container count tracking
        
        // Update UI immediately to show empty scanned items list
        updateScannedItemsList()
        
        // Force UI refresh to show empty state
        loadWarehouseData()
    } catch (error) {
        showToast('Failed to complete loading', 'error')
    }
}

// Delete scanned item from session
function confirmDeleteScannedItem(index, context) {
    const item = state.scannedItems[index]
    if (!item) return
    
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4 text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>Delete Scanned Item?
            </h3>
            <div class="mb-6">
                <p class="mb-2">Are you sure you want to delete this scan?</p>
                <div class="bg-gray-100 p-3 rounded">
                    <p class="font-semibold">
                        <i class="fas fa-pallet mr-1 text-green-600"></i>${item.pallet_id}
                    </p>
                    ${context === 'warehouse' ? `
                        <p class="text-sm text-gray-600">
                            ${item.outlet_code_short || item.outlet_code} - ${item.outlet_name}
                        </p>
                    ` : ''}
                    <p class="text-xs text-gray-500">
                        ${item.transfer_count} transfers • Scanned at ${item.time}
                    </p>
                </div>
                <p class="text-sm text-red-600 mt-2">
                    <i class="fas fa-info-circle mr-1"></i>This will revert the pallet status back to pending.
                    ${context === 'warehouse' ? 'The pallet will be removed from "loaded" status.' : 'The pallet will be removed from "delivered" status.'}
                </p>
            </div>
            <div class="flex space-x-3">
                <button onclick="deleteScannedItem(${index}, '${context}'); this.closest('.fixed').remove()" 
                    class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-trash-alt mr-2"></i>Delete
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                    Cancel
                </button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
}

async function deleteScannedItem(index, context) {
    const item = state.scannedItems[index]
    if (!item) {
        showToast('Item not found', 'error')
        return
    }
    
    try {
        // Call backend API to revert pallet status
        if (context === 'warehouse') {
            const response = await axios.post('/api/warehouse/revert-pallet', {
                pallet_id: item.pallet_id
            })
            
            if (!response.data.success) {
                showToast(response.data.error || 'Failed to revert pallet', 'error')
                return
            }
        } else if (context === 'outlet') {
            // For outlet, similar revert API call
            const response = await axios.post('/api/outlet/revert-pallet', {
                pallet_id: item.pallet_id,
                outlet_code_short: state.selectedOutlet?.code_short
            })
            
            if (!response.data.success) {
                showToast(response.data.error || 'Failed to revert pallet', 'error')
                return
            }
        }
        
        // Remove from scanned items array
        state.scannedItems.splice(index, 1)
        
        // Update the appropriate list and data
        if (context === 'warehouse') {
            updateScannedItemsList()
            // Refresh warehouse data to update outlet summary panel
            await loadWarehouseData()
        } else if (context === 'outlet') {
            updateOutletScannedList()
            updateOutletCompleteButton()
            // Refresh outlet pallets list
            await loadOutletPallets()
        }
        
        showToast(`Pallet ${item.pallet_id} reverted to pending`, 'success')
    } catch (error) {
        console.error('Error reverting pallet:', error)
        showToast(error.response?.data?.error || 'Failed to revert pallet', 'error')
    }
}

// Show outlet details modal with all transfers
async function showOutletDetails(outletCode) {
    try {
        // Fetch transfers for this specific outlet from API
        const response = await axios.get(`/api/warehouse/transfers?outlet_code=${outletCode}`)
        const outletTransfers = response.data.transfers || []
        
        if (outletTransfers.length === 0) {
            showToast('No transfers found for this outlet', 'error')
            return
        }
        
        const outletName = outletTransfers[0].outlet_name
        const scannedCount = outletTransfers.filter(t => t.status === 'loaded' || t.is_scanned_loading).length
        
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="text-2xl font-bold">${outletCode} - ${outletName}</h3>
                            <p class="text-sm text-gray-600 mt-1">
                                ${scannedCount} / ${outletTransfers.length} transfers
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-info-circle mr-1"></i>Showing individual transfers (multiple per pallet)
                            </p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="space-y-2">
                        ${outletTransfers.map((transfer, index) => `
                            <div class="border rounded-lg p-4 ${transfer.is_scanned_loading ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300'}">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <span class="font-mono font-bold text-lg">${transfer.transfer_number}</span>
                                            ${transfer.is_scanned_loading ? 
                                                '<span class="px-2 py-1 bg-green-500 text-white text-xs rounded">SCANNED</span>' : 
                                                '<span class="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded">PENDING</span>'
                                            }
                                        </div>
                                        <p class="text-sm text-gray-600">
                                            <i class="fas fa-pallet mr-1"></i>Pallet: ${transfer.pallet_id}
                                        </p>
                                        ${transfer.is_scanned_loading ? `
                                            <p class="text-xs text-gray-500 mt-1">
                                                <i class="fas fa-clock mr-1"></i>Scanned: ${formatDate(transfer.scanned_loading_at)}
                                            </p>
                                        ` : ''}
                                    </div>
                                    ${canDelete() ? `
                                        <button onclick="confirmDeleteTransfer('${transfer.id}', '${transfer.transfer_number}', '${outletCode}')" 
                                            class="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="p-6 border-t bg-gray-50">
                    <div class="flex space-x-3">
                        ${canDelete() ? `
                            <button onclick="confirmDeleteOutlet('${outletCode}')" 
                                class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold">
                                <i class="fas fa-trash mr-2"></i>Delete All Transfers (${outletTransfers.length})
                            </button>
                        ` : ''}
                        <button onclick="this.closest('.fixed').remove()" 
                            class="${canDelete() ? 'flex-1' : 'w-full'} bg-gray-300 hover:bg-gray-400 px-4 py-3 rounded-lg font-semibold">
                            <i class="fas fa-times mr-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
    } catch (error) {
        console.error('Error showing outlet details:', error)
        showToast('Failed to load outlet details', 'error')
    }
}

// Confirm delete entire outlet
async function confirmDeleteOutlet(outletCode) {
    try {
        // Fetch transfers count for this outlet
        const response = await axios.get(`/api/warehouse/transfers?outlet_code=${outletCode}`)
        const outletTransfers = response.data.transfers || []
        
        if (outletTransfers.length === 0) {
            showToast('No transfers to delete', 'error')
            return
        }
        
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-xl font-bold mb-4 text-red-600">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Delete
                </h3>
                <p class="mb-4">
                    Are you sure you want to delete <strong>ALL ${outletTransfers.length} transfers</strong> for outlet <strong>${outletCode}</strong>?
                </p>
                <p class="text-sm text-red-600 mb-4">
                    <i class="fas fa-info-circle mr-1"></i>This action cannot be undone!
                </p>
                <div class="flex space-x-3">
                    <button onclick="deleteOutletTransfers('${outletCode}')" 
                        class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                        <i class="fas fa-trash mr-2"></i>Yes, Delete All
                    </button>
                    <button onclick="this.closest('.fixed').remove()" 
                        class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg font-semibold">
                        Cancel
                    </button>
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
    } catch (error) {
        showToast('Failed to load transfer information', 'error')
    }
}

// Delete all transfers for an outlet
async function deleteOutletTransfers(outletCode) {
    try {
        await axios.delete(`/api/warehouse/outlet/${outletCode}`)
        
        showToast(`All transfers for ${outletCode} deleted successfully`, 'success')
        
        // Close all modals
        document.querySelectorAll('.fixed').forEach(modal => modal.remove())
        
        // Reload data
        await loadWarehouseData()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to delete transfers', 'error')
    }
}

// Confirm delete single transfer
function confirmDeleteTransfer(transferId, transferNumber, outletCode) {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4 text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Delete
            </h3>
            <p class="mb-4">
                Are you sure you want to delete transfer <strong>${transferNumber}</strong>?
            </p>
            <p class="text-sm text-gray-600 mb-4">
                Outlet: ${outletCode}
            </p>
            <div class="flex space-x-3">
                <button onclick="deleteTransfer('${transferId}', '${outletCode}')" 
                    class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                    <i class="fas fa-trash mr-2"></i>Yes, Delete
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg font-semibold">
                    Cancel
                </button>
            </div>
        </div>
    `
    
    document.body.appendChild(modal)
}

// Delete single transfer
async function deleteTransfer(transferId, outletCode) {
    try {
        await axios.delete(`/api/warehouse/transfer/${transferId}`)
        
        showToast('Transfer deleted successfully', 'success')
        
        // Close confirmation modal
        document.querySelectorAll('.fixed').forEach(modal => {
            if (modal.querySelector('h3').textContent.includes('Confirm Delete')) {
                modal.remove()
            }
        })
        
        // Reload data
        await loadWarehouseData()
        
        // Refresh outlet details if modal is open
        const detailsModal = document.querySelector('.max-w-4xl')
        if (detailsModal) {
            document.querySelectorAll('.fixed').forEach(modal => modal.remove())
            showOutletDetails(outletCode)
        }
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to delete transfer', 'error')
    }
}

// ============ Outlet Page ============
function renderOutlet() {
    // Initialize outlet delivery date to today if not set
    if (!state.outletDeliveryDate) {
        state.outletDeliveryDate = new Date().toISOString().split('T')[0]
    }
    
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-2 py-2 pb-20 flex-1 overflow-y-auto" style="max-height: 100vh;">
            <!-- Mobile-optimized header -->
            <h2 class="text-lg sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4 md:mb-6 text-gray-800">
                <i class="fas fa-store text-blue-600 mr-2"></i>Outlet Unloading
            </h2>
            
            ${!state.selectedOutlet ? `
                <!-- Step 1: Scan Outlet Code - Mobile optimized -->
                <div class="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
                    <div class="text-center mb-4 sm:mb-6">
                        <div class="bg-blue-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <i class="fas fa-store text-3xl sm:text-4xl text-blue-600"></i>
                        </div>
                        <h3 class="text-lg sm:text-xl md:text-2xl font-bold mb-2">Step 1: Identify Your Outlet</h3>
                        <p class="text-sm sm:text-base text-gray-600">Scan or enter your outlet short code</p>
                    </div>
                    
                    <div class="mb-3 sm:mb-4">
                        <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            Outlet Short Code (e.g., MKC, JBB)
                        </label>
                        <input type="text" id="outletCodeInput" 
                            class="w-full px-3 py-2 sm:px-4 sm:py-3 border-4 border-blue-500 rounded-lg text-base sm:text-lg scan-input"
                            placeholder="Scan outlet code..."
                            autofocus
                            onkeydown="if(event.key==='Enter' || event.keyCode===13) { event.preventDefault(); handleFindOutletPallets(); }"
                            onkeypress="if(event.key==='Enter') handleFindOutletPallets()">
                    </div>
                    
                    <button onclick="handleFindOutletPallets()" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 sm:py-4 rounded-lg text-base sm:text-lg">
                        <i class="fas fa-search mr-2"></i>Find My Pallets
                    </button>
                    
                    <div class="mt-4 sm:mt-6 bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4">
                        <p class="text-xs sm:text-sm text-blue-800">
                            <i class="fas fa-info-circle mr-1 sm:mr-2"></i>
                            <strong>Tip:</strong> Your outlet code is the short name (e.g., "MKC")
                        </p>
                    </div>
                </div>
            ` : `
                <!-- Step 2: Scan Pallet IDs -->
                <div class="mb-6 bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800">
                                ${state.selectedOutlet.code_short} - ${state.selectedOutlet.name}
                            </h3>
                            <p class="text-sm text-gray-600">Outlet Code: ${state.selectedOutlet.code}</p>
                        </div>
                        <button onclick="clearOutletSelection()" 
                            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-arrow-left mr-2"></i>Change Outlet
                        </button>
                    </div>
                    
                    <!-- Container Count & Date Info -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <!-- Mobile: Stack vertically, Desktop: Side by side -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div class="text-center md:text-left">
                                <p class="text-xs text-gray-600 mb-1">
                                    <i class="fas fa-box mr-1"></i>Boxes
                                </p>
                                <p class="text-2xl font-bold text-green-600">
                                    ${state.selectedOutlet.box_count || 0}
                                </p>
                            </div>
                            <div class="text-center md:text-left">
                                <p class="text-xs text-gray-600 mb-1">
                                    <i class="fas fa-container-storage mr-1"></i>Containers
                                </p>
                                <p class="text-2xl font-bold text-purple-600">
                                    ${state.selectedOutlet.container_count || 0}
                                </p>
                            </div>
                            <div class="text-center md:text-left">
                                <p class="text-xs text-gray-600 mb-1">
                                    <i class="fas fa-pallet mr-1"></i>Total TN
                                </p>
                                <p class="text-2xl font-bold text-blue-600">
                                    ${state.availablePallets.length + state.scannedItems.length}
                                </p>
                            </div>
                            <div class="text-center md:text-left">
                                <label class="text-xs text-gray-600 mb-1 block">
                                    <i class="fas fa-calendar mr-1"></i>Date
                                </label>
                                <input type="date" id="outletDeliveryDate" 
                                    class="w-full px-2 py-1 border-2 border-blue-300 rounded-lg font-semibold text-center text-sm"
                                    value="${state.outletDeliveryDate || new Date().toISOString().split('T')[0]}"
                                    onchange="setOutletDeliveryDate(this.value)">
                            </div>
                        </div>
                        <div class="text-xs text-gray-600 text-center md:text-left border-t border-blue-200 pt-2">
                            <i class="fas fa-info-circle mr-1"></i>Scan all F codes (pallets) and A codes (containers) to complete
                        </div>
                    </div>
                </div>
                
                <!-- Mobile: Stack vertically, Desktop: Side-by-side grid -->
                <div class="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                    <!-- Scanning Panel -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-lg shadow-lg p-6">
                            <div class="text-center mb-6">
                                <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                    <i class="fas fa-pallet text-3xl text-green-600"></i>
                                </div>
                                <h3 class="text-xl font-bold">Step 2: Scan Pallet IDs</h3>
                                <p class="text-gray-600 text-sm">Scan each pallet to confirm receipt</p>
                            </div>
                            
                            <div class="mb-4">
                                <input type="text" id="palletScanInput" 
                                    class="w-full px-4 py-3 border-4 border-green-500 rounded-lg text-lg scan-input"
                                    placeholder="Scan or enter Pallet ID..."
                                    autofocus
                                    onkeydown="if(event.key==='Enter' || event.keyCode===13) { event.preventDefault(); handleOutletScanPallet(); }"
                                    onkeypress="if(event.key==='Enter') handleOutletScanPallet()">
                            </div>
                            
                            <button onclick="handleOutletScanPallet()" 
                                class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg mb-4">
                                <i class="fas fa-barcode mr-2"></i>Scan Pallet
                            </button>
                            
                            <div id="outletCompleteButton">
                                ${state.scannedItems.length > 0 ? `
                                    <button onclick="showOutletCompletionModal()" 
                                        class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                                        <i class="fas fa-check-circle mr-2"></i>Complete Receipt (${state.scannedItems.length} pallets)
                                    </button>
                                ` : ''}
                            </div>
                            
                            <!-- Scanned Items -->
                            <div class="mt-6">
                                <h4 class="font-semibold mb-3">Scanned Pallets (${state.scannedItems.length})</h4>
                                <div id="outletScannedList" class="space-y-2 max-h-96 overflow-y-auto">
                                    <p class="text-gray-500 text-center py-4">No pallets scanned yet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Available Pallets (Your Deliveries) - Fully scrollable on mobile -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-lg shadow-lg p-6">
                            <h3 class="text-xl font-bold mb-4">Your Deliveries</h3>
                            <div id="availablePallets" class="space-y-3">
                                <p class="text-gray-500 text-center py-4">Loading...</p>
                            </div>
                            
                            <button onclick="loadOutletPallets()" 
                                class="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-sync mr-2"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            `}
            <!-- Extra spacing at bottom to ensure full content visibility -->
            <div class="h-16"></div>
        </div>
        </div>
    `
}

// NEW: Step 1 - Find pallets for outlet by short code
async function handleFindOutletPallets() {
    const input = document.getElementById('outletCodeInput')
    const outletCodeShort = input.value.trim().toUpperCase()
    
    if (!outletCodeShort) {
        showToast('Please enter outlet code', 'error')
        return
    }
    
    try {
        const response = await axios.post('/api/outlet/find-pallets', { 
            outlet_code_short: outletCodeShort 
        })
        
        if (response.data.success) {
            // Debug logging
            console.log('🔍 Outlet data received:', {
                outlet: response.data.outlet_code,
                box_count: response.data.box_count,
                container_count: response.data.container_count,
                a_code_containers: response.data.a_code_containers,
                pallets: response.data.pallets.length
            })
            
            state.selectedOutlet = {
                code: response.data.outlet_code,
                code_short: response.data.outlet_code_short,
                name: response.data.outlet_name,
                container_count_loaded: response.data.container_count_loaded, // OLD: Legacy field
                box_count: response.data.box_count || 0, // NEW: Box count
                container_count: response.data.container_count || 0, // NEW: A-code container count
                a_code_containers: response.data.a_code_containers || [] // NEW: List of A-code containers
            }
            state.availablePallets = response.data.pallets
            state.availableACodeContainers = response.data.a_code_containers || [] // NEW: Store A-code containers separately
            state.scannedItems = []
            
            const totalItems = response.data.pallets.length + (response.data.a_code_containers?.length || 0)
            console.log('📦 Available items:', {
                pallets: state.availablePallets.length,
                aCodeContainers: state.availableACodeContainers.length
            })
            showToast(`Found ${response.data.pallets.length} pallet(s) + ${response.data.a_code_containers?.length || 0} container(s) for ${outletCodeShort}`, 'success')
            render()
            setTimeout(() => loadOutletPallets(), 100)
        } else {
            showToast(response.data.error || 'Outlet not found', 'error')
        }
    } catch (error) {
        console.error('Error finding pallets:', error)
        showToast(error.response?.data?.error || 'Failed to find outlet', 'error')
    }
}

// Load and display available pallets for outlet
async function loadOutletPallets() {
    if (!state.selectedOutlet) return
    
    try {
        const response = await axios.post('/api/outlet/find-pallets', { 
            outlet_code_short: state.selectedOutlet.code_short 
        })
        
        if (response.data.success) {
            state.availablePallets = response.data.pallets
            state.availableACodeContainers = response.data.a_code_containers || [] // NEW: Store A-code containers
            
            // Update container counts if they changed
            if (response.data.container_count_loaded) {
                state.selectedOutlet.container_count_loaded = response.data.container_count_loaded
            }
            if (response.data.box_count !== undefined) {
                state.selectedOutlet.box_count = response.data.box_count
            }
            if (response.data.container_count !== undefined) {
                state.selectedOutlet.container_count = response.data.container_count
            }
            
            // IMPORTANT: Restore previously scanned pallets (status='scanned_unloading')
            // This allows outlet users to see scanned list after logout/refresh
            const scannedPallets = state.availablePallets.filter(p => p.status === 'scanned_unloading')
            if (scannedPallets.length > 0 && state.scannedItems.length === 0) {
                console.log(`📦 Restoring ${scannedPallets.length} previously scanned pallets for outlet`)
                state.scannedItems = scannedPallets.map(p => ({
                    pallet_id: p.pallet_id,
                    outlet_code: state.selectedOutlet.code,
                    outlet_code_short: state.selectedOutlet.code_short,
                    outlet_name: state.selectedOutlet.name,
                    transfer_count: p.transfer_count,
                    time: 'Previously scanned'
                }))
                updateOutletScannedList()
                console.log('✅ Outlet scanned items restored from database')
            }
            
            const palletsDiv = document.getElementById('availablePallets')
            if (!palletsDiv) return
            
            const totalItems = state.availablePallets.length + (state.availableACodeContainers?.length || 0)
            
            if (totalItems === 0) {
                palletsDiv.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-check-circle text-6xl text-green-500 mb-3"></i>
                        <p class="text-lg font-semibold text-green-600">All Deliveries Received!</p>
                        <p class="text-sm text-gray-600">No pending items</p>
                    </div>
                `
                return
            }
            
            // Filter out already scanned pallets
            const unscannedPallets = state.availablePallets.filter(pallet => 
                !state.scannedItems.find(s => s.pallet_id === pallet.pallet_id)
            )
            
            // Filter out already scanned A-code containers
            const unscannedACodeContainers = (state.availableACodeContainers || []).filter(container =>
                !state.outletScannedACodes?.includes(container.container_id)
            )
            
            const totalUnscanned = unscannedPallets.length + unscannedACodeContainers.length
            
            if (totalUnscanned === 0) {
                palletsDiv.innerHTML = `
                    <div class="text-center py-6">
                        <i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i>
                        <p class="font-semibold text-green-600">All Scanned!</p>
                        <p class="text-xs text-gray-600">Complete receipt below</p>
                    </div>
                `
            } else {
                let html = ''
                
                // Show F codes (pallets)
                if (unscannedPallets.length > 0) {
                    html += unscannedPallets.map(pallet => `
                        <div class="border-2 border-blue-300 rounded-lg p-3 bg-blue-50 mb-2">
                            <div class="flex items-center justify-between mb-1">
                                <p class="font-bold text-base">
                                    <i class="fas fa-pallet mr-2 text-blue-600"></i>${pallet.pallet_id}
                                </p>
                                <span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-semibold">
                                    F CODE
                                </span>
                            </div>
                            <p class="text-xs text-gray-600">
                                <i class="fas fa-box mr-1"></i>${pallet.transfer_count} transfers
                            </p>
                        </div>
                    `).join('')
                }
                
                // Show A codes (containers)
                if (unscannedACodeContainers.length > 0) {
                    html += unscannedACodeContainers.map(container => `
                        <div class="border-2 border-purple-300 rounded-lg p-3 bg-purple-50 mb-2">
                            <div class="flex items-center justify-between mb-1">
                                <p class="font-bold text-base">
                                    <i class="fas fa-box mr-2 text-purple-600"></i>${container.container_id}
                                </p>
                                <span class="px-2 py-1 bg-purple-500 text-white text-xs rounded font-semibold">
                                    A CODE
                                </span>
                            </div>
                            <p class="text-xs text-gray-600">
                                <i class="fas fa-container-storage mr-1"></i>Container
                            </p>
                        </div>
                    `).join('')
                }
                
                palletsDiv.innerHTML = html
            }
        }
    } catch (error) {
        console.error('Error loading pallets:', error)
    }
}

function clearOutletSelection() {
    state.selectedOutlet = null
    state.availablePallets = []
    state.scannedItems = [] // Clear scanned items when changing outlet
    render()
}

// Debounce scanner to prevent double-scan
let outletScanTimeout = null

// NEW: Step 2 - Scan pallet ID (validation only, no immediate delivery)
async function handleOutletScanPallet() {
    const input = document.getElementById('palletScanInput')
    const scannedCode = input.value.trim().toUpperCase()
    
    if (!scannedCode || !state.selectedOutlet) return
    
    // Clear input immediately to prevent scanner double-scan
    input.value = ''
    
    // Debounce: prevent double-scan within 500ms
    if (outletScanTimeout) {
        console.log('Debounced duplicate scan')
        return
    }
    outletScanTimeout = setTimeout(() => {
        outletScanTimeout = null
    }, 500)
    
    // Detect code type: A code (starts with 'A') or F code (pallet ID)
    const isACode = scannedCode.startsWith('A')
    
    // Initialize tracking arrays if needed
    if (!state.outletScannedACodes) state.outletScannedACodes = []
    if (!state.outletScannedFCodes) state.outletScannedFCodes = []
    
    // Check for duplicate scan in current session
    const duplicateA = isACode && state.outletScannedACodes.includes(scannedCode)
    const duplicateF = !isACode && state.outletScannedFCodes.includes(scannedCode)
    
    if (duplicateA || duplicateF) {
        playBeep(false)
        showToast(`⚠️ Duplicate scan! ${isACode ? 'Container' : 'Pallet'} ${scannedCode} already scanned`, 'error')
        input.focus()
        return
    }
    
    try {
        if (isACode) {
            // Scan A code (container)
            const response = await axios.post('/api/outlet/scan-container', { 
                outlet_code_short: state.selectedOutlet.code_short,
                outlet_code: state.selectedOutlet.code,
                container_id: scannedCode
            })
            
            if (response.data.success) {
                playBeep(true)
                state.outletScannedACodes.push(scannedCode)
                
                // Add to combined scanned items list
                state.scannedItems.push({
                    code: scannedCode,
                    type: 'container',
                    container_id: scannedCode,
                    time: new Date().toLocaleTimeString()
                })
                
                showToast(`✓ Container ${scannedCode} scanned`, 'success')
                updateOutletScannedList()
                updateOutletCompleteButton()
                
                // Remove scanned A-code from "Your Deliveries" list
                if (!state.availableACodeContainers) state.availableACodeContainers = []
                state.availableACodeContainers = state.availableACodeContainers.filter(a => a.container_id !== scannedCode)
                loadOutletPallets()
            } else {
                playBeep(false)
                showToast(`✗ ${response.data.error}`, 'error')
            }
        } else {
            // Scan F code (pallet)
            const response = await axios.post('/api/outlet/scan-pallet', { 
                outlet_code_short: state.selectedOutlet.code_short,
                pallet_id: scannedCode
            })
            
            if (response.data.success) {
                playBeep(true)
                state.outletScannedFCodes.push(scannedCode)
                
                // Add to combined scanned items list
                state.scannedItems.push({
                    code: scannedCode,
                    type: 'pallet',
                    pallet_id: scannedCode,
                    transfer_count: response.data.transfer_count,
                    time: new Date().toLocaleTimeString()
                })
                
                showToast(`✓ Pallet ${scannedCode} scanned (${response.data.transfer_count} transfers)`, 'success')
                updateOutletScannedList()
                updateOutletCompleteButton()
                
                // Remove scanned pallet from "Your Delivery" list
                state.availablePallets = state.availablePallets.filter(p => p.pallet_id !== scannedCode)
                loadOutletPallets()
            } else {
                playBeep(false)
                showToast(`✗ ${response.data.error}`, 'error')
            }
        }
    } catch (error) {
        playBeep(false)
        showToast(error.response?.data?.error || 'Scan failed', 'error')
    }
    
    // Re-focus input
    setTimeout(() => input.focus(), 100)
}

function updateOutletScannedList() {
    const list = document.getElementById('outletScannedList')
    if (!list) return
    
    const palletCount = state.outletScannedFCodes?.length || 0
    const containerCount = state.outletScannedACodes?.length || 0
    const totalCount = state.scannedItems.length
    
    // Update the header counter
    const headerElement = list.closest('.mt-6')?.querySelector('h4')
    if (headerElement) {
        headerElement.textContent = `Scanned Items (${palletCount} pallets, ${containerCount} containers)`
    }
    
    if (totalCount === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No items scanned yet</p>'
        return
    }
    
    list.innerHTML = state.scannedItems.slice().reverse().map((item, reversedIndex) => {
        // Calculate actual index in original array
        const actualIndex = state.scannedItems.length - 1 - reversedIndex
        
        const isContainer = item.type === 'container'
        const isPallet = item.type === 'pallet'
        
        return `
        <div class="border-l-4 ${isContainer ? 'border-purple-500 bg-purple-50' : 'border-blue-500 bg-blue-50'} p-3 rounded">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold">
                        <i class="fas ${isContainer ? 'fa-box' : 'fa-pallet'} mr-1 ${isContainer ? 'text-purple-600' : 'text-blue-600'}"></i>
                        ${item.code}
                        <span class="text-xs ${isContainer ? 'text-purple-600' : 'text-blue-600'} ml-2">
                            ${isContainer ? 'Container' : 'Pallet'}
                        </span>
                    </p>
                    ${isPallet && item.transfer_count ? `
                        <p class="text-xs text-gray-600">${item.transfer_count} transfers</p>
                    ` : ''}
                    <p class="text-xs ${isContainer ? 'text-purple-600' : 'text-blue-600'}">
                        <i class="fas fa-clock mr-1"></i>Scanned (not confirmed yet)
                    </p>
                </div>
                <div class="flex items-start space-x-2">
                    <span class="text-sm text-gray-500">${item.time}</span>
                    ${canDelete() ? `
                        <button onclick="confirmDeleteScannedItem(${actualIndex}, 'outlet')" 
                            class="text-red-500 hover:text-red-700 ml-2"
                            title="Delete this scan">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `}).join('')
}

function updateOutletCompleteButton() {
    const buttonContainer = document.getElementById('outletCompleteButton')
    if (!buttonContainer) return
    
    if (state.scannedItems.length > 0) {
        buttonContainer.innerHTML = `
            <button onclick="showOutletCompletionModal()" 
                class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                <i class="fas fa-check-circle mr-2"></i>Complete Receipt (${state.scannedItems.length} pallets)
            </button>
        `
    } else {
        buttonContainer.innerHTML = ''
    }
}

// NEW: Show completion modal after scanning all pallets (like warehouse)
function showOutletCompletionModal() {
    if (state.scannedItems.length === 0) {
        showToast('Please scan at least one pallet first', 'error')
        return
    }
    
    // Check if all available pallets (F-codes) are scanned
    const unscannedPallets = state.availablePallets.filter(p => 
        !state.scannedItems.find(s => s.pallet_id === p.pallet_id)
    )
    
    // Check if all available A-code containers are scanned
    const availableAcodes = state.availableACodeContainers || []
    const unscannedAcodes = availableAcodes.filter(a => 
        !state.scannedItems.find(s => s.container_id === a.container_id)
    )
    
    const totalPallets = state.availablePallets.length
    const totalAcodes = availableAcodes.length
    const scannedCount = state.scannedItems.length
    const totalTransfers = state.scannedItems.reduce((sum, item) => sum + item.transfer_count, 0)
    
    // Check if incomplete (either pallets or A-codes missing)
    const isIncomplete = unscannedPallets.length > 0 || unscannedAcodes.length > 0
    
    // Check if warehouse already set container count
    const warehouseContainerCount = state.selectedOutlet.container_count_loaded
    const hasWarehouseCount = warehouseContainerCount && warehouseContainerCount > 0
    
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-green-600">
                <i class="fas fa-check-circle mr-2"></i>Complete Receipt
            </h3>
            <form onsubmit="handleConfirmOutletCompletion(event)">
                <div class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-sm text-gray-600 mb-2">Outlet</p>
                    <p class="text-lg font-bold text-green-700">${state.selectedOutlet.code_short} - ${state.selectedOutlet.name}</p>
                    <p class="text-sm text-gray-500 mt-2">
                        <i class="fas fa-pallet mr-1"></i>${scannedCount} pallet(s) scanned
                        <br>
                        <i class="fas fa-box mr-1"></i>${totalTransfers} total transfers
                        ${hasWarehouseCount ? `<br><i class="fas fa-truck mr-1"></i>${warehouseContainerCount} container(s) loaded at warehouse` : ''}
                    </p>
                </div>
                
                ${isIncomplete ? `
                    <div class="mb-4 bg-red-50 border-2 border-red-500 rounded-lg p-4">
                        <p class="text-sm font-bold text-red-800 mb-2">
                            <i class="fas fa-exclamation-triangle mr-1"></i>⚠️ Warning: Incomplete Receipt
                        </p>
                        ${unscannedPallets.length > 0 ? `
                            <p class="text-xs text-red-700 mb-2">
                                You have <strong>${unscannedPallets.length} F-code pallet(s)</strong> not yet scanned out of ${totalPallets} total.
                            </p>
                            <div class="text-xs text-red-600 bg-white rounded p-2 border border-red-300 mb-2">
                                <strong>Unscanned F-codes (Pallets):</strong>
                                <ul class="list-disc list-inside mt-1">
                                    ${unscannedPallets.slice(0, 5).map(p => `
                                        <li class="text-blue-700">📦 ${p.pallet_id} (${p.transfer_count} transfers)</li>
                                    `).join('')}
                                    ${unscannedPallets.length > 5 ? `<li>...and ${unscannedPallets.length - 5} more</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        ${unscannedAcodes.length > 0 ? `
                            <p class="text-xs text-red-700 mb-2">
                                You have <strong>${unscannedAcodes.length} A-code container(s)</strong> not yet scanned out of ${totalAcodes} total.
                            </p>
                            <div class="text-xs text-red-600 bg-white rounded p-2 border border-red-300">
                                <strong>Unscanned A-codes (Containers):</strong>
                                <ul class="list-disc list-inside mt-1">
                                    ${unscannedAcodes.slice(0, 5).map(a => `
                                        <li class="text-purple-700">📦 ${a.container_id}</li>
                                    `).join('')}
                                    ${unscannedAcodes.length > 5 ? `<li>...and ${unscannedAcodes.length - 5} more</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        <p class="text-xs text-red-700 mt-2 font-semibold">
                            <i class="fas fa-info-circle mr-1"></i>Unscanned items will be marked as <strong>unreceived</strong> in the report.
                        </p>
                    </div>
                ` : `
                    <div class="mb-4 bg-green-50 border border-green-300 rounded-lg p-4">
                        <p class="text-sm font-semibold text-green-800">
                            <i class="fas fa-check-circle mr-1"></i>All Items Scanned!
                        </p>
                        <p class="text-xs text-green-600 mt-1">
                            ✓ ${totalPallets} F-code pallet(s) scanned
                            ${totalAcodes > 0 ? `<br>✓ ${totalAcodes} A-code container(s) scanned` : ''}
                        </p>
                    </div>
                `}
                
                <div class="mb-4 bg-blue-50 border border-blue-300 rounded-lg p-4">
                    <p class="text-sm font-semibold text-blue-800 mb-3">
                        <i class="fas fa-box mr-1"></i>Delivery Quantities
                    </p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium mb-1">
                                📦 Boxes Delivered <span class="text-red-500">*</span>
                            </label>
                            <input type="number" id="boxes_delivered" required 
                                min="0"
                                class="w-full px-3 py-2 border rounded-lg text-center text-lg font-bold"
                                placeholder="0"
                                value="0">
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1">
                                📦 Containers Delivered <span class="text-red-500">*</span>
                            </label>
                            <input type="number" id="containers_delivered" required 
                                min="0"
                                class="w-full px-3 py-2 border rounded-lg text-center text-lg font-bold"
                                placeholder="0"
                                value="0">
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>Enter the actual quantities received
                    </p>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Receiver Name/Signature <span class="text-red-500">*</span></label>
                    <input type="text" id="receiver_name_complete" required 
                        class="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter receiver name"
                        autofocus>
                    <p class="text-xs text-gray-500 mt-1">Who is receiving these deliveries?</p>
                </div>
                
                <div class="flex space-x-3">
                    <button type="submit" id="confirmSignBtn" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
                        <i class="fas fa-signature mr-2"></i>Confirm & Sign
                    </button>
                    <button type="button" onclick="cancelOutletCompletion()" 
                        class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
    
    // CRITICAL FIX: Attach event listener after modal is added to DOM (for Android WebView compatibility)
    const form = modal.querySelector('form')
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault()
            e.stopPropagation()
            handleConfirmOutletCompletion(e)
        })
        
        // Also prevent default form submission via button clicks
        const submitBtn = modal.querySelector('#confirmSignBtn')
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault()
                e.stopPropagation()
                const event = new Event('submit', { cancelable: true, bubbles: true })
                form.dispatchEvent(event)
            })
        }
    }
}

// NEW: Handle completion confirmation with bulk update
async function handleConfirmOutletCompletion(event) {
    event.preventDefault()
    
    const receiverName = document.getElementById('receiver_name_complete').value.trim()
    const boxesDelivered = parseInt(document.getElementById('boxes_delivered').value) || 0
    const containersDelivered = parseInt(document.getElementById('containers_delivered').value) || 0
    
    if (!receiverName) {
        showToast('Please enter receiver name', 'error')
        return
    }
    
    if (boxesDelivered < 0) {
        showToast('Boxes delivered cannot be negative', 'error')
        return
    }
    
    if (containersDelivered < 0) {
        showToast('Containers delivered cannot be negative', 'error')
        return
    }
    
    if (boxesDelivered === 0 && containersDelivered === 0) {
        showToast('Please enter at least one box or container delivered', 'error')
        return
    }
    
    if (state.scannedItems.length === 0) {
        showToast('No pallets to confirm', 'error')
        return
    }
    
    // CRITICAL FIX: Close the completion modal BEFORE showing confirmation dialog
    // This prevents the confirmation dialog from appearing behind the completion modal
    const completionModal = document.querySelector('.fixed.inset-0.z-50')
    if (completionModal) {
        completionModal.style.display = 'none' // Hide but don't remove (we'll remove both later)
    }
    
    // Show double confirmation dialog
    const palletIds = state.scannedItems.map(item => item.pallet_id)
    showFinalConfirmationDialog(receiverName, boxesDelivered, containersDelivered, palletIds)
}

// NEW: Final confirmation dialog before submitting
function showFinalConfirmationDialog(receiverName, boxesDelivered, containersDelivered, palletIds) {
    // Store data in state for the confirmation handler
    state.pendingOutletCompletion = { receiverName, boxesDelivered, containersDelivered, palletIds }
    
    const confirmModal = document.createElement('div')
    confirmModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'
    confirmModal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-orange-600">
                <i class="fas fa-exclamation-circle mr-2"></i>Final Confirmation
            </h3>
            <div class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-gray-700 mb-3">
                    <strong>Please confirm the following details:</strong>
                </p>
                <div class="space-y-2 text-sm">
                    <p><i class="fas fa-store mr-2 text-blue-600"></i><strong>Outlet:</strong> ${state.selectedOutlet.code_short} - ${state.selectedOutlet.name}</p>
                    <p><i class="fas fa-pallet mr-2 text-blue-600"></i><strong>Pallets:</strong> ${palletIds.length} pallet(s)</p>
                    <p><i class="fas fa-box mr-2 text-blue-600"></i><strong>Boxes:</strong> ${boxesDelivered} box(es)</p>
                    <p><i class="fas fa-container-storage mr-2 text-blue-600"></i><strong>Containers:</strong> ${containersDelivered} container(s)</p>
                    <p><i class="fas fa-user mr-2 text-blue-600"></i><strong>Received by:</strong> ${receiverName}</p>
                </div>
            </div>
            <p class="text-sm text-gray-600 mb-4">
                <i class="fas fa-info-circle mr-1"></i>
                Once confirmed, this action cannot be undone. Are you sure you want to proceed?
            </p>
            <div class="flex space-x-3">
                <button id="yesProceedBtn"
                    class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
                    <i class="fas fa-check-circle mr-2"></i>YES - Proceed
                </button>
                <button id="noCancelBtn"
                    class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold">
                    <i class="fas fa-times mr-2"></i>NO - Cancel
                </button>
            </div>
        </div>
    `
    document.body.appendChild(confirmModal)
    
    // CRITICAL: Attach event listeners after modal is added to DOM (Android WebView compatibility)
    const yesBtn = confirmModal.querySelector('#yesProceedBtn')
    const noBtn = confirmModal.querySelector('#noCancelBtn')
    
    if (yesBtn) {
        yesBtn.addEventListener('click', function(e) {
            e.preventDefault()
            e.stopPropagation()
            proceedWithOutletCompletion()
        })
    }
    
    if (noBtn) {
        noBtn.addEventListener('click', function(e) {
            e.preventDefault()
            e.stopPropagation()
            
            // CRITICAL FIX: Show the completion modal again when user clicks NO
            const completionModal = document.querySelector('.fixed.inset-0.z-50')
            if (completionModal) {
                completionModal.style.display = 'flex' // Show it again
            }
            
            confirmModal.remove()
        })
    }
}

// NEW: Proceed with actual submission after confirmation
async function proceedWithOutletCompletion() {
    if (!state.pendingOutletCompletion) {
        showToast('No pending confirmation data', 'error')
        return
    }
    
    const { receiverName, boxesDelivered, containersDelivered, palletIds } = state.pendingOutletCompletion
    
    try {
        const response = await axios.post('/api/outlet/confirm-receipt-bulk', {
            outlet_code_short: state.selectedOutlet.code_short,
            pallet_ids: palletIds,
            receiver_name: receiverName,
            boxes_delivered: boxesDelivered,
            containers_delivered: containersDelivered
        })
        
        showToast(`✓ Receipt completed! ${boxesDelivered} boxes, ${containersDelivered} containers with ${palletIds.length} pallet(s) received by ${receiverName}`, 'success')
        
        // Close all modals
        document.querySelectorAll('.fixed.inset-0').forEach(modal => modal.remove())
        
        // Clear scanned items and pending data
        state.scannedItems = []
        state.pendingOutletCompletion = null
        
        // Refresh pallets list
        await loadOutletPallets()
        render()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to confirm receipt', 'error')
        // Close confirmation modal on error
        document.querySelectorAll('.fixed[class*="z-[60]"]').forEach(modal => modal.remove())
    }
}

function cancelOutletCompletion() {
    const modal = document.querySelector('.fixed.inset-0')
    if (modal) modal.remove()
    const input = document.getElementById('palletScanInput')
    if (input) {
        input.value = ''
        input.focus()
    }
}

function showCompleteUnloadingModal() {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">Complete Unloading Process</h3>
            <form onsubmit="handleCompleteUnloading(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Outlet Receiver Name/Signature</label>
                    <input type="text" id="unloading_signature" required 
                        class="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter name">
                </div>
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-check mr-2"></i>Complete
                    </button>
                    <button type="button" onclick="this.closest('.fixed').remove()" 
                        class="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `
    document.body.appendChild(modal)
}

async function handleCompleteUnloading(event) {
    event.preventDefault()
    
    const signatureName = document.getElementById('unloading_signature').value
    
    try {
        await axios.post('/api/outlet/complete', {
            outlet_code: state.selectedOutlet.code,
            signature_name: signatureName
        })
        
        showToast('Unloading process completed!', 'success')
        document.querySelector('.fixed').remove()
        state.scannedItems = []
        state.selectedOutlet = null
        render()
    } catch (error) {
        showToast('Failed to complete unloading', 'error')
    }
}

// ============ Container Collection Page ============
function renderContainers() {
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-4 py-6 flex-1 overflow-y-auto" style="max-height: 100vh;">
            <h2 class="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-recycle text-green-600 mr-2"></i>Container Collection & Management
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <!-- Collection Workflow -->
                <button onclick="showContainerCollectionView()" 
                    class="bg-green-500 hover:bg-green-600 text-white p-5 md:p-6 rounded-lg text-left shadow-md active:shadow-lg transition-all">
                    <i class="fas fa-hand-holding text-2xl md:text-3xl mb-2 block"></i>
                    <h3 class="text-lg md:text-xl font-bold">Collect Containers</h3>
                    <p class="text-xs md:text-sm opacity-90 mt-1">Scan containers at outlet for collection</p>
                </button>
                
                <!-- View Inventory -->
                <button onclick="showContainerInventoryView()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white p-5 md:p-6 rounded-lg text-left shadow-md active:shadow-lg transition-all">
                    <i class="fas fa-warehouse text-2xl md:text-3xl mb-2 block"></i>
                    <h3 class="text-lg md:text-xl font-bold">Container Inventory</h3>
                    <p class="text-xs md:text-sm opacity-90 mt-1">View containers across all outlets</p>
                </button>
            </div>
            
            <!-- Content Area -->
            <div id="containerContent">
                <div class="bg-white rounded-lg shadow-lg p-6 md:p-8 text-center">
                    <i class="fas fa-recycle text-5xl md:text-6xl text-gray-300 mb-3 md:mb-4"></i>
                    <p class="text-lg md:text-xl text-gray-500">Select an option above to get started</p>
                    <p class="text-xs md:text-sm text-gray-400 mt-2">Manage recyclable containers (Pallet IDs starting with "A")</p>
                </div>
            </div>
        </div>
        </div>
    `
}

// Show container collection workflow
function showContainerCollectionView() {
    const content = document.getElementById('containerContent')
    
    content.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-2xl font-bold mb-6 flex items-center">
                <i class="fas fa-hand-holding text-green-600 mr-3"></i>
                Collect Containers from Outlet
            </h3>
            
            ${!state.selectedOutlet ? `
                <!-- Step 1: Select Outlet -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Enter Outlet Code</label>
                    <div class="flex gap-2">
                        <input type="text" id="containerOutletCodeInput" 
                            placeholder="Enter outlet short code (e.g., MKC, JKJSTT1)"
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            onkeydown="if(event.key==='Enter' || event.keyCode===13) { event.preventDefault(); findOutletContainers(); }"
                            onkeypress="if(event.key==='Enter') findOutletContainers()">
                        <button onclick="findOutletContainers()" 
                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg">
                            <i class="fas fa-search mr-2"></i>Find
                        </button>
                    </div>
                </div>
            ` : `
                <!-- Step 2: Scan Containers -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <!-- Scanning Section -->
                    <div>
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4 mb-4">
                            <p class="font-semibold text-green-800 mb-1 text-sm md:text-base">
                                <i class="fas fa-store mr-2"></i>Collecting from: ${state.selectedOutlet.name}
                            </p>
                            <p class="text-xs md:text-sm text-green-700">Code: ${state.selectedOutlet.code_short}</p>
                            <button onclick="resetContainerCollection()" 
                                class="mt-2 text-xs md:text-sm text-green-600 hover:text-green-800 underline">
                                <i class="fas fa-arrow-left mr-1"></i>Change Outlet
                            </button>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-xs md:text-sm font-medium mb-2">
                                <i class="fas fa-qrcode mr-1"></i>Scan Container ID
                            </label>
                            <div class="flex gap-2">
                                <input type="text" id="containerScanInput" 
                                    placeholder="Scan container ID (A...)"
                                    class="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    onkeydown="if(event.key==='Enter' || event.keyCode===13) { event.preventDefault(); handleContainerScan(); }"
                                    onkeypress="if(event.key==='Enter') handleContainerScan()"
                                    autofocus>
                                <button onclick="handleContainerScan()" 
                                    class="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 md:px-6 py-2 rounded-lg shadow-md">
                                    <i class="fas fa-check"></i>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Available Containers at Outlet -->
                        <div class="bg-gray-50 rounded-lg p-3 md:p-4">
                            <h4 class="font-semibold mb-3 text-sm md:text-base" data-available-count>
                                <i class="fas fa-box mr-2"></i>Available Containers (${state.availableContainers?.length || 0})
                            </h4>
                            <div id="availableContainersList" class="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
                                <p class="text-gray-500 text-center py-2 text-sm">Loading...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Scanned Containers List -->
                    <div>
                        <div class="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                            <h4 class="font-semibold mb-3 text-sm md:text-base" data-scanned-count>
                                <i class="fas fa-check-circle text-green-600 mr-2"></i>
                                Scanned Containers (${state.scannedContainers?.length || 0})
                            </h4>
                            <div id="scannedContainersList" class="space-y-2 max-h-48 md:max-h-64 overflow-y-auto mb-4">
                                <p class="text-gray-500 text-center py-4 text-sm">No containers scanned yet</p>
                            </div>
                            <!-- Complete Collection button will be dynamically inserted here -->
                        </div>
                    </div>
                </div>
            `}
        </div>
    `
    
    // Initialize state
    if (!state.scannedContainers) {
        state.scannedContainers = []
    }
    if (!state.availableContainers) {
        state.availableContainers = []
    }
    
    // Load containers if outlet selected
    if (state.selectedOutlet) {
        setTimeout(() => loadAvailableContainers(), 100)
    }
}

// Find containers at outlet
async function findOutletContainers() {
    const input = document.getElementById('containerOutletCodeInput')
    const outletCodeShort = input.value.trim().toUpperCase()
    
    if (!outletCodeShort) {
        showToast('Please enter outlet code', 'error')
        return
    }
    
    try {
        // NEW: Use dedicated container collection endpoint
        // This finds outlets based on container_inventory with status='delivered'
        const response = await axios.post('/api/containers/find-outlet', {
            outlet_code: outletCodeShort
        })
        
        if (response.data.success) {
            const containerData = response.data
            
            state.selectedOutlet = {
                code: containerData.outlet_code,
                code_short: containerData.outlet_code_short,
                name: containerData.outlet_name
            }
            state.scannedContainers = []
            state.availableContainers = containerData.containers || []
            
            // Reload the view
            showContainerCollectionView()
            
            showToast(`Found ${state.availableContainers.length} container(s) at ${containerData.outlet_name}`, 'success')
        } else {
            showToast(response.data.error || 'Outlet not found', 'error')
        }
    } catch (error) {
        console.error('Error finding outlet:', error)
        showToast(error.response?.data?.error || 'Failed to find outlet', 'error')
    }
}

// Load available containers at outlet
async function loadAvailableContainers() {
    if (!state.selectedOutlet) return
    
    try {
        const response = await axios.get(`/api/containers/by-outlet/${state.selectedOutlet.code}`)
        
        // Get all containers from API
        const allContainers = response.data.containers || []
        
        // Filter out already scanned containers
        const scannedIds = (state.scannedContainers || []).map(c => c.container_id)
        state.availableContainers = allContainers.filter(c => !scannedIds.includes(c.container_id))
        
        // Update the UI
        updateAvailableContainersList()
        updateScannedContainersList()
        
        // Update the header count in the view
        const headerElement = document.querySelector('[data-available-count]')
        if (headerElement) {
            headerElement.textContent = `Available Containers (${state.availableContainers.length})`
        }
    } catch (error) {
        console.error('Error loading containers:', error)
        showToast('Failed to load containers', 'error')
    }
}

// Handle container scan
let containerScanTimeout = null
async function handleContainerScan() {
    const input = document.getElementById('containerScanInput')
    const containerId = input.value.trim().toUpperCase()
    
    if (!containerId) return
    
    // Clear input immediately
    input.value = ''
    
    // Debounce: prevent double-scan within 500ms
    if (containerScanTimeout) {
        console.log('Debounced duplicate container scan')
        return
    }
    containerScanTimeout = setTimeout(() => {
        containerScanTimeout = null
    }, 500)
    
    // Check if already scanned
    if (state.scannedContainers.some(c => c.container_id === containerId)) {
        playBeep(false)
        showToast(`Already scanned: ${containerId}`, 'warning')
        return
    }
    
    try {
        const response = await axios.post('/api/containers/scan-collect', {
            container_id: containerId,
            outlet_code: state.selectedOutlet.code
        })
        
        if (response.data.success) {
            // Add to scanned list
            state.scannedContainers.push({
                container_id: containerId,
                outlet_code: response.data.outlet_code,
                outlet_name: response.data.outlet_name,
                delivered_at: response.data.delivered_at
            })
            
            // Remove from available containers list
            state.availableContainers = state.availableContainers.filter(
                c => c.container_id !== containerId
            )
            
            playBeep(true)
            showToast(`✓ Container ${containerId} ready for collection`, 'success')
            
            // Update UI - both available and scanned lists
            updateAvailableContainersList()
            updateScannedContainersList()
            
            // Update header count
            const headerElement = document.querySelector('[data-available-count]')
            if (headerElement) {
                headerElement.textContent = `Available Containers (${state.availableContainers.length})`
            }
        } else if (response.data.cross_outlet) {
            // Cross-outlet validation - ask for confirmation
            showCrossOutletConfirmation(response.data)
        } else {
            playBeep(false)
            showToast(response.data.error || 'Container not found', 'error')
        }
    } catch (error) {
        playBeep(false)
        showToast(error.response?.data?.error || 'Scan failed', 'error')
    }
}

// Show cross-outlet confirmation dialog
function showCrossOutletConfirmation(data) {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg md:text-xl font-bold mb-3 md:mb-4 text-orange-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>Wrong Outlet Container
            </h3>
            <p class="mb-3 md:mb-4 text-sm md:text-base">
                This container <strong class="font-mono text-xs md:text-sm">${data.container_id}</strong> belongs to:
            </p>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3 md:mb-4">
                <p class="font-semibold text-sm md:text-base">${data.current_outlet_name}</p>
                <p class="text-xs md:text-sm text-gray-600">Code: ${data.current_outlet}</p>
            </div>
            <p class="mb-4 md:mb-6 text-xs md:text-sm text-gray-700">
                Do you want to proceed to collect it and deduct from the owner outlet?
            </p>
            <div class="flex flex-col sm:flex-row gap-3">
                <button onclick="collectCrossOutletContainer('${data.container_id}', '${data.scanning_outlet}'); this.closest('.fixed').remove()" 
                    class="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-2.5 md:py-2 rounded-lg font-semibold text-sm md:text-base shadow-md">
                    <i class="fas fa-check-circle mr-2"></i>YES - Collect
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-800 py-2.5 md:py-2 rounded-lg font-semibold text-sm md:text-base shadow-md">
                    <i class="fas fa-times mr-2"></i>NO - Cancel
                </button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
}

// Collect container from wrong outlet
async function collectCrossOutletContainer(containerId, scanningOutlet) {
    try {
        const response = await axios.post('/api/containers/collect-cross-outlet', {
            container_id: containerId,
            scanning_outlet: scanningOutlet
        })
        
        if (response.data.success) {
            playBeep(true)
            showToast(`✓ Collected ${containerId} from ${response.data.original_outlet_name}`, 'success')
            
            // Add to scanned list with cross-outlet flag
            state.scannedContainers.push({
                container_id: containerId,
                outlet_code: response.data.original_outlet,
                outlet_name: response.data.original_outlet_name,
                cross_outlet: true
            })
            
            // Reload available containers
            loadAvailableContainers()
        } else {
            playBeep(false)
            showToast(response.data.error || 'Collection failed', 'error')
        }
    } catch (error) {
        playBeep(false)
        showToast(error.response?.data?.error || 'Collection failed', 'error')
    }
}

// Update scanned containers list
function updateScannedContainersList() {
    const listDiv = document.getElementById('scannedContainersList')
    if (!listDiv) return
    
    if (!state.scannedContainers || state.scannedContainers.length === 0) {
        listDiv.innerHTML = `<p class="text-gray-500 text-center py-4 text-sm">No containers scanned yet</p>`
    } else {
        listDiv.innerHTML = state.scannedContainers.map((container, index) => `
            <div class="bg-green-50 border border-green-200 rounded p-3">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-mono font-bold text-gray-800">${container.container_id}</p>
                        ${container.cross_outlet ? `
                            <p class="text-xs text-orange-600 font-semibold">
                                <i class="fas fa-exchange-alt mr-1"></i>From: ${container.outlet_name}
                            </p>
                        ` : ''}
                        <p class="text-xs text-gray-500">Ready for collection</p>
                    </div>
                    <button onclick="removeScannedContainer(${index})" 
                        class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('')
    }
    
    // Update the Complete Collection button
    updateCompleteCollectionButton()
}

// Update Complete Collection button visibility and count
function updateCompleteCollectionButton() {
    // Update scanned count header
    const scannedHeader = document.querySelector('[data-scanned-count]')
    if (scannedHeader) {
        scannedHeader.textContent = `Scanned Containers (${state.scannedContainers?.length || 0})`
        scannedHeader.innerHTML = `<i class="fas fa-check-circle text-green-600 mr-2"></i>Scanned Containers (${state.scannedContainers?.length || 0})`
    }
    
    // Find or create the button container
    const scannedDiv = document.getElementById('scannedContainersList')
    if (!scannedDiv) return
    
    const parentDiv = scannedDiv.parentElement
    if (!parentDiv) return
    
    // Remove existing button if any
    const existingButton = parentDiv.querySelector('.complete-collection-btn')
    if (existingButton) {
        existingButton.remove()
    }
    
    // Add button if there are scanned containers
    if (state.scannedContainers && state.scannedContainers.length > 0) {
        const button = document.createElement('button')
        button.className = 'complete-collection-btn w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md'
        button.onclick = completeContainerCollection
        button.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Complete Collection (${state.scannedContainers.length})`
        parentDiv.appendChild(button)
    }
}

// Remove container from scanned list
function removeScannedContainer(index) {
    state.scannedContainers.splice(index, 1)
    updateScannedContainersList()
    showContainerCollectionView() // Refresh to update button
}

// Complete container collection - Step 1: Show signature modal
async function completeContainerCollection() {
    if (!state.scannedContainers || state.scannedContainers.length === 0) {
        showToast('No containers scanned', 'warning')
        return
    }
    
    // Show signature modal (Step 1)
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 class="text-xl font-bold mb-4">
                <i class="fas fa-signature text-blue-600 mr-2"></i>Sign Collection
            </h3>
            <p class="mb-4">Ready to collect <strong>${state.scannedContainers.length}</strong> container(s) from <strong>${state.selectedOutlet.name}</strong></p>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Collector Name/Signature</label>
                <input type="text" id="collectionSignature" 
                    placeholder="Enter your name"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onkeydown="if(event.key==='Enter') { event.preventDefault(); document.getElementById('btnProceedToConfirm').click(); }">
            </div>
            
            <div class="flex gap-3">
                <button id="btnProceedToConfirm" onclick="showCollectionConfirmation(); this.closest('.fixed').remove()" 
                    class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold">
                    <i class="fas fa-arrow-right mr-2"></i>Proceed
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold">
                    Cancel
                </button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
    
    setTimeout(() => {
        document.getElementById('collectionSignature')?.focus()
    }, 100)
}

// Step 2: Show double confirmation dialog (like receiving workflow)
function showCollectionConfirmation() {
    const signature = document.getElementById('collectionSignature')?.value.trim()
    
    if (!signature) {
        showToast('Please enter collector name', 'error')
        // Reopen the signature modal
        setTimeout(() => completeContainerCollection(), 100)
        return
    }
    
    // Store signature in state temporarily
    state.tempCollectionSignature = signature
    
    // Show confirmation dialog with summary
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg md:text-xl font-bold mb-3 md:mb-4 text-orange-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Container Collection
            </h3>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
                <p class="font-semibold text-blue-900 mb-2 text-sm md:text-base">
                    <i class="fas fa-store mr-2"></i>Outlet: ${state.selectedOutlet.name}
                </p>
                <p class="text-xs md:text-sm text-blue-800">Code: ${state.selectedOutlet.code_short}</p>
                <p class="text-xs md:text-sm text-blue-800">
                    <i class="fas fa-signature mr-1"></i>Collector: ${signature}
                </p>
            </div>
            
            <div class="mb-4">
                <p class="font-semibold mb-2 text-sm md:text-base">
                    <i class="fas fa-box-open mr-2"></i>Containers to Collect: ${state.scannedContainers.length}
                </p>
                <div class="bg-gray-50 rounded p-2 md:p-3 max-h-48 md:max-h-64 overflow-y-auto">
                    ${state.scannedContainers.map(c => `
                        <div class="text-xs md:text-sm py-1.5 border-b border-gray-200 last:border-0">
                            <span class="font-mono font-semibold">${c.container_id}</span>
                            ${c.cross_outlet ? `<span class="text-orange-600 ml-2">(Cross-outlet)</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4 mb-4">
                <p class="text-yellow-800 font-semibold mb-2 text-sm md:text-base">
                    <i class="fas fa-question-circle mr-2"></i>Are you sure?
                </p>
                <p class="text-xs md:text-sm text-yellow-700">
                    This action will mark ${state.scannedContainers.length} container(s) as collected from ${state.selectedOutlet.name}.
                </p>
            </div>
            
            <div class="flex gap-2 md:gap-3">
                <button onclick="finalConfirmContainerCollection(); this.closest('.fixed').remove()" 
                    class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base shadow-lg">
                    <i class="fas fa-check-double mr-2"></i>YES - CONFIRM COLLECTION
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base shadow-lg">
                    <i class="fas fa-times mr-2"></i>NO - CANCEL
                </button>
            </div>
        </div>
    `
    document.body.appendChild(modal)
}

// Step 3: Final confirmation and API call
async function finalConfirmContainerCollection() {
    const signature = state.tempCollectionSignature
    
    if (!signature) {
        showToast('Missing collector signature', 'error')
        return
    }

    try {
        // Show loading state
        showToast('Processing collection...', 'info')
        const containerIds = state.scannedContainers.map(c => c.container_id)
        
        const response = await axios.post('/api/containers/complete-collection', {
            outlet_code: state.selectedOutlet.code,
            container_ids: containerIds,
            signature_name: signature
        })
        
        if (response.data.success) {
            showToast(`✓ ${response.data.success_count} container(s) collected successfully!`, 'success')
            
            // Clear temp signature
            delete state.tempCollectionSignature
            
            // Reset state
            state.scannedContainers = []
            state.selectedOutlet = null
            state.availableContainers = []
            
            // Reload the collection view
            showContainerCollectionView()
        } else {
            showToast('Collection failed', 'error')
        }
    } catch (error) {
        console.error('Collection error:', error)
        showToast(error.response?.data?.error || 'Failed to complete collection', 'error')
        // Clear temp signature on error
        delete state.tempCollectionSignature
    }
}

// Helper function to update available containers list only
function updateAvailableContainersList() {
    const listDiv = document.getElementById('availableContainersList')
    if (!listDiv) return
    
    // Filter out scanned containers
    const scannedIds = (state.scannedContainers || []).map(c => c.container_id)
    const actuallyAvailable = (state.availableContainers || []).filter(c => !scannedIds.includes(c.container_id))
    
    if (actuallyAvailable.length === 0) {
        listDiv.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-check-circle text-3xl text-green-500 mb-2"></i>
                <p class="text-sm text-gray-600">All containers scanned!</p>
            </div>
        `
    } else {
        listDiv.innerHTML = actuallyAvailable.map(container => `
            <div class="bg-white border border-gray-200 rounded p-3">
                <p class="font-mono font-bold text-gray-800">${container.container_id}</p>
                <p class="text-xs text-gray-500">Delivered: ${formatDate(container.delivered_at)}</p>
            </div>
        `).join('')
    }
    
    // Update header count
    const headerElement = document.querySelector('[data-available-count]')
    if (headerElement) {
        headerElement.textContent = `Available Containers (${actuallyAvailable.length})`
    }
}

// Reset container collection
function resetContainerCollection() {
    state.selectedOutlet = null
    state.scannedContainers = []
    state.availableContainers = []
    showContainerCollectionView()
}

// Show container inventory view
function showContainerInventoryView() {
    const content = document.getElementById('containerContent')
    
    content.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-4 md:p-6 pb-20">
            <h3 class="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center">
                <i class="fas fa-warehouse text-blue-600 mr-2"></i>
                <span>Container Inventory</span>
            </h3>
            
            <div id="containerInventoryList" class="space-y-3 md:space-y-4">
                <p class="text-gray-500 text-center py-6 md:py-8 text-sm md:text-base">Loading inventory...</p>
            </div>
            
            <button onclick="loadContainerInventory()" 
                class="w-full mt-4 mb-8 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2.5 md:py-2 rounded-lg shadow-md text-sm md:text-base">
                <i class="fas fa-sync mr-2"></i>Refresh Inventory
            </button>
        </div>
    `
    
    setTimeout(() => loadContainerInventory(), 100)
}

// Load container inventory
async function loadContainerInventory() {
    try {
        // OPTIMIZATION: Use cached data if available
        let response
        if (state.cachedContainerInventory && Date.now() - state.cachedContainerInventory.timestamp < 30000) {
            response = state.cachedContainerInventory
        } else {
            response = await axios.get('/api/containers/inventory')
            state.cachedContainerInventory = {
                ...response,
                timestamp: Date.now()
            }
        }
        const allContainers = response.data.containers || []
        
        // FILTER: Only show containers that are NOT yet collected
        // Show containers with status 'at_outlet' or 'delivered' (active in system)
        // Hide containers with status 'collected' (already picked up by driver)
        const containers = allContainers.filter(c => c.status !== 'collected')
        
        const listDiv = document.getElementById('containerInventoryList')
        if (!listDiv) return
        
        if (containers.length === 0) {
            listDiv.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">No containers in inventory</p>
                    <p class="text-sm text-gray-400 mt-2">Containers will appear here after outlet deliveries</p>
                </div>
            `
            return
        }
        
        // Group by outlet
        const groupedByOutlet = {}
        containers.forEach(container => {
            const key = container.outlet_code
            if (!groupedByOutlet[key]) {
                groupedByOutlet[key] = {
                    outlet_code: container.outlet_code,
                    outlet_name: container.outlet_name,
                    containers: []
                }
            }
            groupedByOutlet[key].containers.push(container)
        })
        
        listDiv.innerHTML = Object.values(groupedByOutlet).map(group => `
            <div class="border border-gray-200 rounded-lg p-4 md:p-5 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-center gap-3">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-lg md:text-xl text-gray-800 truncate mb-1">
                            <i class="fas fa-store text-blue-600 mr-2"></i>${group.outlet_name}
                        </h4>
                        <p class="text-sm text-gray-500">
                            <i class="fas fa-tag mr-1"></i>Code: <span class="font-mono font-semibold">${group.outlet_code}</span>
                        </p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex-shrink-0">
                        <div class="text-center">
                            <p class="text-3xl md:text-4xl font-bold">${group.containers.length}</p>
                            <p class="text-xs uppercase tracking-wide opacity-90">Container${group.containers.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('')
    } catch (error) {
        console.error('Error loading inventory:', error)
        const listDiv = document.getElementById('containerInventoryList')
        if (listDiv) {
            listDiv.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                    <p class="text-red-600">Failed to load container inventory</p>
                </div>
            `
        }
    }
}

// ============ Reports Page ============
function renderReports() {
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-4 py-6 flex-1 overflow-y-auto">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-chart-bar text-blue-600 mr-3"></i>Reports & Analytics
            </h2>
            
            <div class="grid md:grid-cols-4 gap-6 mb-6">
                <button onclick="loadDeliveryReport()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-truck text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Delivery Report</p>
                    <p class="text-sm">View completed deliveries</p>
                </button>
                
                <button onclick="loadContainerReport()" 
                    class="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-recycle text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Container Report</p>
                    <p class="text-sm">Track recyclable containers</p>
                </button>
                
                <button onclick="loadErrorReport()" 
                    class="bg-red-500 hover:bg-red-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Error Parcels</p>
                    <p class="text-sm">View scanning errors</p>
                </button>
                
                <button onclick="exportReport()" 
                    class="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-download text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Export Data</p>
                    <p class="text-sm">Download Excel report</p>
                </button>
            </div>
            
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div id="reportContent">
                    <p class="text-gray-500 text-center py-8">Select a report type above</p>
                </div>
            </div>
        </div>
    `
}

async function loadDeliveryReport() {
    try {
        const response = await axios.get('/api/reports/deliveries')
        const deliveries = response.data.deliveries
        
        const content = document.getElementById('reportContent')
        if (!deliveries || deliveries.length === 0) {
            content.innerHTML = '<p class="text-gray-500 text-center py-8">No delivery records found</p>'
            return
        }
        
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Delivery Report</h3>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="border px-4 py-2">Outlet</th>
                            <th class="border px-4 py-2">Pallet ID</th>
                            <th class="border px-4 py-2">Transfer Count</th>
                            <th class="border px-4 py-2">Loaded By (Warehouse)</th>
                            <th class="border px-4 py-2">Driver Signature</th>
                            <th class="border px-4 py-2">Loaded At</th>
                            <th class="border px-4 py-2">Unloaded By (Driver)</th>
                            <th class="border px-4 py-2">Outlet Signature</th>
                            <th class="border px-4 py-2">Delivered At</th>
                            <th class="border px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deliveries.map(d => `
                            <tr>
                                <td class="border px-4 py-2">${d.outlet_code} - ${d.outlet_name}</td>
                                <td class="border px-4 py-2 font-mono">${d.pallet_id}</td>
                                <td class="border px-4 py-2 text-center">${d.total_count}</td>
                                <td class="border px-4 py-2">${d.scanned_loading_by_name || '-'}</td>
                                <td class="border px-4 py-2">${d.loaded_by_name || '-'}</td>
                                <td class="border px-4 py-2">${formatDate(d.loaded_at)}</td>
                                <td class="border px-4 py-2">${d.scanned_unloading_by_name || '-'}</td>
                                <td class="border px-4 py-2">${d.received_by_name || '-'}</td>
                                <td class="border px-4 py-2">${formatDate(d.delivered_at)}</td>
                                <td class="border px-4 py-2">
                                    <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                        ${d.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
    } catch (error) {
        showToast('Failed to load report', 'error')
    }
}

async function loadContainerReport() {
    try {
        // OPTIMIZATION: Use cached data if available
        let response
        if (state.cachedContainerInventory && Date.now() - state.cachedContainerInventory.timestamp < 30000) {
            response = state.cachedContainerInventory
        } else {
            response = await axios.get('/api/containers/inventory')
            state.cachedContainerInventory = {
                ...response,
                timestamp: Date.now()
            }
        }
        const containers = response.data.containers || []
        
        const content = document.getElementById('reportContent')
        if (!containers || containers.length === 0) {
            content.innerHTML = '<p class="text-gray-500 text-center py-8">No container records found</p>'
            return
        }
        
        // Calculate statistics
        const totalContainers = containers.length
        const atOutletCount = containers.filter(c => c.status === 'at_outlet').length
        const collectedCount = containers.filter(c => c.status === 'collected').length
        
        // Group by outlet
        const byOutlet = {}
        containers.forEach(c => {
            if (!byOutlet[c.outlet_code]) {
                byOutlet[c.outlet_code] = {
                    outlet_name: c.outlet_name,
                    containers: []
                }
            }
            byOutlet[c.outlet_code].containers.push(c)
        })
        
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4">
                <i class="fas fa-recycle text-green-600 mr-2"></i>Container Tracking Report
            </h3>
            
            <!-- Statistics -->
            <div class="grid md:grid-cols-3 gap-4 mb-6">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-sm text-blue-600 mb-1">Total Containers</p>
                    <p class="text-3xl font-bold text-blue-800">${totalContainers}</p>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p class="text-sm text-green-600 mb-1">At Outlets</p>
                    <p class="text-3xl font-bold text-green-800">${atOutletCount}</p>
                </div>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p class="text-sm text-gray-600 mb-1">Collected</p>
                    <p class="text-3xl font-bold text-gray-800">${collectedCount}</p>
                </div>
            </div>
            
            <!-- Container Details by Outlet -->
            <h4 class="font-semibold mb-3">Containers by Outlet</h4>
            <div class="overflow-x-auto mb-6">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="border px-4 py-2">Outlet</th>
                            <th class="border px-4 py-2">Container Count</th>
                            <th class="border px-4 py-2">At Outlet</th>
                            <th class="border px-4 py-2">Collected</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(byOutlet).map(([code, data]) => {
                            const atOutlet = data.containers.filter(c => c.status === 'at_outlet').length
                            const collected = data.containers.filter(c => c.status === 'collected').length
                            return `
                                <tr>
                                    <td class="border px-4 py-2">
                                        <div>
                                            <p class="font-semibold">${data.outlet_name}</p>
                                            <p class="text-xs text-gray-500">${code}</p>
                                        </div>
                                    </td>
                                    <td class="border px-4 py-2 text-center font-bold">${data.containers.length}</td>
                                    <td class="border px-4 py-2 text-center">
                                        <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
                                            ${atOutlet}
                                        </span>
                                    </td>
                                    <td class="border px-4 py-2 text-center">
                                        <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-semibold">
                                            ${collected}
                                        </span>
                                    </td>
                                </tr>
                            `
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- All Container Details -->
            <h4 class="font-semibold mb-3">All Container Records</h4>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="border px-4 py-2">Container ID</th>
                            <th class="border px-4 py-2">Outlet</th>
                            <th class="border px-4 py-2">Status</th>
                            <th class="border px-4 py-2">Delivered At</th>
                            <th class="border px-4 py-2">Delivered By</th>
                            <th class="border px-4 py-2">Collected At</th>
                            <th class="border px-4 py-2">Collected By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${containers.map(c => `
                            <tr>
                                <td class="border px-4 py-2 font-mono font-bold">${c.container_id}</td>
                                <td class="border px-4 py-2">
                                    <div>
                                        <p class="font-semibold">${c.outlet_name}</p>
                                        <p class="text-xs text-gray-500">${c.outlet_code}</p>
                                    </div>
                                </td>
                                <td class="border px-4 py-2">
                                    <span class="px-2 py-1 rounded text-sm ${
                                        c.status === 'at_outlet' ? 'bg-green-100 text-green-800' :
                                        c.status === 'collected' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }">
                                        ${c.status}
                                    </span>
                                </td>
                                <td class="border px-4 py-2">${formatDate(c.delivered_at)}</td>
                                <td class="border px-4 py-2">${c.delivered_by_name || '-'}</td>
                                <td class="border px-4 py-2">${c.collected_at ? formatDate(c.collected_at) : '-'}</td>
                                <td class="border px-4 py-2">${c.collected_by_name || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
    } catch (error) {
        console.error('Failed to load container report:', error)
        showToast('Failed to load container report', 'error')
    }
}

async function loadErrorReport() {
    try {
        const response = await axios.get('/api/reports/errors')
        const errors = response.data.errors
        
        const content = document.getElementById('reportContent')
        if (!errors || errors.length === 0) {
            content.innerHTML = '<p class="text-gray-500 text-center py-8">No error records found</p>'
            return
        }
        
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Error Parcels Report</h3>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="border px-4 py-2">Transfer Number</th>
                            <th class="border px-4 py-2">Error Type</th>
                            <th class="border px-4 py-2">Message</th>
                            <th class="border px-4 py-2">Scanned By</th>
                            <th class="border px-4 py-2">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${errors.map(e => `
                            <tr>
                                <td class="border px-4 py-2 font-semibold">${e.transfer_number}</td>
                                <td class="border px-4 py-2">
                                    <span class="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                                        ${e.error_type}
                                    </span>
                                </td>
                                <td class="border px-4 py-2">${e.error_message}</td>
                                <td class="border px-4 py-2">${e.scanned_by_name || '-'}</td>
                                <td class="border px-4 py-2">${formatDate(e.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `
    } catch (error) {
        showToast('Failed to load error report', 'error')
    }
}

async function exportReport() {
    try {
        const [deliveriesRes, errorsRes, containersRes] = await Promise.all([
            axios.get('/api/reports/deliveries'),
            axios.get('/api/reports/errors'),
            axios.get('/api/containers/inventory')
        ])
        
        const deliveries = deliveriesRes.data.deliveries
        const errors = errorsRes.data.errors
        const containers = containersRes.data.containers || []
        
        // Create workbook
        const wb = XLSX.utils.book_new()
        
        // Deliveries sheet
        const deliveriesData = deliveries.map(d => ({
            'Outlet Code': d.outlet_code,
            'Outlet Name': d.outlet_name,
            'Pallet ID': d.pallet_id,
            'Transfer Count': d.total_count,
            'Loaded By (Warehouse)': d.scanned_loading_by_name || '-',
            'Driver Signature': d.loaded_by_name || '-',
            'Loaded At': formatDate(d.loaded_at),
            'Unloaded By (Driver)': d.scanned_unloading_by_name || '-',
            'Outlet Signature': d.received_by_name || '-',
            'Delivered At': formatDate(d.delivered_at),
            'Status': d.status
        }))
        const ws1 = XLSX.utils.json_to_sheet(deliveriesData)
        XLSX.utils.book_append_sheet(wb, ws1, 'Deliveries')
        
        // Container Inventory sheet
        const containersData = containers.map(c => ({
            'Container ID': c.container_id,
            'Outlet Code': c.outlet_code,
            'Outlet Name': c.outlet_name,
            'Status': c.status,
            'Delivered At': formatDate(c.delivered_at),
            'Collected At': c.collected_at ? formatDate(c.collected_at) : '-',
            'Collected By': c.collected_by_name || '-'
        }))
        const ws2 = XLSX.utils.json_to_sheet(containersData)
        XLSX.utils.book_append_sheet(wb, ws2, 'Container Inventory')
        
        // Errors sheet
        const errorsData = errors.map(e => ({
            'Transfer Number': e.transfer_number,
            'Error Type': e.error_type,
            'Error Message': e.error_message,
            'Outlet Code': e.outlet_code || '-',
            'Scanned By': e.scanned_by_name || '-',
            'Time': formatDate(e.created_at)
        }))
        const ws3 = XLSX.utils.json_to_sheet(errorsData)
        XLSX.utils.book_append_sheet(wb, ws3, 'Errors')
        
        // Download
        const filename = `APD_OASIS_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, filename)
        
        showToast('Report exported successfully', 'success')
    } catch (error) {
        console.error('Export error:', error)
        showToast('Failed to export report', 'error')
    }
}

// ============ Profile Page ============
function renderProfile() {
    return `
        <div class="h-full flex flex-col">
        <div class="container mx-auto px-4 py-6 flex-1 overflow-y-auto">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-user text-blue-600 mr-3"></i>My Profile
            </h2>
            
            <div class="max-w-2xl mx-auto">
                <!-- User Information -->
                <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>Profile Information
                    </h3>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600 font-medium">Username:</span>
                            <span class="font-semibold">${state.user.username}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600 font-medium">Full Name:</span>
                            <span class="font-semibold">${state.user.full_name}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b">
                            <span class="text-gray-600 font-medium">Role:</span>
                            <span class="font-semibold capitalize">${state.user.role.replace('_', ' ')}</span>
                        </div>
                        ${state.user.outlet_code ? `
                            <div class="flex justify-between py-2 border-b">
                                <span class="text-gray-600 font-medium">Outlet Code:</span>
                                <span class="font-semibold">${state.user.outlet_code}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Change Password -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-key text-blue-600 mr-2"></i>Change Password
                    </h3>
                    
                    <form onsubmit="handleChangePassword(event)" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Current Password <span class="text-red-500">*</span>
                            </label>
                            <input type="password" id="currentPassword" required 
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter current password">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                New Password <span class="text-red-500">*</span>
                            </label>
                            <input type="password" id="newPassword" required 
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter new password"
                                minlength="6">
                            <p class="text-xs text-gray-500 mt-1">At least 6 characters</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Confirm New Password <span class="text-red-500">*</span>
                            </label>
                            <input type="password" id="confirmPassword" required 
                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Confirm new password">
                        </div>
                        
                        <button type="submit" 
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg">
                            <i class="fas fa-save mr-2"></i>Change Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `
}

async function handleChangePassword(event) {
    event.preventDefault()
    
    const currentPassword = document.getElementById('currentPassword').value
    const newPassword = document.getElementById('newPassword').value
    const confirmPassword = document.getElementById('confirmPassword').value
    
    // Validation
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error')
        return
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error')
        return
    }
    
    if (currentPassword === newPassword) {
        showToast('New password must be different from current password', 'error')
        return
    }
    
    try {
        await axios.post('/api/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        })
        
        showToast('Password changed successfully!', 'success')
        
        // Clear form
        document.getElementById('currentPassword').value = ''
        document.getElementById('newPassword').value = ''
        document.getElementById('confirmPassword').value = ''
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to change password', 'error')
    }
}

// ============ Main Render Function ============
function render() {
    const app = document.getElementById('app')
    
    console.log('=== RENDER START ===')
    console.log('Rendering page:', state.currentPage)
    console.log('User exists:', !!state.user)
    console.log('User data:', state.user)
    console.log('Token exists:', !!state.token)
    
    if (state.currentPage === 'login') {
        app.innerHTML = renderLogin()
        console.log('Rendered login page')
        return
    }
    
    // If no user but we have storage, try to load it
    if (!state.user) {
        console.log('No user in state, checking storage...')
        const storedUser = Storage.get('user')
        const storedToken = Storage.get('token')
        
        if (storedUser && storedToken) {
            console.log('Found user in storage, restoring to state')
            try {
                state.user = JSON.parse(storedUser)
                state.token = storedToken
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
                console.log('State restored from storage:', state.user)
            } catch (e) {
                console.error('Failed to restore from storage:', e)
                state.currentPage = 'login'
                app.innerHTML = renderLogin()
                return
            }
        } else {
            console.log('No user in storage either, showing login')
            state.currentPage = 'login'
            app.innerHTML = renderLogin()
            return
        }
    }
    
    let content = ''
    
    switch(state.currentPage) {
        case 'admin':
            content = renderAdmin()
            break
        case 'import':
            content = renderImport()
            break
        case 'dashboard':
            content = renderDashboard()
            break
        case 'warehouse':
            content = renderWarehouse()
            break
        case 'outlet':
            content = renderOutlet()
            break
        case 'containers':
            content = renderContainers()
            break
        case 'reports':
            content = renderReports()
            break
        case 'profile':
            content = renderProfile()
            break
        default:
            content = '<p class="text-center py-8">Page not found</p>'
    }
    
    app.innerHTML = renderNavBar() + content
    
    // Load data based on current page
    setTimeout(() => {
        switch(state.currentPage) {
            case 'admin':
                loadUsers()
                loadOutlets()
                break
            case 'dashboard':
                loadDashboardData()
                break
            case 'warehouse':
                loadWarehouseData()
                // Update scanned items list to show persistent items
                setTimeout(() => {
                    updateScannedItemsList()
                    // 🐛 DEBUG: Verify date input after page load
                    const dateInput = document.getElementById('warehouseDeliveryDate')
                    console.log('🔍 After page load - Date input element:', dateInput)
                    console.log('🔍 After page load - Date input value:', dateInput?.value)
                    console.log('🔍 After page load - State date:', state.warehouseDeliveryDate)
                }, 200)
                break
            case 'outlet':
                // Outlet page uses manual two-step process: find outlet, then scan pallets
                // Update scanned items list if outlet is already selected
                if (state.selectedOutlet) {
                    setTimeout(() => {
                        updateOutletScannedList()
                        updateOutletCompleteButton()
                    }, 200)
                }
                break
        }
    }, 100)
}

// Initial render
render()
