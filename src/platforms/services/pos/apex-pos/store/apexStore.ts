import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import type { Order, Product, Seller } from '../../../../../services/api';
import type {
  CartItem,
  PosEmployee,
  PosTable,
  PosShift,
  PosSettings,
  PosInventoryItem,
  PosOrderData,
  TableStatus,
} from '../apexTypes';
import { getPosSettings, generateId } from '../apexTypes';

export interface ApexState {
  seller: Seller | null;
  cart: CartItem[];
  tables: PosTable[];
  employees: PosEmployee[];
  currentEmployee: PosEmployee | null;
  activeShift: PosShift | null;
  settings: PosSettings;
  orders: Order[];
  inventory: PosInventoryItem[];
  selectedTable: string | null;
  searchResults: Product[];
  isSearching: boolean;

  setSeller: (seller: Seller | null) => void;
  setSettings: (settings: PosSettings) => void;
  setEmployees: (employees: PosEmployee[]) => void;
  setTables: (tables: PosTable[]) => void;
  setOrders: (orders: Order[]) => void;
  setInventory: (items: PosInventoryItem[]) => void;

  addToCart: (item: Product, modifiers?: CartItem['modifiers']) => void;
  updateCartItemQuantity: (itemId: string, delta: number) => void;
  updateCartItemNotes: (itemId: string, notes: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;

  selectEmployee: (employee: PosEmployee) => void;
  selectTable: (tableId: string | null) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  assignTableToEmployee: (tableId: string, employeeId: string) => void;

  openShift: (employeeId: string, openingFloat: number) => void;
  closeShift: (closingAmount: number) => void;
  recordCashSale: (amount: number) => void;
  recordCardSale: (amount: number) => void;

  addOrderToQueue: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  searchProducts: (query: string, sellerId: string) => void;

  connectWebSocket: (sellerId: string) => void;
  disconnectWebSocket: () => void;
}

const createInitialSettings = (seller?: Seller | null): PosSettings =>
  getPosSettings(seller);

const getSocketBaseUrl = (): string => {
  const configuredSocketUrl = import.meta.env.VITE_WS_URL;
  if (configuredSocketUrl) {
    try {
      const url = new URL(configuredSocketUrl);
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname && url.hostname !== 'https' && url.hostname !== 'http') {
        const wsProto = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
        return `${wsProto}//${url.hostname}`;
      }
    } catch {
      // Fall back to the API origin when the optional socket URL is malformed.
    }
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      if (url.hostname && url.hostname !== 'https' && url.hostname !== 'http') {
        const wsProto = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
        return `${wsProto}//${url.hostname}`;
      }
    } catch {
      // Use the local API origin when the configured API URL is malformed.
    }
  }

  return 'ws://localhost:2823';
};

const connectWebSocketImpl = (sellerId: string) => {
  const wsBaseUrl = getSocketBaseUrl();
  if (socket) {
    socket.disconnect();
  }
  socket = io(wsBaseUrl, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket?.emit('subscribe:seller', sellerId);
  });

  socket.on('order:created', (order: Order) => {
    useApexStore.getState().addOrderToQueue(order);
  });

  socket.on('order:updated', (order: Order) => {
    useApexStore.getState().updateOrderStatus(order.id, order.status);
  });

  socket.on('table:status', (table: PosTable) => {
    useApexStore.getState().updateTableStatus(table.id, table.status);
  });

  socket.on('table:updated', (table: PosTable) => {
    useApexStore.getState().updateTableStatus(table.id, table.status);
  });

  socket.on('shift:opened', (shift: PosShift) => {
    useApexStore.setState({ activeShift: shift });
  });

  socket.on('shift:closed', () => {
    useApexStore.setState({ activeShift: null });
  });

  socket.on('event:new', (event: any) => {
    console.log('[POS Event]', event);
  });
};

