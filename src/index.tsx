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

// Version check endpoint (no auth required)
app.get('/api/version', (c) => {
  return c.json({ 
    version: '1.0.4-fix-outlets-query',
    timestamp: Date.now(),
    message: 'Outlets query uses select=* with order=outlet_code.asc'
  })
})

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
    // Check if password matches password_hash OR if it's the default admin
    const isValidPassword = user.password_hash === password || 
                           (password === 'admin123' && user.username === 'admin')
    
    if (!isValidPassword) {
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
    
    // Prepare update data
    const updateData: any = {
      username: userData.username,
      full_name: userData.full_name,
      role: userData.role,
      outlet_code: userData.outlet_code
    }
    
    // Only update password if it's provided and not empty
    if (userData.password && userData.password.trim() !== '') {
      updateData.password_hash = userData.password  // In production, hash this
    }
    
    // Handle is_active if provided (for activate/deactivate actions)
    if (userData.is_active !== undefined) {
      updateData.is_active = userData.is_active
    }
    
    const response = await supabaseRequest(c, `users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
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

// Get single user (admin only)
app.get('/api/admin/users/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    const response = await supabaseRequest(c, `users?id=eq.${userId}&select=id,username,full_name,role,outlet_code,is_active`)
    const users = await response.json()
    
    if (!users || users.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json(users[0])
  } catch (error) {
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

// Reset user password (admin only)
app.post('/api/admin/reset-password/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    
    // Reset password to default "Alpro@123"
    const response = await supabaseRequest(c, `users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        password_hash: 'Alpro@123'  // In production, hash this
      })
    })
    
    const updatedUser = await response.json()
    return c.json({ success: true, message: 'Password reset to Alpro@123' })
  } catch (error) {
    return c.json({ error: 'Failed to reset password' }, 500)
  }
})

// Change own password (authenticated users)
app.post('/api/change-password', authMiddleware, async (c) => {
  const user = c.get('user')
  
  try {
    const { current_password, new_password } = await c.req.json()
    
    // Validation
    if (!current_password || !new_password) {
      return c.json({ error: 'Current and new passwords are required' }, 400)
    }
    
    if (new_password.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters' }, 400)
    }
    
    // Fetch current user data
    const response = await supabaseRequest(c, `users?id=eq.${user.id}&select=password_hash`)
    const users = await response.json()
    
    if (!users || users.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    const currentUser = users[0]
    
    // Verify current password (simple comparison - in production use bcrypt)
    if (currentUser.password_hash !== current_password) {
      return c.json({ error: 'Current password is incorrect' }, 401)
    }
    
    // Update password
    await supabaseRequest(c, `users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        password_hash: new_password  // In production, hash this
      })
    })
    
    return c.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ error: 'Failed to change password' }, 500)
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
    const { data, import_date, delivery_date } = await c.req.json()
    
    console.log('=== IMPORT REQUEST ===')
    console.log('User:', user.username, 'Role:', user.role)
    console.log('Rows to import:', data.length)
    console.log('Import date:', import_date)
    console.log('Delivery date:', delivery_date)
    
    // OPTIMIZATION: Create import record ONLY (1 API call)
    const importResponse = await supabaseRequest(c, 'imports', {
      method: 'POST',
      body: JSON.stringify({
        import_date: import_date || new Date().toISOString().split('T')[0],
        delivery_date: delivery_date || new Date().toISOString().split('T')[0],
        imported_by: user.id,
        status: 'processing',  // Status = 'processing' initially
        total_parcels: 0  // Will be updated after processing
      })
    })
    
    const importRecord = await importResponse.json()
    const importId = Array.isArray(importRecord) ? importRecord[0].id : importRecord.id
    
    console.log('Import record created:', importId)
    
    // NOW SAFE: Process data in chunks (frontend sends 15 rows at a time)
    // With 15 rows = ~3-5 pallets, total subrequests = 1 (import) + 2 (batch inserts) = 3-4 total
    // This is WELL BELOW the 50 subrequest limit!
    
    // Group by Pallet ID
    const parcelMap = new Map()
    
    data.forEach((row: any, index: number) => {
      // Skip rows with missing required data
      if (!row.pallet_id || !row.transfer_number || !row.outlet_code || !row.outlet_name) {
        console.log(`Row ${index}: SKIPPED - Missing data`)
        return
      }
      
      // Skip header rows
      const outletCode = String(row.outlet_code).trim().toUpperCase()
      const outletName = String(row.outlet_name).trim().toUpperCase()
      if (outletCode === 'STORE CODE' && outletName === 'STORE NAME') {
        return
      }
      
      const palletId = String(row.pallet_id).trim()
      const transferNumber = String(row.transfer_number).trim()
      
      if (!parcelMap.has(palletId)) {
        parcelMap.set(palletId, {
          outlet_code: String(row.outlet_code).trim(),
          outlet_code_short: String(row.outlet_code_short || row.outlet_code).trim(),
          outlet_name: String(row.outlet_name).trim(),
          pallet_id: palletId,
          transfer_numbers: [],
          transfer_numbers_set: new Set()
        })
      }
      
      const parcel = parcelMap.get(palletId)!
      if (!parcel.transfer_numbers_set.has(transferNumber)) {
        parcel.transfer_numbers_set.add(transferNumber)
        parcel.transfer_numbers.push(transferNumber)
      }
    })
    
    const parcels = Array.from(parcelMap.values())
    console.log(`Grouped into ${parcels.length} parcels`)
    
    // Batch insert parcels (1 API call)
    const parcelRecords = parcels.map(parcel => ({
      import_id: importId,
      delivery_date: delivery_date || new Date().toISOString().split('T')[0],
      outlet_code: parcel.outlet_code,
      outlet_code_short: parcel.outlet_code_short,
      outlet_name: parcel.outlet_name,
      pallet_id: parcel.pallet_id,
      transfer_numbers: parcel.transfer_numbers,
      total_count: parcel.transfer_numbers.length,
      status: 'pending'
    }))
    
    const batchParcelResponse = await supabaseRequest(c, 'parcels', {
      method: 'POST',
      body: JSON.stringify(parcelRecords)
    })
    
    const insertedParcels = await batchParcelResponse.json()
    console.log(`✓ ${insertedParcels.length} parcels inserted`)
    
    if (!Array.isArray(insertedParcels) || insertedParcels.length === 0) {
      throw new Error('Failed to insert parcels')
    }
    
    // Batch insert transfer details (1 API call)
    const allTransferDetails: any[] = []
    
    insertedParcels.forEach((insertedParcel, index) => {
      const parcel = parcels[index]
      const transferDetails = parcel.transfer_numbers.map((tn: string) => ({
        parcel_id: insertedParcel.id,
        transfer_number: tn,
        delivery_date: delivery_date || new Date().toISOString().split('T')[0],
        outlet_code: parcel.outlet_code,
        outlet_code_short: parcel.outlet_code_short,
        outlet_name: parcel.outlet_name,
        pallet_id: parcel.pallet_id,
        status: 'pending'
      }))
      allTransferDetails.push(...transferDetails)
    })
    
    const batchTransferResponse = await supabaseRequest(c, 'transfer_details', {
      method: 'POST',
      body: JSON.stringify(allTransferDetails)
    })
    
    const insertedTransfers = await batchTransferResponse.json()
    console.log(`✓ ${insertedTransfers.length} transfer details inserted`)
    
    // Update import record with total
    await supabaseRequest(c, `imports?id=eq.${importId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        total_parcels: insertedParcels.length,
        status: 'active'
      })
    })
    
    return c.json({
      success: true,
      import_id: importId,
      total_parcels: insertedParcels.length,
      total_transfers: insertedTransfers.length,
      message: `Successfully imported ${insertedParcels.length} parcels`
    })
    
  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({ 
      error: 'Import failed', 
      message: errorMessage
    }, 500)
  }
})

