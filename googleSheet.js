/**
 * Google Sheet Module
 * Loads future event signups from Google Sheets JSON feed
 */

// Google Sheet Configuration
const GOOGLE_SHEET_ID = '1uQ2dc9g1u_aY_H-I8C0Yudy2v00FASwYZdcortLOKaA';
const GOOGLE_SHEET_GID = '375114749';
const SHEET_JSON_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${GOOGLE_SHEET_GID}`;

/**
 * Fetches future event signups from Google Sheet
 * @returns {Promise<Object>} Parsed sheet data with columns and rows
 */
async function loadFutureEvents() {
    try {
        const response = await fetch(SHEET_JSON_URL, {
            cache: 'no-store',
            headers: { 
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
        }
        
        // Google Sheets wraps JSON in a callback function
        const text = await response.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\)/s);
        
        if (!jsonMatch || !jsonMatch[1]) {
            throw new Error('Invalid response format from Google Sheets. Make sure the sheet is publicly viewable.');
        }
        
        // Parse the JSON
        const data = JSON.parse(jsonMatch[1]);
        
        if (!data.table || !data.table.rows) {
            throw new Error('Invalid table structure in Google Sheets response');
        }
        
        // Parse the table structure
        const parsedData = parseSheetData(data.table);
        
        console.log('Future events loaded from Google Sheet:', parsedData.rows.length, 'rows');
        
        return parsedData;
        
    } catch (error) {
        console.error('Error loading future events:', error);
        throw error;
    }
}

/**
 * Parses Google Sheets table structure into our format
 */
function parseSheetData(table) {
    // Safely extract column names
    const columns = (table && table.cols && Array.isArray(table.cols))
        ? table.cols.map(col => (col && col.label) ? col.label : '').filter(col => col !== '')
        : [];
    
    // Safely extract rows
    const rows = [];
    
    if (table && table.rows && Array.isArray(table.rows)) {
        table.rows.forEach((row) => {
            if (row && row.c && Array.isArray(row.c)) {
                const rowData = {};
                
                // Map each cell to its column
                row.c.forEach((cell, index) => {
                    const columnName = (columns[index]) ? columns[index] : `Column${index + 1}`;
                    const value = (cell && cell.v !== null && cell.v !== undefined)
                        ? String(cell.v)
                        : '';
                    rowData[columnName] = value;
                });
                
                // Only add row if it has data
                if (Object.values(rowData).some(val => val && val.trim() !== '')) {
                    rows.push(rowData);
                }
            }
        });
    }
    
    return {
        columns: columns.length > 0 ? columns : [],
        rows: rows
    };
}

/**
 * Extracts event information from a row
 * Matches the actual Google Sheet structure:
 * - Column B: "Which event did you signup for?" (Event name with date)
 * - Column C: "First Name"
 * - Column D: "Last Name"
 */
function extractEventFromRow(row, columns) {
    // Find event name column (Column B: "Which event did you signup for?")
    const eventCol = columns.find(col => 
        col.toLowerCase().includes('event') && 
        col.toLowerCase().includes('signup')
    ) || columns.find(col => 
        col.toLowerCase().includes('event') || 
        col.toLowerCase().includes('activity')
    ) || columns[1] || 'Event'; // Fallback to column index 1 (B)
    
    // Find first name column (Column C)
    const firstNameCol = columns.find(col => 
        col.toLowerCase().includes('first') && 
        col.toLowerCase().includes('name')
    ) || columns[2] || 'First Name'; // Fallback to column index 2 (C)
    
    // Find last name column (Column D)
    const lastNameCol = columns.find(col => 
        col.toLowerCase().includes('last') && 
        col.toLowerCase().includes('name')
    ) || columns[3] || 'Last Name'; // Fallback to column index 3 (D)
    
    // Find patrol/adult column (Column G: "Patrol Leader - Patrol?")
    const patrolCol = columns.find(col => 
        col.toLowerCase().includes('patrol') || 
        col.toLowerCase().includes('leader')
    ) || columns[6] || 'Patrol Leader - Patrol?'; // Fallback to column index 6 (G)
    
    // Get values
    const eventNameFull = row[eventCol] || '';
    const firstName = row[firstNameCol] || '';
    const lastName = row[lastNameCol] || '';
    const patrolValue = row[patrolCol] || '';
    
    // Combine first and last name
    const scoutName = `${firstName} ${lastName}`.trim();
    
    // Check if this is an adult (column G contains "Adult" or "adult")
    const isAdult = patrolValue && String(patrolValue).toLowerCase().includes('adult');
    
    // Parse event name and date from the event string
    // Format: "2025 - 11/29 - Leaf Center Service Project (2 pm - 4 pm)"
    // or: "2025 - 12/13 - Patrick Zhang Eagle Project Day #3"
    let eventName = eventNameFull.trim();
    let startDate = '';
    let endDate = '';
    let category = '';
    
    // Extract date from event name (format: "2025 - 11/29" or "2025 - MM/DD")
    const dateMatch = eventName.match(/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        startDate = `${year}-${month}-${day}`;
        endDate = startDate; // Default to same day if no end date specified
        
        // Try to extract end date from time range like "(2 pm - 4 pm)"
        // For now, assume single day events unless specified otherwise
    }
    
    // Clean event name (remove date prefix)
    eventName = eventName.replace(/^\d{4}\s*-\s*\d{1,2}\/\d{1,2}\s*-\s*/, '').trim();
    
    // Extract category from event name patterns
    if (eventName.toLowerCase().includes('eagle project')) {
        category = 'Eagle Project';
    } else if (eventName.toLowerCase().includes('service project')) {
        category = 'Service Project';
    } else if (eventName.toLowerCase().includes('fundraiser')) {
        category = 'Fundraiser';
    } else if (eventName.toLowerCase().includes('camp')) {
        category = 'Camping';
    } else {
        category = 'Other';
    }
    
    return {
        scoutName: scoutName,
        eventName: eventName,
        startDate: startDate,
        endDate: endDate,
        category: category,
        isAdult: isAdult,
        rawRow: row
    };
}

// Export API
window.GoogleSheet = {
    loadFutureEvents,
    parseSheetData,
    extractEventFromRow
};

