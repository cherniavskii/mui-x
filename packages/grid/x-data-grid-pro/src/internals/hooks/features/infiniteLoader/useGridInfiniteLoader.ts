import * as React from 'react';
import {
  useGridSelector,
  GridEvents,
  GridEventListener,
  GridScrollParams,
  useGridApiEventHandler,
  useGridApiOptionHandler,
  visibleGridColumnsSelector,
  gridRowsMetaSelector,
  unstable_useCurrentPageRows as useCurrentPageRows,
} from '@mui/x-data-grid';
import { GridApiRefPro, GridRowScrollEndParams } from '../../../models';
import { DataGridProProcessedProps } from '../../../models/dataGridProProps';

/**
 * Only available in DataGridPro
 * @requires useGridColumns (state)
 * @requires useGridDimensions (method) - can be after
 * @requires useGridScroll (method
 */
export const useGridInfiniteLoader = (
  apiRef: GridApiRefPro,
  props: Pick<
    DataGridProProcessedProps,
    'onRowsScrollEnd' | 'scrollEndThreshold' | 'pagination' | 'paginationMode'
  >,
): void => {
  const visibleColumns = useGridSelector(apiRef, visibleGridColumnsSelector);
  const currentPage = useCurrentPageRows(apiRef, props);
  const rowsMeta = useGridSelector(apiRef, gridRowsMetaSelector);
  const contentHeight = Math.max(rowsMeta.currentPageTotalHeight, 1);

  const isInScrollBottomArea = React.useRef<boolean>(false);

  const handleRowsScrollEnd = React.useCallback(
    (scrollPosition: GridScrollParams) => {
      const dimensions = apiRef.current.getRootDimensions();
      if (!dimensions) {
        return;
      }

      const scrollPositionBottom = scrollPosition.top + dimensions.viewportOuterSize.height;
      const viewportPageSize = apiRef.current.unstable_getViewportPageSize();

      if (scrollPositionBottom < contentHeight - props.scrollEndThreshold) {
        isInScrollBottomArea.current = false;
      }

      if (
        scrollPositionBottom >= contentHeight - props.scrollEndThreshold &&
        !isInScrollBottomArea.current
      ) {
        const rowScrollEndParam: GridRowScrollEndParams = {
          visibleColumns,
          viewportPageSize,
          virtualRowsCount: currentPage.rows.length,
        };
        apiRef.current.publishEvent(GridEvents.rowsScrollEnd, rowScrollEndParam);
        isInScrollBottomArea.current = true;
      }
    },
    [contentHeight, props.scrollEndThreshold, visibleColumns, apiRef, currentPage.rows.length],
  );

  const handleGridScroll = React.useCallback<GridEventListener<GridEvents.rowsScroll>>(
    ({ left, top }) => {
      handleRowsScrollEnd({ left, top });
    },
    [handleRowsScrollEnd],
  );

  useGridApiEventHandler(apiRef, GridEvents.rowsScroll, handleGridScroll);
  useGridApiOptionHandler(apiRef, GridEvents.rowsScrollEnd, props.onRowsScrollEnd);
};
