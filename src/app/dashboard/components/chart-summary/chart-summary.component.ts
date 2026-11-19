import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { ChartData } from '../../interfaces/chart-data';

@Component({
  selector: 'app-chart-summary',
  templateUrl: 'chart-summary.component.html',
  imports: [HighchartsChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['chart-summary.component.scss'],
})
export class ChartSummaryComponent implements OnInit, OnChanges {
  @Input() data!: ChartData[];
  Highcharts: typeof Highcharts = Highcharts;
  updateFlag = false;
  chartOptions: Highcharts.Options = {
    chart: {
      plotShadow: false,
      type: 'pie',
      backgroundColor: 'transparent',
    },
    title: {
      text: '',
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 576,
          },
          chartOptions: {
            legend: {
              enabled: true,
            },
            plotOptions: {
              series: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: [
                  {
                    enabled: false,
                    format: '{point.name}',
                  },
                  {
                    enabled: false,
                    format: '{point.percentage:.0f}%',
                  },
                ],
                showInLegend: true,
              },
            },
          },
        },
      ],
    },
    legend: {
      align: 'center',
      padding: 10,
      title: {
        text: '',
      },
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}% (${point.y:.2f})</b>',
    },
    series: [],
    plotOptions: {
      series: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: [
          {
            enabled: true,
            format: '{point.name} - {point.percentage:.0f}%',
          },
          {
            enabled: false,
            format: '{point.percentage:.0f}%',
          },
        ],
        showInLegend: true,
      },
    },
  };

  ngOnInit() {
    if (this.chartOptions.series) { // In TS and JS, [] (an empty array) is still truthy.
      this.chartOptions.series[0] = {
        type: 'pie',
        data: this.data,
      };
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      if (this.chartOptions.series) {
        this.chartOptions.series[0] = {
          type: 'pie',
          data: changes['data'].currentValue,
        };
        this.updateFlag = true;
      }
    }
  }
}
/* changeDetection: ChangeDetectionStrategy.OnPush, how it works with ngOnChanges for changes in @input():

    you’re telling Angular “only run change detection for this component when its @Input() values change by reference or when Angular explicitly marks it dirty.”

    🔎 How OnPush interacts with @Input() and ngOnChanges

    Default (no OnPush):
    Angular runs change detection for this component every time any parent runs change detection, even if the @Input() didn’t change.

    With OnPush:
    Angular only checks this component when:

    An @Input() reference changes (shallow check: === comparison).

    An event handler inside this component runs (e.g., (click)).

    You manually mark it for check (ChangeDetectorRef.markForCheck() or detectChanges()).

    An async pipe emits a new value.

    👉 When Angular sees an @Input() reference changed, it calls ngOnChanges().
    If the parent mutates the same object/array instead of passing a new reference, Angular won’t detect a change → ngOnChanges() won’t fire.

    ✅ Example 1: Works (new reference)
    @Input() data!: number[];

    ngOnChanges(changes: SimpleChanges) {
      console.log('ngOnChanges fired', changes);
    }


    Parent:

    this.data = [...this.data, 5]; or if data is signal: data.set(); // new array or new reference


    Angular sees a new reference → triggers ngOnChanges() → change detection runs.

    ❌ Example 2: Doesn’t work (same reference)
    this.data.push(5); // mutated in place


    Reference is the same → Angular doesn’t see change → ngOnChanges() doesn’t run with OnPush.

    ✅ Fix for mutations

    Either always create new objects/arrays for @Input values,

    Or manually trigger change detection in the child:

    constructor(private cdr: ChangeDetectorRef) {}

    update() {
      this.cdr.markForCheck(); // schedules detection
    }
*/

/* Angular OnPush ≈ React’s React.memo / useMemo or useCallback/PureComponent.
@Input() reference check ≈ React prop shallow compare.
markForCheck() in Angular ≈ React’s setState/useState/useSignal trigger.*/ 

/* Perfect 👍 You’ve shared an **Angular component** that renders a Highcharts pie chart (`ChartSummaryComponent`). Let’s break it down into **Inputs, Outputs, Processing, Method Flow, Data Flow, and a Flowchart** so you have a complete documentation-ready view.

---

## 🔹 Inputs

* **`data`** (`ChartData[]`):

  * An array of objects containing chart data (e.g., `{ name: string, y: number }` for pie slices).
  * Passed in as an `@Input()` from the parent component.

---

## 🔹 Outputs

* **Rendered Pie Chart** in the DOM, bound to `highcharts-angular`.
* **Dynamic updates** to the chart when `data` changes (`ngOnChanges`).
* **Interactive legend and tooltips** for user interaction.

---

## 🔹 Processing

1. **Initialization (`ngOnInit`)**

   * Sets up the chart series with the initial `data`.
   * Configures chart type (`pie`), options, and legend.

2. **Change Detection (`ngOnChanges`)**

   * Listens for updates to the `data` input.
   * If `data` changes:

     * Updates the `series[0].data` with the new values.
     * Triggers chart re-render (`updateFlag = true`).

3. **Chart Rendering**

   * The `<highcharts-chart>` directive renders the chart using the updated `chartOptions`.

---

## 🔹 Method Flow (Step-by-Step)

```
Parent Component
   |
   |--- passes @Input() data to ---> ChartSummaryComponent
                                          |
                                          |--- ngOnInit()
                                          |        -> sets chartOptions.series[0] = { type: 'pie', data }
                                          |
                                          |--- ngOnChanges()
                                                   -> detects changes in data
                                                   -> updates series[0] with new data
                                                   -> sets updateFlag = true
                                          |
                                          |--- HighchartsChartModule
                                                   -> renders pie chart with options
```

---

## 🔹 Data Flow (Textual Diagram)

```
[Parent Component Data] 
         │
         ▼
   @Input() data
         │
         ▼
[ChartSummaryComponent]
   │
   ├── ngOnInit → initializes chartOptions.series with data
   │
   └── ngOnChanges → updates chartOptions.series when data changes
         │
         ▼
[chartOptions + updateFlag]
         │
         ▼
<highcharts-chart>
         │
         ▼
[Rendered Pie Chart in Browser]
```

---

## 🔹 ASCII Flowchart

```
         ┌─────────────────────────┐
         │  Parent Component Data  │
         └───────────┬─────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ ChartSummaryComponent│
          └───────────┬─────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
     ┌───────────────┐   ┌───────────────┐
     │   ngOnInit     │   │  ngOnChanges  │
     │ - set series   │   │ - detect data │
     │ - init chart   │   │ - update data │
     └───────┬────────┘   │ - set flag   │
             │             └───────┬─────┘
             ▼                     ▼
       ┌─────────────────────────────────┐
       │   chartOptions + updateFlag     │
       └─────────────────┬───────────────┘
                         ▼
             ┌─────────────────────────┐
             │ <highcharts-chart> DOM │
             └───────────┬────────────┘
                         ▼
              ┌─────────────────────────┐
              │  Interactive Pie Chart  │
              └─────────────────────────┘
```

---

✅ So in summary:

* **Input**: `ChartData[]` from parent
* **Processing**: Chart setup + reactive updates via Angular lifecycle
* **Output**: A fully interactive pie chart in the DOM

---

Do you want me to **add a sequence diagram** (like UML-style steps between Angular lifecycle, parent, and Highcharts) in addition to this flowchart?
 */