# Phase 2 Frontend Implementation - PARTIAL COMPLETION

## ✅ COMPLETED: Tab UI Structure

Successfully added tabbed interface to outlet page with 3 tabs:
1. **Unload Parcels** (existing functionality - moved to tab)
2. **Create Parcel** (NEW - form interface added)
3. **Load Parcels** (NEW - loading interface added)

### Changes Made to `public/static/app.js`:

1. **Updated `renderOutlet()` function**:
   - Added tab navigation UI
   - Split functionality into 3 separate render functions
   - Added `state.outletTab` to track current tab

2. **Created `renderOutletUnloadTab()`**:
   - Moved existing unload functionality into this function
   - No changes to logic, just reorganized

3. **Created `renderOutletCreateTab()`**:
   - Form with destination dropdown
   - Pallet ID input
   - Transfer numbers textarea
   - Delivery date picker
   - Notes field
   - Submit and Reset buttons

4. **Created `renderOutletLoadTab()`**:
   - Pending parcels list
   - Scan input for loading parcels
   - Loaded parcels list
   - Load button

## 🔄 PENDING: JavaScript Functions

The following JavaScript functions still need to be added to `public/static/app.js`:

### Location: After line ~3630 (after existing outlet functions)

```javascript
//============================================================================
// OUTLET-TO-OUTLET MODULE: Phase 2 Frontend Functions
//============================================================================

// Load outlets list for destination dropdown
async function loadOutletsForDropdown() {
    try {
        const response = await axios.get('/api/outlets/list')
        const outlets = response.data.outlets || []
        
        const optgroup = document.getElementById('outletsOptgroup')
        if (!optgroup) return
        
        optgroup.innerHTML = outlets
            .filter(o => o.outlet_code !== 'WAREHOUSE')
            .map(outlet => `
                <option value="${outlet.outlet_code}|${outlet.outlet_name}|outlet">
                    🏪 ${outlet.outlet_name} (${outlet.outlet_code})
                </option>
            `).join('')
    } catch (error) {
        console.error('Failed to load outlets:', error)
        showToast('Failed to load outlets list', 'error')
    }
}

// Handle destination change
function handleDestinationChange(value) {
    // value format: "code|name|type"
    if (value) {
        const [code, name, type] = value.split('|')
        console.log('Destination selected:', { code, name, type })
    }
}

// Create outlet parcel
async function handleCreateOutletParcel() {
    try {
        const destinationValue = document.getElementById('createParcelDestination').value
        const palletId = document.getElementById('createParcelPalletId').value.trim()
        const transferNumbersText = document.getElementById('createParcelTransferNumbers').value.trim()
        const deliveryDate = document.getElementById('createParcelDeliveryDate').value
        const notes = document.getElementById('createParcelNotes').value.trim()
        
        // Validate
        if (!destinationValue) {
            showToast('Please select a destination', 'error')
            return
        }
        
        if (!palletId) {
            showToast('Please enter a pallet ID', 'error')
            return
        }
        
        if (!transferNumbersText) {
            showToast('Please enter at least one transfer number', 'error')
            return
        }
        
        // Parse destination
        const [destinationCode, destinationName, destinationType] = destinationValue.split('|')
        
        // Parse transfer numbers (split by newline)
        const transferNumbers = transferNumbersText.split('\n')
            .map(tn => tn.trim())
            .filter(tn => tn.length > 0)
        
        if (transferNumbers.length === 0) {
            showToast('Please enter at least one transfer number', 'error')
            return
        }
        
        // Get current user's outlet info
        const user = state.user
        const originOutletCode = user.outlet_code
        const originOutletName = user.outlet_name || `Outlet ${user.outlet_code}`
        
        // Create parcel
        const response = await axios.post('/api/outlet/create-parcel', {
            origin_outlet_code: originOutletCode,
            origin_outlet_name: originOutletName,
            destination_outlet_code: destinationCode,
            destination_outlet_name: destinationName,
            destination_type: destinationType,
            pallet_id: palletId,
            transfer_numbers: transferNumbers,
            delivery_date: deliveryDate,
            notes: notes
        })
        
        if (response.data.success) {
            showToast('✅ Parcel created successfully!', 'success')
            resetCreateParcelForm()
            
            // Switch to load tab
            state.outletTab = 'load'
            render()
        } else {
            showToast(response.data.error || 'Failed to create parcel', 'error')
        }
    } catch (error) {
        console.error('Create parcel error:', error)
        showToast(error.response?.data?.error || 'Failed to create parcel', 'error')
    }
}

// Reset create parcel form
function resetCreateParcelForm() {
    document.getElementById('createParcelDestination').value = ''
    document.getElementById('createParcelPalletId').value = ''
    document.getElementById('createParcelTransferNumbers').value = ''
    document.getElementById('createParcelDeliveryDate').value = new Date().toISOString().split('T')[0]
    document.getElementById('createParcelNotes').value = ''
}

// Load outlet created parcels (for Load tab)
async function loadOutletCreatedParcels() {
    try {
        const user = state.user
        const outletCode = user.outlet_code
        
        if (!outletCode) {
            console.warn('No outlet code for user')
            return
        }
        
        // Load pending parcels
        const pendingResponse = await axios.get(
            `/api/outlet/my-outgoing-parcels?outlet_code=${outletCode}&status=pending`
        )
        const pendingParcels = pendingResponse.data.parcels || []
        
        // Load loaded parcels
        const loadedResponse = await axios.get(
            `/api/outlet/my-outgoing-parcels?outlet_code=${outletCode}&status=loaded`
        )
        const loadedParcels = loadedResponse.data.parcels || []
        
        // Update pending list
        const pendingList = document.getElementById('pendingParcelsList')
        if (pendingList) {
            if (pendingParcels.length === 0) {
                pendingList.innerHTML = '<p class="text-gray-500 text-center py-4">No pending parcels</p>'
            } else {
                pendingList.innerHTML = pendingParcels.map(parcel => `
                    <div class="bg-white border border-purple-200 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-lg">${parcel.pallet_id}</p>
                                <p class="text-sm text-gray-600">
                                    <i class="fas fa-arrow-right mr-1"></i>To: ${parcel.outlet_name}
                                </p>
                                <p class="text-sm text-gray-600">
                                    <i class="fas fa-list mr-1"></i>${parcel.total_count} transfer numbers
                                </p>
                            </div>
                            <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Pending
                            </span>
                        </div>
                    </div>
                `).join('')
            }
        }
        
        // Update loaded list
        const loadedList = document.getElementById('loadedParcelsList')
        if (loadedList) {
            if (loadedParcels.length === 0) {
                loadedList.innerHTML = '<p class="text-gray-500 text-center py-4">No parcels loaded yet</p>'
            } else {
                loadedList.innerHTML = loadedParcels.map(parcel => `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-lg">${parcel.pallet_id}</p>
                                <p class="text-sm text-gray-600">
                                    <i class="fas fa-arrow-right mr-1"></i>To: ${parcel.outlet_name}
                                </p>
                                <p class="text-xs text-gray-500">
                                    Loaded at: ${new Date(parcel.loaded_at).toLocaleString()}
                                </p>
                            </div>
                            <span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                ✓ Loaded
                            </span>
                        </div>
                    </div>
                `).join('')
            }
        }
    } catch (error) {
        console.error('Load outlet parcels error:', error)
        showToast('Failed to load parcels', 'error')
    }
}

// Handle load outlet parcel
async function handleLoadOutletParcel() {
    try {
        const input = document.getElementById('loadParcelScanInput')
        const palletId = input.value.trim()
        
        if (!palletId) {
            showToast('Please scan or enter a pallet ID', 'error')
            return
        }
        
        const response = await axios.post('/api/outlet/load-parcel', {
            pallet_id: palletId,
            delivery_date: new Date().toISOString().split('T')[0],
            signature_name: state.user.full_name
        })
        
        if (response.data.success) {
            showToast('✅ Parcel loaded successfully!', 'success')
            input.value = ''
            
            // Reload parcels list
            loadOutletCreatedParcels()
        } else {
            showToast(response.data.error || 'Failed to load parcel', 'error')
        }
    } catch (error) {
        console.error('Load parcel error:', error)
        showToast(error.response?.data?.error || 'Failed to load parcel', 'error')
    }
}

//============================================================================
// END OUTLET-TO-OUTLET MODULE Functions
//============================================================================
```

### Integration Instructions:

1. Open `public/static/app.js`
2. Find line ~3630 (after `async function handleFindOutletPallets()` function)
3. Add all the above functions
4. The functions are now ready to be called by the UI

### Auto-load on Tab Switch:

The `switchOutletTab()` function already calls `loadOutletCreatedParcels()` when switching to 'load' tab.

Need to add auto-load for outlets dropdown when switching to 'create' tab.

Update `switchOutletTab()` function:
```javascript
function switchOutletTab(tab) {
    state.outletTab = tab
    render()
    
    // Load data for specific tabs
    if (tab === 'load') {
        loadOutletCreatedParcels()
    } else if (tab === 'create') {
        setTimeout(() => {
            loadOutletsForDropdown()
        }, 100)
    }
}
```

## ⏳ REMAINING TASKS:

1. Add the JavaScript functions above to app.js
2. Add color differentiation in unload list (detect outlet-originated parcels)
3. Test end-to-end flow
4. Deploy Phase 2

## 📝 Notes:

- UI structure is complete and committed
- Backend API is already deployed (Phase 1)
- Just need to add the JavaScript functions for full functionality
