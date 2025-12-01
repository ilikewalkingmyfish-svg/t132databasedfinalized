/**
 * T132 Event Database - Main Application Script
 * Simple, manual version - Works entirely from Google Sheets
 * No database needed - just fetches and displays data
 * 
 * Google Sheet: https://docs.google.com/spreadsheets/d/1uQ2dc9g1u_aY_H-I8C0Yudy2v00FASwYZdcortLOKaA/edit?gid=375114749
 */

// ============================================
// APPLICATION STATE
// ============================================
let futureEvents = [];
let pastEvents = [];
let allScouts = [];
let selectedScout = null;
let autoRefreshInterval = null;
let searchTimeout = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 * Loads events directly from Google Sheets - simple and manual
 */
async function initializeApp() {
    try {
        window.UI.showLoading();
        window.UI.hideError();
        
        // Fetch from Google Sheet
        const sheetData = await window.GoogleSheet.loadFutureEvents();
        const allEvents = convertSheetToEvents(sheetData);
        console.log('Loaded events from Google Sheet:', allEvents.length);
        
        // Separate future and past events based on date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        futureEvents = [];
        pastEvents = [];
        
        allEvents.forEach(event => {
            const eventDate = new Date(event.endDate || event.startDate);
            eventDate.setHours(0, 0, 0, 0);
            
            if (eventDate < today) {
                pastEvents.push(event);
            } else {
                futureEvents.push(event);
            }
        });
        
        console.log('Initialized events:', {
            future: futureEvents.length,
            past: pastEvents.length
        });
        
        // Extract unique scouts (excludes adults)
        allScouts = window.Search.extractUniqueScouts(futureEvents, pastEvents);
        console.log('Extracted unique scouts:', allScouts.length);
        
        // Render statistics
        window.UI.renderStatistics(futureEvents, pastEvents);
        
        // Show search section
        const searchSection = document.getElementById('searchSection');
        if (searchSection) searchSection.classList.remove('hidden');
        
        // Show export section (for backup)
        const exportSection = document.getElementById('exportSection');
        if (exportSection) exportSection.classList.remove('hidden');
        
        // Show stats
        const statsSection = document.getElementById('statsSection');
        if (statsSection) statsSection.classList.remove('hidden');
        
        // Set up search input listener
        setupSearchListener();
        
        window.UI.hideLoading();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        window.UI.showError('Failed to load event data: ' + error.message);
    }
}

/**
 * Converts Google Sheet data to event objects
 * Groups signups by event (one event can have multiple scouts)
 * FIXED: Properly deduplicates scouts per event
 */
function convertSheetToEvents(sheetData) {
    if (!sheetData || !Array.isArray(sheetData.rows)) {
        return [];
    }
    
    const eventsMap = new Map(); // eventKey -> { eventName, startDate, endDate, category, scouts: [], adults: [] }
    const columns = sheetData.columns || [];
    
    // Process each row as a signup
    sheetData.rows.forEach(row => {
        const eventInfo = window.GoogleSheet.extractEventFromRow(row, columns);
        
        if (eventInfo.eventName && eventInfo.startDate && eventInfo.scoutName) {
            // Create unique key for this event (by name and date)
            const eventKey = `${eventInfo.eventName}_${eventInfo.startDate}_${eventInfo.endDate}`.toLowerCase();
            
            if (!eventsMap.has(eventKey)) {
                // Create new event
                eventsMap.set(eventKey, {
                    eventName: eventInfo.eventName,
                    startDate: eventInfo.startDate,
                    endDate: eventInfo.endDate || eventInfo.startDate,
                    category: eventInfo.category,
                    scouts: [],
                    adults: []
                });
            }
            
            // Add scout or adult to this event (deduplicate within event)
            const event = eventsMap.get(eventKey);
            const personName = eventInfo.scoutName.trim();
            
            if (personName) {
                if (eventInfo.isAdult) {
                    // Add to adults list (deduplicate)
                    if (!event.adults.includes(personName)) {
                        event.adults.push(personName);
                    }
                } else {
                    // Add to scouts list (deduplicate)
                    if (!event.scouts.includes(personName)) {
                        event.scouts.push(personName);
                    }
                }
            }
        }
    });
    
    // Convert map to array
    return Array.from(eventsMap.values());
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

/**
 * Sets up search input listener with debouncing
 */
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            handleSearch(query);
        }, 300); // 300ms delay
    });
    
    // Handle Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                const suggestions = window.Search.searchScouts(query, allScouts);
                if (suggestions.length > 0) {
                    selectScout(suggestions[0].fullName);
                }
            }
        }
    });
}

