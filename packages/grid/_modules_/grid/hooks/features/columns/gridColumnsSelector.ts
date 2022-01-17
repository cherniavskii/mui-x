import { createSelector } from 'reselect';
import { GridStateCommunity } from '../../../models/gridState';

export const gridColumnsSelector = (state: GridStateCommunity) => state.columns;

// It includes even the hidden columns
export const allGridColumnsFieldsSelector = (state: GridStateCommunity) => state.columns.all;

export const gridColumnLookupSelector = (state: GridStateCommunity) => state.columns.lookup;

export const allGridColumnsSelector = createSelector(
  allGridColumnsFieldsSelector,
  gridColumnLookupSelector,
  (allFields, lookup) => allFields.map((field) => lookup[field]),
);

export const visibleGridColumnsSelector = createSelector(allGridColumnsSelector, (columns) =>
  columns.filter((c) => c.field != null && !c.hide),
);

export const gridVisibleColumnFieldsSelector = createSelector(
  visibleGridColumnsSelector,
  (visibleColumns) => visibleColumns.map((column) => column.field),
);

export const gridColumnsMetaSelector = createSelector(
  visibleGridColumnsSelector,
  (visibleColumns) => {
    const positions: number[] = [];

    const totalWidth = visibleColumns.reduce((acc, curCol) => {
      positions.push(acc);
      return acc + curCol.computedWidth;
    }, 0);

    return { totalWidth, positions };
  },
);

export const filterableGridColumnsSelector = createSelector(allGridColumnsSelector, (columns) =>
  columns.filter((col) => col.filterable),
);

export const filterableGridColumnsIdsSelector = createSelector(
  filterableGridColumnsSelector,
  (columns) => columns.map((col) => col.field),
);

export const visibleGridColumnsLengthSelector = createSelector(
  visibleGridColumnsSelector,
  (visibleColumns) => visibleColumns.length,
);

export const gridColumnsTotalWidthSelector = createSelector(
  gridColumnsMetaSelector,
  (meta) => meta.totalWidth,
);