// NEW ENDPOINT: Process import data in chunks (separate request context)
app.post('/api/import/:import_id/process-chunk', authMiddleware, async (c) => {
  try {
    const importId = c.req.param('import_id')
    const { chunk, chunk_index, total_chunks, delivery_date } = await c.req.json()
    
    console.log(`=== PROCESSING CHUNK ${chunk_index + 1}/${total_chunks} ===`)
    console.log('Import ID:', importId)
    console.log('Chunk rows:', chunk.length)
    
    // Group by Pallet ID
    const parcelMap = new Map()
    
    console.log('=== BACKEND IMPORT ===')
    console.log('Received rows:', data.length)
    if (data[0]) {
      console.log('First row sample:', {
        outlet_code: data[0].outlet_code,
        outlet_code_short: data[0].outlet_code_short,
        outlet_name: data[0].outlet_name,
        pallet_id: data[0].pallet_id,
        transfer_number: data[0].transfer_number
      })
    }
    
    data.forEach((row: any, index: number) => {
      // Skip rows with missing required data
      if (!row.pallet_id || !row.transfer_number || !row.outlet_code || !row.outlet_name) {
        console.log(`Row ${index}: SKIPPED - Missing data:`, {
          pallet_id: !!row.pallet_id,
          transfer_number: !!row.transfer_number,
          outlet_code: !!row.outlet_code,
          outlet_name: !!row.outlet_name
        })
        return // Skip this row
      }
      
      // Skip ONLY if BOTH outlet_code AND outlet_name are exactly "STORE CODE" and "STORE NAME"
      // This prevents filtering out legitimate data
      const outletCode = String(row.outlet_code).trim().toUpperCase()
      const outletName = String(row.outlet_name).trim().toUpperCase()
      
      if (outletCode === 'STORE CODE' && outletName === 'STORE NAME') {
        return // Skip header row
      }
      
      const palletId = String(row.pallet_id).trim()
      const transferNumber = String(row.transfer_number).trim()
      
      if (!parcelMap.has(palletId)) {
        parcelMap.set(palletId, {
          outlet_code: String(row.outlet_code).trim(),  // Ensure string
          outlet_code_short: String(row.outlet_code_short || row.outlet_code).trim(),  // Short code for display
          outlet_name: String(row.outlet_name).trim(),
          pallet_id: palletId,
          transfer_numbers: [],
          transfer_numbers_set: new Set() // Use Set to prevent duplicates
        })
      }
      
      const parcel = parcelMap.get(palletId)!
      // Only add if not already in set (automatic deduplication)
      if (!parcel.transfer_numbers_set.has(transferNumber)) {
        parcel.transfer_numbers_set.add(transferNumber)
        parcel.transfer_numbers.push(transferNumber)
      }
    })
    
    // Insert parcels and transfer details IN BULK (reduces API calls)
    const parcels = Array.from(parcelMap.values())
    console.log('\n=== PARCELS TO INSERT ===')
    console.log('Total parcels:', parcels.length)
    parcels.forEach((p, i) => {
      console.log(`Parcel ${i+1}:`, {
        outlet_code: p.outlet_code,
        outlet_code_short: p.outlet_code_short,
        outlet_name: p.outlet_name,
        pallet_id: p.pallet_id,
        transfer_count: p.transfer_numbers.length
      })
    })
    
    // OPTIMIZATION 1: Batch insert all parcels at once (1 API call instead of N)
    const parcelRecords = parcels.map(parcel => ({
      import_id: importId,
      delivery_date: delivery_date || new Date().toISOString().split('T')[0],
      outlet_code: parcel.outlet_code,
      outlet_code_short: parcel.outlet_code_short,
      outlet_name: parcel.outlet_name,
      pallet_id: parcel.pallet_id,
      transfer_numbers: parcel.transfer_numbers,
      total_count: parcel.transfer_numbers.length,
      status: 'pending'
    }))
    
    console.log(`\nBatch inserting ${parcelRecords.length} parcels...`)
    const batchParcelResponse = await supabaseRequest(c, 'parcels', {
      method: 'POST',
      body: JSON.stringify(parcelRecords)
    })
    
    console.log(`Batch parcel response status: ${batchParcelResponse.status}`)
    const insertedParcels = await batchParcelResponse.json()
    console.log(`✓ ${insertedParcels.length} parcels inserted in batch`)
    
    if (!Array.isArray(insertedParcels) || insertedParcels.length === 0) {
      throw new Error('Failed to insert parcels in batch')
    }
    
    // OPTIMIZATION 2: Batch insert all transfer details at once (1 API call instead of N)
    const allTransferDetails: any[] = []
    
    insertedParcels.forEach((insertedParcel, index) => {
      const parcel = parcels[index]
      const transferDetails = parcel.transfer_numbers.map((tn: string) => ({
        parcel_id: insertedParcel.id,
        transfer_number: tn,
        delivery_date: delivery_date || new Date().toISOString().split('T')[0],
        outlet_code: parcel.outlet_code,
        outlet_code_short: parcel.outlet_code_short,
        outlet_name: parcel.outlet_name,
        pallet_id: parcel.pallet_id,
        status: 'pending'
      }))
      allTransferDetails.push(...transferDetails)
    })
    
    console.log(`\nBatch inserting ${allTransferDetails.length} transfer details...`)
    const batchTransferResponse = await supabaseRequest(c, 'transfer_details', {
      method: 'POST',
      body: JSON.stringify(allTransferDetails)
    })
    
    console.log(`Batch transfer response status: ${batchTransferResponse.status}`)
    const insertedTransfers = await batchTransferResponse.json()
    console.log(`✓ ${insertedTransfers.length} transfer details inserted in batch`)
    
    const totalCreated = insertedParcels.length
    
    console.log(`\n=== IMPORT COMPLETE ===`)
    console.log(`Total parcels created: ${totalCreated}`)
    
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    return c.json({ 
      error: 'Import failed', 
      message: errorMessage,
      details: errorStack 
    }, 500)
  }
})

