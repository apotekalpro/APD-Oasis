// Inter-Branch Transfer System - Mock Data Implementation (UAT)
// This file contains all inter-branch transfer functionality using localStorage

console.log('%c🚚 Inter-Branch Transfer Module LOADED', 'background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;')

// ============ Mock Transfer Service ============
const InterTransferService = {
    STORAGE_KEY: 'inter_branch_transfers',
    OUTLETS_KEY: 'outlets_data',
    SERIAL_KEY: 'transfer_serial',

    // Initialize mock data
    init() {
        if (!localStorage.getItem(this.OUTLETS_KEY)) {
            const mockOutlets = [
                { outlet_code: 'APDWHS1', outlet_name: 'APD Warehouse', outlet_type: 'warehouse' },
                { outlet_code: 'JKJSTT1', outlet_name: 'Jakarta Setia Budi', outlet_type: 'outlet' },
                { outlet_code: 'JKJSVR1', outlet_name: 'Jakarta Veteran', outlet_type: 'outlet' },
                { outlet_code: 'BDGCHL1', outlet_name: 'Bandung Cihampelas', outlet_type: 'outlet' },
                { outlet_code: 'SBYDKR1', outlet_name: 'Surabaya Dinoyo', outlet_type: 'outlet' },
                { outlet_code: 'SMGGDG1', outlet_name: 'Semarang Gading', outlet_type: 'outlet' },
                { outlet_code: 'MLGDAU1', outlet_name: 'Malang Dinoyo', outlet_type: 'outlet' },
                { outlet_code: 'YKYJLN1', outlet_name: 'Yogyakarta Jalan Kaliurang', outlet_type: 'outlet' },
            ];
            localStorage.setItem(this.OUTLETS_KEY, JSON.stringify(mockOutlets));
        }

        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }

        if (!localStorage.getItem(this.SERIAL_KEY)) {
            localStorage.setItem(this.SERIAL_KEY, JSON.stringify({}));
        }
    },

    // Generate transfer number: TN[Sender][Receiver][DDMM][Serial]
    generateTransferNumber(senderCode, receiverCode) {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const dateKey = `${day}${month}`;
        const fullKey = `${senderCode}${receiverCode}${dateKey}`;

        // Get current serial
        const serialData = JSON.parse(localStorage.getItem(this.SERIAL_KEY) || '{}');
        const currentSerial = (serialData[fullKey] || 0) + 1;
        
        // Update serial
        serialData[fullKey] = currentSerial;
        localStorage.setItem(this.SERIAL_KEY, JSON.stringify(serialData));

        // Format: TN + sender(7) + receiver(7) + DDMM(4) + serial(2)
        const serialStr = String(currentSerial).padStart(2, '0');
        return `TN${senderCode}${receiverCode}${dateKey}${serialStr}`;
    },

    // Get all outlets
    getOutlets() {
        return JSON.parse(localStorage.getItem(this.OUTLETS_KEY) || '[]');
    },

    // Get all transfers
    getTransfers() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },

    // Get transfer by ID
    getTransferById(id) {
        const transfers = this.getTransfers();
        return transfers.find(t => t.id === id) || null;
    },

    // Get transfer by number
    getTransferByNumber(transferNumber) {
        const transfers = this.getTransfers();
        return transfers.find(t => t.transfer_number === transferNumber) || null;
    },

    // Create new transfer
    createTransfer(data) {
        const transfers = this.getTransfers();
        
        const transfer = {
            id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transfer_number: this.generateTransferNumber(data.sender_outlet, data.receiver_outlet),
            sender_outlet: data.sender_outlet,
            receiver_outlet: data.receiver_outlet,
            created_by: data.created_by,
            created_at: new Date().toISOString(),
            status: 'created',
            items: data.items.map(item => ({
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                container_number: item.container_number,
                status: 'pending'
            })),
            notes: data.notes || ''
        };

        transfers.push(transfer);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
        
        return transfer;
    },

    // Load transfer
    loadTransfer(transferId, loadedBy, containerNumbers) {
        const transfers = this.getTransfers();
        const index = transfers.findIndex(t => t.id === transferId);
        
        if (index === -1) return null;

        const transfer = transfers[index];
        const now = new Date().toISOString();

        // Update items
        transfer.items.forEach(item => {
            if (containerNumbers.includes(item.container_number)) {
                item.status = 'loaded';
                item.loaded_at = now;
            }
        });

        // Check if all loaded
        const allLoaded = transfer.items.every(item => item.status === 'loaded');
        
        if (allLoaded) {
            transfer.status = 'in_transit';
            transfer.loaded_at = now;
            transfer.loaded_by = loadedBy;
        }

        transfers[index] = transfer;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
        
        return transfer;
    },

    // Unload transfer with crossdock detection
    unloadTransfer(transferId, unloadedBy, unloadLocation, containerNumbers) {
        const transfers = this.getTransfers();
        const index = transfers.findIndex(t => t.id === transferId);
        
        if (index === -1) return null;

        const transfer = transfers[index];
        const now = new Date().toISOString();

        // Update items
        transfer.items.forEach(item => {
            if (containerNumbers.includes(item.container_number)) {
                item.status = 'unloaded';
                item.unloaded_at = now;
            }
        });

        // Check if all unloaded
        const allUnloaded = transfer.items.every(item => item.status === 'unloaded');

        if (allUnloaded) {
            // Crossdock detection
            const isCrossdock = unloadLocation === 'APDWHS1' && transfer.receiver_outlet !== 'APDWHS1';
            
            transfer.unloaded_at = now;
            transfer.unloaded_by = unloadedBy;
            transfer.unload_location = unloadLocation;
            transfer.is_crossdock = isCrossdock;
            transfer.status = isCrossdock ? 'crossdock' : 
                            (unloadLocation === transfer.receiver_outlet ? 'completed' : 'unloaded');
        }

        transfers[index] = transfer;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
        
        return transfer;
    },

    // Get transfers by status
    getTransfersByStatus(status) {
        return this.getTransfers().filter(t => t.status === status);
    },

    // Get transfers by outlet
    getTransfersByOutlet(outletCode) {
        return this.getTransfers().filter(t => 
            t.sender_outlet === outletCode || t.receiver_outlet === outletCode
        );
    },

    // Get crossdock queue
    getCrossdockQueue() {
        return this.getTransfersByStatus('crossdock');
    },

    // Search transfers
    searchTransfers(query) {
        const transfers = this.getTransfers();
        const searchLower = query.toLowerCase();
        
        return transfers.filter(t => 
            t.transfer_number.toLowerCase().includes(searchLower) ||
            t.items.some(item => item.container_number.toLowerCase().includes(searchLower))
        );
    },

    // Get statistics
    getStatistics() {
        const transfers = this.getTransfers();
        return {
            total: transfers.length,
            created: transfers.filter(t => t.status === 'created').length,
            loaded: transfers.filter(t => t.status === 'loaded').length,
            in_transit: transfers.filter(t => t.status === 'in_transit').length,
            crossdock: transfers.filter(t => t.status === 'crossdock').length,
            unloaded: transfers.filter(t => t.status === 'unloaded').length,
            completed: transfers.filter(t => t.status === 'completed').length,
        };
    }
};

