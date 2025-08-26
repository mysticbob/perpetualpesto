/**
 * Ovie EatIt Marketing Website JavaScript
 * Handles interactive features, animations, form validation, and Stripe integration
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Main app initialization
function initializeApp() {
    initializeNavigation();
    initializeSmoothScrolling();
    initializeAnimations();
    initializeForms();
    initializeExitIntent();
    initializePricingCalculator();
    initializeAnalytics();
    
    // Initialize Stripe if on signup page
    if (window.location.pathname.includes('signup.html')) {
        initializeStripe();
    }
}

// Navigation functionality
function initializeNavigation() {
    const nav = document.querySelector('.nav-sticky');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    
    // Handle scroll effects
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            nav.classList.add('nav-scrolled');
        } else {
            nav.classList.remove('nav-scrolled');
        }
    });
    
    // Mobile menu toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.toggle('mobile-active');
            mobileToggle.classList.toggle('active');
        });
    }
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Intersection Observer for animations
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate in
    document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card, .problem-stat').forEach(el => {
        observer.observe(el);
    });
    
    // Counter animations for stats
    initializeCounters();
}

// Animate numbers counting up
function initializeCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.7
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                animateCounter(entry.target);
                entry.target.classList.add('counted');
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/[^0-9]/g, ''));
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Format the number based on original text
        const originalText = element.textContent;
        if (originalText.includes('$')) {
            element.textContent = '$' + Math.floor(current).toLocaleString();
        } else if (originalText.includes('%')) {
            element.textContent = Math.floor(current) + '%';
        } else if (originalText.includes('hrs')) {
            element.textContent = Math.floor(current) + 'hrs';
        } else if (originalText.includes('K')) {
            element.textContent = Math.floor(current) + 'K+';
        } else if (originalText.includes('M')) {
            element.textContent = '$' + (current / 1000000).toFixed(1) + 'M';
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Form handling and validation
function initializeForms() {
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
    
    // Contact forms
    document.querySelectorAll('form[data-form-type]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Real-time validation
    document.querySelectorAll('input[required], select[required]').forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    
    if (validateEmail(email)) {
        // Simulate API call
        showNotification('Thanks for subscribing! You\'ll receive our first newsletter soon.', 'success');
        form.reset();
        
        // Track conversion
        trackEvent('newsletter_signup', { email: email });
    } else {
        showNotification('Please enter a valid email address.', 'error');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formType = form.dataset.formType;
    
    // Validate all required fields
    let isValid = true;
    form.querySelectorAll('input[required], select[required]').forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    if (isValid) {
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Processing...';
        submitButton.disabled = true;
        
        // Simulate form submission
        setTimeout(() => {
            showNotification('Form submitted successfully!', 'success');
            form.reset();
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            // Track conversion
            trackEvent('form_submit', { form_type: formType });
        }, 1500);
    }
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    clearFieldError(e);
    
    // Required field check
    if (field.hasAttribute('required') && !value) {
        errorMessage = 'This field is required.';
        isValid = false;
    }
    
    // Email validation
    else if (field.type === 'email' && value && !validateEmail(value)) {
        errorMessage = 'Please enter a valid email address.';
        isValid = false;
    }
    
    // Phone validation
    else if (field.type === 'tel' && value && !validatePhone(value)) {
        errorMessage = 'Please enter a valid phone number.';
        isValid = false;
    }
    
    // Password validation
    else if (field.type === 'password' && value && value.length < 8) {
        errorMessage = 'Password must be at least 8 characters long.';
        isValid = false;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function showFieldError(field, message) {
    field.classList.add('error');
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Exit intent popup
function initializeExitIntent() {
    const popup = document.getElementById('exitIntentPopup');
    const closeBtn = document.getElementById('popupClose');
    const claimBtn = document.getElementById('exitClaim');
    
    if (!popup) return;
    
    let hasShown = false;
    let mouseLeaveTimer;
    
    // Show popup when mouse leaves viewport
    document.addEventListener('mouseleave', function(e) {
        if (e.clientY <= 0 && !hasShown && !sessionStorage.getItem('exitIntentShown')) {
            mouseLeaveTimer = setTimeout(() => {
                showExitIntent();
            }, 500);
        }
    });
    
    // Cancel popup if mouse returns quickly
    document.addEventListener('mouseenter', function() {
        if (mouseLeaveTimer) {
            clearTimeout(mouseLeaveTimer);
        }
    });
    
    // Show popup after time on page
    setTimeout(() => {
        if (!hasShown && !sessionStorage.getItem('exitIntentShown')) {
            showExitIntent();
        }
    }, 60000); // 1 minute
    
    // Close popup handlers
    if (closeBtn) {
        closeBtn.addEventListener('click', hideExitIntent);
    }
    
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            hideExitIntent();
        }
    });
    
    // Claim discount handler
    if (claimBtn) {
        claimBtn.addEventListener('click', function() {
            const email = document.getElementById('exitEmail').value;
            if (validateEmail(email)) {
                // Track conversion
                trackEvent('exit_intent_conversion', { email: email });
                
                // Redirect to signup with discount
                window.location.href = '/marketing/signup.html?discount=SAVE20&email=' + encodeURIComponent(email);
            } else {
                showNotification('Please enter a valid email address.', 'error');
            }
        });
    }
    
    function showExitIntent() {
        popup.style.display = 'flex';
        hasShown = true;
        sessionStorage.setItem('exitIntentShown', 'true');
        trackEvent('exit_intent_shown');
    }
    
    function hideExitIntent() {
        popup.style.display = 'none';
        trackEvent('exit_intent_closed');
    }
}

// Pricing calculator functionality
function initializePricingCalculator() {
    const toggles = document.querySelectorAll('.billing-toggle');
    const prices = document.querySelectorAll('.plan-price');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('change', updatePricing);
    });
    
    function updatePricing() {
        const isAnnual = document.querySelector('.billing-toggle:checked')?.value === 'annual';
        
        prices.forEach(priceElement => {
            const monthlyPrice = parseFloat(priceElement.dataset.monthly || 0);
            const annualPrice = parseFloat(priceElement.dataset.annual || 0);
            
            if (isAnnual) {
                priceElement.querySelector('.price').textContent = '$' + Math.floor(annualPrice / 12);
                priceElement.querySelector('.period').textContent = '/month';
                
                // Show savings
                const savings = monthlyPrice * 12 - annualPrice;
                if (savings > 0) {
                    priceElement.querySelector('.plan-savings').textContent = `Save $${savings} annually`;
                    priceElement.querySelector('.plan-savings').style.display = 'block';
                }
            } else {
                priceElement.querySelector('.price').textContent = '$' + monthlyPrice;
                priceElement.querySelector('.period').textContent = '/month';
                priceElement.querySelector('.plan-savings').style.display = 'none';
            }
        });
    }
}

// Stripe integration
let stripe;
let elements;

function initializeStripe() {
    // Initialize Stripe with test key
    stripe = Stripe('pk_test_51234567890abcdef'); // Replace with your test publishable key
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
    
    // Handle plan selection
    const planButtons = document.querySelectorAll('.plan-select-btn');
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.dataset.plan;
            selectPlan(plan);
        });
    });
    
    // Initialize Stripe Elements
    if (document.getElementById('card-element')) {
        initializeStripeElements();
    }
}

function initializeStripeElements() {
    elements = stripe.elements();
    
    const style = {
        base: {
            fontSize: '16px',
            color: '#1A1B18',
            fontFamily: 'Poppins, sans-serif',
            '::placeholder': {
                color: '#6C757D',
            },
        },
    };
    
    const cardElement = elements.create('card', { style: style });
    cardElement.mount('#card-element');
    
    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
}

function selectPlan(planName) {
    // Update UI to show selected plan
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`[data-plan="${planName}"]`).closest('.plan-card');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Store selected plan
    sessionStorage.setItem('selectedPlan', planName);
    
    // Update form if present
    const planInput = document.getElementById('selectedPlan');
    if (planInput) {
        planInput.value = planName;
    }
    
    trackEvent('plan_selected', { plan: planName });
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
        // Create payment method
        const { token, error } = await stripe.createToken(elements.getElement('card'));
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Collect form data
        const formData = new FormData(form);
        const userData = {
            email: formData.get('email'),
            name: formData.get('name'),
            plan: formData.get('plan') || sessionStorage.getItem('selectedPlan'),
            stripeToken: token.id
        };
        
        // Submit to your backend
        const response = await submitSignup(userData);
        
        if (response.success) {
            // Redirect to success page or dashboard
            window.location.href = '/dashboard?welcome=true';
            trackEvent('signup_completed', { plan: userData.plan });
        } else {
            throw new Error(response.message || 'Signup failed');
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
        trackEvent('signup_failed', { error: error.message });
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

async function submitSignup(userData) {
    // Mock API call - replace with your actual endpoint
    return new Promise((resolve) => {
        setTimeout(() => {
            if (userData.email && userData.name) {
                resolve({ success: true });
            } else {
                resolve({ success: false, message: 'Please fill in all required fields.' });
            }
        }, 1500);
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        removeNotification(notification);
    });
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('notification-show');
    }, 10);
}

function removeNotification(notification) {
    notification.classList.remove('notification-show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Analytics and tracking
function initializeAnalytics() {
    // Track page views
    trackEvent('page_view', {
        page: window.location.pathname,
        title: document.title
    });
    
    // Track scroll depth
    let maxScroll = 0;
    let scrollMarkers = [25, 50, 75, 90];
    
    window.addEventListener('scroll', throttle(() => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            
            // Check if we've hit any new markers
            scrollMarkers.forEach(marker => {
                if (scrollPercent >= marker && maxScroll >= marker) {
                    trackEvent('scroll_depth', { depth: marker });
                    scrollMarkers = scrollMarkers.filter(m => m !== marker);
                }
            });
        }
    }, 500));
    
    // Track time on page
    let startTime = Date.now();
    let hasTracked30s = false;
    let hasTracked60s = false;
    
    setInterval(() => {
        const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
        
        if (timeOnPage >= 30 && !hasTracked30s) {
            trackEvent('time_on_page', { seconds: 30 });
            hasTracked30s = true;
        }
        
        if (timeOnPage >= 60 && !hasTracked60s) {
            trackEvent('time_on_page', { seconds: 60 });
            hasTracked60s = true;
        }
    }, 1000);
    
    // Track external link clicks
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && !link.href.includes(window.location.hostname)) {
            trackEvent('external_link_click', { url: link.href });
        }
    });
}

function trackEvent(eventName, parameters = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, parameters);
    }
    
    // Console log for development
    console.log('Event tracked:', eventName, parameters);
}

// Utility functions
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Lazy loading for images
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', initializeLazyLoading);

// Add CSS for animations and notifications
const additionalStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        z-index: 10001;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        border-radius: 12px;
        box-shadow: var(--shadow-large);
    }
    
    .notification-show {
        transform: translateX(0);
    }
    
    .notification-content {
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    
    .notification-success {
        background: var(--success-green);
        color: white;
    }
    
    .notification-error {
        background: var(--error-red);
        color: white;
    }
    
    .notification-info {
        background: var(--primary-teal);
        color: white;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0.7;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .field-error {
        color: var(--error-red);
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }
    
    .error {
        border-color: var(--error-red) !important;
    }
    
    .animate-in {
        animation: slideInUp 0.6s ease-out;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .nav-scrolled {
        background: rgba(255, 255, 255, 0.98) !important;
        box-shadow: var(--shadow-small);
    }
    
    .mobile-menu-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    @media (max-width: 768px) {
        .nav-menu.mobile-active {
            display: flex !important;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 2rem;
            box-shadow: var(--shadow-medium);
        }
        
        .nav-menu.mobile-active .nav-link {
            margin: 0.5rem 0;
        }
        
        .notification {
            left: 20px;
            right: 20px;
            max-width: none;
            transform: translateY(-100px);
        }
        
        .notification-show {
            transform: translateY(0);
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);