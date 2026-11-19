import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AccountSummary } from '../../interfaces/transaction-summary';

@Component({
  selector: 'app-number-cards',
  templateUrl: './number-cards.component.html',
  imports: [MatCardContent, MatIcon, NgClass, MatCard, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./number-cards.component.scss'],
})
export class NumberCardsComponent {
  @Input() data?: AccountSummary;
}
/* Got it 👍 Let’s break your `NumberCardsComponent` down into **data flow**, **method flow**, and **algorithm description** so it’s crystal clear.

---

## 🔹 **1. Inputs, Outputs, and Processing**

* **Input**:

  * `@Input() data?: ExpenseSummary;`
  * `ExpenseSummary` likely has fields such as:

    * `icon: string`
    * `color: string`
    * `value: number | string`
    * `metricTitle: string`

* **Processing**:

  * Angular template checks if `data` exists with `*ngIf`.
  * If present, it renders:

    1. An **icon** (optional).
    2. The **main numeric value** (e.g., total expenses).
    3. A **title/label** (e.g., “This Month”).

* **Output**:

  * A Material Card (`mat-card`) containing the formatted metric summary.

---

## 🔹 **2. Data Flow**

1. **Parent Component → NumberCardsComponent**

   * Passes in an `ExpenseSummary` object via `[data]`.
2. **Template binding**

   * `*ngIf="data"` → ensures rendering only when data is available.
   * `data.icon` → decides whether to show the `mat-icon`.
   * `data.color` → applies dynamic CSS class to the icon.
   * `data.value` → displayed as the main metric.
   * `data.metricTitle` → displayed as a subtitle.

---

## 🔹 **3. Method Flow (Step-by-Step Execution)**

1. Component initializes → `@Input() data` may be `undefined`.
2. Angular’s change detection triggers (`OnPush` strategy = only updates if `data` reference changes).
3. Template logic runs:

   * If `data == null`, nothing renders (card is hidden).
   * If `data != null`, build UI:

     1. Create a Material card (`mat-card`).
     2. Inside, render:

        * `mat-icon` (only if `data.icon` exists).
        * The numeric/text `data.value`.
        * A label with `data.metricTitle`.
4. Result: A small, reusable “metric card” for dashboards.

---

## 🔹 **4. Abstract Algorithm**

```pseudocode
INPUT: ExpenseSummary object (may be null)

IF data is null
    DO NOT RENDER card
ELSE
    CREATE card container
    IF data.icon exists
        DISPLAY icon with class = data.color
    ENDIF
    DISPLAY main value (data.value)
    DISPLAY subtitle (data.metricTitle)
OUTPUT: Material Design card with summary info
```

---

## 🔹 **5. Flowchart**

```
            ┌───────────────┐
            │ Receive data  │
            │ (ExpenseSummary) │
            └───────┬───────┘
                    │
          ┌─────────▼─────────┐
          │ Is data available?│
          └───────┬───────────┘
          YES      │NO
           │       │
           │       ▼
           │   Render nothing
           │
  ┌────────▼──────────┐
  │ Render mat-card    │
  └────────┬──────────┘
           │
   ┌───────▼─────────┐
   │ Icon present?    │
   └───────┬─────────┘
   YES     │NO
    │      │
    ▼      │
 Render   Skip
 mat-icon icon
    │
    ▼
 Render value (data.value)
    │
    ▼
 Render metricTitle (data.metricTitle)
    │
    ▼
 Output: Completed Number Card
```

---

 */
