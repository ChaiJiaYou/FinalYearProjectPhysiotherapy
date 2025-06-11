// Date formatting utilities
// Format: DD/MMM/YYYY (e.g., 15/Jan/2025)

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('DateTime formatting error:', error);
    return 'Invalid Date';
  }
};

export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Invalid Time';
  }
};

export const formatLastLogin = (rawDate) => {
  if (!rawDate) return "Never";
  
  try {
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return "Invalid Date";
    
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (error) {
    console.error('Last login formatting error:', error);
    return "Invalid Date";
  }
};

// For calendar displays - show long month name
export const formatCalendarDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    });
  } catch (error) {
    console.error('Calendar date formatting error:', error);
    return 'Invalid Date';
  }
};

// For form inputs - return YYYY-MM-DD format
export const formatForInput = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
  } catch (error) {
    console.error('Input formatting error:', error);
    return '';
  }
}; 