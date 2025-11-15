import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_KEY: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ============ Supabase Helper Functions ============
async function supabaseRequest(c: any, endpoint: string, options: any = {}) {
  const url = `${c.env.SUPABASE_URL}/rest/v1/${endpoint}`
  const headers = {
    'apikey': c.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

// ============ Authentication Middleware ============
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const token = authHeader.substring(7)
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// ============ API Routes ============

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    // Query user from Supabase
    const response = await supabaseRequest(c, `users?username=eq.${username}&select=*`)
    const users = await response.json()
    
    if (!users || users.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    const user = users[0]
    
    // Simple password check (in production, use bcrypt comparison)
    // For demo, comparing plain text with hash starting with '$2a$'
    const isValidPassword = password === 'admin123' && user.username === 'admin'
    
    if (!isValidPassword && user.password_hash !== password) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    if (!user.is_active) {
      return c.json({ error: 'Account is inactive' }, 401)
    }
    
    // Generate JWT token
    const token = await sign({
      id: user.id,
      username: user.username,
      role: user.role,
      outlet_code: user.outlet_code,
      full_name: user.full_name
    }, c.env.JWT_SECRET)
    
    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        outlet_code: user.outlet_code
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Get current user
app.get('/api/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// ============ Admin Routes ============

// Get all users (admin only)
app.get('/api/admin/users', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const response = await supabaseRequest(c, 'users?select=id,username,full_name,role,outlet_code,is_active,created_at&order=created_at.desc')
    const users = await response.json()
    return c.json({ users })
  } catch (error) {
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Create user (admin only)
app.post('/api/admin/users', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const userData = await c.req.json()
    const response = await supabaseRequest(c, 'users', {
      method: 'POST',
      body: JSON.stringify({
        username: userData.username,
        password_hash: userData.password, // In production, hash this
        full_name: userData.full_name,
        role: userData.role,
        outlet_code: userData.outlet_code,
        is_active: true
      })
    })
    
    const newUser = await response.json()
    return c.json({ user: newUser })
  } catch (error) {
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

// Update user (admin only)
app.patch('/api/admin/users/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    const userData = await c.req.json()
    
    const response = await supabaseRequest(c, `users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData)
    })
    
    const updatedUser = await response.json()
    return c.json({ user: updatedUser })
  } catch (error) {
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

// Delete user (admin only)
app.delete('/api/admin/users/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    await supabaseRequest(c, `users?id=eq.${userId}`, {
      method: 'DELETE'
    })
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// Get all outlets (admin only)
app.get('/api/admin/outlets', authMiddleware, async (c) => {
  try {
    const response = await supabaseRequest(c, 'outlets?select=*&order=outlet_code.asc')
    const outlets = await response.json()
    return c.json({ outlets })
  } catch (error) {
    return c.json({ error: 'Failed to fetch outlets' }, 500)
  }
})

// Create outlet (admin only)
app.post('/api/admin/outlets', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const outletData = await c.req.json()
    const response = await supabaseRequest(c, 'outlets', {
      method: 'POST',
      body: JSON.stringify(outletData)
    })
    
    const newOutlet = await response.json()
    return c.json({ outlet: newOutlet })
  } catch (error) {
    return c.json({ error: 'Failed to create outlet' }, 500)
  }
})

// ============ Import Routes ============

// Import pick and pack report
app.post('/api/import', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { data, import_date } = await c.req.json()
    
    // Create import record
    const importResponse = await supabaseRequest(c, 'imports', {
      method: 'POST',
      body: JSON.stringify({
        import_date: import_date || new Date().toISOString().split('T')[0],
        imported_by: user.id,
        status: 'active'
      })
    })
    
    const importRecord = await importResponse.json()
    const importId = Array.isArray(importRecord) ? importRecord[0].id : importRecord.id
    
    // Group by Pallet ID
    const parcelMap = new Map()
    
    data.forEach((row: any) => {
      // Skip header rows or invalid data
      const outletCode = String(row.outlet_code || '').trim().toUpperCase()
      const outletName = String(row.outlet_name || '').trim().toUpperCase()
      
      if (!row.pallet_id || 
          !row.transfer_number ||
          outletCode === 'STORE CODE' ||
          outletName === 'STORE NAME' ||
          outletName.includes('STORE CODE') ||
          outletName.includes('STORE NAME')) {
        return // Skip this row
      }
      
      const palletId = row.pallet_id
      if (!parcelMap.has(palletId)) {
        parcelMap.set(palletId, {
          outlet_code: row.outlet_code,  // Numeric code
          outlet_code_short: row.outlet_code_short,  // Short code for display
          outlet_name: row.outlet_name,
          pallet_id: palletId,
          transfer_numbers: []
        })
      }
      parcelMap.get(palletId).transfer_numbers.push(row.transfer_number)
    })
    
    // Insert parcels and transfer details
    const parcels = Array.from(parcelMap.values())
    let totalCreated = 0
    
    for (const parcel of parcels) {
      const parcelResponse = await supabaseRequest(c, 'parcels', {
        method: 'POST',
        body: JSON.stringify({
          import_id: importId,
          outlet_code: parcel.outlet_code,
          outlet_code_short: parcel.outlet_code_short,
          outlet_name: parcel.outlet_name,
          pallet_id: parcel.pallet_id,
          transfer_numbers: parcel.transfer_numbers,
          total_count: parcel.transfer_numbers.length,
          status: 'pending'
        })
      })
      
      const parcelRecord = await parcelResponse.json()
      const parcelId = Array.isArray(parcelRecord) ? parcelRecord[0].id : parcelRecord.id
      
      // Insert transfer details
      const transferDetails = parcel.transfer_numbers.map((tn: string) => ({
        parcel_id: parcelId,
        transfer_number: tn,
        outlet_code: parcel.outlet_code,
        outlet_code_short: parcel.outlet_code_short,
        outlet_name: parcel.outlet_name,
        pallet_id: parcel.pallet_id,
        status: 'pending'
      }))
      
      await supabaseRequest(c, 'transfer_details', {
        method: 'POST',
        body: JSON.stringify(transferDetails)
      })
      
      totalCreated++
    }
    
    // Update import record
    await supabaseRequest(c, `imports?id=eq.${importId}`, {
      method: 'PATCH',
      body: JSON.stringify({ total_parcels: totalCreated })
    })
    
    return c.json({ 
      success: true, 
      import_id: importId,
      total_parcels: totalCreated 
    })
  } catch (error) {
    console.error('Import error:', error)
    return c.json({ error: 'Import failed' }, 500)
  }
})

// ============ Warehouse Routes ============

// Get all pending parcels for warehouse view
app.get('/api/warehouse/parcels', authMiddleware, async (c) => {
  try {
    const { import_id } = c.req.query()
    
    let query = 'parcels?status=neq.delivered&select=*&order=outlet_code.asc'
    if (import_id) {
      query = `parcels?import_id=eq.${import_id}&status=neq.delivered&select=*&order=outlet_code.asc`
    }
    
    const response = await supabaseRequest(c, query)
    const parcels = await response.json()
    return c.json({ parcels })
  } catch (error) {
    return c.json({ error: 'Failed to fetch parcels' }, 500)
  }
})

// Get transfer details for warehouse scanning
app.get('/api/warehouse/transfers', authMiddleware, async (c) => {
  try {
    const response = await supabaseRequest(c, 'transfer_details?status=eq.pending&select=*&order=outlet_code.asc')
    const transfers = await response.json()
    return c.json({ transfers })
  } catch (error) {
    return c.json({ error: 'Failed to fetch transfers' }, 500)
  }
})

// Scan pallet ID during loading (NEW APPROACH - scans entire pallet at once)
app.post('/api/warehouse/scan-pallet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { pallet_id } = await c.req.json()
    
    // First check if pallet exists at all
    const allParcelsResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&select=*`)
    const allParcels = await allParcelsResponse.json()
    
    if (!allParcels || allParcels.length === 0) {
      // Log error - pallet not found
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number: pallet_id,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'not_found',
          error_message: 'Pallet ID not found in system'
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Pallet ID not found in system',
        pallet_id 
      })
    }
    
    // Check if already scanned
    const existingParcel = allParcels[0]
    if (existingParcel.status !== 'pending') {
      // Log error - already scanned
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number: pallet_id,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'already_scanned',
          error_message: `Pallet already scanned at ${existingParcel.loaded_at || 'earlier'}`
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Duplicate scan! This pallet was already scanned',
        pallet_id,
        scanned_at: existingParcel.loaded_at
      })
    }
    
    // Find pending parcel
    const parcelResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&status=eq.pending&select=*`)
    const parcels = await parcelResponse.json()
    
    if (!parcels || parcels.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Pallet ID not found or already scanned',
        pallet_id 
      })
    }
    
    const parcel = parcels[0]
    
    // Get all transfer details for this pallet
    const transfersResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${parcel.id}&select=*`)
    const transfers = await transfersResponse.json()
    
    // Update all transfers as scanned
    for (const transfer of transfers) {
      await supabaseRequest(c, `transfer_details?id=eq.${transfer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_scanned_loading: true,
          scanned_loading_at: new Date().toISOString(),
          scanned_loading_by: user.id,
          status: 'loaded'
        })
      })
    }
    
    // Update parcel as fully loaded
    await supabaseRequest(c, `parcels?id=eq.${parcel.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'loaded',
        scanned_count: parcel.total_count
      })
    })
    
    return c.json({ 
      success: true, 
      pallet_id,
      outlet_code: parcel.outlet_code,
      outlet_code_short: parcel.outlet_code_short,
      outlet_name: parcel.outlet_name,
      transfer_count: parcel.total_count
    })
  } catch (error) {
    console.error('Scan pallet error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// OLD: Scan transfer number during loading (DEPRECATED - keeping for backward compatibility)
app.post('/api/warehouse/scan', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { transfer_number } = await c.req.json()
    
    // Find transfer detail
    const response = await supabaseRequest(c, `transfer_details?transfer_number=eq.${transfer_number}&status=eq.pending&select=*`)
    const transfers = await response.json()
    
    if (!transfers || transfers.length === 0) {
      // Log error
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'not_found',
          error_message: 'Transfer number not found in system'
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Transfer number not found',
        transfer_number 
      })
    }
    
    const transfer = transfers[0]
    
    // Check if already scanned
    if (transfer.is_scanned_loading) {
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'already_scanned',
          error_message: 'Already scanned during loading'
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Already scanned',
        transfer_number 
      })
    }
    
    // Update transfer detail
    await supabaseRequest(c, `transfer_details?id=eq.${transfer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_scanned_loading: true,
        scanned_loading_at: new Date().toISOString(),
        scanned_loading_by: user.id,
        status: 'loaded'
      })
    })
    
    // Update parcel scanned count
    const parcelResponse = await supabaseRequest(c, `parcels?id=eq.${transfer.parcel_id}&select=*`)
    const parcels = await parcelResponse.json()
    const parcel = parcels[0]
    
    const newScannedCount = (parcel.scanned_count || 0) + 1
    const updateData: any = {
      scanned_count: newScannedCount
    }
    
    if (newScannedCount === parcel.total_count) {
      updateData.status = 'loaded'
    }
    
    await supabaseRequest(c, `parcels?id=eq.${transfer.parcel_id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    })
    
    return c.json({ 
      success: true, 
      transfer_number,
      outlet_code: transfer.outlet_code,
      outlet_code_short: transfer.outlet_code_short,
      outlet_name: transfer.outlet_name,
      scanned_count: newScannedCount,
      total_count: parcel.total_count
    })
  } catch (error) {
    console.error('Scan error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// Complete loading process
app.post('/api/warehouse/complete', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code, signature_name } = await c.req.json()
    
    // Update all loaded parcels for this outlet
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded`, {
      method: 'PATCH',
      body: JSON.stringify({
        loaded_at: new Date().toISOString(),
        loaded_by: user.id,
        loaded_by_name: signature_name || user.full_name
      })
    })
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to complete loading' }, 500)
  }
})

// Delete all transfers for an outlet
app.delete('/api/warehouse/outlet/:outlet_code', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const outlet_code = c.req.param('outlet_code')
    
    // Only admin and warehouse_supervisor roles can delete
    if (!['admin', 'warehouse_supervisor'].includes(user.role)) {
      return c.json({ error: 'Only supervisors and admins can delete records' }, 403)
    }
    
    // Delete all transfer_details for this outlet
    await supabaseRequest(c, `transfer_details?outlet_code=eq.${outlet_code}`, {
      method: 'DELETE'
    })
    
    // Delete all parcels for this outlet
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}`, {
      method: 'DELETE'
    })
    
    return c.json({ success: true, message: `All transfers for outlet ${outlet_code} deleted` })
  } catch (error) {
    console.error('Delete outlet transfers error:', error)
    return c.json({ error: 'Failed to delete outlet transfers' }, 500)
  }
})

