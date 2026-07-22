// Mock Data Service for Inter-Branch Transfers (UAT Only)
// This service uses localStorage to simulate database operations
// Will be replaced with Supabase in production

export interface InterBranchTransfer {
  id: string;
  transfer_number: string;
  sender_outlet: string;
  receiver_outlet: string;
  created_by: string;
  created_at: string;
  status: 'created' | 'loaded' | 'in_transit' | 'crossdock' | 'unloaded' | 'completed';
  items: TransferItem[];
  loaded_at?: string;
  loaded_by?: string;
  unloaded_at?: string;
  unloaded_by?: string;
  unload_location?: string;
  is_crossdock?: boolean;
  notes?: string;
}

export interface TransferItem {
  id: string;
  container_number: string;
  status: 'pending' | 'loaded' | 'in_transit' | 'unloaded';
  loaded_at?: string;
  unloaded_at?: string;
}

export interface Outlet {
  outlet_code: string;
  outlet_name: string;
  outlet_type: 'outlet' | 'warehouse';
}

class MockTransferService {
  private STORAGE_KEY = 'inter_branch_transfers';
  private OUTLETS_KEY = 'outlets_data';
  private SERIAL_KEY = 'transfer_serial';

  constructor() {
    this.initializeMockData();
  }

  // Initialize mock outlets data
  private initializeMockData() {
    if (!localStorage.getItem(this.OUTLETS_KEY)) {
      const mockOutlets: Outlet[] = [
        { outlet_code: 'APDWHS1', outlet_name: 'APD Warehouse', outlet_type: 'warehouse' },
        { outlet_code: 'JKJSTT1', outlet_name: 'Jakarta Setia Budi', outlet_type: 'outlet' },
        { outlet_code: 'JKJSVR1', outlet_name: 'Jakarta Veteran', outlet_type: 'outlet' },
        { outlet_code: 'BDGCHL1', outlet_name: 'Bandung Cihampelas', outlet_type: 'outlet' },
        { outlet_code: 'SBYDKR1', outlet_name: 'Surabaya Dinoyo', outlet_type: 'outlet' },
        { outlet_code: 'SMGGDG1', outlet_name: 'Semarang Gading', outlet_type: 'outlet' },
      ];
      localStorage.setItem(this.OUTLETS_KEY, JSON.stringify(mockOutlets));
    }

    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
    }