// Initialize on load
InterTransferService.init();

// ============ Barcode Generation ============
function generateBarcode(text) {
    // Simple barcode using Code 128 pattern
    // In production, use a proper barcode library
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
            <rect width="200" height="60" fill="white"/>
            <text x="100" y="15" text-anchor="middle" font-family="monospace" font-size="10">${text}</text>
            ${generateBarcodePattern(text)}
        </svg>
    `)}`;
}

function generateBarcodePattern(text) {
    // Simple barcode bars pattern
    let bars = '';
    let x = 10;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i) % 10;
        const width = code % 2 === 0 ? 2 : 3;
        bars += `<rect x="${x}" y="20" width="${width}" height="30" fill="black"/>`;
        x += width + 1;
    }
    return bars;
}

// ============ UI Rendering Functions ============

// Render Create Transfer Page
function renderCreateTransfer() {
    const outlets = InterTransferService.getOutlets();
    const userOutlet = state.user?.outlet_code || '';
    
    return `
        <div class="h-full overflow-y-auto">
            <div class="max-w-4xl mx-auto p-4 pb-20">
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                        <i class="fas fa-truck"></i>
                        Create Inter-Branch Transfer
                    </h2>

                    <form id="createTransferForm" class="space-y-6">
                        <!-- Sender Outlet (Editable - defaults to current user's outlet) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Sender Outlet *
                            </label>
                            <select id="senderOutlet" required
                                class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                                ${outlets.map(o => `
                                    <option value="${o.outlet_code}" ${o.outlet_code === userOutlet ? 'selected' : ''}>
                                        ${o.outlet_code} - ${o.outlet_name}
                                    </option>
                                `).join('')}
                            </select>
                            <p class="text-sm text-gray-500 mt-1">Default: Your outlet (${userOutlet})</p>
                        </div>

                        <!-- Receiver Outlet (Searchable Dropdown) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Receiver Outlet *
                            </label>
                            <select id="receiverOutlet" required
                                class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500">
                                <option value="">Select receiver outlet...</option>
                                ${outlets.map(o => `
                                    <option value="${o.outlet_code}">${o.outlet_code} - ${o.outlet_name}</option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Number of Parcels (Auto-generate containers) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Number of Parcels *
                            </label>
                            <input type="number" id="parcelCount" required min="1" max="99"
                                placeholder="Enter number of parcels to send"
                                class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <p class="text-sm text-gray-500 mt-1">
                                Container IDs will be auto-generated (e.g., 2 parcels → TN...01, TN...02)
                            </p>
                        </div>

                        <!-- Notes -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea id="transferNotes" rows="3"
                                placeholder="Add any notes or special instructions..."
                                class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>

                        <!-- Buttons -->
                        <div class="flex gap-4">
                            <button type="submit"
                                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-semibold">
                                <i class="fas fa-plus mr-2"></i>Create Transfer
                            </button>
                            <button type="button" onclick="navigateTo('inter-transfer-list')"
                                class="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50">
                                <i class="fas fa-arrow-left mr-2"></i>Back
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// Render Transfer List Page
function renderTransferList() {
    const transfers = InterTransferService.getTransfers();
    const stats = InterTransferService.getStatistics();
    
    return `
        <div class="h-full overflow-y-auto">
            <div class="max-w-6xl mx-auto p-4 pb-20">
                <!-- Statistics Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="text-sm text-gray-600">Total</div>
                    <div class="text-2xl font-bold">${stats.total}</div>
                </div>
                <div class="bg-blue-50 rounded-lg shadow p-4">
                    <div class="text-sm text-blue-600">In Transit</div>
                    <div class="text-2xl font-bold text-blue-600">${stats.in_transit}</div>
                </div>
                <div class="bg-orange-50 rounded-lg shadow p-4">
                    <div class="text-sm text-orange-600">Crossdock</div>
                    <div class="text-2xl font-bold text-orange-600">${stats.crossdock}</div>
                </div>
                <div class="bg-green-50 rounded-lg shadow p-4">
                    <div class="text-sm text-green-600">Completed</div>
                    <div class="text-2xl font-bold text-green-600">${stats.completed}</div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="bg-white rounded-lg shadow p-4 mb-4">
                <div class="flex flex-wrap gap-2">
                    <button onclick="navigateTo('inter-transfer-create')"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-plus mr-2"></i>New Transfer
                    </button>
                    <button onclick="navigateTo('inter-transfer-loading')"
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-qrcode mr-2"></i>Loading
                    </button>
                    <button onclick="navigateTo('inter-transfer-unloading')"
                        class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-truck-loading mr-2"></i>Unloading
                    </button>
                    <button onclick="navigateTo('inter-transfer-crossdock')"
                        class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-exchange-alt mr-2"></i>Crossdock Queue
                    </button>
                </div>
            </div>

            <!-- Search -->
            <div class="bg-white rounded-lg shadow p-4 mb-4">
                <input type="text" id="transferSearch" placeholder="Search by transfer number or container..."
                    class="w-full px-4 py-2 border rounded"
                    onkeyup="filterTransfers()"
                />
            </div>

            <!-- Transfer List -->
            <div id="transferListContainer" class="space-y-4">
                ${renderTransferItems(transfers)}
            </div>
            </div>
        </div>
    `;
}

function renderTransferItems(transfers) {
    if (transfers.length === 0) {
        return `
            <div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>No transfers found</p>
            </div>
        `;
    }

    return transfers.map(t => {
        const outlets = InterTransferService.getOutlets();
        const sender = outlets.find(o => o.outlet_code === t.sender_outlet);
        const receiver = outlets.find(o => o.outlet_code === t.receiver_outlet);
        
        const statusColors = {
            created: 'bg-gray-100 text-gray-700',
            loaded: 'bg-blue-100 text-blue-700',
            in_transit: 'bg-indigo-100 text-indigo-700',
            crossdock: 'bg-orange-100 text-orange-700',
            unloaded: 'bg-purple-100 text-purple-700',
            completed: 'bg-green-100 text-green-700'
        };

        return `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-lg">${t.transfer_number}</div>
                        <div class="text-sm text-gray-600">
                            ${sender?.outlet_name || t.sender_outlet} → ${receiver?.outlet_name || t.receiver_outlet}
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded text-sm font-semibold ${statusColors[t.status]}">
                        ${t.status.toUpperCase().replace('_', ' ')}
                    </span>
                </div>
                
                <div class="text-sm text-gray-600 mb-2">
                    <i class="fas fa-boxes mr-2"></i>${t.items.length} containers
                </div>
                
                <div class="text-xs text-gray-500">
                    Created: ${new Date(t.created_at).toLocaleString()}
                </div>
                
                <div class="mt-3 flex gap-2">
                    <button onclick="viewTransferDetails('${t.id}')"
                        class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-eye mr-1"></i>View Details
                    </button>
                    <button onclick="printTransferLabel('${t.id}')"
                        class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// View transfer details
function viewTransferDetails(transferId) {
    const transfer = InterTransferService.getTransferById(transferId);
    if (!transfer) return;

    const outlets = InterTransferService.getOutlets();
    const sender = outlets.find(o => o.outlet_code === transfer.sender_outlet);
    const receiver = outlets.find(o => o.outlet_code === transfer.receiver_outlet);

    const detailsHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-xl font-bold">${transfer.transfer_number}</h3>
                        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <div class="text-sm text-gray-600">Sender</div>
                                <div class="font-semibold">${sender?.outlet_name || transfer.sender_outlet}</div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-600">Receiver</div>
                                <div class="font-semibold">${receiver?.outlet_name || transfer.receiver_outlet}</div>
                            </div>
                        </div>

                        <div>
                            <div class="text-sm text-gray-600">Status</div>
                            <div class="font-semibold">${transfer.status.toUpperCase().replace('_', ' ')}</div>
                        </div>

                        ${transfer.is_crossdock ? `
                            <div class="bg-orange-50 border border-orange-200 rounded p-3">
                                <i class="fas fa-exclamation-triangle text-orange-600 mr-2"></i>
                                <span class="text-orange-800 font-semibold">Crossdock Required</span>
                                <p class="text-sm text-orange-700 mt-1">
                                    This transfer arrived at warehouse but final destination is ${receiver?.outlet_name}
                                </p>
                            </div>
                        ` : ''}

                        <div>
                            <div class="text-sm text-gray-600 mb-2">Containers (${transfer.items.length})</div>
                            <div class="space-y-1">
                                ${transfer.items.map(item => `
                                    <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span class="font-mono">${item.container_number}</span>
                                        <span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                            ${item.status}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        ${transfer.notes ? `
                            <div>
                                <div class="text-sm text-gray-600">Notes</div>
                                <div class="bg-gray-50 p-3 rounded">${transfer.notes}</div>
                            </div>
                        ` : ''}

                        <div class="text-xs text-gray-500">
                            Created: ${new Date(transfer.created_at).toLocaleString()}
                            ${transfer.loaded_at ? `<br/>Loaded: ${new Date(transfer.loaded_at).toLocaleString()}` : ''}
                            ${transfer.unloaded_at ? `<br/>Unloaded: ${new Date(transfer.unloaded_at).toLocaleString()}` : ''}
                        </div>
                    </div>

                    <div class="mt-6 flex gap-2">
                        <button onclick="printTransferLabel('${transfer.id}')"
                            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                            <i class="fas fa-print mr-2"></i>Print Label
                        </button>
                        <button onclick="closeModal()"
                            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', detailsHTML);
}

// Print transfer label (A5 landscape) - One label per container
function printTransferLabel(transferId) {
    const transfer = InterTransferService.getTransferById(transferId);
    if (!transfer) return;

    const outlets = InterTransferService.getOutlets();
    const sender = outlets.find(o => o.outlet_code === transfer.sender_outlet);
    const receiver = outlets.find(o => o.outlet_code === transfer.receiver_outlet);

    const printWindow = window.open('', '_blank');
    
    // Generate separate labels for each container
    const labelPages = transfer.items.map((item, index) => `
        <div class="label-page" style="page-break-after: ${index < transfer.items.length - 1 ? 'always' : 'auto'};">
            <div class="header">
                <h1 style="margin: 0;">INTER-BRANCH TRANSFER</h1>
                <h2 style="margin: 10px 0;">${transfer.transfer_number}</h2>
            </div>

            <div class="barcode">
                <svg id="barcode-${index}"></svg>
            </div>

            <div class="info">
                <div class="info-box">
                    <div class="label">FROM (SENDER)</div>
                    <div class="value">${transfer.sender_outlet}</div>
                    <div>${sender?.outlet_name || ''}</div>
                </div>
                <div class="info-box">
                    <div class="label">TO (RECEIVER)</div>
                    <div class="value">${transfer.receiver_outlet}</div>
                    <div>${receiver?.outlet_name || ''}</div>
                </div>
            </div>

            <div class="container-info">
                <div class="label">CONTAINER ${index + 1} OF ${transfer.items.length}</div>
                <div class="container-id">${item.container_number}</div>
            </div>

            <div class="footer">
                Created: ${new Date(transfer.created_at).toLocaleString()}
            </div>
        </div>
    `).join('');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transfer Labels - ${transfer.transfer_number}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @page { 
                    size: A5 landscape; 
                    margin: 10mm; 
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                    .label-page { 
                        width: 210mm;
                        height: 148mm;
                        position: relative;
                    }
                }
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0;
                    padding: 0;
                }
                .label-page {
                    width: 210mm;
                    height: 148mm;
                    padding: 15mm;
                    box-sizing: border-box;
                    position: relative;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 15px; 
                }
                .barcode { 
                    text-align: center; 
                    margin: 15px 0; 
                }
                .barcode svg { 
                    max-width: 70%;
                    height: auto;
                }
                .info { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .info-box { 
                    border: 3px solid #333; 
                    padding: 15px;
                    border-radius: 8px;
                }
                .label { 
                    font-weight: bold; 
                    color: #666; 
                    font-size: 14px;
                    text-transform: uppercase;
                }
                .value { 
                    font-size: 24px; 
                    font-weight: bold; 
                    margin-top: 5px; 
                }
                .container-info {
                    border: 3px solid #000;
                    background: #f9f9f9;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px;
                }
                .container-id {
                    font-size: 28px;
                    font-weight: bold;
                    font-family: monospace;
                    margin-top: 10px;
                    letter-spacing: 2px;
                }
                .footer {
                    margin-top: 20px; 
                    text-align: center; 
                    font-size: 12px; 
                    color: #666;
                }
                .no-print {
                    text-align: center;
                    padding: 20px;
                    background: #f0f0f0;
                    border-top: 2px solid #ccc;
                }
            </style>
        </head>
        <body>
            ${labelPages}
            
            <div class="no-print">
                <p><strong>${transfer.items.length} label(s) ready to print</strong></p>
                <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px; margin: 5px;">
                    <i class="fas fa-print"></i> Print All Labels
                </button>
                <button onclick="window.close()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #666; color: white; border: none; border-radius: 4px; margin: 5px;">
                    Close
                </button>
            </div>
            
            <script>
                // Generate barcodes for each label
                ${transfer.items.map((item, index) => `
                    JsBarcode("#barcode-${index}", "${transfer.transfer_number}", {
                        format: "CODE128",
                        width: 2,
                        height: 80,
                        displayValue: true,
                        fontSize: 20,
                        margin: 10
                    });
                `).join('')}
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Render loading page
function renderLoadingPage() {
    const pendingTransfers = InterTransferService.getTransfers()
        .filter(t => t.status === 'created' || t.status === 'loaded');

    return `
        <div class="h-full overflow-y-auto">
            <div class="max-w-4xl mx-auto p-4 pb-20">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">
                            <i class="fas fa-qrcode mr-2"></i>Load Transfers
                        </h2>
                        <button onclick="navigateTo('inter-transfer-list')"
                            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                            <i class="fas fa-arrow-left mr-2"></i>Back
                        </button>
                    </div>

                    <!-- Scan Section -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Scan Transfer Barcode or Enter Number
                        </label>
                        <input type="text" id="loadScanInput" 
                            placeholder="Scan or type transfer number..."
                            class="w-full px-4 py-3 border-2 rounded text-lg focus:ring-2 focus:ring-blue-500"
                            onkeyup="handleLoadScan(event)"
                        />
                    </div>

                    <!-- Pending Transfers -->
                    <div>
                        <h3 class="font-semibold mb-3">Pending Transfers (${pendingTransfers.length})</h3>
                        <div class="space-y-3">
                            ${pendingTransfers.length === 0 ? 
                                '<p class="text-gray-500 text-center py-4">No pending transfers</p>' :
                                pendingTransfers.map(t => `
                                    <div class="border rounded p-4">
                                        <div class="font-bold">${t.transfer_number}</div>
                                        <div class="text-sm text-gray-600">${t.items.length} containers</div>
                                        <button onclick="loadTransferById('${t.id}')"
                                            class="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                            Load Transfer
                                        </button>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Handle load scan
function handleLoadScan(event) {
    if (event.key === 'Enter') {
        const input = event.target;
        const transferNumber = input.value.trim();
        
        if (!transferNumber) return;
        
        const transfer = InterTransferService.getTransferByNumber(transferNumber);
        if (!transfer) {
            alert('Transfer not found: ' + transferNumber);
            input.value = '';
            return;
        }
        
        if (transfer.status !== 'created' && transfer.status !== 'loaded') {
            alert('Transfer is not in loadable status');
            input.value = '';
            return;
        }
        
        loadTransferById(transfer.id);
        input.value = '';
    }
}

// Load transfer
function loadTransferById(transferId) {
    const transfer = InterTransferService.getTransferById(transferId);
    if (!transfer) return;
    
    const pendingItems = transfer.items.filter(i => i.status === 'pending');
    const containerNumbers = pendingItems.map(i => i.container_number);
    
    if (containerNumbers.length === 0) {
        alert('All items already loaded');
        return;
    }
    
    const updated = InterTransferService.loadTransfer(
        transferId,
        state.user?.username || 'driver',
        containerNumbers
    );
    
    if (updated) {
        alert(`✅ Transfer ${updated.transfer_number} loaded successfully!\nStatus: ${updated.status.toUpperCase()}`);
        render();
    }
}

// Render unloading page
function renderUnloadingPage() {
    const inTransitTransfers = InterTransferService.getTransfers()
        .filter(t => t.status === 'in_transit' || t.status === 'loaded');

    return `
        <div class="h-full overflow-y-auto">
            <div class="max-w-4xl mx-auto p-4 pb-20">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">
                            <i class="fas fa-truck-loading mr-2"></i>Unload Transfers
                        </h2>
                        <button onclick="navigateTo('inter-transfer-list')"
                            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                            <i class="fas fa-arrow-left mr-2"></i>Back
                        </button>
                    </div>

                    <!-- Scan Section -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Scan Transfer Barcode or Enter Number
                        </label>
                        <input type="text" id="unloadScanInput" 
                            placeholder="Scan or type transfer number..."
                            class="w-full px-4 py-3 border-2 rounded text-lg focus:ring-2 focus:ring-purple-500"
                            onkeyup="handleUnloadScan(event)"
                        />
                    </div>

                    <!-- In-Transit Transfers -->
                    <div>
                        <h3 class="font-semibold mb-3">In-Transit Transfers (${inTransitTransfers.length})</h3>
                        <div class="space-y-3">
                            ${inTransitTransfers.length === 0 ? 
                                '<p class="text-gray-500 text-center py-4">No in-transit transfers</p>' :
                                inTransitTransfers.map(t => {
                                    const outlets = InterTransferService.getOutlets();
                                    const receiver = outlets.find(o => o.outlet_code === t.receiver_outlet);
                                    return `
                                        <div class="border rounded p-4">
                                            <div class="font-bold">${t.transfer_number}</div>
                                            <div class="text-sm text-gray-600">
                                                To: ${receiver?.outlet_name || t.receiver_outlet}<br/>
                                                ${t.items.length} containers
                                            </div>
                                            <button onclick="unloadTransferById('${t.id}')"
                                                class="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">
                                                Unload Transfer
                                            </button>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Handle unload scan
function handleUnloadScan(event) {
    if (event.key === 'Enter') {
        const input = event.target;
        const transferNumber = input.value.trim();
        
        if (!transferNumber) return;
        
        const transfer = InterTransferService.getTransferByNumber(transferNumber);
        if (!transfer) {
            alert('Transfer not found: ' + transferNumber);
            input.value = '';
            return;
        }
        
        if (transfer.status !== 'in_transit' && transfer.status !== 'loaded') {
            alert('Transfer is not in transit');
            input.value = '';
            return;
        }
        
        unloadTransferById(transfer.id);
        input.value = '';
    }
}

// Unload transfer
function unloadTransferById(transferId) {
    const transfer = InterTransferService.getTransferById(transferId);
    if (!transfer) return;
    
    const userOutlet = state.user?.outlet_code || 'APDWHS1';
    const loadedItems = transfer.items.filter(i => i.status === 'loaded' || i.status === 'in_transit');
    const containerNumbers = loadedItems.map(i => i.container_number);
    
    if (containerNumbers.length === 0) {
        alert('No items to unload');
        return;
    }
    
    const updated = InterTransferService.unloadTransfer(
        transferId,
        state.user?.username || 'driver',
        userOutlet,
        containerNumbers
    );
    
    if (updated) {
        let message = `✅ Transfer ${updated.transfer_number} unloaded!\n`;
        message += `Status: ${updated.status.toUpperCase()}\n`;
        
        if (updated.is_crossdock) {
            message += '\n⚠️ CROSSDOCK DETECTED!\n';
            message += 'This transfer has been added to the crossdock queue for reloading.';
        }
        
        alert(message);
        render();
    }
}

// Render crossdock queue
function renderCrossdockQueue() {
    const crossdockTransfers = InterTransferService.getCrossdockQueue();

    return `
        <div class="h-full overflow-y-auto">
            <div class="max-w-4xl mx-auto p-4 pb-20">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold flex items-center gap-2">
                            <i class="fas fa-exchange-alt text-orange-500"></i>
                            Crossdock Reload Queue
                        </h2>
                        <button onclick="navigateTo('inter-transfer-list')"
                            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                            <i class="fas fa-arrow-left mr-2"></i>Back
                        </button>
                    </div>

                    <div class="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
                        <p class="text-orange-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            These transfers arrived at the warehouse but need to be reloaded for delivery to their final destination.
                        </p>
                    </div>

                    <div class="space-y-4">
                        ${crossdockTransfers.length === 0 ? 
                            '<p class="text-gray-500 text-center py-8">No crossdock transfers in queue</p>' :
                            crossdockTransfers.map(t => {
                                const outlets = InterTransferService.getOutlets();
                                const sender = outlets.find(o => o.outlet_code === t.sender_outlet);
                                const receiver = outlets.find(o => o.outlet_code === t.receiver_outlet);
                                
                                return `
                                    <div class="border-2 border-orange-300 rounded p-4 bg-orange-50">
                                        <div class="flex justify-between items-start mb-2">
                                            <div>
                                                <div class="font-bold text-lg">${t.transfer_number}</div>
                                                <div class="text-sm text-gray-600">
                                                    From: ${sender?.outlet_name || t.sender_outlet}<br/>
                                                    Final Destination: ${receiver?.outlet_name || t.receiver_outlet}
                                                </div>
                                            </div>
                                            <span class="px-3 py-1 bg-orange-500 text-white rounded font-semibold">
                                                CROSSDOCK
                                            </span>
                                        </div>
                                        
                                        <div class="text-sm text-gray-700 mb-3">
                                            <i class="fas fa-boxes mr-2"></i>${t.items.length} containers
                                        </div>
                                        
                                        <div class="flex gap-2">
                                            <button onclick="viewTransferDetails('${t.id}')"
                                                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                                <i class="fas fa-eye mr-2"></i>View Details
                                            </button>
                                            <button onclick="printTransferLabel('${t.id}')"
                                                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                                                <i class="fas fa-print mr-2"></i>Print
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Filter transfers
function filterTransfers() {
    const searchInput = document.getElementById('transferSearch');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    const transfers = query ? InterTransferService.searchTransfers(query) : InterTransferService.getTransfers();
    
    const container = document.getElementById('transferListContainer');
    if (container) {
        container.innerHTML = renderTransferItems(transfers);
    }
}

// Close modal
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modals = document.querySelectorAll('.fixed.inset-0');
    modals.forEach(modal => modal.remove());
}

// Show crossdock reload confirmation
function showCrossdockReloadConfirmation(transfer) {
    const outlets = InterTransferService.getOutlets();
    const sender = outlets.find(o => o.outlet_code === transfer.sender_outlet);
    const receiver = outlets.find(o => o.outlet_code === transfer.receiver_outlet);
    
    const confirmHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
            <div class="bg-white rounded-lg max-w-2xl w-full" onclick="event.stopPropagation()">
                <div class="bg-orange-500 text-white p-6 rounded-t-lg">
                    <h3 class="text-2xl font-bold flex items-center gap-2">
                        <i class="fas fa-exclamation-triangle"></i>
                        Crossdock Transfer - Reload Confirmation
                    </h3>
                </div>
                
                <div class="p-6 space-y-4">
                    <div class="bg-orange-50 border-l-4 border-orange-500 p-4">
                        <p class="font-semibold text-orange-800">
                            This transfer has arrived at the warehouse but needs to be reloaded for final delivery.
                        </p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="border rounded p-4">
                            <div class="text-sm text-gray-600">Transfer Number</div>
                            <div class="font-bold text-lg">${transfer.transfer_number}</div>
                        </div>
                        <div class="border rounded p-4">
                            <div class="text-sm text-gray-600">Containers</div>
                            <div class="font-bold text-lg">${transfer.items.length} parcels</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="border rounded p-4">
                            <div class="text-sm text-gray-600">From</div>
                            <div class="font-semibold">${sender?.outlet_name || transfer.sender_outlet}</div>
                            <div class="text-xs text-gray-500">${transfer.sender_outlet}</div>
                        </div>
                        <div class="border rounded p-4 bg-blue-50">
                            <div class="text-sm text-blue-600 font-semibold">Final Destination</div>
                            <div class="font-semibold text-blue-800">${receiver?.outlet_name || transfer.receiver_outlet}</div>
                            <div class="text-xs text-blue-600">${transfer.receiver_outlet}</div>
                        </div>
                    </div>
                    
                    <div class="border rounded p-4 bg-gray-50">
                        <div class="text-sm text-gray-600 mb-2">Container IDs:</div>
                        <div class="grid grid-cols-2 gap-2">
                            ${transfer.items.map(item => `
                                <div class="bg-white px-3 py-1 rounded border font-mono text-sm">
                                    ${item.container_number}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded p-4">
                        <p class="text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Action Required:</strong> Confirm to reload this transfer onto the lorry for delivery to ${receiver?.outlet_name}.
                        </p>
                    </div>
                </div>
                
                <div class="p-6 bg-gray-50 rounded-b-lg flex gap-3">
                    <button onclick="confirmCrossdockReload('${transfer.id}')"
                        class="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded font-semibold text-lg">
                        <i class="fas fa-check-circle mr-2"></i>Confirm Reload
                    </button>
                    <button onclick="closeModal()"
                        class="px-6 py-3 border-2 border-gray-300 rounded hover:bg-gray-100 font-semibold">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
}

// Confirm crossdock reload
function confirmCrossdockReload(transferId) {
    const transfer = InterTransferService.getTransferById(transferId);
    if (!transfer) return;
    
    const loadedBy = state.user?.username || 'driver';
    const containerNumbers = transfer.items.map(i => i.container_number);
    
    // Reload the transfer (mark as in_transit again)
    const updated = InterTransferService.loadTransfer(transferId, loadedBy, containerNumbers);
    
    if (updated) {
        playBeep(true);
        closeModal();
        showToast(`✅ Transfer ${transfer.transfer_number} reloaded!\nStatus: IN_TRANSIT for delivery to ${transfer.receiver_outlet}\n${containerNumbers.length} containers loaded`, 'success');
        
        // Refocus warehouse scan input
        const input = document.getElementById('warehouseScanInput');
        if (input) setTimeout(() => input.focus(), 100);
    } else {
        playBeep(false);
        showToast(`❌ Failed to reload transfer`, 'error');
    }
}

// Handle create transfer form
document.addEventListener('submit', function(e) {
    if (e.target.id === 'createTransferForm') {
        e.preventDefault();
        
        const senderOutlet = document.getElementById('senderOutlet').value;
        const receiverOutlet = document.getElementById('receiverOutlet').value;
        const parcelCount = parseInt(document.getElementById('parcelCount').value);
        const notes = document.getElementById('transferNotes').value;
        
        if (!senderOutlet) {
            alert('Please select sender outlet');
            return;
        }
        
        if (!receiverOutlet) {
            alert('Please select receiver outlet');
            return;
        }
        
        if (senderOutlet === receiverOutlet) {
            alert('Sender and receiver cannot be the same outlet');
            return;
        }
        
        if (!parcelCount || parcelCount < 1) {
            alert('Please enter number of parcels (minimum 1)');
            return;
        }
        
        if (parcelCount > 99) {
            alert('Maximum 99 parcels per transfer');
            return;
        }
        
        // First create the transfer to get the transfer number
        const tempTransfer = {
            sender_outlet: senderOutlet,
            receiver_outlet: receiverOutlet,
            created_by: state.user?.username || 'user',
            items: [],
            notes: notes
        };
        
        // Generate transfer number
        const transferNumber = InterTransferService.generateTransferNumber(
            tempTransfer.sender_outlet,
            tempTransfer.receiver_outlet
        );
        
        // Auto-generate container IDs based on transfer number
        const containers = [];
        for (let i = 1; i <= parcelCount; i++) {
            const serial = String(i).padStart(2, '0');
            containers.push({ container_number: `${transferNumber}-${serial}` });
        }
        
        // Create transfer with auto-generated containers
        const transfer = InterTransferService.createTransfer({
            sender_outlet: tempTransfer.sender_outlet,
            receiver_outlet: receiverOutlet,
            created_by: tempTransfer.created_by,
            items: containers,
            notes: notes
        });
        
        if (transfer) {
            alert(`✅ Transfer created successfully!\n\nTransfer Number: ${transfer.transfer_number}\nParcels: ${parcelCount}\nContainer IDs: ${transfer.transfer_number}-01 to ${transfer.transfer_number}-${String(parcelCount).padStart(2, '0')}\n\nYou can now print the label.`);
            
            // Ask if user wants to print label
            if (confirm('Do you want to print the transfer label now?')) {
                printTransferLabel(transfer.id);
            }
            
            navigateTo('inter-transfer-list');
        }
    }
});

console.log('✅ Inter-Transfer functions loaded');