// Clear all database data (admin function)
app.post('/api/admin/clear-database', authMiddleware, async (c) => {
  try {
    console.log('\n=== CLEARING DATABASE ===')
    console.log('Note: Users and audit logs will be preserved')
    
    let totalDeleted = {
      transfer_details: 0,
      parcels: 0,
      imports: 0,
      containers: 0,
      error_parcels: 0
    }
    
    // Delete operational data in correct order (foreign key constraints)
    // ✅ KEEP: users table, audit_logs (logs)
    // ❌ DELETE: 
    //    - transfer_details (all F-code transfers)
    //    - parcels (all delivery records - this clears Delivery Report)
    //    - imports (all import records)
    //    - container_inventory (all A-code containers - this clears Container Report)
    //    - error_parcels (all error records - this clears Error Parcels Report)
    
    // 1. Delete transfer_details
    console.log('Counting transfer_details...')
    const transferCountResponse = await supabaseRequest(c, 'transfer_details?select=id')
    const transferList = await transferCountResponse.json()
    console.log(`  Found ${transferList.length} transfer details to delete`)
    
    if (transferList.length > 0) {
      console.log('Deleting transfer_details...')
      const transferDeleteResponse = await supabaseRequest(c, 'transfer_details?created_at=gte.2000-01-01', {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=representation'
        }
      })
      totalDeleted.transfer_details = transferList.length
      console.log(`  ✓ Deleted ${totalDeleted.transfer_details} transfer details`)
    }
    
    // 2. Delete parcels
    console.log('Counting parcels...')
    const parcelCountResponse = await supabaseRequest(c, 'parcels?select=id')
    const parcelList = await parcelCountResponse.json()
    console.log(`  Found ${parcelList.length} parcels to delete`)
    
    if (parcelList.length > 0) {
      console.log('Deleting parcels...')
      const parcelDeleteResponse = await supabaseRequest(c, 'parcels?created_at=gte.2000-01-01', {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=representation'
        }
      })
      totalDeleted.parcels = parcelList.length
      console.log(`  ✓ Deleted ${totalDeleted.parcels} parcels`)
    }
    
    // 3. Delete imports
    console.log('Counting imports...')
    const importCountResponse = await supabaseRequest(c, 'imports?select=id')
    const importList = await importCountResponse.json()
    console.log(`  Found ${importList.length} imports to delete`)
    
    if (importList.length > 0) {
      console.log('Deleting imports...')
      const importDeleteResponse = await supabaseRequest(c, 'imports?created_at=gte.2000-01-01', {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=representation'
        }
      })
      totalDeleted.imports = importList.length
      console.log(`  ✓ Deleted ${totalDeleted.imports} imports`)
    }
    
    // 4. Delete container_inventory (A-code containers)
    console.log('Counting container_inventory...')
    const containerCountResponse = await supabaseRequest(c, 'container_inventory?select=id')
    const containerList = await containerCountResponse.json()
    console.log(`  Found ${containerList.length} containers to delete`)
    
    if (containerList.length > 0) {
      console.log('Deleting container_inventory...')
      const containerDeleteResponse = await supabaseRequest(c, 'container_inventory?scanned_at=gte.2000-01-01', {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=representation'
        }
      })
      totalDeleted.containers = containerList.length
      console.log(`  ✓ Deleted ${totalDeleted.containers} containers`)
    }
    
    // 5. Delete error_parcels
    console.log('Counting error_parcels...')
    const errorParcelCountResponse = await supabaseRequest(c, 'error_parcels?select=id')
    const errorParcelList = await errorParcelCountResponse.json()
    console.log(`  Found ${errorParcelList.length} error parcels to delete`)
    
    if (errorParcelList.length > 0) {
      console.log('Deleting error_parcels...')
      const errorParcelDeleteResponse = await supabaseRequest(c, 'error_parcels?created_at=gte.2000-01-01', {
        method: 'DELETE',
        headers: {
          'Prefer': 'return=representation'
        }
      })
      totalDeleted.error_parcels = errorParcelList.length
      console.log(`  ✓ Deleted ${totalDeleted.error_parcels} error parcels`)
    }
    
    console.log('=== DATABASE CLEARED SUCCESSFULLY ===')
    console.log('📊 Reports Cleared:')
    console.log(`   ✓ Delivery Report: ${totalDeleted.parcels} records removed`)
    console.log(`   ✓ Container Report: ${totalDeleted.containers} records removed`)
    console.log(`   ✓ Error Parcels Report: ${totalDeleted.error_parcels} records removed`)
    console.log('📦 Operational Data Cleared:')
    console.log(`   ✓ Transfer Details: ${totalDeleted.transfer_details} records removed`)
    console.log(`   ✓ Imports: ${totalDeleted.imports} records removed`)
    console.log('✅ Users and Audit Logs: PRESERVED\n')
    
    return c.json({
      success: true,
      deleted: totalDeleted,
      reports_cleared: {
        delivery_report: totalDeleted.parcels,
        container_report: totalDeleted.containers,
        error_parcels_report: totalDeleted.error_parcels
      }
    })
  } catch (error) {
    console.error('Clear database error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return c.json({
      error: 'Failed to clear database',
      message: errorMessage
    }, 500)
  }
})

// ============ Warehouse Routes ============

// Get all pending parcels for warehouse view
app.get('/api/warehouse/parcels', authMiddleware, async (c) => {
  try {
    const { import_id, delivery_date } = c.req.query()
    
    // Return ALL parcels (including delivered) so frontend can show complete overview
    let query = 'parcels?select=*&order=outlet_code.asc'
    
    if (delivery_date && import_id) {
      query = `parcels?import_id=eq.${import_id}&delivery_date=eq.${delivery_date}&select=*&order=outlet_code.asc`
    } else if (delivery_date) {
      query = `parcels?delivery_date=eq.${delivery_date}&select=*&order=outlet_code.asc`
    } else if (import_id) {
      query = `parcels?import_id=eq.${import_id}&select=*&order=outlet_code.asc`
    }
    
    const response = await supabaseRequest(c, query)
    const parcels = await response.json()
    return c.json({ parcels })
  } catch (error) {
    return c.json({ error: 'Failed to fetch parcels' }, 500)
  }
})

// Get ALL parcels for dashboard view (including delivered)
app.get('/api/dashboard/parcels', authMiddleware, async (c) => {
  try {
    const { delivery_date } = c.req.query()
    
    // Filter by delivery date if provided
    let query = 'parcels?select=*&order=outlet_code.asc'
    if (delivery_date) {
      query = `parcels?delivery_date=eq.${delivery_date}&select=*&order=outlet_code.asc`
    }
    
    const response = await supabaseRequest(c, query)
    const parcels = await response.json()
    return c.json({ parcels })
  } catch (error) {
    console.error('Dashboard parcels error:', error)
    return c.json({ error: 'Failed to fetch dashboard parcels' }, 500)
  }
})