    if (!localStorage.getItem(this.SERIAL_KEY)) {
      localStorage.setItem(this.SERIAL_KEY, JSON.stringify({}));
    }
  }

  // Generate transfer number: TN[Sender][Receiver][DDMM][Serial]
  generateTransferNumber(senderCode: string, receiverCode: string): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateKey = `${day}${month}`;
    const fullKey = `${senderCode}${receiverCode}${dateKey}`;

    // Get current serial for this combination
    const serialData = JSON.parse(localStorage.getItem(this.SERIAL_KEY) || '{}');
    const currentSerial = (serialData[fullKey] || 0) + 1;
    
    // Update serial
    serialData[fullKey] = currentSerial;
    localStorage.setItem(this.SERIAL_KEY, JSON.stringify(serialData));

    // Format: TN + sender(7) + receiver(7) + DDMM(4) + serial(2)
    const serialStr = String(currentSerial).padStart(2, '0');
    return `TN${senderCode}${receiverCode}${dateKey}${serialStr}`;
  }

  // Get all outlets
  getOutlets(): Outlet[] {
    return JSON.parse(localStorage.getItem(this.OUTLETS_KEY) || '[]');
  }

  // Get all transfers
  getTransfers(): InterBranchTransfer[] {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  }

  // Get transfer by ID
  getTransferById(id: string): InterBranchTransfer | null {
    const transfers = this.getTransfers();
    return transfers.find(t => t.id === id) || null;
  }

  // Get transfer by number
  getTransferByNumber(transferNumber: string): InterBranchTransfer | null {
    const transfers = this.getTransfers();
    return transfers.find(t => t.transfer_number === transferNumber) || null;
  }

  // Create new transfer
  createTransfer(data: {
    sender_outlet: string;
    receiver_outlet: string;
    created_by: string;
    items: { container_number: string }[];
    notes?: string;
  }): InterBranchTransfer {
    const transfers = this.getTransfers();
    
    const transfer: InterBranchTransfer = {
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
      notes: data.notes
    };

    transfers.push(transfer);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
    
    return transfer;
  }

  // Update transfer status
  updateTransferStatus(
    transferId: string, 
    status: InterBranchTransfer['status'],
    additionalData?: Partial<InterBranchTransfer>
  ): InterBranchTransfer | null {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === transferId);
    
    if (index === -1) return null;

    transfers[index] = {
      ...transfers[index],
      status,
      ...additionalData
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
    return transfers[index];
  }

  // Load transfer (mark items as loaded)
  loadTransfer(transferId: string, loadedBy: string, containerNumbers: string[]): InterBranchTransfer | null {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === transferId);
    
    if (index === -1) return null;

    const transfer = transfers[index];
    const now = new Date().toISOString();

    // Update items status
    transfer.items.forEach(item => {
      if (containerNumbers.includes(item.container_number)) {
        item.status = 'loaded';
        item.loaded_at = now;
      }
    });

    // Check if all items are loaded
    const allLoaded = transfer.items.every(item => item.status === 'loaded');
    
    transfers[index] = {
      ...transfer,
      status: allLoaded ? 'loaded' : 'created',
      loaded_at: allLoaded ? now : transfer.loaded_at,
      loaded_by: allLoaded ? loadedBy : transfer.loaded_by
    };

    if (allLoaded) {
      transfers[index].status = 'in_transit';
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
    return transfers[index];
  }

  // Unload transfer with crossdock detection
  unloadTransfer(
    transferId: string, 
    unloadedBy: string, 
    unloadLocation: string,
    containerNumbers: string[]
  ): InterBranchTransfer | null {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === transferId);
    
    if (index === -1) return null;

    const transfer = transfers[index];
    const now = new Date().toISOString();

    // Update items status
    transfer.items.forEach(item => {
      if (containerNumbers.includes(item.container_number)) {
        item.status = 'unloaded';
        item.unloaded_at = now;
      }
    });

    // Check if all items are unloaded
    const allUnloaded = transfer.items.every(item => item.status === 'unloaded');

    // Crossdock detection: unloaded at warehouse but receiver is not warehouse
    const isCrossdock = unloadLocation === 'APDWHS1' && transfer.receiver_outlet !== 'APDWHS1';
    
    transfers[index] = {
      ...transfer,
      unloaded_at: allUnloaded ? now : transfer.unloaded_at,
      unloaded_by: allUnloaded ? unloadedBy : transfer.unloaded_by,
      unload_location: unloadLocation,
      is_crossdock: isCrossdock,
      status: allUnloaded ? (isCrossdock ? 'crossdock' : 'unloaded') : transfer.status
    };

    // If final destination reached, mark as completed
    if (allUnloaded && !isCrossdock && unloadLocation === transfer.receiver_outlet) {
      transfers[index].status = 'completed';
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
    return transfers[index];
  }

  // Get transfers by status
  getTransfersByStatus(status: InterBranchTransfer['status']): InterBranchTransfer[] {
    const transfers = this.getTransfers();
    return transfers.filter(t => t.status === status);
  }

  // Get transfers by outlet (sender or receiver)
  getTransfersByOutlet(outletCode: string): InterBranchTransfer[] {
    const transfers = this.getTransfers();
    return transfers.filter(t => 
      t.sender_outlet === outletCode || t.receiver_outlet === outletCode
    );
  }

  // Get crossdock queue for warehouse
  getCrossdockQueue(): InterBranchTransfer[] {
    return this.getTransfersByStatus('crossdock');
  }

  // Search transfers by number or container
  searchTransfers(query: string): InterBranchTransfer[] {
    const transfers = this.getTransfers();
    const searchLower = query.toLowerCase();
    
    return transfers.filter(t => 
      t.transfer_number.toLowerCase().includes(searchLower) ||
      t.items.some(item => item.container_number.toLowerCase().includes(searchLower))
    );
  }

  // Clear all data (for testing)
  clearAllData() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SERIAL_KEY);
    this.initializeMockData();
  }

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
}

// Export singleton instance
export const mockTransferService = new MockTransferService();
