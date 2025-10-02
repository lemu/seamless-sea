# Multi-Level Order Table Implementation Guide

This guide provides step-by-step instructions for implementing a 3-level hierarchical order table with collapsible groups, exactly as shown in the "Multi-Level Order Table" story in Tide UI.

## Table of Contents
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [Column Configuration](#column-configuration)
4. [DataTable Setup](#datatable-setup)
5. [Complete Example](#complete-example)

---

## Overview

The Multi-Level Order Table demonstrates a hierarchical structure with:
- **Level 1**: Orders with aggregated counterparties
- **Level 2**: Broker groups (rendered as section headers)
- **Level 3**: Individual offers with full details

**Key Features:**
- Collapsible rows with chevron icons
- Auto-expansion of child rows when parent is expanded
- Custom section headers for broker groups
- Horizontal border styling
- Initial expanded state configuration

---

## Data Structure

### TypeScript Interface

```typescript
interface OrderData {
  id: string
  counterparty: string
  broker?: string  // Broker field for grouping (not shown in columns)
  type: string
  stage: string
  laycan: string
  vessel: string
  lastBid: string
  lastOffer: string
  demurrage: string
  tce: string
  validity: string
  isBrokerGroup?: boolean  // Flag to identify Level 2 broker groups
  children?: OrderData[]    // Nested children (Level 2 or Level 3)
}
```

### Data Generation Example

```typescript
const generateMultiLevelOrderData = (): OrderData[] => {
  const counterparties = ['Teekay Corp', 'Frontline Ltd.', 'Maran Tankers', 'Seaspan', 'Euronav NV', 'Minerva Marine']
  const brokers = ['Clarksons', 'Gibson Shipbrokers', 'Braemar ACM']
  const vessels = ['Copper Spirit', 'Front Sparta', 'Maran Poseidon', 'Cedar', 'Minerva Vera', 'Ocean Voyager', 'Trinity']

  // Level 3: Individual Offer
  const generateIndividualOffer = (counterparty: string, broker: string, index: number): OrderData => ({
    id: '',  // Empty ID for individual offers
    counterparty,
    broker,
    type: '',
    stage: 'Offer',
    laycan: `${20 + index} Feb 2025 — ${21 + index} Feb 2025`,
    vessel: vessels[Math.floor(Math.random() * vessels.length)],
    lastBid: `WS ${90 + Math.floor(Math.random() * 10)}-${95 + Math.floor(Math.random() * 5)}`,
    lastOffer: `WS ${90 + Math.floor(Math.random() * 10)}-${96 + Math.floor(Math.random() * 5)}`,
    demurrage: `$${(Math.random() * 30000 + 60000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
    tce: Math.random() > 0.5 ? `$${(Math.random() * 100000 + 200000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : '-',
    validity: '-',
  })

  // Level 2: Broker Group (section header)
  const generateBrokerGroup = (broker: string, counterpartiesList: string[]): OrderData => ({
    id: `broker-${broker.toLowerCase().replace(/\s/g, '-')}`,
    counterparty: broker,  // Display broker name
    broker,
    type: '',
    stage: '',
    laycan: '',
    vessel: '',
    lastBid: '',
    lastOffer: '',
    demurrage: '',
    tce: '',
    validity: '',
    isBrokerGroup: true,  // Mark as section header
    children: counterpartiesList.map((cp, i) => generateIndividualOffer(cp, broker, i))
  })

  // Level 1: Order (top-level aggregation)
  const generateOrder = (id: string, counterpartiesList: string[]): OrderData => {
    const uniqueCounterparties = [...new Set(counterpartiesList)]
    const displayCounterparty = uniqueCounterparties.length > 2
      ? `${uniqueCounterparties.slice(0, 2).join(', ')} + ${uniqueCounterparties.length - 2}`
      : uniqueCounterparties.join(', ')

    const allOffers = counterpartiesList.length
    const minDemurrage = 69900
    const maxDemurrage = 93100

    // Generate broker groups
    const brokerGroups = [
      generateBrokerGroup('Clarksons', counterpartiesList.slice(0, 3)),
      generateBrokerGroup('Gibson Shipbrokers', counterpartiesList.slice(3, 6)),
    ].filter(group => group.children && group.children.length > 0)

    return {
      id,
      counterparty: displayCounterparty,
      type: '+/-',
      stage: 'Active',
      laycan: '25 Nov 2025 — 26 nov 2025',
      vessel: `${allOffers} options`,
      lastBid: 'WS 90-95',
      lastOffer: 'WS 90-95',
      demurrage: `$${minDemurrage.toLocaleString()}-${maxDemurrage.toLocaleString()}`,
      tce: '-',
      validity: '-',
      children: brokerGroups
    }
  }

  return [
    generateOrder('QW74M3D', ['Teekay Corp', 'Frontline Ltd.', 'Maran Tankers', 'Euronav NV', 'Minerva Marine', 'Seaspan']),
    generateOrder('YH35P8A', ['Teekay Corp', 'Frontline Ltd.', 'Maran Tankers', 'Euronav NV', 'Minerva Marine', 'Seaspan', 'Ocean Yield', 'Star Bulk']),
    generateOrder('TR90YH', ['Maran Tankers', 'Frontline Ltd.']),
    generateOrder('QW74M3D', ['Teekay Corp', 'Frontline Ltd.', 'Maran Tankers', 'Euronav NV', 'Minerva Marine', 'Seaspan']),
  ]
}
```

---

## Column Configuration

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@rafal.lemieszewski/tide-ui'
import { cn } from '@rafal.lemieszewski/tide-ui'

const orderColumns: ColumnDef<OrderData>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="font-mono text-body-sm text-[var(--color-text-primary)]">
        {row.getValue('id')}
      </div>
    ),
  },
  {
    accessorKey: 'counterparty',
    header: 'Counterparty',
    cell: ({ row }) => {
      const isBroker = row.original.isBrokerGroup
      return (
        <div className={cn(
          isBroker ? 'font-medium text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
        )}>
          {row.getValue('counterparty')}
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const value = row.getValue('type') as string
      return value ? <div className="text-center">{value}</div> : null
    },
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => {
      const stage = row.getValue('stage') as string
      if (!stage) return null
      return (
        <Badge variant={stage === 'Active' ? 'default' : 'secondary'} className="text-caption-sm">
          {stage}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'laycan',
    header: 'Laycan',
    cell: ({ row }) => (
      <div className="text-body-sm text-[var(--color-text-primary)]">
        {row.getValue('laycan')}
      </div>
    ),
  },
  {
    accessorKey: 'vessel',
    header: 'Vessel',
    cell: ({ row }) => {
      const vessel = row.getValue('vessel') as string
      const isOptions = vessel?.includes('options')
      return (
        <div className={cn(
          'text-body-sm',
          isOptions ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
        )}>
          {vessel}
        </div>
      )
    },
  },
  {
    accessorKey: 'lastBid',
    header: 'Last bid',
    cell: ({ row }) => (
      <div className="text-body-sm text-[var(--color-text-primary)]">
        {row.getValue('lastBid')}
      </div>
    ),
  },
  {
    accessorKey: 'lastOffer',
    header: 'Last offer',
    cell: ({ row }) => (
      <div className="text-body-sm font-medium text-[var(--color-text-primary)]">
        {row.getValue('lastOffer')}
      </div>
    ),
  },
  {
    accessorKey: 'demurrage',
    header: 'Demurrage',
    cell: ({ row }) => (
      <div className="text-body-sm text-[var(--color-text-primary)]">
        {row.getValue('demurrage')}
      </div>
    ),
  },
  {
    accessorKey: 'tce',
    header: 'TCE',
    cell: ({ row }) => {
      const value = row.getValue('tce') as string
      return (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {value || '-'}
        </div>
      )
    },
  },
  {
    accessorKey: 'validity',
    header: 'Validity',
    cell: ({ row }) => {
      const value = row.getValue('validity') as string
      return (
        <div className="text-body-sm text-[var(--color-text-primary)]">
          {value || '-'}
        </div>
      )
    },
  },
]
```

---

## DataTable Setup

### Basic Configuration

```typescript
import { DataTable, Icon } from '@rafal.lemieszewski/tide-ui'
import { useState } from 'react'

export function MultiLevelOrderTable() {
  const [data] = useState(() => generateMultiLevelOrderData())

  // Set initial expanded state - expand first order and all its broker groups
  const initialExpanded = useState(() => {
    const expanded: Record<string, boolean> = {}
    // Expand the first order (index 0 in the row model)
    expanded['0'] = true
    // Expand all broker groups within the first order
    expanded['0.0'] = true
    expanded['0.1'] = true
    return expanded
  })[0]

  return (
    <DataTable
      data={data}
      columns={orderColumns}
      enableExpanding={true}
      getSubRows={(row) => row.children}
      title="Shipping Orders"
      borderStyle="horizontal"
      autoExpandChildren={true}
      initialState={{
        expanded: initialExpanded
      }}
      renderSectionHeaderRow={(row) => {
        // Check if this row is a broker group (Level 2)
        if (row.original.isBrokerGroup) {
          const broker = row.original.counterparty
          const canExpand = row.getCanExpand()
          const isExpanded = row.getIsExpanded()

          return (
            <div className="flex items-center gap-[var(--space-sm)] h-7 px-[var(--space-md)] pl-[var(--space-xlg)]">
              {canExpand && (
                <button
                  onClick={row.getToggleExpandedHandler()}
                  className="flex h-[var(--size-sm)] w-[var(--size-sm)] items-center justify-center rounded-sm text-[var(--color-text-secondary)] hover:bg-[var(--blue-100)] hover:text-[var(--color-text-primary)]"
                >
                  <Icon
                    name={isExpanded ? "chevron-down" : "chevron-right"}
                    className="h-3 w-3"
                  />
                </button>
              )}
              <span className="text-body-strong-sm text-[var(--color-text-secondary)]">
                {broker}
              </span>
            </div>
          )
        }
        return null
      }}
    />
  )
}
```

### Key DataTable Props Explained

| Prop | Type | Description |
|------|------|-------------|
| `enableExpanding` | `boolean` | Enables row expansion functionality |
| `getSubRows` | `(row) => row.children` | Tells the table how to access child rows |
| `borderStyle` | `"horizontal"` | Shows horizontal borders between rows |
| `autoExpandChildren` | `boolean` | When parent expands, automatically expand all children |
| `initialState.expanded` | `Record<string, boolean>` | Set which rows are expanded on mount |
| `renderSectionHeaderRow` | `(row) => ReactNode` | Custom renderer for section headers (broker groups) |

### Initial Expanded State

The expanded state uses dot notation for hierarchical indices:
- `'0'` - First top-level order
- `'0.0'` - First broker group within first order
- `'0.1'` - Second broker group within first order
- `'1'` - Second top-level order
- `'1.0'` - First broker group within second order

```typescript
const initialExpanded: Record<string, boolean> = {
  '0': true,      // Expand first order
  '0.0': true,    // Expand first broker group
  '0.1': true,    // Expand second broker group
}
```

---

## Complete Example

```typescript
import { DataTable, Icon, Badge } from '@rafal.lemieszewski/tide-ui'
import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'

// 1. Define data structure
interface OrderData {
  id: string
  counterparty: string
  broker?: string
  type: string
  stage: string
  laycan: string
  vessel: string
  lastBid: string
  lastOffer: string
  demurrage: string
  tce: string
  validity: string
  isBrokerGroup?: boolean
  children?: OrderData[]
}

// 2. Generate data (use functions from Data Structure section above)
const data = generateMultiLevelOrderData()

// 3. Configure columns (use columns from Column Configuration section above)
const columns = orderColumns

// 4. Render the table
export function ShippingOrdersTable() {
  const [data] = useState(() => generateMultiLevelOrderData())

  const initialExpanded = useState(() => ({
    '0': true,
    '0.0': true,
    '0.1': true,
  }))[0]

  return (
    <div className="p-[var(--space-lg)]">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-[var(--space-lg)]">
          <h2 className="text-heading-lg mb-[var(--space-sm)]">
            Multi-Level Order Table
          </h2>
          <p className="text-body-md text-[var(--color-text-secondary)] mb-[var(--space-sm)]">
            A 3-level hierarchical structure demonstrating order aggregation with
            collapsible broker groups and individual offers. Click chevron icons to
            expand/collapse levels.
          </p>
          <div className="bg-[var(--color-background-accent-subtle)] border border-[var(--color-border-accent-subtle)] rounded-md p-[var(--space-md)]">
            <div className="flex items-center gap-[var(--space-sm)]">
              <Icon name="info" className="h-4 w-4 text-[var(--color-text-accent)]" />
              <span className="text-body-sm text-[var(--color-text-accent)]">
                Level 1: Orders with aggregated counterparties → Level 2: Broker groups →
                Level 3: Individual offers with full details
              </span>
            </div>
          </div>
        </div>

        <DataTable
          data={data}
          columns={columns}
          enableExpanding={true}
          getSubRows={(row) => row.children}
          title="Shipping Orders"
          borderStyle="horizontal"
          autoExpandChildren={true}
          initialState={{
            expanded: initialExpanded
          }}
          renderSectionHeaderRow={(row) => {
            if (row.original.isBrokerGroup) {
              const broker = row.original.counterparty
              const canExpand = row.getCanExpand()
              const isExpanded = row.getIsExpanded()

              return (
                <div className="flex items-center gap-[var(--space-sm)] h-7 px-[var(--space-md)] pl-[var(--space-xlg)]">
                  {canExpand && (
                    <button
                      onClick={row.getToggleExpandedHandler()}
                      className="flex h-[var(--size-sm)] w-[var(--size-sm)] items-center justify-center rounded-sm text-[var(--color-text-secondary)] hover:bg-[var(--blue-100)] hover:text-[var(--color-text-primary)]"
                    >
                      <Icon
                        name={isExpanded ? "chevron-down" : "chevron-right"}
                        className="h-3 w-3"
                      />
                    </button>
                  )}
                  <span className="text-body-strong-sm text-[var(--color-text-secondary)]">
                    {broker}
                  </span>
                </div>
              )
            }
            return null
          }}
        />
      </div>
    </div>
  )
}
```

---

## Customization Tips

### 1. Change Hierarchy Depth
Modify the data generation to add/remove levels by adjusting the `children` structure.

### 2. Different Section Header Styles
Customize the `renderSectionHeaderRow` function to change colors, spacing, or add icons.

### 3. Conditional Expansion
Use `autoExpandChildren={false}` to require manual expansion of each level.

### 4. Custom Expand Icons
Replace the chevron icons with custom SVGs or Icon component variants.

### 5. Add Action Columns
Add action buttons to specific levels (e.g., edit/delete buttons only on Level 3).

### 6. Programmatic Expansion
Control expansion state externally:

```typescript
const [expanded, setExpanded] = useState<Record<string, boolean>>({})

// Expand all rows
const expandAll = () => {
  const allExpanded = {}
  // Logic to expand all rows
  setExpanded(allExpanded)
}

<DataTable
  state={{ expanded }}
  onExpandedChange={setExpanded}
  // ... other props
/>
```

---

## Troubleshooting

### Issue: Children not showing
- Ensure `getSubRows={(row) => row.children}` is set
- Verify `children` property exists in your data
- Check that `enableExpanding={true}` is set

### Issue: Section headers not rendering
- Confirm `isBrokerGroup` flag is set on Level 2 rows
- Verify `renderSectionHeaderRow` function is defined
- Check that the row has the correct structure

### Issue: Initial expansion not working
- Use correct dot notation for indices (`'0'`, `'0.0'`, etc.)
- Ensure `initialState.expanded` is set before render
- Verify row indices match your data structure

### Issue: Auto-expand not working
- Set `autoExpandChildren={true}`
- Ensure parent rows have `children` array
- Check that child rows are properly nested

---

## Related Documentation

- [DataTable API Reference](https://github.com/lemu/tide-ui)
- [TanStack Table Expanding Docs](https://tanstack.com/table/v8/docs/guide/expanding)
- [Tide UI Design Tokens](https://github.com/lemu/tide-ui/blob/main/CLAUDE.md)

---

**Last Updated:** 2025-10-02
**Tide UI Version:** 0.21.0+
