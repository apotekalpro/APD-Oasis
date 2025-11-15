#!/usr/bin/env python3
"""
Import Outlets and Create Outlet Users from Excel
This script reads the Outlet List 2026.xlsx and creates:
1. Outlet records in the database
2. User accounts for each outlet with username = Short Store Name, password = Alpro@123
"""

import openpyxl
import requests
import json

# Configuration
SUPABASE_URL = "https://ptfnmivvowgiqzwyznmu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Zm5taXZ2b3dnaXF6d3l6bm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzEzNTk2NiwiZXhwIjoyMDc4NzExOTY2fQ.6aSe9mpRbLc7T4fGL7MOobti6hYmD4c1LUKab-cotLY"

DEFAULT_PASSWORD = "Alpro@123"

headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def load_outlets_from_excel(filename):
    """Load outlets from Excel file"""
    print(f"Loading outlets from {filename}...")
    wb = openpyxl.load_workbook(filename)
    sheet = wb.active
    
    outlets = []
    for i, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):  # Skip header
        if row[0] and row[1] and row[2]:  # Ensure all required columns have data
            outlet = {
                'store_code': str(row[0]).strip(),
                'short_name': str(row[1]).strip(),
                'store_name': str(row[2]).strip()
            }
            outlets.append(outlet)
    
    print(f"Loaded {len(outlets)} outlets from Excel")
    return outlets

def create_outlet(outlet):
    """Create outlet in database"""
    data = {
        'outlet_code': outlet['store_code'],  # Numeric code (e.g., "0001")
        'outlet_code_short': outlet['short_name'],  # Short code (e.g., "JKJSTT1")
        'outlet_name': outlet['store_name'],
        'address': '',
        'is_active': True
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/outlets",
            headers=headers,
            json=data
        )
        
        if response.status_code in [200, 201]:
            return True, "Created"
        elif response.status_code == 409:
            return True, "Already exists"
        else:
            return False, f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"Exception: {str(e)}"

def create_user(outlet):
    """Create user account for outlet"""
    data = {
        'username': outlet['short_name'],
        'password_hash': DEFAULT_PASSWORD,  # In production, this should be hashed
        'full_name': outlet['store_name'],
        'role': 'outlet',
        'outlet_code': outlet['store_code'],
        'is_active': True
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/users",
            headers=headers,
            json=data
        )
        
        if response.status_code in [200, 201]:
            return True, "Created"
        elif response.status_code == 409:
            return True, "Already exists"
        else:
            return False, f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return False, f"Exception: {str(e)}"

def main():
    print("=" * 80)
    print("APD OASIS - Outlet Import Tool")
    print("=" * 80)
    print()
    
    # Load outlets from Excel
    outlets = load_outlets_from_excel('Outlet List 2026.xlsx')
    
    if not outlets:
        print("ERROR: No outlets found in Excel file!")
        return
    
    print(f"\nProcessing {len(outlets)} outlets...")
    print("=" * 80)
    
    # Statistics
    stats = {
        'outlets_created': 0,
        'outlets_exists': 0,
        'outlets_failed': 0,
        'users_created': 0,
        'users_exists': 0,
        'users_failed': 0
    }
    
    # Process each outlet
    for i, outlet in enumerate(outlets, 1):
        print(f"\n[{i}/{len(outlets)}] Processing: {outlet['store_code']} - {outlet['short_name']}")
        
        # Create outlet
        success, message = create_outlet(outlet)
        if success:
            if "Created" in message:
                stats['outlets_created'] += 1
                print(f"  ✓ Outlet created")
            else:
                stats['outlets_exists'] += 1
                print(f"  ✓ Outlet already exists")
        else:
            stats['outlets_failed'] += 1
            print(f"  ✗ Outlet failed: {message}")
        
        # Create user
        success, message = create_user(outlet)
        if success:
            if "Created" in message:
                stats['users_created'] += 1
                print(f"  ✓ User created (username: {outlet['short_name']}, password: {DEFAULT_PASSWORD})")
            else:
                stats['users_exists'] += 1
                print(f"  ✓ User already exists")
        else:
            stats['users_failed'] += 1
            print(f"  ✗ User failed: {message}")
        
        # Progress indicator every 100 outlets
        if i % 100 == 0:
            print(f"\n--- Progress: {i}/{len(outlets)} outlets processed ---")
    
    # Print summary
    print("\n" + "=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    print(f"Total outlets processed: {len(outlets)}")
    print(f"\nOutlets:")
    print(f"  Created:        {stats['outlets_created']}")
    print(f"  Already exists: {stats['outlets_exists']}")
    print(f"  Failed:         {stats['outlets_failed']}")
    print(f"\nUsers:")
    print(f"  Created:        {stats['users_created']}")
    print(f"  Already exists: {stats['users_exists']}")
    print(f"  Failed:         {stats['users_failed']}")
    print("\n" + "=" * 80)
    print("✓ Import completed!")
    print(f"Default password for all outlets: {DEFAULT_PASSWORD}")
    print("=" * 80)

if __name__ == "__main__":
    main()
