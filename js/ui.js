/**
 * UI Module
 * Handles all rendering and display logic
 */

/**
 * Shows loading state
 */
function showLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.remove('hidden');
    hideError();
    hideScoutResults();
}

/**
 * Hides loading state
 */
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.add('hidden');
}

/**
 * Shows error message
 */
function showError(message) {
    const errorState = document.getElementById('errorState');
    const errorText = document.getElementById('errorText');
    if (errorState && errorText) {
        errorText.textContent = message;
        errorState.classList.remove('hidden');
    }
    hideLoading();
    hideScoutResults();
}

/**
 * Hides error message
 */
function hideError() {
    const errorState = document.getElementById('errorState');
    if (errorState) errorState.classList.add('hidden');
}

/**
 * Shows scout search results
 */
function showScoutResults() {
    const resultsSection = document.getElementById('scoutResultsSection');
    if (resultsSection) resultsSection.classList.remove('hidden');
}

/**
 * Hides scout search results
 */
function hideScoutResults() {
    const resultsSection = document.getElementById('scoutResultsSection');
    if (resultsSection) resultsSection.classList.add('hidden');
}

/**
 * Renders search suggestions dropdown
 */
function renderSearchSuggestions(suggestions, query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    if (!query || query.trim().length === 0 || !Array.isArray(suggestions) || suggestions.length === 0) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.classList.add('hidden');
        return;
    }
    
    // Show top 5 suggestions
    const topSuggestions = suggestions.slice(0, 5);
    
    suggestionsContainer.innerHTML = topSuggestions.map((scout, index) => `
        <div 
            class="suggestion-item" 
            onclick="selectScout('${scout.fullName.replace(/'/g, "\\'")}')"
            onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'"
            onmouseout="this.style.background='transparent'"
        >
            <span class="font-semibold">${scout.fullName}</span>
        </div>
    `).join('');
    
    suggestionsContainer.classList.remove('hidden');
}

/**
 * Renders scout event history (past + future)
 */
