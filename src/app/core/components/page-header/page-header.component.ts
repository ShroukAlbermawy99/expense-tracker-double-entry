import { Component, DestroyRef, inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, switchMap } from 'rxjs';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})

/* 
@ViewChild('dynamic', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;
'dynamic':
This is the selector, which typically refers to a template reference variable (e.g., <ng-container #dynamic></ng-container> or <div #dynamic></div>) in the component's HTML template.
{ read: ViewContainerRef }:
This crucial option specifies that instead of getting a reference to the element itself, Angular should provide a ViewContainerRef associated with that element.
ViewContainerRef:
This is an Angular class that represents a container where one or more views (components or templates) can be attached, detached, or manipulated programmatically. It's essential for dynamic component loading and manipulation of the DOM within Angular's rendering cycle.
viewContainerRef!: ViewContainerRef;:
This declares a property named viewContainerRef of type ViewContainerRef. The ! (definite assignment assertion) indicates to TypeScript that this property will definitely be assigned a value by Angular during the component's lifecycle.
*/

/* 
this.router.events:
Listens for Navigation End events
this.router.events emits router lifecycle events (like start, end, cancel, etc.).
filter((event) => event instanceof NavigationEnd) ensures the rest of the pipeline runs only when navigation is finished.
Cleans up automatically on destroy
takeUntilDestroyed(this.destroyRef) is an Angular 16+ feature that stops the subscription automatically when the component is destroyed — no manual ngOnDestroy() unsubscribe needed.
Gets the data from the active route
switchMap(() => (this.route.firstChild ? this.route.firstChild.data : this.route.data))
If the current route has a child (nested route), it takes that child's data.
Otherwise, it takes the current route’s data.
The data comes from Angular route configuration (data: { title: 'My Page', pageActions: SomeComponent } in the Routes array).
Subscribes and uses the data
(data: Record<string, string | Type<unknown>>) means data is expected to be a key-value object, where values can be strings (like a title) or component types.
this.pageTitle = (data['title'] as string) ?? ''; sets a page title property.
this.viewContainerRef.clear(); clears any previously created dynamic components.
If data['pageActions'] exists, it dynamically creates that component inside the ViewContainerRef.
*/

export class PageHeaderComponent implements OnInit {
  pageTitle = '';
  @ViewChild('dynamic', { read: ViewContainerRef }) viewContainerRef!: ViewContainerRef;

  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private destroyRef: DestroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationEnd),
        switchMap(() => (this.route.firstChild ? this.route.firstChild.data : this.route.data)),
      )
      .subscribe((data: Record<string, string | Type<unknown>>) => {
        this.pageTitle = (data['title'] as string) ?? '';
        this.viewContainerRef.clear();
        if (data['pageActions']) {
          this.viewContainerRef.createComponent(data['pageActions'] as Type<unknown>);
        }
      });
  }
}
/* Got it ✅ — your `PageHeaderComponent` is a **dynamic header renderer** that reacts to Angular route changes.
Let’s break it down into **detailed algorithm + method flow**, so you can document it like we did for `LayoutComponent`.

---

# 🔹 **Algorithm for `PageHeaderComponent`**

### `ngOnInit()`

```
1. On component initialization:
2.   Subscribe to router.events.
3.   For each emitted event:
4.     IF event is NOT NavigationEnd:
5.         Ignore it.
6.     ELSE:
7.         IF route.firstChild exists:
8.             Return route.firstChild.data (Observable).
9.         ELSE:
10.            Return route.data (Observable).
11.    Subscribe to the data.
12.    Extract 'title' from data.
13.    Assign 'title' to this.pageTitle (default = '').
14.    Clear the current ViewContainerRef (remove old components).
15.    IF data contains 'pageActions':
16.         Create a new component dynamically using viewContainerRef.createComponent().
17. END
```

---

# 🔹 **Method Flow**

### `ngOnInit()`

* **Input:** Router navigation events.
* **Process:**

  1. Observe navigation lifecycle with `this.router.events`.
  2. Use `filter` to pass only `NavigationEnd` events.
  3. Use `switchMap` to select route data:

     * If nested child route exists → take its `.data`.
     * Otherwise → take current route `.data`.
  4. On subscription:

     * Update `pageTitle` with `data['title']`.
     * Clear dynamic container (`viewContainerRef.clear()`).
     * If `data['pageActions']` exists → create that component dynamically in the placeholder.
* **Output:** Updated page title and injected action component.

---

# 🔹 **Data Flow**

```
Router Event (NavigationEnd)
         │
         ▼
 ActivatedRoute (data / firstChild.data)
         │
         ▼
  { title, pageActions }
         │
 ┌──────────────┬─────────────┐
 ▼              ▼             ▼
pageTitle   Clear View     If pageActions
 property   ContainerRef   ▼
                        Dynamically create
                        component into
                        <ng-template #dynamic>
```

---

# 🔹 **Key Roles**

* `@ViewChild('dynamic', { read: ViewContainerRef })`: Target insertion point for dynamic components.
* `this.pageTitle`: Bound to template `<h2>` — updates header text.
* `this.viewContainerRef`: Clears and re-injects components.
* `route.data`: Provides metadata (title, pageActions) from Angular route configuration.

---
 */