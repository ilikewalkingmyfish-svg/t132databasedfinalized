/**
 * Search Module
 * Handles fuzzy search for scouts by name
 */

/**
 * Calculates similarity between two strings (Levenshtein distance)
 * Returns a score between 0 (no match) and 1 (exact match)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Calculate Levenshtein distance
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = [];
    
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    const similarity = 1 - (distance / maxLen);
    
    return similarity;
}

/**
 * Extracts all unique scout names from events (excludes adults)
 * Uses Set to deduplicate by full name
 * FIXED: Properly handles events with scouts arrays and separates scouts from adults
 */
function extractUniqueScouts(futureEvents, pastEvents) {
    const scoutSet = new Set();
    const scoutMap = new Map(); // name -> { firstName, lastName, fullName }
    
    // Process future events (events have scouts array, adults array)
    if (Array.isArray(futureEvents)) {
        futureEvents.forEach(event => {
            // Only process scouts, not adults
            if (event && Array.isArray(event.scouts)) {
                event.scouts.forEach(scoutName => {
                    const name = String(scoutName).trim();
                    if (name) {
                        const normalized = name.toLowerCase();
                        scoutSet.add(normalized);
                        if (!scoutMap.has(normalized)) {
                            const parts = name.split(/\s+/);
                            scoutMap.set(normalized, {
                                fullName: name,
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                                normalized: normalized
                            });
                        }
                    }
                });
            }
        });
    }
    
    // Process past events (events have scouts array)
    if (Array.isArray(pastEvents)) {
        pastEvents.forEach(event => {
            // Only process scouts, not adults
            if (event && Array.isArray(event.scouts)) {
                event.scouts.forEach(scoutName => {
                    const name = String(scoutName).trim();
                    if (name) {
                        const normalized = name.toLowerCase();
                        scoutSet.add(normalized);
                        if (!scoutMap.has(normalized)) {
                            const parts = name.split(/\s+/);
                            scoutMap.set(normalized, {
                                fullName: name,
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                                normalized: normalized
                            });
                        }
                    }
                });
            }
        });
    }
    
    return Array.from(scoutMap.values());
}

/**
 * Extracts all unique adult names from events
 * Uses Set to deduplicate by full name
 */
function extractUniqueAdults(futureEvents, pastEvents) {
    const adultSet = new Set();
    const adultMap = new Map(); // name -> { firstName, lastName, fullName }
    
    // Process future events (events have adults array)
    if (Array.isArray(futureEvents)) {
        futureEvents.forEach(event => {
            if (event && Array.isArray(event.adults)) {
                event.adults.forEach(adultName => {
                    const name = String(adultName).trim();
                    if (name) {
                        const normalized = name.toLowerCase();
                        adultSet.add(normalized);
                        if (!adultMap.has(normalized)) {
                            const parts = name.split(/\s+/);
                            adultMap.set(normalized, {
                                fullName: name,
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                                normalized: normalized
                            });
                        }
                    }
                });
            }
        });
    }
    
    // Process past events (check if they have adults array)
    if (Array.isArray(pastEvents)) {
        pastEvents.forEach(event => {
            if (event && Array.isArray(event.adults)) {
                event.adults.forEach(adultName => {
                    const name = String(adultName).trim();
                    if (name) {
                        const normalized = name.toLowerCase();
                        adultSet.add(normalized);
                        if (!adultMap.has(normalized)) {
                            const parts = name.split(/\s+/);
                            adultMap.set(normalized, {
                                fullName: name,
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                                normalized: normalized
                            });
                        }
                    }
                });
            }
        });
    }
    
    return Array.from(adultMap.values());
}

/**
 * Searches for scouts matching the query
 * Supports fuzzy matching and searches first name, last name, and full name
 */
function searchScouts(query, allScouts) {
    if (!query || !query.trim()) {
        return [];
    }
    
    if (!Array.isArray(allScouts) || allScouts.length === 0) {
        return [];
    }
    
    const searchTerm = query.trim().toLowerCase();
    const results = [];
    
    allScouts.forEach(scout => {
        let score = 0;
        
        // Check full name
        const fullNameScore = calculateSimilarity(scout.fullName, searchTerm);
        if (fullNameScore > 0.3) {
            score = Math.max(score, fullNameScore);
        }
        
        // Check first name
        const firstNameScore = calculateSimilarity(scout.firstName, searchTerm);
        if (firstNameScore > 0.3) {
            score = Math.max(score, firstNameScore * 0.9); // Slightly lower weight
        }
        
        // Check last name
        const lastNameScore = calculateSimilarity(scout.lastName, searchTerm);
        if (lastNameScore > 0.3) {
            score = Math.max(score, lastNameScore * 0.9); // Slightly lower weight
        }
        
        // Check if search term is contained in any part
        if (scout.fullName.toLowerCase().includes(searchTerm) ||
            scout.firstName.toLowerCase().includes(searchTerm) ||
            scout.lastName.toLowerCase().includes(searchTerm)) {
            score = Math.max(score, 0.7);
        }
        
        if (score > 0.3) {
            results.push({
                scout,
                score
            });
        }
    });
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    return results.map(r => r.scout);
}

/**
 * Gets all events for a specific scout
 * Searches both future and past events
 * Future events have scouts array, past events have scouts array
 */
function getScoutEvents(scoutName, futureEvents, pastEvents) {
    const normalizedName = scoutName.toLowerCase().trim();
    
    // Filter future events where scout is in the scouts array
    const future = Array.isArray(futureEvents) 
        ? futureEvents.filter(event => 
            event && Array.isArray(event.scouts) && 
            event.scouts.some(name => String(name).toLowerCase().trim() === normalizedName)
        )
        : [];
    
    // Filter past events where scout is in the scouts array
    const past = Array.isArray(pastEvents)
        ? pastEvents.filter(event => 
            event && Array.isArray(event.scouts) && 
            event.scouts.some(name => String(name).toLowerCase().trim() === normalizedName)
        )
        : [];
    
    return {
        future,
        past
    };
}

// Export API
window.Search = {
    calculateSimilarity,
    extractUniqueScouts,
    extractUniqueAdults,
    searchScouts,
    getScoutEvents
};