const disconnectWebSocketImpl = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const useApexStore = create<ApexState>()(
  persist(
    (set, get) => ({
      seller: null,
      cart: [],
      tables: [],
      employees: [],
      currentEmployee: null,
      activeShift: null,
      settings: createInitialSettings(null),
      orders: [],
      inventory: [],
      selectedTable: null,
      searchResults: [],
      isSearching: false,

      setSeller: (seller) =>
        set((state) => ({
          seller,
          settings: createInitialSettings(seller) || state.settings,
        })),

      setSettings: (settings) => set({ settings }),
      setEmployees: (employees) => set({ employees }),
      setTables: (tables) => set({ tables }),
      setOrders: (orders) => set({ orders }),
      setInventory: (inventory) => set({ inventory }),

      addToCart: (item, modifiers) =>
        set((state) => {
          const existing = state.cart.find((i) => i.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1, modifiers } : i
              ),
            };
          }
          return {
            cart: [...state.cart, { ...item, quantity: 1, modifiers }],
          };
        }),

      updateCartItemQuantity: (itemId, delta) =>
        set((state) => ({
          cart: state.cart
            .map((i) =>
              i.id === itemId ? { ...i, quantity: i.quantity + delta } : i
            )
            .filter((i) => i.quantity > 0),
        })),

      updateCartItemNotes: (itemId, notes) =>
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === itemId ? { ...i, notes } : i
          ),
        })),

      removeFromCart: (itemId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== itemId),
        })),

      clearCart: () =>
        set({
          cart: [],
          selectedTable: null,
          searchResults: [],
        }),

      setCart: (items) => set({ cart: items }),

      selectEmployee: (employee) =>
        set({ currentEmployee: employee }),

      selectTable: (tableId) => set({ selectedTable: tableId }),

      updateTableStatus: (tableId, status) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, status } : t
          ),
        })),

      assignTableToEmployee: (tableId, employeeId) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, assignedEmployeeId: employeeId, status: 'occupied' as TableStatus }
              : t
          ),
        })),

      openShift: (employeeId, openingFloat) => {
        const shift: PosShift = {
          id: generateId(),
          employeeId,
          sellerId: get().seller?.id || '',
          startedAt: new Date().toISOString(),
          openingFloat,
          cashSales: 0,
          cardSales: 0,
          status: 'open',
        };
        set({ activeShift: shift });
      },

      closeShift: (closingAmount) =>
        set((state) => {
          if (!state.activeShift) return {};
          const cashCounted = state.activeShift.cashSales + state.activeShift.openingFloat;
          const variance = closingAmount - cashCounted;
          return {
            activeShift: {
              ...state.activeShift,
              endedAt: new Date().toISOString(),
              closingAmount,
              cashCounted,
              variance,
              status: 'closed',
            },
          };
        }),

      recordCashSale: (amount) =>
        set((state) => ({
          activeShift: state.activeShift
            ? { ...state.activeShift, cashSales: state.activeShift.cashSales + amount }
            : null,
        })),

      recordCardSale: (amount) =>
        set((state) => ({
          activeShift: state.activeShift
            ? { ...state.activeShift, cardSales: state.activeShift.cardSales + amount }
            : null,
        })),

      addOrderToQueue: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        })),

      searchProducts: (query, sellerId) => {
        set({ isSearching: true });
        if (!query.trim()) {
          set({ searchResults: [], isSearching: false });
          return;
        }

        const allItems: Product[] = sellerId ? get().searchResults : [];
        const filtered = allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (item.description || '').toLowerCase().includes(query.toLowerCase())
        );
        set({ searchResults: filtered, isSearching: false });
      },

      connectWebSocket: connectWebSocketImpl,
      disconnectWebSocket: disconnectWebSocketImpl,
    }),
    {
      name: 'apex-pos-storage',
      partialize: (state) => ({
        cart: state.cart,
        currentEmployee: state.currentEmployee,
        activeShift: state.activeShift,
        selectedTable: state.selectedTable,
        settings: state.settings,
      }),
    }
  )
);

let socket: Socket | null = null;