function renderScoutHistory(scoutName, futureEvents, pastEvents) {
    const resultsSection = document.getElementById('scoutResultsSection');
    if (!resultsSection) return;
    
    // Calculate event statistics
    const totalPast = Array.isArray(pastEvents) ? pastEvents.length : 0;
    const totalFuture = Array.isArray(futureEvents) ? futureEvents.length : 0;
    
    // Calculate total days attended
    let totalDays = 0;
    if (Array.isArray(pastEvents)) {
        pastEvents.forEach(event => {
            if (event.startDate && event.endDate) {
                try {
                    const start = new Date(event.startDate);
                    const end = new Date(event.endDate);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    totalDays += days;
                } catch (e) {
                    // Invalid date, skip
                }
            }
        });
    }
    
    let html = `
        <div class="scout-profile-card">
            <div class="scout-header">
                <h2 class="text-3xl font-bold mb-2">${scoutName}</h2>
                <div class="scout-stats">
                    <div class="stat-badge">
                        <span class="stat-number">${totalPast}</span>
                        <span class="stat-label">Past Events</span>
                    </div>
                    <div class="stat-badge">
                        <span class="stat-number">${totalFuture}</span>
                        <span class="stat-label">Upcoming</span>
                    </div>
                    <div class="stat-badge">
                        <span class="stat-number">${totalDays}</span>
                        <span class="stat-label">Total Days</span>
                    </div>
                </div>
            </div>
    `;
    
    // Future Events Section
    if (Array.isArray(futureEvents) && futureEvents.length > 0) {
        html += `
            <div class="events-section">
                <h3 class="section-title upcoming">📅 Upcoming Events</h3>
                <div class="events-list">
        `;
        
        // Sort future events by date (soonest first)
        const sortedFuture = [...futureEvents].sort((a, b) => {
            const dateA = new Date(a.startDate || 0);
            const dateB = new Date(b.startDate || 0);
            return dateA - dateB;
        });
        
        sortedFuture.forEach(event => {
            const startDate = formatDate(event.startDate);
            const endDate = event.endDate && event.endDate !== event.startDate 
                ? ` - ${formatDate(event.endDate)}` 
                : '';
            const category = event.category ? `<span class="event-category">${event.category}</span>` : '';
            
            // Calculate event length
            let eventLength = '';
            if (event.startDate && event.endDate) {
                try {
                    const start = new Date(event.startDate);
                    const end = new Date(event.endDate);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    eventLength = days === 1 ? '1 day' : `${days} days`;
                } catch (e) {
                    eventLength = '';
                }
            }
            
            html += `
                <div class="event-card future">
                    <div class="event-header">
                        <h4 class="event-name">${event.eventName || 'Unnamed Event'}</h4>
                        ${category}
                    </div>
                    <p class="event-date">${startDate}${endDate}</p>
                    ${eventLength ? `<p class="event-length">${eventLength}</p>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="events-section">
                <h3 class="section-title upcoming">📅 Upcoming Events</h3>
                <p class="no-events">No upcoming events</p>
            </div>
        `;
    }
    
    // Past Events Section
    if (Array.isArray(pastEvents) && pastEvents.length > 0) {
        html += `
            <div class="events-section">
                <h3 class="section-title past">📚 Past Events (History)</h3>
                <div class="events-list">
        `;
        
        // Sort past events by date (newest first)
        const sortedPast = [...pastEvents].sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate || 0);
            const dateB = new Date(b.endDate || b.startDate || 0);
            return dateB - dateA;
        });
        
        sortedPast.forEach(event => {
            const startDate = formatDate(event.startDate);
            const endDate = event.endDate && event.endDate !== event.startDate 
                ? ` - ${formatDate(event.endDate)}` 
                : '';
            
            // Calculate event length
            let eventLength = '';
            if (event.startDate && event.endDate) {
                try {
                    const start = new Date(event.startDate);
                    const end = new Date(event.endDate);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    eventLength = days === 1 ? '1 day' : `${days} days`;
                } catch (e) {
                    eventLength = '';
                }
            }
            
            const category = event.category ? `<span class="event-category">${event.category}</span>` : '';
            
            html += `
                <div class="event-card past">
                    <div class="event-header">
                        <h4 class="event-name">${event.eventName}</h4>
                        ${category}
                    </div>
                    <p class="event-date">${startDate}${endDate}</p>
                    ${eventLength ? `<p class="event-length">${eventLength}</p>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="events-section">
                <h3 class="section-title past">📚 Past Events (History)</h3>
                <p class="no-events">No past events recorded</p>
            </div>
        `;
    }
    
    html += `
        </div>
    `;
    
    resultsSection.innerHTML = html;
    showScoutResults();
}

/**
 * Formats a date string for display
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * Renders statistics overview
 * FIXED: Separates scouts from adults, counts each separately with deduplication
 * FIXED: Counts unique scouts/adults across ALL events (not per event)
 */
function renderStatistics(futureEvents, pastEvents) {
    // Count unique scouts using Set (excludes adults)
    // FIXED: Count across all events, not per event (no duplicates)
    const uniqueScouts = new Set();
    const uniqueAdults = new Set();
    
    // From future events
    if (Array.isArray(futureEvents)) {
        futureEvents.forEach(event => {
            // Count scouts (exclude adults) - deduplicate across all events
            if (event && Array.isArray(event.scouts)) {
                event.scouts.forEach(scout => {
                    if (scout) {
                        uniqueScouts.add(String(scout).toLowerCase().trim());
                    }
                });
            }
            // Count adults separately - deduplicate across all events
            if (event && Array.isArray(event.adults)) {
                event.adults.forEach(adult => {
                    if (adult) {
                        uniqueAdults.add(String(adult).toLowerCase().trim());
                    }
                });
            }
        });
    }
    
    // From past events
    if (Array.isArray(pastEvents)) {
        pastEvents.forEach(event => {
            // Count scouts (exclude adults) - deduplicate across all events
            if (event && Array.isArray(event.scouts)) {
                event.scouts.forEach(scout => {
                    if (scout) {
                        uniqueScouts.add(String(scout).toLowerCase().trim());
                    }
                });
            }
            // Count adults separately - deduplicate across all events
            if (event && Array.isArray(event.adults)) {
                event.adults.forEach(adult => {
                    if (adult) {
                        uniqueAdults.add(String(adult).toLowerCase().trim());
                    }
                });
            }
        });
    }
    
    const totalScoutsEl = document.getElementById('totalScouts');
    const totalAdultsEl = document.getElementById('totalAdults');
    const totalFutureEventsEl = document.getElementById('totalFutureEvents');
    const totalPastEventsEl = document.getElementById('totalPastEvents');
    
    if (totalScoutsEl) totalScoutsEl.textContent = uniqueScouts.size;
    if (totalAdultsEl) totalAdultsEl.textContent = uniqueAdults.size;
    if (totalFutureEventsEl) totalFutureEventsEl.textContent = Array.isArray(futureEvents) ? futureEvents.length : 0;
    if (totalPastEventsEl) totalPastEventsEl.textContent = Array.isArray(pastEvents) ? pastEvents.length : 0;
}

// Export API
window.UI = {
    showLoading,
    hideLoading,
    showError,
    hideError,
    showScoutResults,
    hideScoutResults,
    renderSearchSuggestions,
    renderScoutHistory,
    formatDate,
    renderStatistics
};

