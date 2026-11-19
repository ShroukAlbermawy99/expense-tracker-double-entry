import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResponsiveService {
  private readonly breakpointObserver = inject(BreakpointObserver);
  
  // Handset	(max-width: 599.98px) and (orientation: portrait), (max-width: 959.98px) and (orientation: landscape) 
  readonly isHandset: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  // HandsetPortrait	(max-width: 599.98px) and (orientation: portrait)
  readonly isHandsetPortrait: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(Breakpoints.HandsetPortrait).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  // HandsetLandscape	(max-width: 959.98px) and (orientation: landscape)
  readonly isHandsetLandscape: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(Breakpoints.HandsetLandscape).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  // Tablet	(min-width: 600px) and (max-width: 839.98px) and (orientation: portrait), (min-width: 960px) and (max-width: 1279.98px) and (orientation: landscape)
  readonly isTablet: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(Breakpoints.Tablet).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  // Web	(min-width: 840px) and (orientation: portrait), (min-width: 1280px) and (orientation: landscape)
  readonly isDesktop: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(Breakpoints.Web).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
}
