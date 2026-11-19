import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, RouterModule } from '@angular/router';
import { LayoutComponent } from './core/components/layout/layout.component';
import { UserService } from './core/services/user.service';

@Component({
  selector: 'app-root',
  imports: [RouterModule, LayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) {
    this.afAuth.authState.pipe(takeUntilDestroyed()).subscribe((authData) => {
      if (authData && authData.email) {
        this.userService.setUserId(authData.uid);
        this.userService.setUser(authData);
        const path = window.location.pathname || this.router.url;
        if (path === '/' || path.startsWith('/login')) {
          this.router.navigate(['/dashboard']).then();
        }
      } else {
        this.userService.setUser(undefined);
        const path = window.location.pathname || this.router.url;
        if (!path.startsWith('/login')) {
          this.router.navigate(['/login']).then();
        }
      }
    });
  }
}
/*  AngularFireAuth → AngularFire wrapper around Firebase Authentication.
    authState → an Observable<firebase.User | null> that emits:
      firebase.User; when a user is signed in.
      null: when signed out.
    pipe(takeUntilDestroyed()) → automatically unsubscribes when the component/service is destroyed. This is Angular’s new built-in cleanup operator (Angular v16+).
    .subscribe((authData) => {...}) → you get the current auth user object or null. 
*/