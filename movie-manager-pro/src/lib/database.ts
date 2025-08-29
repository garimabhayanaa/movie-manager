import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { UserMovie, MovieList, Activity, UserBadge } from '@/types';

export const database = {
  // User Movies
  addUserMovie: async (userMovie: Omit<UserMovie, 'id'>) => {
    const docRef = await addDoc(collection(db, 'userMovies'), {
      ...userMovie,
      watchedDate: userMovie.watchedDate || serverTimestamp(),
    });
    return docRef.id;
  },

  updateUserMovie: async (id: string, updates: Partial<UserMovie>) => {
    await updateDoc(doc(db, 'userMovies', id), updates);
  },

  getUserMovie: async (userId: string, movieId: number): Promise<UserMovie | null> => {
    const q = query(
      collection(db, 'userMovies'),
      where('userId', '==', userId),
      where('movieId', '==', movieId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as UserMovie;
  },

  getUserMovies: async (userId: string, status?: string) => {
    let q = query(
      collection(db, 'userMovies'),
      where('userId', '==', userId),
      orderBy('watchedDate', 'desc')
    );
    
    if (status) {
      q = query(
        collection(db, 'userMovies'),
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('watchedDate', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserMovie[];
  },

  // Activity Feed
  addActivity: async (activity: Omit<Activity, 'id'>) => {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      createdAt: serverTimestamp(),
    });
  },

  getActivities: async (userId?: string, limitCount = 20) => {
    let q = query(
      collection(db, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (userId) {
      q = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
  },

  // Movie Lists
  createList: async (list: Omit<MovieList, 'id'>) => {
    const docRef = await addDoc(collection(db, 'movieLists'), {
      ...list,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  updateList: async (id: string, updates: Partial<MovieList>) => {
    await updateDoc(doc(db, 'movieLists', id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  getUserLists: async (userId: string) => {
    const q = query(
      collection(db, 'movieLists'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MovieList[];
  },

  getPublicLists: async () => {
    const q = query(
      collection(db, 'movieLists'),
      where('isPublic', '==', true),
      orderBy('likes', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MovieList[];
  },

  // User Profile Updates
  updateUserStats: async (userId: string, updates: any) => {
    await updateDoc(doc(db, 'users', userId), updates);
  },

  // Batch operations for better performance
  batchUpdate: async (operations: Array<{ type: 'add' | 'update' | 'delete', collection: string, id?: string, data?: any }>) => {
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      if (op.type === 'add') {
        const docRef = doc(collection(db, op.collection));
        batch.set(docRef, op.data);
      } else if (op.type === 'update' && op.id) {
        const docRef = doc(db, op.collection, op.id);
        batch.update(docRef, op.data);
      } else if (op.type === 'delete' && op.id) {
        const docRef = doc(db, op.collection, op.id);
        batch.delete(docRef);
      }
    });

    await batch.commit();
  },
};
