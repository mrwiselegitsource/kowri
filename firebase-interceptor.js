import { auth, db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const originalFetch = window.fetch;

window.fetch = async function(url, options) {
  if (typeof url === 'string' && url.includes('kowriwebbackend-2.onrender.com/api/')) {
    const path = url.split('/api/')[1];
    const method = (options?.method || 'GET').toUpperCase();
    
    try {
      // 1. /api/users/{userId}/financial-summary
      if (path.match(/^users\/([^\/]+)\/financial-summary$/) && method === 'GET') {
        const userId = path.split('/')[1];
        const userDoc = await getDoc(doc(db, 'users', userId));
        const data = userDoc.exists() ? userDoc.data() : {};
        return new Response(JSON.stringify({
          balance: data.balance || 0,
          totalDeposited: data.totalDeposited || 0,
          totalRewardsEarned: data.totalRewardsEarned || 0,
          totalWithdrawn: data.totalWithdrawn || 0
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // 2. /api/deposits/{userId}/my-transactions
      if (path.match(/^deposits\/([^\/]+)\/my-transactions$/) && method === 'GET') {
        const userId = path.split('/')[1];
        const q = query(collection(db, 'deposits'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const deps = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString() }));
        return new Response(JSON.stringify(deps), { status: 200 });
      }

      // 3. /api/users/{userId}/withdrawals
      if (path.match(/^users\/([^\/]+)\/withdrawals$/) && method === 'GET') {
        const userId = path.split('/')[1];
        const q = query(collection(db, 'withdrawals'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const wds = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString() }));
        return new Response(JSON.stringify(wds), { status: 200 });
      }

      // 4. /api/admin/users
      if (path === 'admin/users' && method === 'GET') {
        const snap = await getDocs(collection(db, 'users'));
        const users = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString() }));
        return new Response(JSON.stringify(users), { status: 200 });
      }

      // 5. /api/deposits/all
      if (path === 'deposits/all' && method === 'GET') {
        const snap = await getDocs(collection(db, 'deposits'));
        const deps = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString() }));
        return new Response(JSON.stringify(deps), { status: 200 });
      }

      // 6. /api/admin/withdrawals
      if (path === 'admin/withdrawals' && method === 'GET') {
        const snap = await getDocs(collection(db, 'withdrawals'));
        const wds = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate()?.toISOString() || new Date().toISOString() }));
        return new Response(JSON.stringify(wds), { status: 200 });
      }

      // 7. /api/admin/notifications (MOCK EMPTY TO PREVENT CRASHES)
      if (path === 'admin/notifications' && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (path.match(/^users\/([^\/]+)\/notifications$/) && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (path.match(/^users\/([^\/]+)\/notifications\/unread-count$/) && method === 'GET') {
        return new Response(JSON.stringify({unreadCount:0}), { status: 200 });
      }
      if (path === 'admin/screenshots/all' || path === 'admin/screenshots/last-24h') {
          return new Response(JSON.stringify([]), { status: 200 });
      }

      // 8. /api/admin/deposits/{id}/status (Approve/Reject Deposit)
      if (path.match(/^admin\/deposits\/([^\/]+)\/status$/) && method === 'PATCH') {
        const depositId = path.split('/')[2];
        const body = JSON.parse(options.body);
        const newStatus = body.status; // 'APPROVED' or 'REJECTED'
        
        const depRef = doc(db, 'deposits', depositId);
        const depDoc = await getDoc(depRef);
        
        if (depDoc.exists() && depDoc.data().status !== 'APPROVED') {
          await updateDoc(depRef, { status: newStatus });
          
          if (newStatus === 'APPROVED') {
            const depData = depDoc.data();
            const userRef = doc(db, 'users', depData.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const uData = userDoc.data();
              const newBalance = (parseFloat(uData.balance) || 0) + parseFloat(depData.rewardAmount || depData.amount || 0);
              const newDeposited = (parseFloat(uData.totalDeposited) || 0) + parseFloat(depData.amount || 0);
              const newRewards = (parseFloat(uData.totalRewardsEarned) || 0) + parseFloat((depData.rewardAmount || 0) - (depData.amount || 0));
              
              await updateDoc(userRef, { 
                balance: newBalance,
                totalDeposited: newDeposited,
                totalRewardsEarned: newRewards > 0 ? (uData.totalRewardsEarned||0)+newRewards : (uData.totalRewardsEarned||0)
              });
            }
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // 9. /api/admin/withdrawals/{id}/status?status=APPROVED
      if (path.match(/^admin\/withdrawals\/([^\/]+)\/status/) && method === 'PATCH') {
        const withdrawalId = path.split('/')[2];
        const newStatus = url.split('status=')[1]; // 'APPROVED' or 'REJECTED'
        
        const wdRef = doc(db, 'withdrawals', withdrawalId);
        const wdDoc = await getDoc(wdRef);
        
        if (wdDoc.exists() && wdDoc.data().status !== 'APPROVED') {
          await updateDoc(wdRef, { status: newStatus });
          
          if (newStatus === 'APPROVED') {
            const wdData = wdDoc.data();
            const userRef = doc(db, 'users', wdData.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const uData = userDoc.data();
              const newBalance = (parseFloat(uData.balance) || 0) - parseFloat(wdData.amount || 0);
              const newWithdrawn = (parseFloat(uData.totalWithdrawn) || 0) + parseFloat(wdData.amount || 0);
              
              await updateDoc(userRef, { 
                balance: newBalance < 0 ? 0 : newBalance,
                totalWithdrawn: newWithdrawn
              });
            }
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      // Return empty array for unsupported routes to avoid breaking the UI
      return new Response(JSON.stringify([]), { status: 200 });

    } catch(err) {
      console.error('Firebase Interceptor Error:', err);
      return new Response(JSON.stringify({ message: err.message }), { status: 500 });
    }
  }
  
  return originalFetch(url, options);
};