// Get transfer details for warehouse scanning
app.get('/api/warehouse/transfers', authMiddleware, async (c) => {
  try {
    const { outlet_code } = c.req.query()
    
    console.log('=== WAREHOUSE TRANSFERS API ===')
    console.log('outlet_code parameter:', outlet_code)
    
    let query = 'transfer_details?select=*&order=outlet_code.asc,transfer_number.asc'
    if (outlet_code) {
      // Try both outlet_code and outlet_code_short
      query = `transfer_details?or=(outlet_code.eq.${outlet_code},outlet_code_short.eq.${outlet_code})&select=*&order=transfer_number.asc`
      console.log('Query for specific outlet:', query)
    } else {
      // Otherwise, get only pending transfers
      query = 'transfer_details?status=eq.pending&select=*&order=outlet_code.asc'
      console.log('Query for all pending:', query)
    }
    
    const response = await supabaseRequest(c, query)
    const transfers = await response.json()
    
    console.log('Transfer details found:', transfers.length)
    if (transfers.length > 0) {
      console.log('Sample transfer:', {
        transfer_number: transfers[0].transfer_number,
        outlet_code: transfers[0].outlet_code,
        outlet_code_short: transfers[0].outlet_code_short,
        pallet_id: transfers[0].pallet_id,
        status: transfers[0].status
      })
    }
    
    return c.json({ transfers })
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return c.json({ error: 'Failed to fetch transfers' }, 500)
  }
})

// Scan pallet ID during loading (NEW APPROACH - scans entire pallet at once)
app.post('/api/warehouse/scan-pallet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { pallet_id, delivery_date } = await c.req.json()
    
    // 🐛 DEBUG: Server-side logging for APK debugging
    console.log('=== SERVER SCAN DEBUG ===')
    console.log('User:', user.username, '(', user.full_name, ')')
    console.log('Pallet ID:', pallet_id)
    console.log('Delivery date received:', delivery_date)
    console.log('Delivery date type:', typeof delivery_date)
    console.log('========================')
    
    // Validate delivery date is provided
    if (!delivery_date) {
      console.error('❌ SERVER: No delivery date in request!')
      return c.json({ 
        success: false, 
        error: 'Delivery date is required',
        pallet_id 
      })
    }
    
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
    
    // Validate delivery date matches pallet's delivery date
    const parcelDeliveryDate = allParcels[0].delivery_date
    if (parcelDeliveryDate !== delivery_date) {
      // Log error - wrong delivery date
      await supabaseRequest(c, 'error_parcels', {
        method: 'POST',
        body: JSON.stringify({
          transfer_number: pallet_id,
          scanned_by: user.id,
          scanned_by_name: user.full_name,
          error_type: 'wrong_delivery_date',
          error_message: `Pallet belongs to delivery date ${parcelDeliveryDate}, but you selected ${delivery_date}`
        })
      })
      
      return c.json({ 
        success: false, 
        error: `Wrong delivery date! This pallet is for ${parcelDeliveryDate}, but you selected ${delivery_date}`,
        pallet_id,
        expected_date: parcelDeliveryDate,
        selected_date: delivery_date
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

// NEW: Revert/unscan a pallet (revert status back to pending)
app.post('/api/warehouse/revert-pallet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { pallet_id } = await c.req.json()
    
    console.log(`Reverting pallet ${pallet_id} back to pending status`)
    
    // Find the pallet
    const parcelResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&status=eq.loaded&select=*`)
    const parcels = await parcelResponse.json()
    
    if (!parcels || parcels.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Pallet not found or not in loaded status',
        pallet_id 
      })
    }
    
    const parcel = parcels[0]
    
    // Get all transfer details for this pallet
    const transfersResponse = await supabaseRequest(c, `transfer_details?parcel_id=eq.${parcel.id}&select=*`)
    const transfers = await transfersResponse.json()
    
    // Revert all transfers back to pending
    for (const transfer of transfers) {
      await supabaseRequest(c, `transfer_details?id=eq.${transfer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_scanned_loading: false,
          scanned_loading_at: null,
          scanned_loading_by: null,
          status: 'pending'
        })
      })
    }
    
    // Revert parcel back to pending
    await supabaseRequest(c, `parcels?id=eq.${parcel.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'pending',
        scanned_count: 0
      })
    })
    
    console.log(`✓ Pallet ${pallet_id} reverted to pending`)
    
    return c.json({ 
      success: true, 
      pallet_id,
      outlet_code: parcel.outlet_code
    })
  } catch (error) {
    console.error('Revert pallet error:', error)
    return c.json({ error: 'Revert failed' }, 500)
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
    
    console.log('\n=== WAREHOUSE COMPLETE LOADING DEBUG ===')
    console.log('Outlet Code:', outlet_code)
    console.log('Signature Name:', signature_name)
    console.log('User:', user.full_name, '(ID:', user.id, ')')
    
    // First, check how many loaded parcels exist for this outlet
    const checkResponse = await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded&select=id,pallet_id,outlet_code,status`)
    const loadedParcels = await checkResponse.json()
    console.log(`Found ${loadedParcels.length} parcels with status='loaded' for outlet ${outlet_code}`)
    console.log('Parcel IDs:', loadedParcels.map(p => p.pallet_id).join(', '))
    
    const updateData = {
      loaded_at: new Date().toISOString(),
      loaded_by: user.id,  // Warehouse staff who did loading
      loaded_by_name: signature_name || user.full_name,  // Driver signature who confirmed
      scanned_loading_by_name: user.full_name  // Track warehouse staff name separately
    }
    console.log('Update data:', JSON.stringify(updateData, null, 2))
    
    // Update all loaded parcels for this outlet
    // loaded_by: warehouse staff who did the scanning/loading
    // loaded_by_name: driver signature who acknowledged and received the load
    const updateResponse = await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
      headers: {
        'Prefer': 'return=representation'
      }
    })
    
    const updatedParcels = await updateResponse.json()
    console.log(`✅ Updated ${updatedParcels.length} parcels`)
    if (updatedParcels.length > 0) {
      console.log('First updated parcel:', JSON.stringify(updatedParcels[0], null, 2))
    }
    console.log('=======================================\n')
    
    return c.json({ success: true, updated_count: updatedParcels.length })
  } catch (error) {
    console.error('❌ Warehouse complete error:', error)
    return c.json({ error: 'Failed to complete loading' }, 500)
  }
})

