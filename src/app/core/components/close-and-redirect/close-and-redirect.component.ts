import { Component } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-close-and-redirect',
  imports: [MatIconButton, MatIcon, RouterLink],
  templateUrl: './close-and-redirect.component.html',
  styleUrl: './close-and-redirect.component.scss',
})
export class CloseAndRedirectComponent {}
/////////////
/* Great example — this one is very simple compared to your `DataExportComponent`.
Here’s the **data + method flow** for `CloseAndRedirectComponent`:

---

### 🔹 Data Flow

* **Inputs**:

  * None (no `@Input`, no `@Output` in this component).
* **Outputs**:

  * None directly, but navigation happens through `routerLink`.

So the **only data** this component handles is the static route path (`/dashboard`) embedded in the template.

---

### 🔹 Method Flow

* **Class methods**:

  * None defined (the class is empty).

* **Template action**:

  * `<button mat-icon-button routerLink="/dashboard">` → when the button is clicked:

    1. Angular Router intercepts the `routerLink`.
    2. Router navigates the user to `/dashboard`.

---

### 🔹 Flow Diagram

```
User clicks Close button
   │
   ▼
Angular Material Button + RouterLink
   │
   └──> Angular Router navigates to "/dashboard"
```

---

### 🔹 Summary

* **This component has no business logic.**
* It’s essentially a **UI helper** that renders a “close” button and uses Angular’s `RouterLink` directive to navigate to the dashboard page.
* All "method flow" is handled by Angular’s built-in `RouterLink`, not by your component code.

---

⚡ Would you like me to show you how to **standardize this documentation format** (Inputs → Outputs → Methods → Flow Diagram) so you can reuse it for all your Angular components in your project?
*/