import React, { useState, useCallback, useRef } from 'react';
import { Typography, Box, CircularProgress, Paper, IconButton, Chip } from '@mui/material';
import {
  AttachFile as FileIcon,
  Delete as DeleteIcon,
  InsertDriveFile as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as TextIcon,
} from '@mui/icons-material';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { ControlProps, rankWith, schemaTypeIs, and, schemaMatches } from '@jsonforms/core';
import FormulusClient from './FormulusInterface';
import { FileResult } from './FormulusInterfaceDefinition';
import QuestionShell from './QuestionShell';

// Tester function - determines when this renderer should be used
export const fileQuestionTester = rankWith(
  5, // Priority (higher = more specific)
  and(
    schemaTypeIs('object'), // Expects object data type
    schemaMatches((schema) => schema.format === 'select_file'), // Matches format
  ),
);

const FileQuestionRenderer: React.FC<ControlProps> = ({
  data,
  handleChange,
  path,
  errors,
  schema,
  uischema,
  enabled = true,
  visible = true,
}) => {
  // State management
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const formulusClient = useRef(FormulusClient.getInstance());

  // Extract field ID from path
  const fieldId = path.split('.').pop() || path;

  // Handle file selection via React Native
  const handleFileSelection = useCallback(async () => {
    setIsSelecting(true);
    setError(null);

    try {
      const result: FileResult = await formulusClient.current.requestFile(fieldId);

      if (result.status === 'success' && result.data) {
        // Update form data with the file result
        handleChange(path, result.data);
      }
    } catch (err: any) {
      if (err.status === 'cancelled') {
        // User cancelled - don't show error
        console.log('File selection cancelled by user');
      } else if (err.status === 'error') {
        setError(err.message || 'File selection failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSelecting(false);
    }
  }, [fieldId, handleChange, path]);

  // Handle delete/clear
  const handleDelete = useCallback(() => {
    handleChange(path, null);
    setError(null);
  }, [handleChange, path]);

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon sx={{ color: '#4CAF50' }} />;
    } else if (mimeType === 'application/pdf') {
      return <PdfIcon sx={{ color: '#F44336' }} />;
    } else if (
      mimeType.startsWith('text/') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return <TextIcon sx={{ color: '#2196F3' }} />;
    } else {
      return <DocumentIcon sx={{ color: '#9E9E9E' }} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type label
  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) {
      return 'Image';
    } else if (mimeType === 'application/pdf') {
      return 'PDF';
    } else if (mimeType.includes('document')) {
      return 'Document';
    } else if (mimeType.includes('spreadsheet')) {
      return 'Spreadsheet';
    } else if (mimeType.includes('presentation')) {
      return 'Presentation';
    } else if (mimeType.startsWith('text/')) {
      return 'Text';
    } else {
      return 'File';
    }
  };

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const hasData = data && typeof data === 'object' && data.type === 'file';
  const hasError = errors && (Array.isArray(errors) ? errors.length > 0 : errors.length > 0);
  const validationError = hasError
    ? Array.isArray(errors)
      ? errors.join(', ')
      : (errors as any)
    : null;

  return (
    <QuestionShell
      title={schema.title}
      description={schema.description}
      required={Boolean((uischema as any)?.options?.required ?? (schema as any)?.options?.required)}
      error={error || validationError}
      helperText="Attach a file. Images, PDFs, and documents are supported."
      metadata={
        process.env.NODE_ENV === 'development' ? (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              Debug: fieldId="{fieldId}", path="{path}", format="select_file"
            </Typography>
          </Box>
        ) : undefined
      }
    >
      {/* File Selection Button */}
      {!hasData && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 4, sm: 5 },
            px: 2,
          }}
        >
          <IconButton
            onClick={handleFileSelection}
            disabled={!enabled || isSelecting}
            color="primary"
            size="large"
            sx={{
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
            aria-label="Select file"
          >
            {isSelecting ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              <FileIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            )}
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            {isSelecting ? 'Selecting file...' : 'Tap to select file'}
          </Typography>
        </Box>
      )}

      {/* File Display */}
      {hasData && (
        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getFileIcon(data.mimeType)}
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {data.filename}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={getFileTypeLabel(data.mimeType)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip label={formatFileSize(data.size)} size="small" variant="outlined" />
                    {data.metadata.extension && (
                      <Chip
                        label={`.${data.metadata.extension.toUpperCase()}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 2 }}>
              <IconButton
                onClick={handleFileSelection}
                disabled={!enabled || isSelecting}
                color="primary"
                size="small"
                aria-label="Replace file"
              >
                <FileIcon />
              </IconButton>
              <IconButton
                onClick={handleDelete}
                disabled={!enabled}
                color="error"
                size="small"
                aria-label="Delete file"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}
    </QuestionShell>
  );
};

export default withJsonFormsControlProps(FileQuestionRenderer);
