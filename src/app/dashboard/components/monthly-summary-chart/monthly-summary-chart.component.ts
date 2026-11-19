import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import * as Highcharts from 'highcharts';
import { SeriesOptionsType } from 'highcharts';
import { HighchartsChartComponent, HighchartsChartModule } from 'highcharts-angular';
import { Account, AccountCategory } from '../../../core/interfaces/account-model';
import { ResponsiveService } from '../../../shared/services/responsive.service';

@Component({
  selector: 'app-monthly-summary-chart',
  templateUrl: './monthly-summary-chart.component.html',
  styleUrls: ['./monthly-summary-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HighchartsChartModule, MatIcon],
})
export class MonthlySummaryChartComponent implements OnInit, OnChanges {
  readonly responsiveService = inject(ResponsiveService);
  readonly isHandset = this.responsiveService.isHandset;

  @Input() data!: Account[];
  @Input() date!: Date;
  @Input() categories!: AccountCategory[];
  @ViewChild('chart') chart!: HighchartsChartComponent;

  currentData: Account[] = [];
  originalData: Account[] = [];

  Highcharts: typeof Highcharts = Highcharts;
  updateFlag = false;
  chartOptions: Highcharts.Options = {
    chart: {
      plotShadow: false,
      type: 'column',
      backgroundColor: 'transparent',
      scrollablePlotArea: {
        minWidth: this.isHandset() ? 800 : undefined,
        scrollPositionX: 0,
      },
    },
    title: {
      text: '',
    },
    accessibility: {
      announceNewData: {
        enabled: true,
      },
    },
    xAxis: {
      type: 'category',
      labels: {
        rotation: this.isHandset() ? -45 : 0,
        style: {
          fontSize: this.isHandset() ? '8px' : '12px',
        },
      },
    },
    yAxis: {
      title: {
        text: 'Total monthly account balance',
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      series: {
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          format: '${point.y:.1f}',
        },
      },
    },
    tooltip: {
      headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
      pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>${point.y:.2f}</b> <br/>',
    },
    series: [
      {
        type: 'column',
        data: [],
      },
    ],
    drilldown: {
      breadcrumbs: {
        position: {
          align: 'right',
        },
      },
    },
  };

  ngOnInit() {
    this.originalData = [...this.data];
    this.currentData = this.data;
    this.setDataForMonthRange();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      if (this.chartOptions) {
        this.originalData = [...this.data];
        this.currentData = this.data;
        this.setDataForMonthRange();
      }
    }

    if (changes['date'] && !changes['date'].firstChange) {
      if (this.date) {
        this.setDataForMonthRange();
      }
    }
  }

  setDataForMonthRange() {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const monthRange = this.getDateRange();

    const monthSummary = [];
    const drillDown = [];
    for (const month of monthRange) {
      let monthSum = 0;
      const drillDownData = [];

      for (const account of this.currentData) {
        const currentDate = new Date(account.createdAt);
        if (month.getMonth() === currentDate.getMonth() && month.getFullYear() === currentDate.getFullYear()) {
          monthSum += +account.balance as number;
          drillDownData.push(account);
        }
      }
      let parsedSum;
      if (monthSum !== 0) {
        parsedSum = monthSum.toFixed(2);
      }

      monthSummary.push({
        name: `${monthNames[month.getMonth()]} ${month.getFullYear()}`,
        y: parseFloat(parsedSum ?? ''),
        drilldown: monthNames[month.getMonth()],
      });
      drillDown.push({
        name: monthNames[month.getMonth()],
        id: monthNames[month.getMonth()],
        data: this.getDrillDownData(drillDownData),
      });
    }
    if (this.chartOptions.series?.length) {
      this.chartOptions.series[0] = {
        type: 'column',
        data: monthSummary,
      };
    }

    // if (this.chartOptions.drilldown?.series?.length) {
    //   this.chartOptions.drilldown.series = drillDown as SeriesOptionsType[];
    // }
    this.chartOptions.drilldown!.series = drillDown as SeriesOptionsType[];

    this.updateFlag = true;
  }

  getDrillDownData(data: Account[]): [string, number][] {
    const summaryData: [string, number][] = [];

    for (const category of this.categories) {
      let categorySum = 0;
      for (const account of data) {
        if (category === account.type) {
          categorySum += +account.balance;
        }
      }
      summaryData.push([category, categorySum]);
    }
    return summaryData;
  }

  getDateRange(): Date[] {
    const monthRange = [this.date];
    for (let i = 1; i < 12; i++) {
      const month = new Date(this.date.getTime());
      month.setMonth(this.date.getMonth() + i);
      monthRange.push(month);
    }
    return monthRange;
  }
}
/*  month.setMonth(this.date.getMonth() + i);
    If today is August 30, 2025, the loop produces:
    September 2025
    October 2025
    …
    July 2026 
*/
/* Perfect — thanks for sharing the full `MonthlySummaryChartComponent` 👌. Let’s analyze it in terms of **inputs, outputs, processing, method flow, and data flow** so you fully understand what’s happening.

---

# 🔹 Inputs

1. **@Input() data: Expense\[]**

   * Full list of expenses (each with `date`, `amount`, `category`).

2. **@Input() date: Date**

   * Reference start month (current month shown + range of 12 months ahead).

3. **@Input() categories: string\[]**

   * The list of categories (Food, Rent, Transport, etc.).

---

# 🔹 Outputs

* A **Highcharts column chart** with:

  * **Monthly summary** of total expenses (`series[0]`).
  * **Drilldown data**: breakdown of expenses per category in each month (`drilldown.series`).
* Dynamic update of the chart when inputs (`data`, `date`) change.

---

# 🔹 Processing Steps

### 1. **ngOnInit**

* Copies original `data` into `originalData` and `currentData`.
* Calls `setDataForMonthRange()` to populate chart with data.

### 2. **ngOnChanges**

* If `data` changes → refresh chart with new expenses.
* If `date` changes → regenerate chart for the new 12-month range.

### 3. **setDataForMonthRange()**

* Prepares **12 months starting from given `date`** via `getDateRange()`.
* For each month:

  * Sum expenses for that month → `monthSum`.
  * Collect detailed expenses for drilldown.
  * Push a summary object (`{ name, y, drilldown }`) into `monthSummary`.
  * Push drilldown dataset (`{ name, id, data }`) into `drillDown`.
* Updates chart:

  * `series[0] = monthSummary`
  * `drilldown.series = drillDown`
* Sets `updateFlag = true` → triggers chart redraw.

### 4. **getDrillDownData()**

* For each category in `categories`:

  * Sum expenses for that category within the given month.
  * Push `[category, totalAmount]` into `summaryData`.
* Returns this breakdown for the chart’s drilldown feature.

### 5. **getDateRange()**

* Creates an array of 12 consecutive months starting from `date`.
* Example: If `date = Aug 30, 2025`, result:
  `[Aug 2025, Sep 2025, …, Jul 2026]`.

---

# 🔹 Data Flow (Simplified)

```
Inputs:
 ┌──────────────┐       ┌─────────────┐
 │ data:Expense[]│       │ date: Date  │
 └─────┬─────────┘       └─────┬───────┘
       │                        │
       ▼                        ▼
  ngOnInit / ngOnChanges ──────► getDateRange()
       │                               │
       ▼                               ▼
 setDataForMonthRange()         Generate 12-month range
       │
       │  For each month:
       │   ┌───────────────┐
       │   │ Sum expenses  │─────► monthSummary[]
       │   │ Collect drill │─────► drillDown[]
       │   └───────────────┘
       ▼
 chartOptions updated
       │
       ▼
 Highcharts renders
```

---

# 🔹 Method Flow (Step-by-Step)

1. Component initializes → `ngOnInit` → `setDataForMonthRange()`.
2. Each month (12 months forward):

   * Loop expenses.
   * Aggregate totals.
   * Build summary + drilldown objects.
3. Update `chartOptions.series` with monthly totals.
4. Update `chartOptions.drilldown.series` with category breakdowns.
5. Set `updateFlag = true` to trigger chart redraw.

---

# 🔹 Flowchart

```
       ┌──────────────┐
       │ OnInit/Change│
       └──────┬───────┘
              ▼
     ┌───────────────────┐
     │ getDateRange(12mo)│
     └──────┬────────────┘
            ▼
   ┌───────────────────────┐
   │ For each month in range│
   └──────┬────────────────┘
          ▼
 ┌───────────────────┐
 │ Filter expenses    │
 │ matching month/year│
 └──────┬─────────────┘
        ▼
 ┌────────────────────┐
 │ Sum total amount    │
 │ Collect drilldown   │
 └──────┬──────────────┘
        ▼
 ┌───────────────────────┐
 │ Push to monthSummary[] │
 │ Push to drillDown[]    │
 └──────┬────────────────┘
        ▼
       Loop until 12 months
        ▼
 ┌───────────────────────┐
 │ Update chartOptions   │
 │ series & drilldown    │
 └──────┬────────────────┘
        ▼
  ┌─────────────┐
  │ updateFlag= │
  │ true → chart│
  │ re-renders  │
  └─────────────┘
```

---

👉 So, the **inputs** are `data`, `date`, `categories`.
👉 The **processing** is month-wise aggregation + drilldown grouping.
👉 The **outputs** are `chartOptions.series` (monthly totals) and `chartOptions.drilldown.series` (per-category drilldown).

---

 */