// Set container count for an outlet
// NEW: Set box and container count after all outlet pallets are scanned
app.post('/api/warehouse/set-box-container-count', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code, box_count, container_count } = await c.req.json()
    
    if (!outlet_code || box_count === undefined || container_count === undefined) {
      return c.json({ error: 'Missing required fields: outlet_code, box_count, container_count' }, 400)
    }
    
    console.log(`Setting box/container count for outlet ${outlet_code}: ${box_count} boxes, ${container_count} containers`)
    
    // Update box_count and container_count for all loaded parcels of this outlet
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded`, {
      method: 'PATCH',
      body: JSON.stringify({
        box_count: parseInt(box_count),
        container_count: parseInt(container_count)
      })
    })
    
    return c.json({ 
      success: true, 
      box_count: parseInt(box_count),
      container_count: parseInt(container_count),
      outlet_code 
    })
  } catch (error) {
    console.error('Set box/container count error:', error)
    return c.json({ error: 'Failed to set box/container count' }, 500)
  }
})

// DEPRECATED: Old endpoint (kept for backward compatibility)
app.post('/api/warehouse/set-container-count', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code, container_count } = await c.req.json()
    
    if (!outlet_code || !container_count) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Update container_count_loaded for all loaded parcels of this outlet (legacy)
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.loaded`, {
      method: 'PATCH',
      body: JSON.stringify({
        container_count_loaded: container_count
      })
    })
    
    return c.json({ success: true, container_count })
  } catch (error) {
    return c.json({ error: 'Failed to set container count' }, 500)
  }
})

// NEW: Scan A code container and link to outlet
app.post('/api/warehouse/scan-container', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { container_id, outlet_code, outlet_name, delivery_date } = await c.req.json()
    
    if (!container_id || !outlet_code || !delivery_date) {
      return c.json({ error: 'Missing required fields: container_id, outlet_code, delivery_date' }, 400)
    }
    
    console.log(`🔍 Scanning A code container: ${container_id} for outlet ${outlet_code}`)
    console.log(`📝 Scan details:`, { container_id, outlet_code, outlet_name, delivery_date, user: user.full_name })
    
    // Check if A code already scanned for this outlet
    const existingResponse = await supabaseRequest(c, 
      `container_inventory?container_id=eq.${container_id}&outlet_code=eq.${outlet_code}&select=*`)
    const existing = await existingResponse.json()
    
    if (existing && existing.length > 0) {
      console.log(`⚠️ Duplicate scan detected: ${container_id} already exists for outlet ${outlet_code}`)
      return c.json({ 
        success: false, 
        error: 'Container already scanned for this outlet',
        container_id 
      })
    }
    
    // Create container record linked to outlet
    console.log(`💾 Saving A-code to container_inventory:`, {
      container_id,
      outlet_code,
      outlet_name,
      delivery_date,
      status: 'at_outlet'
    })
    
    const insertResponse = await supabaseRequest(c, 'container_inventory', {
      method: 'POST',
      body: JSON.stringify({
        container_id: container_id,
        outlet_code: outlet_code,
        outlet_name: outlet_name || `Outlet ${outlet_code}`, // Fallback if name not provided
        delivery_date: delivery_date,
        status: 'at_outlet', // Container loaded and ready for delivery
        scanned_at: new Date().toISOString(),
        scanned_by: user.id,
        scanned_by_name: user.full_name
      })
    })
    
    const insertResult = await insertResponse.json()
    console.log(`✅ A-code saved successfully:`, insertResult)
    
    return c.json({ 
      success: true, 
      container_id,
      outlet_code,
      saved_data: insertResult
    })
  } catch (error) {
    console.error('Scan container error:', error)
    return c.json({ error: 'Failed to scan container' }, 500)
  }
})

