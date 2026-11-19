import { ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Account, AccountCategory } from '@core/interfaces/account-model';
import { ResponsiveService } from '@shared/services/responsive.service';
import Highcharts, { AxisOptions, SeriesOptionsType } from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

// import { types } from 'util';
// import { DatabaseService } from '@core/services/database.service';
// import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-category-summary-chart',
  templateUrl: './category-summary-chart.component.html',
  imports: [HighchartsChartModule, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./category-summary-chart.component.scss'],
})
export class CategorySummaryChartComponent implements OnInit, OnChanges {
  readonly responsiveService = inject(ResponsiveService);
  readonly isHandset = this.responsiveService.isHandset;
  // readonly userService = inject(UserService);
  // readonly userId = this.userService.getUserId();
  // readonly databaseService = inject(DatabaseService);
  // readonly getTypes = this.databaseService.getTypes(this.userId);

  @Input() data!: Account[];
  @Input() date!: Date;
  @Input() categories!: AccountCategory[];
  @Input() chartType: 'line' | 'column' = 'column';
  // @Input() types!: string[];

  updateFlag = false;
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {
    chart: {
      plotShadow: false, //if true, it adds shadow border
      type: this.chartType,
      backgroundColor: 'transparent',
      scrollablePlotArea: {
        minWidth: this.isHandset() ? 800 : undefined,
        scrollPositionX: 0,
      },
    },
    title: {
      text: '',
    },
    plotOptions: {
      series: {
        states: {
          hover: {
            enabled: !this.isHandset(),
          },
        },
      },
    },
    yAxis: {
      title: {
        text: 'Category Amount',
      },
    },
    xAxis: {
      categories: [
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
      ],
      labels: {
        rotation: this.isHandset() ? -45 : 0,
        style: {
          fontSize: this.isHandset() ? '8px' : '12px',
        },
      },
    },
    tooltip: {
      headerFormat: '<b>{category}</b><br/>',
      pointFormat: '{series.name}: ${point.y:.2f}<br/>Total: ${point.stackTotal:.2f}',
    },
    legend: {
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom',
      enabled: true,
      itemStyle: {
        fontSize: this.isHandset() ? '8px' : '12px',
      },
    },
    series: [
      {
        type: this.chartType,
        data: [],
      },
    ],
  };

  ngOnInit() {
    this.setCategoriesData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      this.setCategoriesData();
    }

    if (changes['date'] && !changes['date'].firstChange) {
      this.setCategoriesData();
    }

    if (changes['chartType'] && !changes['chartType'].firstChange) {
      this.chartType = changes['chartType'].currentValue;
      this.setCategoriesData();
    }
  }

  setCategoriesData() {
    const totals = [];
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
    for (const category of this.categories) {
      const categorySumByMonth = monthNames.map(() => 0);
      const matchingAccounts = this.data.filter((c) => c.type === category);
      matchingAccounts.forEach((a) => {
        const accountDate = new Date(a.createdAt);
        if (accountDate.getFullYear() === this.date.getFullYear()) {
          categorySumByMonth[accountDate.getMonth()] = categorySumByMonth[accountDate.getMonth()] + +a.balance;
        }
      });
      const dataObj = { name: category, data: categorySumByMonth };
      totals.push(dataObj);
    }
    (this.chartOptions!.xAxis as AxisOptions)['categories'] = monthNames.map((m) => `${m} ${this.date.getFullYear()}`);
    (this.chartOptions.chart ?? {})['type'] = this.chartType;
    this.chartOptions.series = totals as SeriesOptionsType[];
    this.updateFlag = true;
  }
}
// const monthIndex = expenseDate.getMonth(); // 0 = Jan, 1 = Feb, ...
// +e.amount → the unary + forces e.amount into a number (in case it’s a string).
/* Perfect, thanks for sharing the whole **`CategorySummaryChartComponent`** 🎯.
Let’s break it down into **algorithm, method flow, data flow, and flow chart**.

---

## **1. Abstract Algorithm**

1. **Initialize chart options** with defaults (type, background, tooltip, x/y axis, legend).
2. **OnInit**

   * Call `setCategoriesData()` to prepare initial chart series.
3. **OnChanges**

   * If input `data`, `date`, or `chartType` changes → call `setCategoriesData()`.
4. **setCategoriesData**

   * For each category in `categories`:

     1. Initialize an array of 12 zeros (one per month).
     2. Filter `data` for matching category.
     3. For each expense:

        * Check if year matches selected `date`.
        * Add expense amount to correct month index.
     4. Store `{ name: category, data: monthlyTotals }`.
   * Update chart options:

     * `xAxis.categories = [Jan 2025, Feb 2025, …]`.
     * `chart.type = chartType`.
     * `series = totals`.
   * Set `updateFlag = true` to refresh chart.

---

## **2. Method Flow**

```
ngOnInit()
  → calls setCategoriesData()

ngOnChanges(changes)
  → if data/date/chartType changed
       → update chartType if needed
       → calls setCategoriesData()

setCategoriesData()
  → loop over categories[]
     → filter expenses by category
     → sum by month (if year matches selected date)
     → build totals[]
  → update chartOptions.xAxis, chartOptions.series
  → set updateFlag = true
```

---

## **3. Data Flow**

**Inputs**:

* `@Input() data: Expense[]`
* `@Input() date: Date`
* `@Input() categories: string[]`
* `@Input() chartType: 'line' | 'column'`

**Processing**:

* Filter & group `data` by category.
* Aggregate amounts per month for given year.
* Format axis labels and series objects for Highcharts.

**Outputs**:

* `chartOptions.series` → updated dataset for chart.
* `updateFlag = true` → triggers Highcharts redraw.
* UI updates:

  * Chart display (line or column).
  * Responsive changes (scroll, font size, tooltips).
  * "Swipe" message on mobile via `ResponsiveService`.

---

## **4. ASCII Flow Chart**

```
 ┌────────────────────────┐
 │   Component Init (ngOnInit) 
 │   OR Input Changes (ngOnChanges)
 └─────────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ setCategoriesData() │
     └──────────┬─────────┘
                │
   ┌────────────┼───────────────────────────────┐
   │ For each category in categories[]           │
   │  ┌───────────────────────────────────────┐ │
   │  │ Initialize monthlyTotals = [0..11]    │ │
   │  │ Filter expenses by category           │ │
   │  │ For each expense:                     │ │
   │  │   if expense.year == selectedYear     │ │
   │  │      add amount to monthlyTotals[month]││
   │  └───────────────────────────────────────┘ │
   └────────────────────────────────────────────┘
                │
                ▼
     ┌───────────────────────────┐
     │ Build totals[] = {name, data[]} 
     │ Update chartOptions.xAxis & series
     │ chartOptions.chart.type = chartType
     │ updateFlag = true
     └───────────────────────────┘
                │
                ▼
        ┌─────────────────────┐
        │ Highcharts re-renders│
        └─────────────────────┘
```

 */
