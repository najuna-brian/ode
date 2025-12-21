import React, { ReactNode, useState, useEffect } from 'react';
import { Box, Paper, Stack, Button } from '@mui/material';

interface FormLayoutProps {
  /**
   * The main form content to display
   */
  children: ReactNode;

  /**
   * Previous button configuration
   */
  previousButton?: {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
  };

  /**
   * Next button configuration
   */
  nextButton?: {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
  };

  /**
   * Optional header content (e.g., progress bar)
   */
  header?: ReactNode;

  /**
   * Additional padding at the bottom of content area (in pixels)
   * Default: 120px to ensure content is never hidden behind navigation
   */
  contentBottomPadding?: number;

  /**
   * Whether to show navigation buttons
   * Default: true
   */
  showNavigation?: boolean;
}

/**
 * FormLayout Component
 *
 * A robust, responsive layout component for forms that:
 * - Prevents navigation buttons from overlapping form content
 * - Handles mobile keyboard appearance correctly
 * - Ensures all form fields are scrollable and accessible
 * - Uses dynamic viewport height (100dvh) for proper mobile support
 *
 * Layout Structure:
 * - Header area (sticky at top, optional)
 * - Scrollable content area (flexible, with bottom padding)
 * - Navigation bar (sticky at bottom, non-overlapping)
 */
const FormLayout: React.FC<FormLayoutProps> = ({
  children,
  previousButton,
  nextButton,
  header,
  contentBottomPadding = 120,
  showNavigation = true,
}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;

      const handleViewportChange = () => {
        if (!viewport) return;

        const heightDifference = window.innerHeight - viewport.height;
        const keyboardThreshold = 150;
        setIsKeyboardVisible(heightDifference > keyboardThreshold);
      };

      viewport.addEventListener('resize', handleViewportChange);
      viewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();

      return () => {
        viewport.removeEventListener('resize', handleViewportChange);
        viewport.removeEventListener('scroll', handleViewportChange);
      };
    } else {
      // Fallback for browsers without Visual Viewport API
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const initialHeight = window.screen.height;
        setIsKeyboardVisible(currentHeight < initialHeight * 0.75);
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh', // Dynamic viewport height - adapts to mobile keyboard
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        // Ensure proper rendering on all devices
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Header Area - Sticky at top (optional) */}
      {header && (
        <Box
          sx={{
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'background.default',
            // Add subtle shadow for visual separation
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          {header}
        </Box>
      )}

      {/* Scrollable Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          // Use -webkit-overflow-scrolling for smooth iOS scrolling
          WebkitOverflowScrolling: 'touch',
          // Add padding to prevent content from being hidden behind navigation
          paddingBottom: `${contentBottomPadding}px`,
          // Ensure proper scrolling behavior when keyboard appears
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </Box>

      {/* Navigation Bar - Sticky at bottom, non-overlapping */}
      {/* Hide navigation when keyboard is visible to prevent covering content */}
      {showNavigation && (previousButton || nextButton) && !isKeyboardVisible && (
        <Paper
          elevation={3}
          sx={{
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            width: '100%',
            padding: { xs: 1.5, sm: 2 },
            backgroundColor: 'background.paper',
            // Add border-top for visual separation
            borderTop: '1px solid',
            borderColor: 'divider',
            // Ensure it stays above content
            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{
              // Full-width buttons on mobile, auto-width on larger screens
              '& > *': {
                flex: { xs: 1, sm: '0 1 auto' },
                minWidth: { xs: 'auto', sm: '120px' },
              },
            }}
          >
            {previousButton && (
              <Button
                variant="outlined"
                onClick={previousButton.onClick}
                disabled={previousButton.disabled}
                fullWidth={false}
                sx={{
                  // Ensure buttons are touch-friendly (Material Design minimum: 48dp)
                  minHeight: { xs: '48px', sm: '48px' },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                }}
              >
                {previousButton.label || 'Previous'}
              </Button>
            )}
            {nextButton && (
              <Button
                variant="contained"
                onClick={nextButton.onClick}
                disabled={nextButton.disabled}
                fullWidth={false}
                sx={{
                  // Ensure buttons are touch-friendly (Material Design minimum: 48dp)
                  minHeight: { xs: '48px', sm: '48px' },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                }}
              >
                {nextButton.label || 'Next'}
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default FormLayout;
