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

  // Follow System
  addFollow: async (followerId: string, followingId: string) => {
    await addDoc(collection(db, 'follows'), {
      followerId,
      followingId,
      createdAt: serverTimestamp(),
    });
  },

  removeFollow: async (followerId: string, followingId: string) => {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    );
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => deleteDoc(doc.ref));
  },

  getFollowers: async (userId: string) => {
    const q = query(
      collection(db, 'follows'),
      where('followingId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getFollowing: async (userId: string) => {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Like System
  toggleLike: async (targetType: string, targetId: string, userId: string) => {
    const likeId = `${targetType}_${targetId}_${userId}`;
    const likeRef = doc(db, 'likes', likeId);
    const likeDoc = await getDoc(likeRef);

    if (likeDoc.exists()) {
      // Unlike - remove the like
      await deleteDoc(likeRef);
      
      // Decrement like count on target
      await database.updateLikeCount(targetType, targetId, -1);
    } else {
      // Like - add the like
      await setDoc(likeRef, {
        targetType,
        targetId,
        userId,
        createdAt: serverTimestamp(),
      });
      
      // Increment like count on target
      await database.updateLikeCount(targetType, targetId, 1);
    }
  },

  checkLikeStatus: async (targetType: string, targetId: string, userId: string): Promise<boolean> => {
    const likeId = `${targetType}_${targetId}_${userId}`;
    const likeDoc = await getDoc(doc(db, 'likes', likeId));
    return likeDoc.exists();
  },

  updateLikeCount: async (targetType: string, targetId: string, increment: number) => {
    const targetRef = doc(db, `${targetType}s`, targetId);
    await updateDoc(targetRef, {
      likes: increment(increment),
    });
  },

  getLikeCount: async (targetType: string, targetId: string): Promise<number> => {
    const targetDoc = await getDoc(doc(db, `${targetType}s`, targetId));
    return targetDoc.exists() ? targetDoc.data().likes || 0 : 0;
  },

  // Comment System
  addComment: async (commentData: any) => {
    await addDoc(collection(db, 'comments'), {
      ...commentData,
      createdAt: serverTimestamp(),
    });
  },

  toggleCommentLike: async (commentId: string, userId: string) => {
    const likeId = `comment_${commentId}_${userId}`;
    const likeRef = doc(db, 'commentLikes', likeId);
    const likeDoc = await getDoc(likeRef);

    if (likeDoc.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, 'comments', commentId), {
        likes: increment(-1),
      });
    } else {
      await setDoc(likeRef, {
        commentId,
        userId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'comments', commentId), {
        likes: increment(1),
      });
    }
  },

  // Badge System
  getUserBadges: async (userId: string) => {
    const q = query(
      collection(db, 'userBadges'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      earnedAt: doc.data().earnedAt?.toDate()
    }));
  },

  awardBadge: async (userId: string, badgeId: string) => {
    const userBadgeData = {
      userId,
      badgeId,
      earnedAt: serverTimestamp(),
    };
    
    await addDoc(collection(db, 'userBadges'), userBadgeData);
    
    // Add activity for badge earned
    await database.addActivity({
      userId,
      type: 'badge_earned',
      badgeId,
    });
  },

  checkAndAwardBadges: async (userId: string) => {
    // This function would be called after user actions to check if they've earned new badges
    const badges = await getAllBadges(); // Implementation needed
    const earnedBadges = await database.getUserBadges(userId);
    const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badgeId));
    
    // Check each badge criteria
    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;
      
      const meetscriteria = await checkBadgeCriteria(userId, badge);
      if (meetscriteria) {
        await database.awardBadge(userId, badge.id);
      }
    }
  },
};

// Helper function to check badge criteria
const checkBadgeCriteria = async (userId: string, badge: any): Promise<boolean> => {
  try {
    const userMovies = await database.getUserMovies(userId);
    const watchedMovies = userMovies.filter(um => um.status === 'watched');
    
    switch (badge.criteria.type) {
      case 'movies_watched':
        return watchedMovies.length >= badge.criteria.value;
      
      case 'reviews_written':
        const reviewCount = watchedMovies.filter(um => um.review).length;
        return reviewCount >= badge.criteria.value;
      
      case 'lists_created':
        const userLists = await database.getUserLists(userId);
        return userLists.length >= badge.criteria.value;
      
      case 'streak_days':
        // This would check the user's current streak
        const userProfile = await getUserProfile(userId);
        return (userProfile?.currentStreak || 0) >= badge.criteria.value;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking badge criteria:', error);
    return false;
  }
};