// DEBUG: Check containers table for specific outlet
app.get('/api/debug/containers/:outlet_code', authMiddleware, async (c) => {
  try {
    const outlet_code = c.req.param('outlet_code')
    
    // Get all containers for this outlet
    const containersResponse = await supabaseRequest(c, 
      `container_inventory?outlet_code=eq.${outlet_code}&select=*`)
    const containers = await containersResponse.json()
    
    // Also get ALL containers (to see what outlet_codes exist)
    const allContainersResponse = await supabaseRequest(c, `container_inventory?select=*&order=scanned_at.desc&limit=20`)
    const allContainers = await allContainersResponse.json()
    
    return c.json({
      outlet_code: outlet_code,
      containers_for_outlet: containers,
      recent_containers: allContainers,
      query_used: `container_inventory?outlet_code=eq.${outlet_code}&select=*`
    })
  } catch (error) {
    console.error('Debug containers error:', error)
    return c.json({ error: 'Failed to query containers' }, 500)
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
    
    console.log(`Finding pallets for outlet: ${outlet_code_short}`)
    
    // Get all loaded (ready for unloading) parcels for this outlet using outlet_code_short
    const parcelsResponse = await supabaseRequest(c, `parcels?outlet_code_short=eq.${outlet_code_short}&status=eq.loaded&select=*&order=pallet_id.asc`)
    const parcels = await parcelsResponse.json()
    
    console.log(`Found ${parcels.length} loaded parcels`)
    
    if (!parcels || parcels.length === 0) {
      return c.json({ 
        success: false, 
        error: 'No loaded pallets found for this outlet' 
      })
    }
    
    // Get outlet info from first parcel
    const firstParcel = parcels[0]
    
    // Get container counts from first parcel
    const containerCountLoaded = firstParcel.container_count_loaded || 0 // OLD: Legacy field
    const boxCount = firstParcel.box_count || 0 // NEW: Box count
    const containerCount = firstParcel.container_count || 0 // NEW: A-code container count
    
    // Fetch A-code containers linked to this outlet
    let aCodeContainers = []
    console.log(`🔍 Fetching A-code containers for outlet ${firstParcel.outlet_code}, container_count=${containerCount}`)
    console.log(`📝 Full outlet info:`, {
      outlet_code: firstParcel.outlet_code,
      outlet_code_short: firstParcel.outlet_code_short,
      outlet_name: firstParcel.outlet_name
    })
    console.log(`📝 Query: container_inventory?outlet_code=eq.${firstParcel.outlet_code}&select=*`)
    
    // Fetch ONLY containers at this outlet that are NOT yet delivered (status='at_outlet')
    try {
      const containersResponse = await supabaseRequest(c, 
        `container_inventory?outlet_code=eq.${firstParcel.outlet_code}&status=eq.at_outlet&select=*`)
      const containers = await containersResponse.json()
      console.log(`✅ Query returned ${containers?.length || 0} A-code containers at outlet (not delivered)`)
      console.log(`📦 Container data:`, JSON.stringify(containers, null, 2))
      
      if (containers && containers.length > 0) {
        aCodeContainers = containers.map((cont: any) => ({
          container_id: cont.container_id,
          scanned_at: cont.scanned_at,
          status: cont.status
        }))
      }
    } catch (err) {
      console.error('Error fetching A-code containers:', err)
    }
    
    return c.json({
      success: true,
      outlet_code: firstParcel.outlet_code,
      outlet_code_short: firstParcel.outlet_code_short,
      outlet_name: firstParcel.outlet_name,
      container_count_loaded: containerCountLoaded, // OLD: Legacy field for backward compatibility
      box_count: boxCount, // NEW: Box count from warehouse
      container_count: containerCount, // NEW: A-code container count
      a_code_containers: aCodeContainers, // NEW: List of A-code containers to scan
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
    
    console.log(`Scanning pallet ${pallet_id} for outlet ${outlet_code_short}`)
    
    // First check if pallet exists for this outlet using outlet_code_short (any status)
    const allParcelsResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&outlet_code_short=eq.${outlet_code_short}&select=*`)
    const allParcels = await allParcelsResponse.json()
    
    console.log(`Found ${allParcels.length} parcels for this pallet+outlet combination`)
    
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
          outlet_code: outlet_code_short
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
          outlet_code: existingParcel.outlet_code
        })
      })
      
      return c.json({ 
        success: false, 
        error: 'Duplicate scan! This pallet was already received',
        pallet_id,
        delivered_at: existingParcel.delivered_at
      })
    }
    
    // Check if pallet is in "loaded" status (ready for unloading)
    if (existingParcel.status !== 'loaded') {
      return c.json({ 
        success: false, 
        error: existingParcel.status === 'pending' ? 
          'Pallet not yet loaded at warehouse' : 
          'Pallet already delivered',
        pallet_id 
      })
    }
    
    // Just validate - don't update yet (wait for signature confirmation)
    return c.json({ 
      success: true, 
      pallet_id,
      transfer_count: existingParcel.total_count
    })
  } catch (error) {
    console.error('Scan pallet error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// NEW: Revert outlet pallet scan (remove from scanned list before confirmation)
app.post('/api/outlet/revert-pallet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { pallet_id, outlet_code_short } = await c.req.json()
    
    console.log(`Reverting outlet pallet scan for ${pallet_id} at outlet ${outlet_code_short}`)
    
    // For outlet context: Since scanning doesn't immediately change database status,
    // this is primarily a client-side list removal
    // The pallet remains in "loaded" status until confirmation
    
    return c.json({ 
      success: true,
      pallet_id,
      message: 'Pallet removed from scan list (remains in loaded status)'
    })
  } catch (error) {
    console.error('Revert outlet pallet error:', error)
    return c.json({ error: 'Revert failed' }, 500)
  }
})

// NEW: Scan A code container at outlet
app.post('/api/outlet/scan-container', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code_short, outlet_code, container_id } = await c.req.json()
    
    console.log(`Scanning container ${container_id} for outlet ${outlet_code_short || outlet_code}`)
    
    // Check if container exists for this outlet
    const containersResponse = await supabaseRequest(c, 
      `container_inventory?container_id=eq.${container_id}&outlet_code=eq.${outlet_code || outlet_code_short}&select=*`)
    const containers = await containersResponse.json()
    
    if (!containers || containers.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Container not found for this outlet',
        container_id 
      })
    }
    
    const container = containers[0]
    
    // Check if already delivered
    if (container.status === 'delivered') {
      return c.json({ 
        success: false, 
        error: 'Duplicate scan! This container was already received',
        container_id
      })
    }
    
    // Just validate - don't update yet (wait for confirmation like pallets)
    return c.json({ 
      success: true, 
      container_id
    })
  } catch (error) {
    console.error('Scan container error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// NEW: Confirm receipt with signature
app.post('/api/outlet/confirm-receipt', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { pallet_id, outlet_code_short, receiver_name } = await c.req.json()
    
    console.log(`Confirming receipt: ${pallet_id} by ${receiver_name} for outlet ${outlet_code_short}`)
    
    // Find the pallet
    const parcelsResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&outlet_code_short=eq.${outlet_code_short}&status=eq.loaded&select=*`)
    const parcels = await parcelsResponse.json()
    
    if (!parcels || parcels.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Pallet not found or already delivered' 
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
    
    // Update parcel as delivered with receiver name
    await supabaseRequest(c, `parcels?id=eq.${parcel.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        delivered_by: user.id,
        delivered_by_name: user.full_name,
        received_by_name: receiver_name  // Store receiver signature
      })
    })
    
    console.log(`✓ Pallet ${pallet_id} confirmed as delivered by ${receiver_name}`)
    
    return c.json({ 
      success: true, 
      pallet_id,
      receiver_name,
      transfer_count: parcel.total_count
    })
  } catch (error) {
    console.error('Confirm receipt error:', error)
    return c.json({ error: 'Failed to confirm receipt' }, 500)
  }
})

// NEW: Bulk confirm receipt for multiple pallets at once
app.post('/api/outlet/confirm-receipt-bulk', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code_short, pallet_ids, receiver_name, container_count } = await c.req.json()
    
    console.log(`Bulk confirming receipt for outlet ${outlet_code_short}: ${pallet_ids.length} pallets in ${container_count || 'unknown'} containers by ${receiver_name}`)
    
    if (!pallet_ids || pallet_ids.length === 0) {
      return c.json({ error: 'No pallet IDs provided' }, 400)
    }
    
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    // Process each pallet/container
    for (const pallet_id of pallet_ids) {
      try {
        // Check if this is an A-code (container) instead of F-code (pallet)
        const isACode = pallet_id.toUpperCase().startsWith('A')
        
        if (isACode) {
          // This is an A-code container - update container_inventory
          console.log(`📦 Processing A-code container: ${pallet_id}`)
          
          // Find the container
          const containerResponse = await supabaseRequest(c, 
            `container_inventory?container_id=eq.${pallet_id}&status=eq.at_outlet&select=*`)
          const containers = await containerResponse.json()
          
          if (!containers || containers.length === 0) {
            errorCount++
            errors.push(`${pallet_id}: A-code not found or already delivered`)
            console.error(`❌ A-code ${pallet_id} not found in container_inventory`)
            continue
          }
          
          const container = containers[0]
          
          // Update container status to delivered
          await supabaseRequest(c, `container_inventory?id=eq.${container.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'delivered',
              delivered_at: new Date().toISOString(),
              delivered_by: user.id,
              delivered_by_name: user.full_name,
              receiver_name: receiver_name
            })
          })
          
          successCount++
          console.log(`✓ A-code ${pallet_id} marked as delivered`)
          continue // Skip pallet processing for A-codes
        }
        
        // This is an F-code (pallet) - process normally
        const parcelsResponse = await supabaseRequest(c, `parcels?pallet_id=eq.${pallet_id}&outlet_code_short=eq.${outlet_code_short}&status=eq.loaded&select=*`)
        const parcels = await parcelsResponse.json()
        
        if (!parcels || parcels.length === 0) {
          errorCount++
          errors.push(`${pallet_id}: not found or already delivered`)
          continue
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
        
        // Update parcel as delivered with receiver name and container count
        await supabaseRequest(c, `parcels?id=eq.${parcel.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            delivered_by: user.id,
            delivered_by_name: user.full_name,
            received_by_name: receiver_name,
            container_count_delivered: container_count
          })
        })
        
        // 🔄 CONTAINER RECYCLING: Check if pallet ID starts with 'A' (recyclable container)
        if (pallet_id.toUpperCase().startsWith('A')) {
          try {
            console.log(`♻️ Detected recyclable container: ${pallet_id} - Adding to inventory at outlet ${outlet_code_short}`)
            
            // Add container to inventory
            await supabaseRequest(c, 'container_inventory', {
              method: 'POST',
              body: JSON.stringify({
                container_id: pallet_id,
                outlet_code: parcel.outlet_code,
                outlet_name: parcel.outlet_name,
                status: 'at_outlet',
                delivered_at: new Date().toISOString(),
                delivered_by: user.id,
                delivered_by_name: user.full_name,
                delivery_date: parcel.delivery_date,
                original_outlet_code: parcel.outlet_code,
                original_outlet_name: parcel.outlet_name
              })
            })
            
            console.log(`✓ Container ${pallet_id} added to inventory at ${outlet_code_short}`)
          } catch (containerError) {
            // Log error but don't fail the delivery confirmation
            console.error(`⚠️ Failed to add container ${pallet_id} to inventory:`, containerError)
          }
        }
        
        successCount++
        console.log(`✓ Pallet ${pallet_id} confirmed as delivered`)
      } catch (error) {
        errorCount++
        errors.push(`${pallet_id}: ${error instanceof Error ? error.message : 'unknown error'}`)
        console.error(`Error confirming pallet ${pallet_id}:`, error)
      }
    }
    
    console.log(`Bulk confirmation complete: ${successCount} success, ${errorCount} errors`)
    
    return c.json({ 
      success: true, 
      total: pallet_ids.length,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      receiver_name
    })
  } catch (error) {
    console.error('Bulk confirm receipt error:', error)
    return c.json({ error: 'Failed to confirm receipts' }, 500)
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
    // delivered_by: driver/warehouse staff who did the scanning/unloading
    // received_by_name: outlet staff signature who acknowledged and received the delivery
    await supabaseRequest(c, `parcels?outlet_code=eq.${outlet_code}&status=eq.delivered`, {
      method: 'PATCH',
      body: JSON.stringify({
        delivered_at: new Date().toISOString(),
        delivered_by: user.id,  // Driver/warehouse staff who did unloading
        scanned_unloading_by_name: user.full_name,  // Track driver name separately
        received_by_name: signature_name  // Outlet staff signature who confirmed
      })
    })
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to complete unloading' }, 500)
  }
})

// ============ Container Management Routes ============

// Get all outlets (public endpoint for authenticated users) - FIXED VERSION
app.get('/api/outlets', authMiddleware, async (c) => {
  try {
    // CRITICAL FIX: Must use outlet_code not code for ordering
    const response = await supabaseRequest(c, 'outlets?select=*&order=outlet_code.asc')
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase error:', errorText)
      return c.json({ error: 'Failed to fetch outlets', details: errorText }, 500)
    }
    
    const outlets = await response.json()
    console.log('Outlets fetched (v1.0.4):', Array.isArray(outlets) ? outlets.length : 'not an array')
    
    // Supabase returns array directly
    return c.json({ outlets: Array.isArray(outlets) ? outlets : [] })
  } catch (error) {
    console.error('Failed to fetch outlets exception:', error)
    return c.json({ error: 'Failed to fetch outlets', message: String(error) }, 500)
  }
})

// NEW: Alternative outlets endpoint with different path (cache-busting)
app.get('/api/v2/outlets', authMiddleware, async (c) => {
  try {
    const response = await supabaseRequest(c, 'outlets?select=*&order=outlet_code.asc')
    
    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ error: 'Failed to fetch outlets', details: errorText }, 500)
    }
    
    const outlets = await response.json()
    return c.json({ outlets: Array.isArray(outlets) ? outlets : [], version: '1.0.4' })
  } catch (error) {
    return c.json({ error: 'Failed to fetch outlets', message: String(error) }, 500)
  }
})

// Get all parcels (public endpoint for authenticated users)
app.get('/api/parcels', authMiddleware, async (c) => {
  try {
    const response = await supabaseRequest(c, 'parcels?select=outlet_code,outlet_code_short,outlet_name&order=outlet_code.asc')
    const parcels = await response.json()
    return c.json({ parcels })
  } catch (error) {
    console.error('Failed to fetch parcels:', error)
    return c.json({ error: 'Failed to fetch parcels' }, 500)
  }
})

// Get containers by outlet
app.get('/api/containers/by-outlet/:outlet_code', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    let outlet_code = c.req.param('outlet_code')
    
    // If user is outlet role, force use their outlet_code
    if (user.role === 'outlet' && user.outlet_code) {
      outlet_code = user.outlet_code
    }
    
    const response = await supabaseRequest(c, `container_inventory?outlet_code=eq.${outlet_code}&status=eq.at_outlet&select=*&order=delivered_at.desc`)
    const containers = await response.json()
    return c.json({ containers })
  } catch (error) {
    console.error('Failed to fetch containers:', error)
    return c.json({ error: 'Failed to fetch containers' }, 500)
  }
})

// Get all containers inventory (admin/warehouse view)
app.get('/api/containers/inventory', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    
    // Allow admin, warehouse staff, warehouse supervisor, outlet users, and drivers to view containers
    if (!['admin', 'warehouse', 'warehouse_staff', 'warehouse_supervisor', 'outlet', 'driver'].includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    
    // If outlet user, filter to show only their outlet's containers
    let query = 'container_inventory?select=*&order=delivered_at.desc'
    if (user.role === 'outlet' && user.outlet_code) {
      query = `container_inventory?outlet_code=eq.${user.outlet_code}&select=*&order=delivered_at.desc`
    }
    
    const response = await supabaseRequest(c, query)
    const containers = await response.json()
    return c.json({ containers })
  } catch (error) {
    console.error('Failed to fetch container inventory:', error)
    return c.json({ error: 'Failed to fetch container inventory' }, 500)
  }
})

// Scan container for collection
app.post('/api/containers/scan-collect', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { container_id, outlet_code } = await c.req.json()
    
    console.log(`🔍 Scanning container ${container_id} for collection at outlet ${outlet_code}`)
    
    // Find the container
    const response = await supabaseRequest(c, `container_inventory?container_id=eq.${container_id}&status=eq.at_outlet&select=*`)
    const containers = await response.json()
    
    if (!containers || containers.length === 0) {
      console.log(`❌ Container ${container_id} not found in inventory`)
      return c.json({ 
        success: false, 
        error: 'Container not found or already collected',
        container_id 
      })
    }
    
    const container = containers[0]
    
    // Check if container belongs to this outlet
    if (container.outlet_code !== outlet_code) {
      console.log(`⚠️ Container ${container_id} belongs to ${container.outlet_code}, not ${outlet_code}`)
      
      // Return cross-outlet warning
      return c.json({ 
        success: false,
        cross_outlet: true,
        error: `This container belongs to ${container.outlet_name} (${container.outlet_code})`,
        container_id,
        current_outlet: container.outlet_code,
        current_outlet_name: container.outlet_name,
        scanning_outlet: outlet_code
      })
    }
    
    // Container belongs to this outlet - mark as ready for collection
    console.log(`✓ Container ${container_id} validated for collection`)
    
    return c.json({ 
      success: true, 
      container_id,
      outlet_code: container.outlet_code,
      outlet_name: container.outlet_name,
      delivered_at: container.delivered_at
    })
  } catch (error) {
    console.error('Container scan error:', error)
    return c.json({ error: 'Scan failed' }, 500)
  }
})

// Collect container from wrong outlet (cross-outlet collection)
app.post('/api/containers/collect-cross-outlet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { container_id, scanning_outlet } = await c.req.json()
    
    console.log(`♻️ Cross-outlet collection: Container ${container_id} from ${scanning_outlet} by ${user.full_name}`)
    
    // Find the container
    const response = await supabaseRequest(c, `container_inventory?container_id=eq.${container_id}&status=eq.at_outlet&select=*`)
    const containers = await response.json()
    
    if (!containers || containers.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Container not found or already collected',
        container_id 
      })
    }
    
    const container = containers[0]
    
    // Update container status to collected (deducted from original outlet)
    await supabaseRequest(c, `container_inventory?id=eq.${container.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'collected',
        collected_at: new Date().toISOString(),
        collected_by: user.id,
        collected_by_name: user.full_name
      })
    })
    
    console.log(`✓ Container ${container_id} collected from ${container.outlet_code} (cross-outlet)`)
    
    return c.json({ 
      success: true,
      container_id,
      original_outlet: container.outlet_code,
      original_outlet_name: container.outlet_name,
      scanning_outlet
    })
  } catch (error) {
    console.error('Cross-outlet collection error:', error)
    return c.json({ error: 'Collection failed' }, 500)
  }
})

