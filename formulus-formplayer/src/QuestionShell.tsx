import React, { ReactNode } from 'react';
import { Box, Typography, Alert, Stack, Divider } from '@mui/material';

export interface QuestionShellProps {
  title?: string;
  description?: string;
  required?: boolean;
  error?: string | string[] | null;
  helperText?: ReactNode;
  actions?: ReactNode;
  metadata?: ReactNode;
  children: ReactNode;
}

const normalizeError = (error?: string | string[] | null): string | null => {
  if (!error) return null;
  if (Array.isArray(error)) {
    return error.filter(Boolean).join(', ') || null;
  }
  return error;
};

const QuestionShell: React.FC<QuestionShellProps> = ({
  title,
  description,
  required = false,
  error,
  helperText,
  actions,
  metadata,
  children,
}) => {
  const normalizedError = normalizeError(error);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {(title || description) && (
        <Stack spacing={0.5}>
          {title && (
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {title}
              {required && (
                <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
                  *
                </Box>
              )}
            </Typography>
          )}
          {description && (
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          )}
        </Stack>
      )}

      {normalizedError && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {normalizedError}
        </Alert>
      )}

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {children}
      </Box>

      {(helperText || actions) && (
        <Stack spacing={1}>
          {helperText && (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          )}
          {actions}
        </Stack>
      )}

      {metadata && (
        <Stack spacing={1}>
          <Divider />
          <Box>{metadata}</Box>
        </Stack>
      )}
    </Box>
  );
};

export default QuestionShell;
