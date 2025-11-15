// APD OASIS Warehouse Logistic System - Frontend Application

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
    errors: []
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
const API_BASE = window.location.origin
axios.defaults.baseURL = API_BASE

// Set auth token if exists
const storedToken = localStorage.getItem('token')
if (storedToken) {
    state.token = storedToken
    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    
    // Verify token
    axios.get('/api/me')
        .then(response => {
            state.user = response.data.user
            navigateTo(getDefaultPage())
        })
        .catch(() => {
            localStorage.removeItem('token')
            state.token = null
            delete axios.defaults.headers.common['Authorization']
            navigateTo('login')
        })
} else {
    navigateTo('login')
}

// ============ Helper Functions ============
function getDefaultPage() {
    if (!state.user) return 'login'
    
    switch(state.user.role) {
        case 'admin': return 'dashboard'
        case 'warehouse': return 'dashboard'
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
    state.currentPage = page
    render()
}

function logout() {
    localStorage.removeItem('token')
    state.token = null
    state.user = null
    delete axios.defaults.headers.common['Authorization']
    navigateTo('login')
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
                
                <div class="mt-6 text-center text-sm text-gray-600">
                    <p>Default Admin: admin / admin123</p>
                </div>
            </div>
        </div>
    `
}

async function handleLogin(event) {
    event.preventDefault()
    
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value
    
    try {
        const response = await axios.post('/api/login', { username, password })
        
        state.token = response.data.token
        state.user = response.data.user
        
        localStorage.setItem('token', state.token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        
        showToast('Login successful!', 'success')
        navigateTo(getDefaultPage())
    } catch (error) {
        showToast(error.response?.data?.error || 'Login failed', 'error')
    }
}

// ============ Navigation Bar ============
function renderNavBar() {
    if (!state.user) return ''
    
    return `
        <nav class="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
            <div class="container mx-auto px-4 py-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-truck text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-bold">APD OASIS</h1>
                            <p class="text-xs text-blue-200">${state.user.full_name} (${state.user.role})</p>
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        ${state.user.role === 'admin' ? `
                            <button onclick="navigateTo('admin')" 
                                class="px-4 py-2 rounded ${state.currentPage === 'admin' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                                <i class="fas fa-cog mr-2"></i>Admin
                            </button>
                            <button onclick="navigateTo('import')" 
                                class="px-4 py-2 rounded ${state.currentPage === 'import' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                                <i class="fas fa-upload mr-2"></i>Import
                            </button>
                        ` : ''}
                        
                        ${['admin', 'warehouse', 'driver'].includes(state.user.role) ? `
                            <button onclick="navigateTo('dashboard')" 
                                class="px-4 py-2 rounded ${state.currentPage === 'dashboard' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                                <i class="fas fa-tachometer-alt mr-2"></i>Dashboard
                            </button>
                            <button onclick="navigateTo('warehouse')" 
                                class="px-4 py-2 rounded ${state.currentPage === 'warehouse' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                                <i class="fas fa-warehouse mr-2"></i>Warehouse
                            </button>
                        ` : ''}
                        
                        ${['admin', 'outlet', 'driver'].includes(state.user.role) ? `
                            <button onclick="navigateTo('outlet')" 
                                class="px-4 py-2 rounded ${state.currentPage === 'outlet' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                                <i class="fas fa-store mr-2"></i>Outlet
                            </button>
                        ` : ''}
                        
                        <button onclick="navigateTo('reports')" 
                            class="px-4 py-2 rounded ${state.currentPage === 'reports' ? 'bg-blue-800' : 'bg-blue-500 hover:bg-blue-700'}">
                            <i class="fas fa-chart-bar mr-2"></i>Reports
                        </button>
                        
                        <button onclick="logout()" 
                            class="px-4 py-2 bg-red-500 hover:bg-red-600 rounded">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `
}

// ============ Admin Page ============
function renderAdmin() {
    return `
        <div class="container mx-auto px-4 py-6">
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
    `
}

async function loadUsers() {
    try {
        const response = await axios.get('/api/admin/users')
        state.users = response.data.users
        
        const usersList = document.getElementById('usersList')
        if (!usersList) return
        
        if (state.users.length === 0) {
            usersList.innerHTML = '<p class="text-gray-500 text-center py-4">No users found</p>'
            return
        }
        
        usersList.innerHTML = state.users.map(user => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${user.full_name}</p>
                        <p class="text-sm text-gray-600">@${user.username} - ${user.role}</p>
                        ${user.outlet_code ? `<p class="text-sm text-blue-600">Outlet: ${user.outlet_code}</p>` : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="toggleUserStatus('${user.id}', ${!user.is_active})" 
                            class="px-3 py-1 rounded text-sm ${user.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white">
                            ${user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onclick="deleteUser('${user.id}')" 
                            class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('')
    } catch (error) {
        console.error('Error loading users:', error)
    }
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
                            <option value="warehouse">Warehouse</option>
                            <option value="driver">Driver</option>
                            <option value="outlet">Outlet</option>
                            <option value="admin">Admin</option>
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
        <div class="container mx-auto px-4 py-6">
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
            
            if (importData.length === 0) {
                showToast('No valid data found in Excel file', 'error')
                return
            }
            
            // Show preview
            const preview = document.getElementById('importPreview')
            preview.classList.remove('hidden')
            
            // Group by pallet ID for preview
            const palletMap = new Map()
            importData.forEach(item => {
                if (!palletMap.has(item.pallet_id)) {
                    palletMap.set(item.pallet_id, {
                        ...item,
                        transfer_count: 0
                    })
                }
                palletMap.get(item.pallet_id).transfer_count++
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
        
        const response = await axios.post('/api/import', {
            data: importData,
            import_date: new Date().toISOString().split('T')[0],
            delivery_date: deliveryDate
        })
        
        showToast(`Successfully imported ${response.data.total_parcels} parcels for ${deliveryDate}`, 'success')
        cancelImport()
        navigateTo('warehouse')
    } catch (error) {
        showToast(error.response?.data?.error || 'Import failed', 'error')
        
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

// ============ Dashboard Page ============
function renderDashboard() {
    // Initialize dashboard date if not set
    if (!state.dashboardDate) {
        state.dashboardDate = new Date().toISOString().split('T')[0] // Today
    }
    
    // Calculate yesterday, today, tomorrow
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const selectedDate = state.dashboardDate
    
    // Format date labels
    const formatDateLabel = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    return `
        <div class="container mx-auto px-4 py-6">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-tachometer-alt text-blue-600 mr-3"></i>Live Dashboard
            </h2>
            
            <!-- Date Selection Tabs -->
            <div class="bg-white rounded-lg shadow-lg mb-6 p-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="flex gap-2">
                        <button onclick="setDashboardDate('${yesterdayStr}')" 
                            class="px-4 py-2 rounded-lg font-semibold transition ${selectedDate === yesterdayStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                            <i class="fas fa-chevron-left mr-2"></i>Yesterday (${formatDateLabel(yesterdayStr)})
                        </button>
                        <button onclick="setDashboardDate('${todayStr}')" 
                            class="px-4 py-2 rounded-lg font-semibold transition ${selectedDate === todayStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                            <i class="fas fa-calendar-day mr-2"></i>Today (${formatDateLabel(todayStr)})
                        </button>
                        <button onclick="setDashboardDate('${tomorrowStr}')" 
                            class="px-4 py-2 rounded-lg font-semibold transition ${selectedDate === tomorrowStr ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}">
                            Tomorrow (${formatDateLabel(tomorrowStr)})<i class="fas fa-chevron-right ml-2"></i>
                        </button>
                    </div>
                    <button onclick="loadDashboardData()" 
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-sync mr-2"></i>Refresh
                    </button>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="grid md:grid-cols-4 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Total Outlets</p>
                            <p id="dash-total-outlets" class="text-3xl font-bold text-blue-600">-</p>
                        </div>
                        <i class="fas fa-store text-4xl text-blue-200"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Total Pallets</p>
                            <p id="dash-total-pallets" class="text-3xl font-bold text-purple-600">-</p>
                        </div>
                        <i class="fas fa-pallet text-4xl text-purple-200"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Loaded Pallets</p>
                            <p id="dash-loaded-pallets" class="text-3xl font-bold text-green-600">-</p>
                        </div>
                        <i class="fas fa-check-circle text-4xl text-green-200"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Delivered Pallets</p>
                            <p id="dash-delivered-pallets" class="text-3xl font-bold text-teal-600">-</p>
                        </div>
                        <i class="fas fa-truck text-4xl text-teal-200"></i>
                    </div>
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
                        <span id="dash-loading-text">0 / 0 pallets loaded</span>
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
                        <span id="dash-delivery-text">0 / 0 pallets delivered</span>
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
                                <th class="px-4 py-2 text-center">Total Pallets</th>
                                <th class="px-4 py-2 text-center">Loaded</th>
                                <th class="px-4 py-2 text-center">Delivered</th>
                                <th class="px-4 py-2 text-center">Status</th>
                                <th class="px-4 py-2 text-center">Loaded At</th>
                                <th class="px-4 py-2 text-center">Delivered At</th>
                                <th class="px-4 py-2 text-left">Receiver</th>
                            </tr>
                        </thead>
                        <tbody id="dash-outlet-table">
                            <tr>
                                <td colspan="8" class="text-center py-4 text-gray-500">Loading...</td>
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
        
        // Fetch parcels for selected date
        const response = await axios.get(`/api/dashboard/parcels?delivery_date=${selectedDate}`)
        const parcels = response.data.parcels || []
        
        // Group by outlet
        const outletMap = new Map()
        let totalPallets = 0
        let loadedPallets = 0
        let deliveredPallets = 0
        
        parcels.forEach(parcel => {
            // Skip invalid parcels
            if (!parcel.outlet_code || !parcel.outlet_name) return
            if (parcel.outlet_code.toUpperCase().trim() === 'STORE CODE' && 
                parcel.outlet_name.toUpperCase().trim() === 'STORE NAME') return
            
            totalPallets++
            if (parcel.status === 'loaded') loadedPallets++
            if (parcel.status === 'delivered') deliveredPallets++
            
            if (!outletMap.has(parcel.outlet_code)) {
                outletMap.set(parcel.outlet_code, {
                    code: parcel.outlet_code,
                    code_short: parcel.outlet_code_short || parcel.outlet_code,
                    name: parcel.outlet_name,
                    total: 0,
                    loaded: 0,
                    delivered: 0,
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
            }
            
            // Track delivered status and info
            if (parcel.status === 'delivered') {
                outlet.delivered++
                // Store latest delivery info
                if (!outlet.last_delivered_at || parcel.delivered_at > outlet.last_delivered_at) {
                    outlet.last_delivered_at = parcel.delivered_at
                    outlet.last_receiver = parcel.received_by_name
                }
            }
        })
        
        // Update statistics
        document.getElementById('dash-total-outlets').textContent = outletMap.size
        document.getElementById('dash-total-pallets').textContent = totalPallets
        document.getElementById('dash-loaded-pallets').textContent = loadedPallets
        document.getElementById('dash-delivered-pallets').textContent = deliveredPallets
        
        // Update loading progress
        const loadingPercent = totalPallets > 0 ? Math.round((loadedPallets / totalPallets) * 100) : 0
        document.getElementById('dash-loading-percent').textContent = loadingPercent + '%'
        document.getElementById('dash-loading-bar').style.width = loadingPercent + '%'
        document.getElementById('dash-loading-text').textContent = `${loadedPallets} / ${totalPallets} pallets loaded`
        
        // Update delivery progress
        const deliveryPercent = totalPallets > 0 ? Math.round((deliveredPallets / totalPallets) * 100) : 0
        document.getElementById('dash-delivery-percent').textContent = deliveryPercent + '%'
        document.getElementById('dash-delivery-bar').style.width = deliveryPercent + '%'
        document.getElementById('dash-delivery-text').textContent = `${deliveredPallets} / ${totalPallets} pallets delivered`
        
        // Update outlet table
        const tableBody = document.getElementById('dash-outlet-table')
        if (outletMap.size === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-gray-500">No data available</td></tr>'
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
setInterval(() => {
    if (state.currentPage === 'dashboard') {
        loadDashboardData()
    }
}, 30000)

// ============ Warehouse Page ============
function renderWarehouse() {
    // Initialize warehouse delivery date if not set
    if (!state.warehouseDeliveryDate) {
        state.warehouseDeliveryDate = new Date().toISOString().split('T')[0]
    }
    
    return `
        <div class="container mx-auto px-4 py-6">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-warehouse text-blue-600 mr-3"></i>Warehouse Loading
            </h2>
            
            <!-- Delivery Date Selection -->
            <div class="bg-white rounded-lg shadow-lg mb-6 p-4">
                <div class="flex items-center gap-4 flex-wrap">
                    <label class="font-semibold text-gray-700">
                        <i class="fas fa-calendar mr-2"></i>Delivery Date:
                    </label>
                    <input type="date" id="warehouseDeliveryDate" 
                        class="px-4 py-2 border-2 border-blue-300 rounded-lg font-semibold"
                        value="${state.warehouseDeliveryDate}"
                        onchange="setWarehouseDeliveryDate(this.value)">
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-info-circle mr-1"></i>
                        Select the delivery date to view and load parcels
                    </p>
                </div>
            </div>
            
            <div class="grid lg:grid-cols-3 gap-6">
                <!-- Scanning Panel -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold mb-4">
                            <i class="fas fa-pallet mr-2 text-blue-600"></i>Scan Pallet ID
                        </h3>
                        
                        <div class="mb-4">
                            <input type="text" id="warehouseScanInput" 
                                class="w-full px-4 py-3 border-4 border-blue-500 rounded-lg text-lg scan-input"
                                placeholder="Scan or enter Pallet ID..."
                                autofocus
                                onkeypress="if(event.key==='Enter') handleWarehouseScan()">
                        </div>
                        
                        <div class="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                            <p class="text-sm text-blue-800">
                                <i class="fas fa-info-circle mr-2"></i>
                                <strong>New!</strong> Scan Pallet ID to mark all transfers in that pallet as loaded at once.
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
    state.warehouseDeliveryDate = date
    loadWarehouseData()
}

async function loadWarehouseData() {
    try {
        // Get selected delivery date (default to today)
        const deliveryDate = state.warehouseDeliveryDate || new Date().toISOString().split('T')[0]
        
        const response = await axios.get(`/api/warehouse/parcels?delivery_date=${deliveryDate}`)
        state.parcels = response.data.parcels
        
        console.log('Loaded parcels:', state.parcels.length)
        
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
        
        summary.innerHTML = Array.from(outletMap.values()).map(outlet => {
            const percentage = outlet.total > 0 ? Math.round((outlet.scanned / outlet.total) * 100) : 0
            const isComplete = outlet.scanned === outlet.total
            
            return `
                <div class="border-2 ${isComplete ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex-1">
                            <p class="font-bold text-lg">${outlet.code_short}</p>
                            <p class="text-sm text-gray-600">${outlet.name}</p>
                            <p class="text-xs text-gray-500">Code: ${outlet.code}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${isComplete ? '<i class="fas fa-check-circle text-green-500 text-2xl"></i>' : ''}
                        </div>
                    </div>
                    <div class="mt-2">
                        <div class="flex justify-between text-sm mb-1">
                            <span>${outlet.scanned} / ${outlet.total} pallets</span>
                            <span>${percentage}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
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
        }).join('')
    } catch (error) {
        console.error('Error loading warehouse data:', error)
    }
}

async function handleWarehouseScan() {
    const input = document.getElementById('warehouseScanInput')
    const palletId = input.value.trim().toUpperCase()
    
    if (!palletId) return
    
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
        // NEW: Scan pallet ID (scans entire pallet at once)
        const response = await axios.post('/api/warehouse/scan-pallet', { pallet_id: palletId })
        
        if (response.data.success) {
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
                time: new Date().toLocaleTimeString()
            })
            
            updateScannedItemsList()
            loadWarehouseData()
        } else {
            playBeep(false)
            showToast(`✗ ${response.data.error}`, 'error')
        }
    } catch (error) {
        playBeep(false)
        showToast(error.response?.data?.error || 'Scan failed', 'error')
    }
    
    input.value = ''
    input.focus()
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
        state.scannedItems = []
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
                    <i class="fas fa-info-circle mr-1"></i>This will remove the item from your current session only.
                    ${context === 'warehouse' ? 'The parcels will remain in "loaded" status in the database.' : 'The parcels will remain in "delivered" status in the database.'}
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