// Complete container collection
app.post('/api/containers/complete-collection', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code, container_ids, signature_name } = await c.req.json()
    
    console.log(`📦 Completing collection for outlet ${outlet_code}: ${container_ids.length} containers by ${signature_name}`)
    
    if (!container_ids || container_ids.length === 0) {
      return c.json({ error: 'No container IDs provided' }, 400)
    }
    
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    // Process each container
    for (const container_id of container_ids) {
      try {
        // Find the container at this outlet
        const response = await supabaseRequest(c, `container_inventory?container_id=eq.${container_id}&outlet_code=eq.${outlet_code}&status=eq.at_outlet&select=*`)
        const containers = await response.json()
        
        if (!containers || containers.length === 0) {
          errorCount++
          errors.push(`${container_id}: not found or already collected`)
          continue
        }
        
        const container = containers[0]
        
        // Update container status to collected
        await supabaseRequest(c, `container_inventory?id=eq.${container.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'collected',
            collected_at: new Date().toISOString(),
            collected_by: user.id,
            collected_by_name: user.full_name,
            collection_signature: signature_name
          })
        })
        
        successCount++
        console.log(`✓ Container ${container_id} collected from ${outlet_code}`)
      } catch (error) {
        errorCount++
        errors.push(`${container_id}: ${error instanceof Error ? error.message : 'unknown error'}`)
        console.error(`Error collecting container ${container_id}:`, error)
      }
    }
    
    console.log(`Collection complete: ${successCount} success, ${errorCount} errors`)
    
    return c.json({ 
      success: true, 
      total: container_ids.length,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      signature_name
    })
  } catch (error) {
    console.error('Complete collection error:', error)
    return c.json({ error: 'Failed to complete collection' }, 500)
  }
})

// Find outlet for container collection (driver use)
app.post('/api/containers/find-outlet', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const { outlet_code } = await c.req.json()
    
    console.log(`🔍 Finding outlet for container collection: ${outlet_code}`)
    
    // Find containers at this outlet with status NOT 'collected' (ready for collection)
    // Accept both 'at_outlet' and 'delivered' status
    // Support both full outlet_code and outlet_code_short
    const containersResponse = await supabaseRequest(c, 
      `container_inventory?outlet_code=eq.${outlet_code}&status=neq.collected&select=*`)
    const containersByFullCode = await containersResponse.json()
    
    let containers = containersByFullCode
    let outletInfo = null
    
    // If no containers found with full code, try searching by short code in parcels
    if (!containers || containers.length === 0) {
      console.log(`🔍 No containers found by full code, trying short code lookup...`)
      
      // Find outlet info from parcels table using short code
      const parcelsResponse = await supabaseRequest(c,
        `parcels?outlet_code_short=eq.${outlet_code}&select=outlet_code,outlet_code_short,outlet_name&limit=1`)
      const parcels = await parcelsResponse.json()
      
      if (parcels && parcels.length > 0) {
        outletInfo = parcels[0]
        console.log(`📝 Found outlet info from parcels:`, outletInfo)
        
        // Now search containers using the full outlet_code
        // Accept any status except 'collected'
        const containersResponse2 = await supabaseRequest(c,
          `container_inventory?outlet_code=eq.${outletInfo.outlet_code}&status=neq.collected&select=*`)
        containers = await containersResponse2.json()
        console.log(`📦 Found ${containers?.length || 0} containers at outlet ${outletInfo.outlet_code}`)
      }
    } else {
      // Get outlet info from first container
      outletInfo = containers[0]
    }
    
    if (!containers || containers.length === 0) {
      return c.json({
        success: false,
        error: `Outlet ${outlet_code} not found or has no containers available for pickup`
      })
    }
    
    console.log(`✅ Found ${containers.length} containers ready for collection`)
    
    return c.json({
      success: true,
      outlet_code: outletInfo.outlet_code,
      outlet_code_short: outletInfo.outlet_code_short || outlet_code,
      outlet_name: outletInfo.outlet_name,
      containers: containers.map((c: any) => ({
        container_id: c.container_id,
        delivered_at: c.delivered_at,
        status: c.status
      }))
    })
  } catch (error) {
    console.error('Find outlet for collection error:', error)
    return c.json({ error: 'Failed to find outlet' }, 500)
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
    
    console.log('\n=== DELIVERY REPORT DEBUG ===')
    console.log('Query:', query)
    
    const response = await supabaseRequest(c, query)
    const deliveries = await response.json()
    
    console.log(`Found ${deliveries.length} delivery records`)
    if (deliveries.length > 0) {
      const sample = deliveries[0]
      console.log('Sample delivery record fields:')
      console.log('  - loaded_at:', sample.loaded_at)
      console.log('  - loaded_by_name:', sample.loaded_by_name)
      console.log('  - scanned_loading_by_name:', sample.scanned_loading_by_name)
      console.log('  - scanned_unloading_by_name:', sample.scanned_unloading_by_name)
      console.log('  - status:', sample.status)
    }
    console.log('============================\n')
    
    return c.json({ deliveries })
  } catch (error) {
    console.error('❌ Delivery report error:', error)
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
