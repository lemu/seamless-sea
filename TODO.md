# TODO

## Pending Tasks

### Remove DataTable Skeleton CSS Hack
- **File:** `src/index.css` (lines 135-139)
- **Description:** Remove the CSS workaround that hides `<th>` elements in `<tbody>` once Tide UI fixes the duplicate header row issue in DataTable loading skeleton
- **CSS to remove:**
  ```css
  /* Fix for DataTable skeleton duplicate header row */
  /* Hide <th> elements in tbody during skeleton loading */
  tbody th {
    display: none;
  }
  ```
- **Condition:** Wait for Tide UI library update that fixes the DataTableSkeleton component rendering header rows in both `<thead>` and `<tbody>`
- **Tide UI Issue:** DataTable renders skeleton with duplicate darker rows (1st and 3rd) because DataTableSkeleton uses `<th>` elements for its first row in both header and body sections
- **Related Files:**
  - `src/routes/Fixtures.tsx` (DataTable with `isLoading` prop)
  - `src/routes/TradeDesk.tsx` (DataTable with `isLoading` prop)
