import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PaperAccount, PaperOrder, TradingJournalEntry, RiskLimits } from '../types/trading';
import { DEFAULT_RISK_LIMITS } from './riskEngine';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test Firestore connection on boot per Firebase skill instruction
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or Firestore database is provisioning.');
    }
  }
}
testConnection();

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function loginAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

// ----------------------------------------------------
// LocalStorage Fallback Helper (Guarantees immediate zero-lag UX & offline resilience)
// ----------------------------------------------------
function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`marketmind:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`marketmind:${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

// ----------------------------------------------------
// Paper Trading Persistence
// ----------------------------------------------------
const INITIAL_ACCOUNT_BALANCE = 10000;

export async function getPaperAccount(userId: string): Promise<PaperAccount> {
  const localKey = `account:${userId || 'guest'}`;
  const defaultAccount: PaperAccount = {
    userId: userId || 'guest',
    balance: INITIAL_ACCOUNT_BALANCE,
    initialBalance: INITIAL_ACCOUNT_BALANCE,
    currency: 'USD',
    equity: INITIAL_ACCOUNT_BALANCE,
    margin: 0,
    freeMargin: INITIAL_ACCOUNT_BALANCE,
    marginLevel: 0,
    leverage: 100,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalReturnPercent: 0,
    winRate: 0,
    totalTrades: 0,
    updatedAt: new Date().toISOString(),
  };

  const localAcc = getLocal<PaperAccount>(localKey, defaultAccount);

  if (!userId) return localAcc;

  try {
    const docRef = doc(db, 'paperAccounts', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PaperAccount;
      setLocal(localKey, data);
      return data;
    } else {
      await setDoc(docRef, localAcc);
    }
  } catch (err) {
    console.warn('Firestore getPaperAccount fallback to local:', err);
  }

  return localAcc;
}

export async function savePaperAccount(account: PaperAccount): Promise<void> {
  const localKey = `account:${account.userId || 'guest'}`;
  setLocal(localKey, account);

  if (account.userId && account.userId !== 'guest') {
    try {
      const docRef = doc(db, 'paperAccounts', account.userId);
      await setDoc(docRef, account, { merge: true });
    } catch (err) {
      console.warn('Firestore savePaperAccount error:', err);
    }
  }
}

// ----------------------------------------------------
// Paper Orders Persistence
// ----------------------------------------------------
export async function getPaperOrders(userId: string): Promise<PaperOrder[]> {
  const localKey = `orders:${userId || 'guest'}`;
  const localOrders = getLocal<PaperOrder[]>(localKey, []);

  if (!userId || userId === 'guest') return localOrders;

  try {
    const q = query(collection(db, 'paperOrders'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const orders = snap.docs.map((d) => d.data() as PaperOrder);
      setLocal(localKey, orders);
      return orders;
    }
  } catch (err) {
    console.warn('Firestore getPaperOrders fallback to local:', err);
  }

  return localOrders;
}

export async function savePaperOrder(order: PaperOrder): Promise<void> {
  const localKey = `orders:${order.userId || 'guest'}`;
  const current = getLocal<PaperOrder[]>(localKey, []);
  const index = current.findIndex((o) => o.id === order.id);
  if (index >= 0) {
    current[index] = order;
  } else {
    current.unshift(order);
  }
  setLocal(localKey, current);

  if (order.userId && order.userId !== 'guest') {
    try {
      const docRef = doc(db, 'paperOrders', order.id);
      await setDoc(docRef, order, { merge: true });
    } catch (err) {
      console.warn('Firestore savePaperOrder error:', err);
    }
  }
}

// ----------------------------------------------------
// Watchlists Persistence
// ----------------------------------------------------
export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  market: string;
  notes?: string;
  addedAt: string;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { id: 'w1', userId: 'default', symbol: 'BTC', name: 'Bitcoin', market: 'crypto', addedAt: new Date().toISOString() },
  { id: 'w2', userId: 'default', symbol: 'ETH', name: 'Ethereum', market: 'crypto', addedAt: new Date().toISOString() },
  { id: 'w3', userId: 'default', symbol: 'AAPL', name: 'Apple Inc.', market: 'stocks', addedAt: new Date().toISOString() },
  { id: 'w4', userId: 'default', symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'stocks', addedAt: new Date().toISOString() },
  { id: 'w5', userId: 'default', symbol: 'EUR/USD', name: 'Euro / US Dollar', market: 'forex', addedAt: new Date().toISOString() },
];

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const localKey = `watchlist:${userId || 'guest'}`;
  const localList = getLocal<WatchlistItem[]>(localKey, DEFAULT_WATCHLIST);

  if (!userId || userId === 'guest') return localList;

  try {
    const q = query(collection(db, 'watchlists'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as WatchlistItem);
      setLocal(localKey, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore getWatchlist fallback:', err);
  }

  return localList;
}

export async function addToWatchlist(item: WatchlistItem): Promise<void> {
  const localKey = `watchlist:${item.userId || 'guest'}`;
  const current = getLocal<WatchlistItem[]>(localKey, DEFAULT_WATCHLIST);
  if (!current.some((w) => w.symbol === item.symbol && w.market === item.market)) {
    current.unshift(item);
    setLocal(localKey, current);
  }

  if (item.userId && item.userId !== 'guest') {
    try {
      await setDoc(doc(db, 'watchlists', item.id), item);
    } catch (err) {
      console.warn('Firestore addToWatchlist error:', err);
    }
  }
}

export async function removeFromWatchlist(userId: string, itemId: string): Promise<void> {
  const localKey = `watchlist:${userId || 'guest'}`;
  const current = getLocal<WatchlistItem[]>(localKey, DEFAULT_WATCHLIST);
  const updated = current.filter((w) => w.id !== itemId);
  setLocal(localKey, updated);

  if (userId && userId !== 'guest') {
    try {
      await deleteDoc(doc(db, 'watchlists', itemId));
    } catch (err) {
      console.warn('Firestore removeFromWatchlist error:', err);
    }
  }
}

// ----------------------------------------------------
// Trading Journal Persistence
// ----------------------------------------------------
export async function getTradingJournals(userId: string): Promise<TradingJournalEntry[]> {
  const localKey = `journals:${userId || 'guest'}`;
  const localJournals = getLocal<TradingJournalEntry[]>(localKey, []);

  if (!userId || userId === 'guest') return localJournals;

  try {
    const q = query(collection(db, 'tradingJournals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as TradingJournalEntry);
      setLocal(localKey, list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore getTradingJournals fallback:', err);
  }

  return localJournals;
}

export async function saveTradingJournal(entry: TradingJournalEntry): Promise<void> {
  const localKey = `journals:${entry.userId || 'guest'}`;
  const current = getLocal<TradingJournalEntry[]>(localKey, []);
  const index = current.findIndex((j) => j.id === entry.id);
  if (index >= 0) {
    current[index] = entry;
  } else {
    current.unshift(entry);
  }
  setLocal(localKey, current);

  if (entry.userId && entry.userId !== 'guest') {
    try {
      await setDoc(doc(db, 'tradingJournals', entry.id), entry, { merge: true });
    } catch (err) {
      console.warn('Firestore saveTradingJournal error:', err);
    }
  }
}

// ----------------------------------------------------
// User Settings & Risk Limits Persistence
// ----------------------------------------------------
export async function getUserRiskLimits(userId: string): Promise<RiskLimits> {
  const localKey = `riskLimits:${userId || 'guest'}`;
  const localLimits = getLocal<RiskLimits>(localKey, DEFAULT_RISK_LIMITS);

  if (!userId || userId === 'guest') return localLimits;

  try {
    const docRef = doc(db, 'userSettings', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.riskLimits) {
        setLocal(localKey, data.riskLimits);
        return data.riskLimits;
      }
    }
  } catch (err) {
    console.warn('Firestore getUserRiskLimits fallback:', err);
  }

  return localLimits;
}

export async function saveUserRiskLimits(userId: string, limits: RiskLimits): Promise<void> {
  const localKey = `riskLimits:${userId || 'guest'}`;
  setLocal(localKey, limits);

  if (userId && userId !== 'guest') {
    try {
      await setDoc(doc(db, 'userSettings', userId), { riskLimits: limits, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Firestore saveUserRiskLimits error:', err);
    }
  }
}
