import { supabase, auth } from './supabaseClient.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const emailLoginForm = document.getElementById('emailLoginForm');
const emailSignupForm = document.getElementById('emailSignupForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const loadingIndicator = document.getElementById('loadingIndicator');

// Helper functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
}

function hideMessages() {
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
}

function showLoading() {
    loadingIndicator.classList.add('show');
}

function hideLoading() {
    loadingIndicator.classList.remove('show');
}

// Check if user is already logged in
async function checkAuth() {
    showLoading();
    try {
        const { data: { session } } = await auth.getSession();
        if (session) {
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    } finally {
        hideLoading();
    }
}

// Google OAuth Login
async function handleGoogleLogin() {
    hideMessages();
    showLoading();
    
    try {
        const { data, error } = await auth.signInWithGoogle();
        
        if (error) {
            showError(error.message);
            hideLoading();
        }
        // If successful, Supabase will redirect to the callback URL
    } catch (error) {
        showError('An unexpected error occurred. Please try again.');
        hideLoading();
        console.error('Google login error:', error);
    }
}

// Email Login
async function handleEmailLogin(e) {
    e.preventDefault();
    hideMessages();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await auth.signInWithEmail(email, password);
        
        if (error) {
            showError(error.message);
            hideLoading();
            return;
        }
        
        if (data.session) {
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        }
    } catch (error) {
        showError('An unexpected error occurred. Please try again.');
        hideLoading();
        console.error('Email login error:', error);
    }
}

// Email Signup
async function handleEmailSignup(e) {
    e.preventDefault();
    hideMessages();
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    showLoading();
    
    try {
        const { data, error } = await auth.signUpWithEmail(email, password);
        
        if (error) {
            showError(error.message);
            hideLoading();
            return;
        }
        
        if (data.user) {
            if (data.user.identities && data.user.identities.length === 0) {
                showError('An account with this email already exists.');
            } else if (data.session) {
                // Auto-confirmed (if email confirmation is disabled)
                showSuccess('Account created! Redirecting...');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                // Email confirmation required
                showSuccess('Account created! Please check your email to confirm your account.');
                emailSignupForm.reset();
            }
        }
        hideLoading();
    } catch (error) {
        showError('An unexpected error occurred. Please try again.');
        hideLoading();
        console.error('Email signup error:', error);
    }
}

// Toggle between login and signup forms
function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    hideMessages();
}

function showLoginForm() {
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    hideMessages();
}

// Event Listeners
googleLoginBtn.addEventListener('click', handleGoogleLogin);
googleSignupBtn.addEventListener('click', handleGoogleLogin);
emailLoginForm.addEventListener('submit', handleEmailLogin);
emailSignupForm.addEventListener('submit', handleEmailSignup);
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

// Listen for auth state changes (handles OAuth callback)
auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        window.location.href = '/dashboard.html';
    }
});

// Check auth on page load
checkAuth();
