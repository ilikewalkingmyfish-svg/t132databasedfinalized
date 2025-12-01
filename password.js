/**
 * Password Protection Module
 * Protects the site with a password before allowing access
 */

const CORRECT_PASSWORD = 'Security4987!';
const AUTH_STORAGE_KEY = 't132_authenticated';

/**
 * Check if user is already authenticated
 */
function isAuthenticated() {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) return false;
    
    try {
        const parsed = JSON.parse(authData);
        // Check if authentication is still valid (expires after 7 days)
        const expirationTime = parsed.expires || 0;
        if (Date.now() > expirationTime) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return false;
        }
        return parsed.authenticated === true;
    } catch (e) {
        return false;
    }
}

/**
 * Set authentication status
 */
function setAuthenticated(authenticated) {
    if (authenticated) {
        // Store authentication for 7 days
        const expirationTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            authenticated: true,
            expires: expirationTime
        }));
    } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}

/**
 * Check password and authenticate
 */
function checkPassword(password) {
    return password === CORRECT_PASSWORD;
}

/**
 * Show password screen
 */
function showPasswordScreen() {
    const passwordScreen = document.getElementById('passwordScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (passwordScreen) {
        passwordScreen.classList.remove('hidden');
    }
    if (mainContent) {
        mainContent.classList.add('hidden');
    }
}

/**
 * Hide password screen and show main content
 */
function hidePasswordScreen() {
    const passwordScreen = document.getElementById('passwordScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (passwordScreen) {
        passwordScreen.classList.add('hidden');
    }
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
}

/**
 * Initialize password protection
 */
function initPasswordProtection() {
    // Check if already authenticated
    if (isAuthenticated()) {
        hidePasswordScreen();
        return true;
    }
    
    // Show password screen
    showPasswordScreen();
    
    // Set up password form handler
    const passwordForm = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('passwordInput');
    const passwordError = document.getElementById('passwordError');
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const enteredPassword = passwordInput ? passwordInput.value : '';
            
            if (checkPassword(enteredPassword)) {
                // Correct password
                setAuthenticated(true);
                hidePasswordScreen();
                
                // Initialize the app
                if (typeof initializeApp === 'function') {
                    initializeApp();
                }
                
                // Start auto-refresh
                if (typeof startAutoRefresh === 'function') {
                    startAutoRefresh();
                }
                
                // Clear error message
                if (passwordError) {
                    passwordError.classList.add('hidden');
                }
            } else {
                // Wrong password
                if (passwordError) {
                    passwordError.classList.remove('hidden');
                    passwordError.textContent = 'Incorrect password. Please try again.';
                }
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }
        });
    }
    
    // Focus password input
    if (passwordInput) {
        setTimeout(() => passwordInput.focus(), 100);
    }
    
    return false;
}

// Export functions
window.PasswordProtection = {
    initPasswordProtection,
    isAuthenticated,
    setAuthenticated,
    checkPassword
};

