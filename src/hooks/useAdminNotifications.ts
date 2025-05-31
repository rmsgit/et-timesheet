
'use client';

import { useEffect, useState } from 'react';
import { database } from '@/lib/firebase';
import { ref, onChildAdded, off, DataSnapshot, query, orderByChild, startAt } from 'firebase/database';
import { useAuth } from './useAuth';
import { FIREBASE_ADMIN_NOTIFICATIONS_PATH } from '@/lib/constants';

interface AdminNotificationPayload {
  projectName: string;
  editorUsername: string;
  timestamp: string; // ISO string
  recordId: string; 
}

export const useAdminNotifications = () => {
  const { isAdmin } = useAuth();
  // Store the timestamp when the hook/listener is effectively mounted for the current session.
  // This helps in ensuring that only notifications created *after* this point are shown.
  const [listenerReadyTimestamp] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!isAdmin || !database) {
      return;
    }

    // Query to listen only for new children added after the listenerReadyTimestamp
    // Firebase timestamps should be server timestamps if possible, or consistent ISO strings.
    // Using orderByChild and startAt can help filter.
    // However, a simpler approach for onChildAdded is just to check the timestamp client-side
    // as onChildAdded will fire for existing children initially then new ones.
    const notificationsRef = ref(database, FIREBASE_ADMIN_NOTIFICATIONS_PATH);
    
    // Query for children added after the listener became ready.
    // Note: Firebase Realtime Database queries with startAt/endAt work best on numeric values or strings that sort chronologically.
    // ISO timestamps (like new Date().toISOString()) are strings that sort chronologically.
    const notificationsQuery = query(notificationsRef, orderByChild('timestamp'), startAt(listenerReadyTimestamp));


    const handleNewNotification = (snapshot: DataSnapshot) => {
      try {
        const notification = snapshot.val() as AdminNotificationPayload;
        const notificationKey = snapshot.key;

        // Double check timestamp, although query should handle it.
        // This also ensures we don't process malformed data.
        if (notification && notification.timestamp && notificationKey) {
          // The query with startAt should mean we only get new ones,
          // but an explicit check against listenerReadyTimestamp can be a fallback.
          // For this implementation, we rely on the query and the fact that `onChildAdded`
          // will trigger for historical items matching the query first, then new items.
          // The `listenerReadyTimestamp` helps ensure that only items *actually new since mount* are processed.
          if (notification.timestamp >= listenerReadyTimestamp) {
            if (typeof window !== "undefined" && "Notification" in window) {
              const showNotification = () => {
                // Using recordId as a tag helps prevent duplicate notifications for the same event if it's somehow re-triggered.
                new Notification("Editor Task Completed", {
                  body: `Project "${notification.projectName}" marked complete by ${notification.editorUsername}.`,
                  tag: notification.recordId || notificationKey, 
                });
              };

              if (Notification.permission === "granted") {
                showNotification();
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                  if (permission === "granted") {
                    showNotification();
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing admin notification from Firebase:", error);
      }
    };

    // Attach listener using the query
    const listener = onChildAdded(notificationsQuery, handleNewNotification, (error) => {
        console.error("Error attaching admin notification listener:", error);
    });

    return () => {
      // Detach the specific listener callback when component unmounts or isAdmin changes
      off(notificationsQuery, 'child_added', listener);
    };
  }, [isAdmin, listenerReadyTimestamp]); // listenerReadyTimestamp is stable

  // This hook's purpose is to set up a side effect (listener). It doesn't need to return anything.
};
