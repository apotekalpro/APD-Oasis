# 📱 APK Debug Guide - Chrome DevTools USB Debugging

## Quick Setup Guide for Debugging "Delivery date is required" Error

---

## 🔧 Step 1: Enable USB Debugging on Android Device

1. **Enable Developer Options:**
   - Go to: **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - You'll see: "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to: **Settings** → **Developer Options**
   - Toggle ON: **USB Debugging**
   - Toggle ON: **USB Debugging (Security Settings)** (if available)

---

## 🖥️ Step 2: Connect to Chrome DevTools

1. **Connect Device to Computer:**
   - Use USB cable to connect Android device to your computer

2. **Open Chrome Browser on Computer:**
   - Type in address bar: `chrome://inspect/#devices`
   - Press Enter

3. **Allow USB Debugging:**
   - On your Android device, you'll see a popup
   - Check: "Always allow from this computer"
   - Tap: **OK**

4. **Find Your App:**
   - In Chrome DevTools, you'll see your device listed
   - Under your device, find: **APD OASIS** app
   - Click: **Inspect**

---

## 🐛 Step 3: View Console Logs

A new window will open with DevTools:

1. **Click Console Tab** (at the top)

2. **Clear Previous Logs:**
   - Click the 🚫 icon to clear console

3. **Try Scanning:**
   - On your device, go to Warehouse page
   - Select delivery date: **2024-11-18** (or any date)
   - Scan a pallet (or type manually)

4. **Check Console Output:**

### ✅ Expected Output (if working):
```
=== WAREHOUSE SCAN DEBUG ===
Input element exists: true
Input element value: 2024-11-18
State delivery date: 2024-11-18
Final delivery date: 2024-11-18
Pallet ID: PALLET001
===========================
✓ Scanning with delivery date: 2024-11-18
📤 Sending API request: {pallet_id: "PALLET001", delivery_date: "2024-11-18"}
📥 API response: {success: true, ...}
✅ Scan successful!
```

### ❌ Problem Output (if date is missing):
```
=== WAREHOUSE SCAN DEBUG ===
Input element exists: true
Input element value: undefined    ← Problem here!
State delivery date: undefined     ← Or here!
Final delivery date: undefined     ← Missing date!
Pallet ID: PALLET001
===========================
❌ No delivery date found!
```

---

## 🔍 Step 4: Diagnose the Issue

Based on the console output, we can identify where the date is lost:

### Case 1: Input element doesn't exist
```
Input element exists: false
```
**Problem**: Date input element not found in DOM  
**Cause**: APK WebView may have rendering delay

### Case 2: Input has no value
```
Input element exists: true
Input element value: undefined
```
**Problem**: Date input element exists but has no value  
**Cause**: 
- User didn't select date
- Date input not working in WebView
- Need alternative date picker

### Case 3: State is not updated
```
Input element value: 2024-11-18
State delivery date: undefined
```
**Problem**: Date input has value but state not updated  
**Cause**: `setWarehouseDeliveryDate()` function not working

---

## 📋 Step 5: Share Console Output

1. **Take Screenshot:**
   - Press **Ctrl+Shift+P** (Windows) or **Cmd+Shift+P** (Mac)
   - Type: "screenshot"
   - Choose: "Capture full size screenshot"

2. **Or Copy Text:**
   - Right-click in console
   - Select: **Save as...**
   - Save log file

3. **Share with Developer:**
   - Send screenshot or log file
   - Include: What date you selected, what pallet you scanned

---

## 🛠️ Troubleshooting Chrome DevTools Connection

### Device Not Showing in chrome://inspect
1. Check USB cable (try different cable)
2. Try different USB port
3. On device: Disable and re-enable USB debugging
4. On device: Change USB mode to "File Transfer" or "PTP"
5. Restart ADB: 
   ```bash
   adb kill-server
   adb start-server
   ```

### "Inspect" Button Not Clickable
1. Close the app completely
2. Re-open the app
3. Refresh `chrome://inspect/#devices` page
4. Try again

### No Console Output
1. Make sure you're in the **Console** tab (not Elements)
2. Clear console and try scanning again
3. Check if app is actually loading (try clicking around)

---

## 💡 Additional Debug Information

### Network Tab (Check API Calls)
1. In DevTools, click **Network** tab
2. Clear with 🚫 icon
3. Try scanning
4. Look for `/api/warehouse/scan-pallet` request
5. Click on it to see:
   - **Headers** → Request Payload → Should have `delivery_date`
   - **Response** → Should show success or error

### Check if Date Input Works
1. In DevTools **Console** tab, type:
   ```javascript
   document.getElementById('warehouseDeliveryDate').value
   ```
2. Press Enter
3. Should show the selected date like `"2024-11-18"`
4. If shows `""` or `null`, the input is not working

### Manually Set Date (Testing)
1. In Console, type:
   ```javascript
   document.getElementById('warehouseDeliveryDate').value = '2024-11-18'
   state.warehouseDeliveryDate = '2024-11-18'
   ```
2. Press Enter
3. Try scanning again
4. If it works, the problem is the date input element

---

## 📞 What to Report

After debugging, please share:

1. **Console screenshot** showing the debug output
2. **What happened:**
   - Did you select a date? Which date?
   - What pallet did you scan?
   - What error message appeared?

3. **Console values:**
   - `Input element exists`: true/false
   - `Input element value`: value or undefined
   - `State delivery date`: value or undefined
   - `Final delivery date`: value or undefined

4. **Network tab:**
   - Screenshot of the `/api/warehouse/scan-pallet` request
   - Check if `delivery_date` is in the payload

This information will help identify and fix the exact cause of the "Delivery date is required" error.

---

## 🎯 Quick Test Commands

Copy and paste these in Console to test:

```javascript
// Check if date input exists
document.getElementById('warehouseDeliveryDate')

// Check date input value
document.getElementById('warehouseDeliveryDate').value

// Check state
state.warehouseDeliveryDate

// Manually set date for testing
document.getElementById('warehouseDeliveryDate').value = '2024-11-18'
state.warehouseDeliveryDate = '2024-11-18'

// Check if scan function exists
typeof handleWarehouseScan
```

---

**Good luck with debugging! The console logs will help us find the exact issue.** 🚀