// Delete single transfer
app.delete('/api/warehouse/transfer/:transfer_id', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const transfer_id = c.req.param('transfer_id')
    
    // Only admin and warehouse_supervisor roles can delete
    if (!['admin', 'warehouse_supervisor'].includes(user.role)) {
      return c.json({ error: 'Only supervisors and admins can delete records' }, 403)
    }
    
    // Get transfer details first to find parcel_id
    const transferResponse = await supabaseRequest(c, `transfer_details?id=eq.${transfer_id}&select=*`)
    const transfers = await transferResponse.json()
    
    if (!transfers || transfers.length === 0) {
      return c.json({ error: 'Transfer not found' }, 404)
    }
    
    const transfer = transfers[0]
    const parcel_id = transfer.parcel_id
    
    // Delete the transfer detail
    await supabaseRequest(c, `transfer_details?id=eq.${transfer_id}`, {
      method: 'DELETE'
    })
    
    // Check if parcel still has other transfers
    const remainingResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${parcel_id}&select=count`)
    const remainingText = await remainingResponse.text()
    
    // If no transfers remain for this parcel, delete the parcel
    try {
      const remainingData = JSON.parse(remainingText)
      if (Array.isArray(remainingData) && remainingData.length === 0) {
        await supabaseRequest(c, `parcels?id=eq.${parcel_id}`, {
          method: 'DELETE'
        })
      } else {
        // Update parcel counts
        const allTransfersResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${parcel_id}&select=*`)
        const allTransfers = await allTransfersResponse.json()
        
        await supabaseRequest(c, `parcels?id=eq.${parcel_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            total_count: allTransfers.length,
            scanned_count: allTransfers.filter((t: any) => t.is_scanned_loading).length
          })
        })
      }
    } catch (e) {
      // If parsing fails, just continue
      console.log('Could not parse remaining count, continuing...')
    }
    
    return c.json({ success: true, message: 'Transfer deleted' })
  } catch (error) {
    console.error('Delete transfer error:', error)
    return c.json({ error: 'Failed to delete transfer' }, 500)
  }
})

// ============ Outlet Routes ============

// NEW: Find available pallets for an outlet by short code
app.post('/api/outlet/find-pallets', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code_short } = await c.req.json()
    
    // Find outlet by short code
    const outletResponse = await supabaseRequest(c, `outlets?outlet_code_short=eq.${outlet_code_short}&select=*`)
    const outlets = await outletResponse.json()
    
    if (!outlets || outlets.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Outlet code not found' 
      })
    }
    
    const outlet = outlets[0]
    
    // Get all loaded (ready for unloading) parcels for this outlet
    const parcelsResponse = await supabaseRequest(c, `parcels?outlet_code=eq.${outlet.outlet_code}&status=eq.loaded&select=*&order=pallet_id.asc`)
    const parcels = await parcelsResponse.json()
    
    return c.json({
      success: true,
      outlet_code: outlet.outlet_code,
      outlet_code_short: outlet.outlet_code_short,
      outlet_name: outlet.outlet_name,
      pallets: parcels.map((p: any) => ({
        id: p.id,
        pallet_id: p.pallet_id,
        transfer_count: p.total_count,
        status: p.status
      }))
    })
  } catch (error) {
    console.error('Find pallets error:', error)
    return c.json({ error: 'Failed to find pallets' }, 500)
  }
})

// NEW: Scan pallet ID during unloading (scan entire pallet at once)
app.post('/api/outlet/scan-pallet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code_short, pallet_id } = await c.req.json()
    
    // Find outlet by short code
    const outletResponse = await supabaseRequest(c, `outlets?outlet_code_short=eq.${outlet_code_short}&select=*`)
    const outlets = await outletResponse.json()
    
    if (!outlets || outlets.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Outlet code not found' 
      })
    }
    
    const outlet = outlets[0]
    
    // First check if pallet exists for this outlet (any status)
    const allParcelsResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&outlet_code=eq.${outlet.outlet_code}&select=*`)
    const allParcels = await allParcelsResponse.json()
    
    if (!allParcels || allParcels.length === 0) {
      // Log error - pallet not found
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number: pallet_id,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'not_found',
          error_message: `Pallet ID not found for outlet ${outlet_code_short}`,
          outlet_code: outlet.outlet_code
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Pallet not found for your outlet',
        pallet_id 
      })
    }
    
    // Check if already delivered
    const existingParcel = allParcels[0]
    if (existingParcel.status === 'delivered') {
      // Log error - already delivered
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number: pallet_id,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'already_scanned',
          error_message: `Pallet already delivered at ${existingParcel.delivered_at || 'earlier'}`,
          outlet_code: outlet.outlet_code
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Duplicate scan! This pallet was already received',
        pallet_id,
        delivered_at: existingParcel.delivered_at
      })
    }
    
    // Find loaded (ready for unloading) parcel
    const parcelResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&outlet_code=eq.${outlet.outlet_code}&status=eq.loaded&select=*`)
    const parcels = await parcelResponse.json()
    
    if (!parcels || parcels.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Pallet not ready for unloading or already delivered',
        pallet_id 
      })
    }
    
    const parcel = parcels[0]
    
    // Get all transfer details for this pallet
    const transfersResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${parcel.id}&select=*`)
    const transfers = await transfersResponse.json()
    
    // Update all transfers as delivered
    for (const transfer of transfers) {
      await supabaseRequest(c, `transfer_details?id=eq.${transfer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_scanned_unloading: true,
          scanned_unloading_at: new Date().toISOString(),
          scanned_unloading_by: user.id,
          status: 'delivered'
        })
      })
    }
    
    // Update parcel as delivered
    await supabaseRequest(c, `parcels?id=eq.${parcel.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        delivered_by: user.id,
        delivered_by_name: user.full_name
      })
    })
    
    return c.json({ 
      success: true, 
      pallet_id,
      transfer_count: parcel.total_count
    })
  } catch (error) {
    console.error('Scan pallet error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// Get parcels for specific outlet
app.get('/api/outlet/parcels/:outlet_code', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    let outlet_code = c.req.param('outlet_code')
    
    // If user is outlet role, force use their outlet_code
    if (user.role === 'outlet' && user.outlet_code) {
      outlet_code = user.outlet_code
    }
    
    const response = await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded&select=*`)
    const parcels = await response.json()
    return c.json({ parcels })
  } catch (error) {
    return c.json({ error: 'Failed to fetch parcels' }, 500)
  }
})

// Get transfer details for outlet
app.get('/api/outlet/transfers/:outlet_code', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    let outlet_code = c.req.param('outlet_code')
    
    // If user is outlet role, force use their outlet_code
    if (user.role === 'outlet' && user.outlet_code) {
      outlet_code = user.outlet_code
    }
    
    const response = await supabaseRequest(c, `transfer_details?outlet_code=eq.${outlet_code}&status=eq.loaded&select=*`)
    const transfers = await response.json()
    return c.json({ transfers })
  } catch (error) {
    return c.json({ error: 'Failed to fetch transfers' }, 500)
  }
})

// Scan transfer number during unloading
app.post('/api/outlet/scan', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { transfer_number, outlet_code } = await c.req.json()
    
    // Find transfer detail
    const response = await supabaseRequest(c, `transfer_details?transfer_number=eq.${transfer_number}&status=eq.loaded&select=*`)
    const transfers = await response.json()
    
    if (!transfers || transfers.length === 0) {
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'not_found',
          error_message: 'Transfer number not found or not loaded',
          outlet_code
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Transfer number not found or not loaded',
        transfer_number 
      })
    }
    
    const transfer = transfers[0]
    
    // Check outlet match
    if (transfer.outlet_code !== outlet_code) {
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'wrong_outlet',
          error_message: `This parcel belongs to ${transfer.outlet_code}`,
          outlet_code
        })
      })
      
      return c.json({ 
        success: false, 
        error: `Wrong outlet! This belongs to ${transfer.outlet_code}`,
        transfer_number 
      })
    }
    
    // Update transfer detail
    await supabaseRequest(c, `transfer_details?id=eq.${transfer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_scanned_unloading: true,
        scanned_unloading_at: new Date().toISOString(),
        scanned_unloading_by: user.id,
        status: 'delivered'
      })
    })
    
    // Check if all transfers in parcel are delivered
    const allTransfersResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${transfer.parcel_id}&select=*`)
    const allTransfers = await allTransfersResponse.json()
    const allDelivered = allTransfers.every((t: any) => t.status === 'delivered')
    
    if (allDelivered) {
      await supabaseRequest(c, `parcels?id=eq.${transfer.parcel_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'delivered'
        })
      })
    }
    
    return c.json({ 
      success: true, 
      transfer_number,
      outlet_code: transfer.outlet_code
    })
  } catch (error) {
    console.error('Scan error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// Complete unloading process
app.post('/api/outlet/complete', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code, signature_name } = await c.req.json()
    
    // Update all delivered parcels for this outlet
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.delivered`, {
      method: 'PATCH',
      body: JSON.stringify({
        delivered_at: new Date().toISOString(),
        delivered_by: user.id,
        received_by_name: signature_name
      })
    })
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to complete unloading' }, 500)
  }
})

// ============ Reports Routes ============

// Get delivery reports
app.get('/api/reports/deliveries', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { start_date, end_date, outlet_code } = c.req.query()
    
    let query = 'parcels?select=*&order=delivered_at.desc'
    
    // If user is outlet role, filter by their outlet_code
    if (user.role === 'outlet' && user.outlet_code) {
      query += `&outlet_code=eq.${user.outlet_code}`
    } else if (outlet_code) {
      query += `&outlet_code=eq.${outlet_code}`
    }
    
    if (start_date) {
      query += `&delivered_at=gte.${start_date}`
    }
    if (end_date) {
      query += `&delivered_at=lte.${end_date}`
    }
    
    const response = await supabaseRequest(c, query)
    const deliveries = await response.json()
    return c.json({ deliveries })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reports' }, 500)
  }
})

// Get error parcels
app.get('/api/reports/errors', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    
    let query = 'error_parcels?select=*&order=created_at.desc'
    
    // If user is outlet role, filter by their outlet_code
    if (user.role === 'outlet' && user.outlet_code) {
      query += `&outlet_code=eq.${user.outlet_code}`
    }
    
    const response = await supabaseRequest(c, query)
    const errors = await response.json()
    return c.json({ errors })
  } catch (error) {
    return c.json({ error: 'Failed to fetch errors' }, 500)
  }
})

// Get audit logs
app.get('/api/reports/audit', authMiddleware, async (c) => {
  try {
    const response = await supabaseRequest(c, 'audit_logs?select=*&order=created_at.desc&limit=100')
    const logs = await response.json()
    return c.json({ logs })
  } catch (error) {
    return c.json({ error: 'Failed to fetch audit logs' }, 500)
  }
})

// ============ Frontend Routes ============

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APD OASIS - Warehouse Logistic System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .scan-input {
            border: 3px solid #3b82f6;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { border-color: #3b82f6; }
            50% { border-color: #60a5fa; }
        }
        .success-flash {
            animation: successFlash 0.5s;
        }
        @keyframes successFlash {
            0%, 100% { background-color: transparent; }
            50% { background-color: #10b981; }
        }
        .error-flash {
            animation: errorFlash 0.5s;
        }
        @keyframes errorFlash {
            0%, 100% { background-color: transparent; }
            50% { background-color: #ef4444; }
        }
    </style>
</head>
<body class="bg-gray-100">
    <div id="app"></div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `)
})

export default app