function deleteScannedItem(index, context) {
    const item = state.scannedItems[index]
    if (!item) {
        showToast('Item not found', 'error')
        return
    }
    
    // Remove from scanned items array
    state.scannedItems.splice(index, 1)
    
    // Update the appropriate list
    if (context === 'warehouse') {
        updateScannedItemsList()
    } else if (context === 'outlet') {
        updateOutletScannedList()
    }
    
    showToast(`Scan removed: ${item.pallet_id}`, 'success')
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
    return `
        <div class="container mx-auto px-4 py-6">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-store text-blue-600 mr-3"></i>Outlet Unloading
            </h2>
            
            ${!state.selectedOutlet ? `
                <!-- Step 1: Scan Outlet Code -->
                <div class="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
                    <div class="text-center mb-6">
                        <div class="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-store text-4xl text-blue-600"></i>
                        </div>
                        <h3 class="text-2xl font-bold mb-2">Step 1: Identify Your Outlet</h3>
                        <p class="text-gray-600">Scan or enter your outlet short code</p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Outlet Short Code (e.g., MKC, JBB, JKJSTT1)
                        </label>
                        <input type="text" id="outletCodeInput" 
                            class="w-full px-4 py-3 border-4 border-blue-500 rounded-lg text-lg scan-input"
                            placeholder="Scan or enter outlet code..."
                            autofocus
                            onkeypress="if(event.key==='Enter') handleFindOutletPallets()">
                    </div>
                    
                    <button onclick="handleFindOutletPallets()" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-lg text-lg">
                        <i class="fas fa-search mr-2"></i>Find My Pallets
                    </button>
                    
                    <div class="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                        <p class="text-sm text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Tip:</strong> Your outlet code is the short name before the dash in your store name (e.g., if your store is "MKC - Central Store", enter "MKC")
                        </p>
                    </div>
                </div>
            ` : `
                <!-- Step 2: Scan Pallet IDs -->
                <div class="mb-6 bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center">
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
                </div>
                
                <div class="grid lg:grid-cols-3 gap-6">
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
                                    onkeypress="if(event.key==='Enter') handleOutletScanPallet()">
                            </div>
                            
                            <button onclick="handleOutletScanPallet()" 
                                class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg mb-4">
                                <i class="fas fa-barcode mr-2"></i>Scan Pallet
                            </button>
                            
                            ${state.scannedItems.length > 0 ? `
                                <button onclick="showOutletCompletionModal()" 
                                    class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg">
                                    <i class="fas fa-check-circle mr-2"></i>Complete Receipt (${state.scannedItems.length} pallets)
                                </button>
                            ` : ''}
                            
                            <!-- Scanned Items -->
                            <div class="mt-6">
                                <h4 class="font-semibold mb-3">Scanned Pallets (${state.scannedItems.length})</h4>
                                <div id="outletScannedList" class="space-y-2 max-h-96 overflow-y-auto">
                                    <p class="text-gray-500 text-center py-4">No pallets scanned yet</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Available Pallets -->
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
            state.selectedOutlet = {
                code: response.data.outlet_code,
                code_short: response.data.outlet_code_short,
                name: response.data.outlet_name
            }
            state.availablePallets = response.data.pallets
            state.scannedItems = []
            
            showToast(`Found ${response.data.pallets.length} pallet(s) for ${outletCodeShort}`, 'success')
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
            
            const palletsDiv = document.getElementById('availablePallets')
            if (!palletsDiv) return
            
            if (state.availablePallets.length === 0) {
                palletsDiv.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-check-circle text-6xl text-green-500 mb-3"></i>
                        <p class="text-lg font-semibold text-green-600">All Deliveries Received!</p>
                        <p class="text-sm text-gray-600">No pending pallets</p>
                    </div>
                `
                return
            }
            
            palletsDiv.innerHTML = state.availablePallets.map(pallet => `
                <div class="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                    <div class="flex items-center justify-between mb-2">
                        <p class="font-bold text-lg">
                            <i class="fas fa-pallet mr-2 text-blue-600"></i>${pallet.pallet_id}
                        </p>
                        <span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-semibold">
                            ${pallet.status.toUpperCase()}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-box mr-1"></i>${pallet.transfer_count} transfers
                    </p>
                </div>
            `).join('')
        }
    } catch (error) {
        console.error('Error loading pallets:', error)
    }
}

function clearOutletSelection() {
    state.selectedOutlet = null
    state.availablePallets = []
    state.scannedItems = []
    render()
}

// NEW: Step 2 - Scan pallet ID (validation only, no immediate delivery)
async function handleOutletScanPallet() {
    const input = document.getElementById('palletScanInput')
    const palletId = input.value.trim().toUpperCase()
    
    if (!palletId || !state.selectedOutlet) return
    
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
        // Only validate the pallet (don't mark as delivered yet)
        const response = await axios.post('/api/outlet/scan-pallet', { 
            outlet_code_short: state.selectedOutlet.code_short,
            pallet_id: palletId
        })
        
        if (response.data.success) {
            playBeep(true)
            
            // Add to scanned items list (not delivered yet)
            state.scannedItems.push({
                pallet_id: palletId,
                transfer_count: response.data.transfer_count,
                time: new Date().toLocaleTimeString()
            })
            
            showToast(`✓ Pallet ${palletId} scanned (${response.data.transfer_count} transfers)`, 'success')
            updateOutletScannedList()
        } else {
            playBeep(false)
            showToast(`✗ ${response.data.error}`, 'error')
        }
    } catch (error) {
        playBeep(false)
        showToast(error.response?.data?.error || 'Scan failed', 'error')
    }
    
    input.value = ''
    input.focus()
}

function updateOutletScannedList() {
    const list = document.getElementById('outletScannedList')
    if (!list) return
    
    if (state.scannedItems.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No pallets scanned yet</p>'
        return
    }
    
    list.innerHTML = state.scannedItems.slice().reverse().map((item, reversedIndex) => {
        // Calculate actual index in original array
        const actualIndex = state.scannedItems.length - 1 - reversedIndex
        
        return `
        <div class="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold">
                        <i class="fas fa-pallet mr-1 text-blue-600"></i>${item.pallet_id}
                    </p>
                    <p class="text-xs text-gray-600">${item.transfer_count} transfers</p>
                    <p class="text-xs text-blue-600"><i class="fas fa-clock mr-1"></i>Scanned (not confirmed yet)</p>
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

// NEW: Show completion modal after scanning all pallets (like warehouse)
function showOutletCompletionModal() {
    if (state.scannedItems.length === 0) {
        showToast('Please scan at least one pallet first', 'error')
        return
    }
    
    // Check if all available pallets are scanned
    const unscannedPallets = state.availablePallets.filter(p => 
        !state.scannedItems.find(s => s.pallet_id === p.pallet_id)
    )
    
    const totalPallets = state.availablePallets.length
    const scannedCount = state.scannedItems.length
    const totalTransfers = state.scannedItems.reduce((sum, item) => sum + item.transfer_count, 0)
    
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
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
                    </p>
                </div>
                
                ${unscannedPallets.length > 0 ? `
                    <div class="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                        <p class="text-sm font-semibold text-yellow-800 mb-2">
                            <i class="fas fa-exclamation-triangle mr-1"></i>Warning: Incomplete Receipt
                        </p>
                        <p class="text-xs text-yellow-700 mb-2">
                            You have <strong>${unscannedPallets.length} pallet(s)</strong> not yet scanned out of ${totalPallets} total.
                        </p>
                        <div class="text-xs text-yellow-600 bg-white rounded p-2">
                            <strong>Unscanned pallets:</strong>
                            <ul class="list-disc list-inside mt-1">
                                ${unscannedPallets.slice(0, 5).map(p => `
                                    <li>${p.pallet_id} (${p.transfer_count} transfers)</li>
                                `).join('')}
                                ${unscannedPallets.length > 5 ? `<li>...and ${unscannedPallets.length - 5} more</li>` : ''}
                            </ul>
                        </div>
                        <p class="text-xs text-yellow-700 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>These will be marked as <strong>unreceived</strong> in the report.
                        </p>
                    </div>
                ` : `
                    <div class="mb-4 bg-green-50 border border-green-300 rounded-lg p-4">
                        <p class="text-sm font-semibold text-green-800">
                            <i class="fas fa-check-circle mr-1"></i>All Pallets Scanned!
                        </p>
                        <p class="text-xs text-green-600 mt-1">
                            You have scanned all ${totalPallets} pallets for this outlet.
                        </p>
                    </div>
                `}
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Receiver Name/Signature <span class="text-red-500">*</span></label>
                    <input type="text" id="receiver_name_complete" required 
                        class="w-full px-3 py-2 border rounded-lg"
                        placeholder="Enter receiver name"
                        autofocus>
                    <p class="text-xs text-gray-500 mt-1">Who is receiving these deliveries?</p>
                </div>
                
                <div class="flex space-x-3">
                    <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
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
}

// NEW: Handle completion confirmation with bulk update
async function handleConfirmOutletCompletion(event) {
    event.preventDefault()
    
    const receiverName = document.getElementById('receiver_name_complete').value.trim()
    
    if (!receiverName) {
        showToast('Please enter receiver name', 'error')
        return
    }
    
    if (state.scannedItems.length === 0) {
        showToast('No pallets to confirm', 'error')
        return
    }
    
    try {
        // Confirm all scanned pallets at once
        const palletIds = state.scannedItems.map(item => item.pallet_id)
        
        const response = await axios.post('/api/outlet/confirm-receipt-bulk', {
            outlet_code_short: state.selectedOutlet.code_short,
            pallet_ids: palletIds,
            receiver_name: receiverName
        })
        
        showToast(`✓ Receipt completed! ${palletIds.length} pallet(s) received by ${receiverName}`, 'success')
        
        // Close modal
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) modal.remove()
        
        // Clear scanned items
        state.scannedItems = []
        
        // Refresh pallets list
        await loadOutletPallets()
        render()
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to confirm receipt', 'error')
    }
}

function cancelOutletCompletion() {
    const modal = document.querySelector('.fixed.inset-0')
    if (modal) modal.remove()
    const input = document.getElementById('palletScanInput')
    if (input) {
        input.value = ''
    document.getElementById('palletScanInput').focus()
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

// ============ Reports Page ============
function renderReports() {
    return `
        <div class="container mx-auto px-4 py-6">
            <h2 class="text-3xl font-bold mb-6 text-gray-800">
                <i class="fas fa-chart-bar text-blue-600 mr-3"></i>Reports & Analytics
            </h2>
            
            <div class="grid md:grid-cols-3 gap-6 mb-6">
                <button onclick="loadDeliveryReport()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-truck text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Delivery Report</p>
                    <p class="text-sm">View completed deliveries</p>
                </button>
                
                <button onclick="loadErrorReport()" 
                    class="bg-red-500 hover:bg-red-600 text-white p-6 rounded-lg text-left">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p class="text-xl font-bold">Error Parcels</p>
                    <p class="text-sm">View scanning errors</p>
                </button>
                
                <button onclick="exportReport()" 
                    class="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg text-left">
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
                            <th class="border px-4 py-2">Delivered At</th>
                            <th class="border px-4 py-2">Received By</th>
                            <th class="border px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deliveries.map(d => `
                            <tr>
                                <td class="border px-4 py-2">${d.outlet_code} - ${d.outlet_name}</td>
                                <td class="border px-4 py-2">${d.pallet_id}</td>
                                <td class="border px-4 py-2 text-center">${d.total_count}</td>
                                <td class="border px-4 py-2">${formatDate(d.delivered_at)}</td>
                                <td class="border px-4 py-2">${d.received_by_name || '-'}</td>
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
        const [deliveriesRes, errorsRes] = await Promise.all([
            axios.get('/api/reports/deliveries'),
            axios.get('/api/reports/errors')
        ])
        
        const deliveries = deliveriesRes.data.deliveries
        const errors = errorsRes.data.errors
        
        // Create workbook
        const wb = XLSX.utils.book_new()
        
        // Deliveries sheet
        const deliveriesData = deliveries.map(d => ({
            'Outlet Code': d.outlet_code,
            'Outlet Name': d.outlet_name,
            'Pallet ID': d.pallet_id,
            'Transfer Count': d.total_count,
            'Delivered At': formatDate(d.delivered_at),
            'Received By': d.received_by_name || '-',
            'Status': d.status
        }))
        const ws1 = XLSX.utils.json_to_sheet(deliveriesData)
        XLSX.utils.book_append_sheet(wb, ws1, 'Deliveries')
        
        // Errors sheet
        const errorsData = errors.map(e => ({
            'Transfer Number': e.transfer_number,
            'Error Type': e.error_type,
            'Error Message': e.error_message,
            'Outlet Code': e.outlet_code || '-',
            'Scanned By': e.scanned_by_name || '-',
            'Time': formatDate(e.created_at)
        }))
        const ws2 = XLSX.utils.json_to_sheet(errorsData)
        XLSX.utils.book_append_sheet(wb, ws2, 'Errors')
        
        // Download
        const filename = `APD_OASIS_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, filename)
        
        showToast('Report exported successfully', 'success')
    } catch (error) {
        showToast('Failed to export report', 'error')
    }
}

// ============ Main Render Function ============
function render() {
    const app = document.getElementById('app')
    
    if (state.currentPage === 'login') {
        app.innerHTML = renderLogin()
        return
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
        case 'reports':
            content = renderReports()
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
                break
            case 'outlet':
                // Outlet page uses manual two-step process: find outlet, then scan pallets
                // No auto-load needed
                break
        }
    }, 100)
}

// Initial render
render()
