import React from 'react';
import {
  Box,
  TablePagination,
  Select,
  MenuItem,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';

const CustomTablePagination = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
      sx={{
        padding: '16px',
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0e0',
        borderRadius: '0 0 8px 8px',
      }}
    >
      <Typography variant="body2" sx={{ marginRight: 2 }}>
        Rows per page:
      </Typography>
      <FormControl variant="standard" size="small" sx={{ minWidth: 60 }}>
        <InputLabel id="rows-per-page-label" sx={{ display: 'none' }}>
          Rows per page
        </InputLabel>
        <Select
          labelId="rows-per-page-label"
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(e)}
          disableUnderline
          sx={{
            padding: 0,
            '& .MuiSelect-select': {
              padding: '4px 16px',
            },
          }}
        >
          {[5, 10, 25, 50].map((rows) => (
            <MenuItem key={rows} value={rows}>
              {rows}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TablePagination
        component="div"
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        rowsPerPageOptions={[]}
        sx={{
          '& .MuiTablePagination-spacer': {
            flex: 0,
          },
          '& .MuiTablePagination-toolbar': {
            padding: 0,
          },
        }}
        ActionsComponent={({ onPageChange }) => (
          <Box display="flex" alignItems="center">
            <Typography
              variant="body2"
              sx={{ cursor: 'pointer', padding: '0 16px' }}
              onClick={() => onPageChange(null, page - 1)}
              disabled={page === 0}
            >
              {'<'}
            </Typography>
            <Typography
              variant="body2"
              sx={{ cursor: 'pointer', padding: '0 16px' }}
              onClick={() => onPageChange(null, page + 1)}
              disabled={page >= Math.ceil(count / rowsPerPage) - 1}
            >
              {'>'}
            </Typography>
          </Box>
        )}
      />
    </Box>
  );
};

export default CustomTablePagination;