/**
 * Handles search input
 */
function handleSearch(query) {
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
    }
    
    if (!query || query.length === 0) {
        window.UI.renderSearchSuggestions([], '');
        window.UI.hideScoutResults();
        return;
    }
    
    // Get search suggestions
    const suggestions = window.Search.searchScouts(query, allScouts);
    window.UI.renderSearchSuggestions(suggestions, query);
    
    // If exact match, auto-select
    const exactMatch = suggestions.find(s => 
        s.fullName.toLowerCase() === query.toLowerCase()
    );
    
    if (exactMatch) {
        selectScout(exactMatch.fullName);
    }
}

/**
 * Selects a scout and shows their event history
 */
function selectScout(scoutName) {
    selectedScout = scoutName;
    
    // Update search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = scoutName;
    }
    
    // Hide suggestions
    window.UI.renderSearchSuggestions([], '');
    
    // Get scout's events
    const scoutEvents = window.Search.getScoutEvents(scoutName, futureEvents, pastEvents);
    
    // Render scout history
    window.UI.renderScoutHistory(scoutName, scoutEvents.future, scoutEvents.past);
    
    // Scroll to results
    const resultsSection = document.getElementById('scoutResultsSection');
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Clears search
 */
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    
    window.UI.renderSearchSuggestions([], '');
    window.UI.hideScoutResults();
    selectedScout = null;
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

/**
 * Exports events as JSON (for backup)
 */
function exportEventsJSON() {
    try {
        const data = {
            futureEvents: futureEvents,
            pastEvents: pastEvents,
            exportedAt: new Date().toISOString()
        };
        
        const jsonContent = JSON.stringify(data, null, 2);
        
        // Create download
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'events-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Events JSON exported successfully');
        
        alert('Events backup downloaded! This is a snapshot of current data.');
        
    } catch (error) {
        console.error('Error exporting events:', error);
        alert('Failed to export events: ' + error.message);
    }
}

// ============================================
// AUTO-REFRESH FUNCTIONALITY
// ============================================

/**
 * Start auto-refresh - updates data every 30 seconds
 */
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(async () => {
        console.log('Auto-refreshing data...');
        try {
            // Fetch latest from Google Sheet
            const sheetData = await window.GoogleSheet.loadFutureEvents();
            const allEvents = convertSheetToEvents(sheetData);
            
            // Separate future and past events
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            futureEvents = [];
            pastEvents = [];
            
            allEvents.forEach(event => {
                const eventDate = new Date(event.endDate || event.startDate);
                eventDate.setHours(0, 0, 0, 0);
                
                if (eventDate < today) {
                    pastEvents.push(event);
                } else {
                    futureEvents.push(event);
                }
            });
            
            // Update scouts list
            allScouts = window.Search.extractUniqueScouts(futureEvents, pastEvents);
            
            // Update statistics
            window.UI.renderStatistics(futureEvents, pastEvents);
            
            // If a scout is selected, refresh their view
            if (selectedScout) {
                const scoutEvents = window.Search.getScoutEvents(selectedScout, futureEvents, pastEvents);
                window.UI.renderScoutHistory(selectedScout, scoutEvents.future, scoutEvents.past);
            }
            
            console.log('Data refreshed successfully');
        } catch (error) {
            console.error('Error during auto-refresh:', error);
        }
    }, 30000); // 30 seconds
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ============================================
// PAGE LOAD INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('T132 Event Database loaded...');
    // App initialization is controlled by password protection
    // Password protection will call initializeApp() after authentication
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
});
