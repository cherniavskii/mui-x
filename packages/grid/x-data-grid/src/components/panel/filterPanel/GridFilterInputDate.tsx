import * as React from 'react';
import PropTypes from 'prop-types';
import { TextFieldProps } from '@mui/material/TextField';
import { unstable_useId as useId } from '@mui/utils';
import { GridLoadIcon } from '../../icons';
import { GridFilterInputValueProps } from './GridFilterInputValueProps';
import { useGridRootProps } from '../../../hooks/utils/useGridRootProps';

export type GridFilterInputDateProps = GridFilterInputValueProps &
  TextFieldProps & { type?: 'date' | 'datetime-local' };

export const SUBMIT_FILTER_DATE_STROKE_TIME = 500;

function GridFilterInputDate(props: GridFilterInputDateProps) {
  const { item, applyValue, type, apiRef, focusElementRef, InputProps, ...other } = props;
  const filterTimeout = React.useRef<any>();
  const [filterValueState, setFilterValueState] = React.useState('');
  const [applying, setIsApplying] = React.useState(false);
  const id = useId();
  const rootProps = useGridRootProps();

  const onFilterChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      clearTimeout(filterTimeout.current);
      setFilterValueState(event.target.value);

      setIsApplying(true);
      filterTimeout.current = setTimeout(() => {
        applyValue({ ...item, value: new Date(event.target.value) });
        setIsApplying(false);
      }, SUBMIT_FILTER_DATE_STROKE_TIME);
    },
    [applyValue, item],
  );

  React.useEffect(() => {
    return () => {
      clearTimeout(filterTimeout.current);
    };
  }, []);

  React.useEffect(() => {
    const itemValue = item.value ?? '';
    let value = itemValue;
    if (itemValue instanceof Date) {
      const dateCopy = new Date(itemValue);
      // The date picker expects the date to be in the local timezone.
      // But .toISOString() converts it to UTC with zero offset.
      // So we need to remove the timezone offset from the date.
      dateCopy.setMinutes(dateCopy.getMinutes() - dateCopy.getTimezoneOffset());
      if (type === 'date') {
        value = dateCopy.toISOString().substring(0, 10);
      } else if (type === 'datetime-local') {
        value = dateCopy.toISOString().substring(0, 19);
      }
    }
    setFilterValueState(value);
  }, [item.value, type]);

  return (
    <rootProps.components.BaseTextField
      id={id}
      label={apiRef.current.getLocaleText('filterPanelInputLabel')}
      placeholder={apiRef.current.getLocaleText('filterPanelInputPlaceholder')}
      value={filterValueState}
      onChange={onFilterChange}
      variant="standard"
      type={type || 'text'}
      InputLabelProps={{ shrink: true }}
      inputRef={focusElementRef}
      InputProps={{
        ...(applying ? { endAdornment: <GridLoadIcon /> } : {}),
        ...InputProps,
        inputProps: {
          max: type === 'datetime-local' ? '9999-12-31T23:59' : '9999-12-31',
          ...InputProps?.inputProps,
        },
      }}
      {...other}
      {...rootProps.componentsProps?.baseTextField}
    />
  );
}

GridFilterInputDate.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "yarn proptypes"  |
  // ----------------------------------------------------------------------
  apiRef: PropTypes.shape({
    current: PropTypes.object.isRequired,
  }).isRequired,
  applyValue: PropTypes.func.isRequired,
  focusElementRef: PropTypes /* @typescript-to-proptypes-ignore */.oneOfType([
    PropTypes.func,
    PropTypes.object,
  ]),
  item: PropTypes.shape({
    field: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    operator: PropTypes.string.isRequired,
    value: PropTypes.any,
  }).isRequired,
} as any;

export { GridFilterInputDate };
