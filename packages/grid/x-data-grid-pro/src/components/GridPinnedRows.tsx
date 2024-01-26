import * as React from 'react';
import clsx from 'clsx';
import { unstable_composeClasses as composeClasses } from '@mui/utils';
import { getDataGridUtilityClass, gridClasses, useGridSelector } from '@mui/x-data-grid';
import {
  GridPinnedRowsProps,
  gridPinnedRowsSelector,
  useGridPrivateApiContext,
} from '@mui/x-data-grid/internals';

const useUtilityClasses = () => {
  const slots = {
    root: ['pinnedRows'],
  };
  return composeClasses(slots, getDataGridUtilityClass, {});
};

export function GridPinnedRows({ position, virtualScroller, ...other }: GridPinnedRowsProps) {
  const classes = useUtilityClasses();
  const apiRef = useGridPrivateApiContext();

  const pinnedRowsData = useGridSelector(apiRef, gridPinnedRowsSelector);
  const pinnedRows = virtualScroller.getRows({
    position,
    rows: pinnedRowsData[position],
  });

  return (
    <div
      {...other}
      className={clsx(classes.root, other.className, gridClasses[`pinnedRows--${position}`])}
      role="presentation"
    >
      {pinnedRows}
    </div>
  );
}
