import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AutoRefreshService {
  // Track the last time the user interacted with the app
  private lastActivity: number = Date.now();
  
  // Set how long the user must be inactive before we consider them "idle" (e.g., 10 minutes)
  private readonly IDLE_THRESHOLD_MS = 10 * 60 * 1000; 

  constructor(private ngZone: NgZone) {
    this.initActivityListeners();
    this.startMidnightCheck();
  }

  private initActivityListeners(): void {
    // We run this OUTSIDE the Angular Zone so that moving the mouse 
    // doesn't constantly trigger Angular's change detection, which would ruin performance.
    this.ngZone.runOutsideAngular(() => {
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      
      activityEvents.forEach(eventName => {
        window.addEventListener(eventName, () => {
          this.lastActivity = Date.now();
        }, true);
      });
    });
  }

  private startMidnightCheck(): void {
    this.ngZone.runOutsideAngular(() => {
      // Check the time every 1 minute
      setInterval(() => {
        const now = new Date();
        
        // Check if it is exactly 00:00 (Midnight)
        if (now.getHours() === 0 && now.getMinutes() === 0) {
          
          const timeSinceLastActivity = Date.now() - this.lastActivity;
          
          // If the user has been idle longer than the threshold, force a reload
          if (timeSinceLastActivity > this.IDLE_THRESHOLD_MS) {
            this.forceHardReload();
          }
        }
      }, 60000); // 60,000 ms = 1 minute
    });
  }

  private forceHardReload(): void {
    // window.location.reload(true) is the JavaScript programmatic equivalent to CTRL+SHIFT+R.
    // Note: TypeScript might complain about 'true' being deprecated in some modern browsers, 
    // but you can safely ignore it using @ts-ignore, or simply append a timestamp to the URL to bust the cache.
    
    window.location.reload(); 
  }
}