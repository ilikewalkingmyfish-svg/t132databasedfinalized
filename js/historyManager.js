/**
 * History Manager Module
 * Simple utility functions for event date management
 * No database needed - works purely from Google Sheets data
 */

/**
 * Checks if an event date has passed (is in the past)
 * @param {string} endDate - Event end date (YYYY-MM-DD format)
 * @returns {boolean} - true if event is in the past
 */
function isEventPast(endDate) {
    if (!endDate) return false;
    
    try {
        const eventDate = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return eventDate < today;
    } catch (error) {
        console.warn('Error parsing date:', endDate, error);
        return false;
    }
}

// Export API
window.HistoryManager = {
    isEventPast
};
