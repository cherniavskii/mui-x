import * as React from 'react';
import {
  GridRowId,
  GridRowTreeConfig,
  GridRowTreeNodeConfig,
  GridFilterState,
} from '@mui/x-data-grid-pro';
import { GridAggregatedFilterItemApplier } from '@mui/x-data-grid-pro/internals';
import { DataGridPremiumProcessedProps } from '../../../models/dataGridPremiumProps';
import { GridRowGroupingModel } from './gridRowGroupingInterfaces';
import { GridStatePremium } from '../../../models/gridStatePremium';
import { gridRowGroupingSanitizedModelSelector } from './gridRowGroupingSelector';
import { GridApiPremium } from '../../../models/gridApiPremium';

export const GRID_ROW_GROUPING_SINGLE_GROUPING_FIELD = '__row_group_by_columns_group__';

export const ROW_GROUPING_STRATEGY = 'grouping-columns';

export const getRowGroupingFieldFromGroupingCriteria = (groupingCriteria: string | null) => {
  if (groupingCriteria === null) {
    return GRID_ROW_GROUPING_SINGLE_GROUPING_FIELD;
  }

  return `__row_group_by_columns_group_${groupingCriteria}__`;
};

export const getRowGroupingCriteriaFromGroupingField = (groupingColDefField: string) => {
  const match = groupingColDefField.match(/^__row_group_by_columns_group_(.*)__$/);

  if (!match) {
    return null;
  }

  return match[1];
};

export const isGroupingColumn = (field: string) =>
  field === GRID_ROW_GROUPING_SINGLE_GROUPING_FIELD ||
  getRowGroupingCriteriaFromGroupingField(field) !== null;

interface FilterRowTreeFromTreeDataParams {
  rowTree: GridRowTreeConfig;
  isRowMatchingFilters: GridAggregatedFilterItemApplier | null;
}

/**
 * When filtering a group, we only want to filter according to the items related to this grouping column.
 */
const shouldApplyFilterItemOnGroup = (columnField: string, node: GridRowTreeNodeConfig) => {
  if (columnField === GRID_ROW_GROUPING_SINGLE_GROUPING_FIELD) {
    return true;
  }

  const groupingCriteriaField = getRowGroupingCriteriaFromGroupingField(columnField);

  return groupingCriteriaField === node.groupingField;
};

/**
 * A leaf is visible if it passed the filter
 * A group is visible if all the following criteria are met:
 * - One of its children is passing the filter
 * - It is passing the filter
 */
export const filterRowTreeFromGroupingColumns = (
  params: FilterRowTreeFromTreeDataParams,
): Omit<GridFilterState, 'filterModel'> => {
  const { rowTree, isRowMatchingFilters } = params;
  const visibleRowsLookup: Record<GridRowId, boolean> = {};
  const filteredRowsLookup: Record<GridRowId, boolean> = {};
  const filteredDescendantCountLookup: Record<GridRowId, number> = {};

  const filterTreeNode = (
    node: GridRowTreeNodeConfig,
    areAncestorsPassingChildren: boolean,
    areAncestorsExpanded: boolean,
  ): number => {
    let isMatchingFilters: boolean;
    if (!isRowMatchingFilters) {
      isMatchingFilters = true;
    } else {
      const shouldApplyItem = node.isAutoGenerated
        ? (columnField: string) => shouldApplyFilterItemOnGroup(columnField, node)
        : undefined;

      isMatchingFilters = isRowMatchingFilters(node.id, shouldApplyItem);
    }

    let filteredDescendantCount = 0;
    node.children?.forEach((childId) => {
      const childNode = rowTree[childId];
      const childSubTreeSize = filterTreeNode(
        childNode,
        areAncestorsPassingChildren && isMatchingFilters,
        areAncestorsExpanded && !!node.childrenExpanded,
      );
      filteredDescendantCount += childSubTreeSize;
    });

    let shouldPassFilters: boolean;
    if (!areAncestorsPassingChildren) {
      shouldPassFilters = false;
    } else if (node.children?.length) {
      shouldPassFilters = isMatchingFilters && filteredDescendantCount > 0;
    } else {
      shouldPassFilters = isMatchingFilters;
    }

    visibleRowsLookup[node.id] = shouldPassFilters && areAncestorsExpanded;
    filteredRowsLookup[node.id] = shouldPassFilters;

    if (!shouldPassFilters) {
      return 0;
    }

    filteredDescendantCountLookup[node.id] = filteredDescendantCount;

    if (!node.children && !node.isAutoGenerated) {
      return filteredDescendantCount + 1;
    }

    return filteredDescendantCount;
  };

  const nodes = Object.values(rowTree);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.depth === 0) {
      filterTreeNode(node, true, true);
    }
  }

  return {
    visibleRowsLookup,
    filteredRowsLookup,
    filteredDescendantCountLookup,
  };
};

export const getColDefOverrides = (
  groupingColDefProp: DataGridPremiumProcessedProps['groupingColDef'],
  fields: string[],
) => {
  if (typeof groupingColDefProp === 'function') {
    return groupingColDefProp({
      groupingName: ROW_GROUPING_STRATEGY,
      fields,
    });
  }

  return groupingColDefProp;
};

export const mergeStateWithRowGroupingModel =
  (rowGroupingModel: GridRowGroupingModel) =>
  (state: GridStatePremium): GridStatePremium => ({
    ...state,
    rowGrouping: { ...state.rowGrouping, model: rowGroupingModel },
  });

export const setStrategyAvailability = (
  apiRef: React.MutableRefObject<GridApiPremium>,
  disableRowGrouping: boolean,
) => {
  let isAvailable: () => boolean;
  if (disableRowGrouping) {
    isAvailable = () => false;
  } else {
    isAvailable = () => {
      const rowGroupingSanitizedModel = gridRowGroupingSanitizedModelSelector(apiRef);
      return rowGroupingSanitizedModel.length > 0;
    };
  }

  apiRef.current.unstable_setStrategyAvailability('rowTree', ROW_GROUPING_STRATEGY, isAvailable);
};
