import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'behavior_session_id';
const MOUSE_SAMPLE_INTERVAL = 2500; // 2.5 seconds
const BATCH_SEND_INTERVAL = 5000; // 5 seconds

interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getOrCreateSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// Clear session when user logs out
export const clearTrackingSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const useTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const pageLoadTime = useRef<number>(Date.now());
  const mousePositions = useRef<MousePosition[]>([]);
  const lastMouseSampleTime = useRef<number>(0);
  const maxScrollDepth = useRef<number>(0);
  const hasTrackedPageView = useRef<boolean>(false);
  const previousPath = useRef<string>('');
  const isTracking = useRef<boolean>(false);

  // Only track if user is logged in
  const shouldTrack = !!user;

  const sendTrackingEvent = useCallback(async (
    eventType: 'page' | 'click' | 'mouse' | 'scroll',
    page: string,
    extraData: Record<string, unknown>
  ) => {
    if (!user) return;
    
    const sessionId = getOrCreateSessionId();
    
    try {
      await supabase.functions.invoke('track', {
        body: {
          user_id: user.id,
          session_id: sessionId,
          page,
          timestamp: new Date().toISOString(),
          event_type: eventType,
          extra_data: {
            ...extraData,
            user_agent: navigator.userAgent
          }
        }
      });
    } catch (error) {
      // Silent fail - don't disrupt user experience
      console.debug('Tracking event failed:', error);
    }
  }, [user]);

  // Track page visit
  const trackPageVisit = useCallback(() => {
    if (!shouldTrack) return;
    
    const currentPage = location.pathname + location.search;
    
    // Send previous page time spent if navigating
    if (previousPath.current && previousPath.current !== currentPage) {
      const timeSpent = Date.now() - pageLoadTime.current;
      sendTrackingEvent('page', previousPath.current, {
        time_spent_ms: timeSpent,
        referrer: document.referrer
      });
    }

    // Track new page view
    sendTrackingEvent('page', currentPage, {
      time_spent_ms: 0,
      referrer: previousPath.current || document.referrer
    });

    previousPath.current = currentPage;
    pageLoadTime.current = Date.now();
    maxScrollDepth.current = 0;
  }, [location.pathname, location.search, shouldTrack, sendTrackingEvent]);

  // Track clicks
  const trackClick = useCallback((event: MouseEvent) => {
    if (!shouldTrack) return;
    
    const target = event.target as HTMLElement;
    const currentPage = location.pathname + location.search;
    
    sendTrackingEvent('click', currentPage, {
      x: event.clientX,
      y: event.clientY,
      element_tag: target.tagName.toLowerCase(),
      element_id: target.id || null,
      element_class: target.className || null
    });
  }, [location.pathname, location.search, shouldTrack, sendTrackingEvent]);

  // Sample mouse movement
  const trackMouseMove = useCallback((event: MouseEvent) => {
    if (!shouldTrack) return;
    
    const now = Date.now();
    
    // Sample every 2.5 seconds
    if (now - lastMouseSampleTime.current >= MOUSE_SAMPLE_INTERVAL) {
      mousePositions.current.push({
        x: event.clientX,
        y: event.clientY,
        timestamp: now
      });
      lastMouseSampleTime.current = now;
    }
  }, [shouldTrack]);

  // Track scroll depth
  const trackScroll = useCallback(() => {
    if (!shouldTrack) return;
    
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollDepthPercent = Math.round((scrollY + viewportHeight) / documentHeight * 100);
    
    // Only track if we've scrolled deeper
    if (scrollDepthPercent > maxScrollDepth.current) {
      maxScrollDepth.current = scrollDepthPercent;
    }
  }, [shouldTrack]);

  // Send batched mouse movements
  const sendMouseBatch = useCallback(() => {
    if (!shouldTrack || mousePositions.current.length === 0) return;
    
    const currentPage = location.pathname + location.search;
    const positions = [...mousePositions.current];
    mousePositions.current = [];
    
    sendTrackingEvent('mouse', currentPage, {
      positions
    });
  }, [location.pathname, location.search, shouldTrack, sendTrackingEvent]);

  // Send scroll depth
  const sendScrollDepth = useCallback(() => {
    if (!shouldTrack || maxScrollDepth.current === 0) return;
    
    const currentPage = location.pathname + location.search;
    
    sendTrackingEvent('scroll', currentPage, {
      scroll_depth_percent: maxScrollDepth.current,
      scroll_y: window.scrollY,
      viewport_height: window.innerHeight,
      document_height: document.documentElement.scrollHeight
    });
  }, [location.pathname, location.search, shouldTrack, sendTrackingEvent]);

  // Handle page unload - attempt to flush final time-spent (best-effort)
  const handleBeforeUnload = useCallback(() => {
    if (!shouldTrack) return;
    
    const currentPage = location.pathname + location.search;
    const timeSpent = Date.now() - pageLoadTime.current;

    // Fire-and-forget; browsers may drop async work during unload.
    void sendTrackingEvent('page', currentPage, {
      time_spent_ms: timeSpent,
      referrer: document.referrer,
    });
  }, [location.pathname, location.search, shouldTrack, sendTrackingEvent]);

  // Setup event listeners and intervals
  useEffect(() => {
    // Don't track if user is not logged in
    if (!shouldTrack) {
      isTracking.current = false;
      return;
    }

    // Track initial page visit when user logs in
    if (!isTracking.current) {
      trackPageVisit();
      isTracking.current = true;
    }

    // Add event listeners
    document.addEventListener('click', trackClick);
    document.addEventListener('mousemove', trackMouseMove);
    document.addEventListener('scroll', trackScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Setup intervals for batched sending
    const mouseInterval = setInterval(sendMouseBatch, BATCH_SEND_INTERVAL);
    const scrollInterval = setInterval(sendScrollDepth, BATCH_SEND_INTERVAL);

    return () => {
      document.removeEventListener('click', trackClick);
      document.removeEventListener('mousemove', trackMouseMove);
      document.removeEventListener('scroll', trackScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(mouseInterval);
      clearInterval(scrollInterval);
      
      // Send final batched data
      if (shouldTrack) {
        sendMouseBatch();
        sendScrollDepth();
      }
    };
  }, [shouldTrack, trackClick, trackMouseMove, trackScroll, sendMouseBatch, sendScrollDepth, handleBeforeUnload, trackPageVisit]);

  // Track page changes
  useEffect(() => {
    if (shouldTrack && isTracking.current) {
      trackPageVisit();
    }
  }, [location.pathname, location.search, shouldTrack, trackPageVisit]);

  return null;
};
