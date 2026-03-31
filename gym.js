/**
 * FitPro Performance Lab - Core Logic
 * Component-based architecture with centralized state management,
 * event delegation, and simulated API layer.
 */

// --- UTILITIES ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- API ABSTRACTION ---
class ApiService {
    static async fetchAppData() {
        const latency = Math.floor(Math.random() * 800) + 400; // Simulated latency
        await wait(latency);

        try {
            const res = await fetch('data.json');
            if(!res.ok) throw new Error("Could not load lab data.");
            return await res.json();
        } catch (err) {
            console.error("[ApiService] Error:", err);
            throw err;
        }
    }

    static async submitApplication(formData) {
        // Send request to real backend
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                throw new Error("Server communication error. Are you running the Node backend or Docker container?");
            }
            
            if(!res.ok) {
                throw new Error(data.error || "Failed to submit application. Please try again.");
            }
            
            // Handle Stripe Checkout Redirect via Session URL
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
                return { success: true, message: "Redirecting to secure online payment..." };
            }

            return { success: true, message: data.message || "Application received! We will be in touch shortly." };
            
        } catch (error) {
            console.error("Backend Error:", error);
            throw new Error(error.message || "Connection to the lab failed. Try again.");
        }
    }
    
    static async claimLeadMagnet(email) {
        try {
            const res = await fetch('/api/magnet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            
            if(!res.ok) throw new Error(data.error || "Failed to send blueprint.");
            
            return { success: true, message: data.message };
        } catch (error) {
            console.error("Magnet Error:", error);
            throw error;
        }
    }
}

// --- STATE MANAGEMENT ---
class Store {
    constructor() {
        this.state = {
            data: {
                classes: [],
                trainers: [],
                pricing: [],
                testimonials: [],
                transformations: []
            },
            ui: {
                programsFilter: 'all',
                bookingStep: 1,
                bookingData: { objective: null, trainer: null, name: '', email: '', phone: '', payment: 'card' },
                scarcityCount: 5,
                isLoading: true,
                error: null
            }
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Actions
    setData(data) {
        this.state.data = { ...this.state.data, ...data };
        this.state.ui.isLoading = false;
        this.notify();
    }

    setError(errorMsg) {
        this.state.ui.error = errorMsg;
        this.state.ui.isLoading = false;
        this.notify();
    }

    setProgramsFilter(filter) {
        this.state.ui.programsFilter = filter;
        this.notify();
    }

    setBookingStep(step) {
        this.state.ui.bookingStep = step;
        this.notify();
    }
    
    updateBookingData(key, value) {
        this.state.ui.bookingData[key] = value;
    }
    
    decrementScarcity() {
        if(this.state.ui.scarcityCount > 1) {
            this.state.ui.scarcityCount -= 1;
            this.notify();
        }
    }
}

// --- UI COMPONENTS ---
class Templates {
    static skeleton(height = '300px') {
        return `<div class="skeleton" style="height: ${height}; width: 100%;"></div>`;
    }

    static error(msg) {
        return `
            <div style="grid-column: 1/-1; padding: var(--spacing-12); text-align: center; border: 1px dashed var(--color-error); border-radius: var(--radius-md);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--color-error); margin-bottom: var(--spacing-4);"></i>
                <p style="color: var(--color-error); font-weight: 600;">System Error</p>
                <p style="color: var(--color-text-muted);">${msg}</p>
                <button class="btn btn--outline mt-4" data-action="retryLoad">Retry Connection</button>
            </div>
        `;
    }

    static testimonialCard(t) {
        return `
            <div class="testimonial-card">
                <p class="testimonial-card__quote">"${t.quote}"</p>
                <div class="testimonial-card__author-wrap">
                    <img src="${t.image}" alt="${t.author}" class="testimonial-card__avatar">
                    <div class="testimonial-card__author-info">
                        <span class="testimonial-card__name">${t.author}</span>
                        <span class="testimonial-card__title">${t.title}</span>
                    </div>
                </div>
            </div>
        `;
    }

    static transformationCard(tr) {
        return `
            <div class="transformation-card">
                <div class="transformation-card__images">
                    <div class="transformation-card__img-box">
                        <span class="transformation-card__label transformation-card__label--before">Before</span>
                        <img src="${tr.image_before}" alt="${tr.name} before" loading="lazy">
                    </div>
                    <div class="transformation-card__img-box">
                        <span class="transformation-card__label transformation-card__label--after">After</span>
                        <img src="${tr.image_after}" alt="${tr.name} after" loading="lazy">
                    </div>
                </div>
                <div class="transformation-card__content">
                    <h3 class="transformation-card__client">${tr.name}</h3>
                    <span class="transformation-card__time"><i class="fa-regular fa-clock"></i> ${tr.timeframe} Evolution</span>
                    <div class="transformation-card__metrics">
                        <div class="metric-box">
                            <span class="metric-box__label">${tr.metric1_label}</span>
                            <div class="metric-box__values">
                                <span class="metric-box__before">${tr.metric1_before}</span>
                                <i class="fa-solid fa-arrow-right metric-box__arrow"></i>
                                <span class="metric-box__after">${tr.metric1_after}</span>
                            </div>
                        </div>
                        <div class="metric-box">
                            <span class="metric-box__label">${tr.metric2_label}</span>
                            <div class="metric-box__values">
                                <span class="metric-box__before">${tr.metric2_before}</span>
                                <i class="fa-solid fa-arrow-right metric-box__arrow"></i>
                                <span class="metric-box__after">${tr.metric2_after}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static programCard(p) {
        return `
            <div class="program-card">
                <div class="program-card__cover">
                    <span class="program-card__tag">${p.category}</span>
                    <img src="${p.image}" alt="${p.title}" class="program-card__img" loading="lazy">
                </div>
                <div class="program-card__content">
                    <h3 class="program-card__title">${p.title}</h3>
                    <p class="program-card__desc">${p.description}</p>
                </div>
            </div>
        `;
    }

    static trainerCard(t) {
        return `
            <div class="trainer-card">
                <img src="${t.image}" alt="${t.name}" class="trainer-card__img" loading="lazy">
                <div class="trainer-card__info">
                    <h3 class="trainer-card__name">${t.name}</h3>
                    <span class="trainer-card__specialty">${t.specialty}</span>
                </div>
            </div>
        `;
    }

    static pricingCard(p, isFeatured) {
        const featClass = isFeatured ? 'pricing-card--featured' : '';
        const featuresHtml = p.features.map(f => `<div class="pricing-feature"><i class="fa-solid fa-check"></i> <span>${f}</span></div>`).join('');
        
        return `
            <div class="pricing-card ${featClass}">
                <h3 class="pricing-card__tier">${p.tier}</h3>
                <div class="pricing-card__price">
                    <span class="pricing-card__currency">$</span>
                    <span>${p.price}</span>
                    <span class="pricing-card__period">/${p.period}</span>
                </div>
                <div class="pricing-features">
                    ${featuresHtml}
                </div>
                <a href="#booking" class="btn ${isFeatured ? 'btn--primary' : 'btn--outline'} btn--full" data-action="navLink">Select Plan</a>
            </div>
        `;
    }
}

// --- APP CONTROLLER ---
class App {
    constructor() {
        this.store = new Store();
        
        // DOM Mount Points
        this.mounts = {
            testimonials: document.getElementById('testimonials-mount'),
            transformations: document.getElementById('transformations-mount'),
            programs: document.getElementById('programs-mount'),
            trainers: document.getElementById('trainers-mount'),
            pricing: document.getElementById('pricing-mount')
        };
        
        // Single listener binding
        this.bindEvents();
        
        // Store subscription
        this.store.subscribe((state) => this.render(state));
    }

    async init() {
        this.initObservers();
        this.initScarcitySim();
        await this.loadData();
    }

    async loadData() {
        // Initial state is loading, render skeletons
        this.renderSkeletons();
        
        try {
            const data = await ApiService.fetchAppData();
            this.store.setData(data); // Triggers render
        } catch (error) {
            this.store.setError(error.message);
        }
    }

    renderSkeletons() {
        const sks = (n, h) => Array(n).fill(Templates.skeleton(h)).join('');
        if(this.mounts.testimonials) this.mounts.testimonials.innerHTML = sks(3, '200px');
        if(this.mounts.transformations) this.mounts.transformations.innerHTML = sks(2, '450px');
        if(this.mounts.programs) this.mounts.programs.innerHTML = sks(3, '380px');
        if(this.mounts.trainers) this.mounts.trainers.innerHTML = sks(4, '400px');
        if(this.mounts.pricing) this.mounts.pricing.innerHTML = sks(3, '500px');
    }

    render(state) {
        if(state.ui.isLoading) return;

        if(state.ui.error) {
            const errorHtml = Templates.error(state.ui.error);
            Object.values(this.mounts).forEach(mount => { if(mount) mount.innerHTML = errorHtml; });
            return;
        }

        // 1. Render Testimonials
        if(this.mounts.testimonials) {
            this.mounts.testimonials.innerHTML = state.data.testimonials.map(t => Templates.testimonialCard(t)).join('');
        }

        // 2. Render Transformations
        if(this.mounts.transformations) {
            this.mounts.transformations.innerHTML = state.data.transformations.map(tr => Templates.transformationCard(tr)).join('');
        }

        // 3. Render Programs (Filtered)
        if(this.mounts.programs) {
            const filtered = state.ui.programsFilter === 'all' 
                ? state.data.classes 
                : state.data.classes.filter(c => c.category === state.ui.programsFilter);
            this.mounts.programs.innerHTML = filtered.map(p => Templates.programCard(p)).join('');
        }

        // 4. Render Trainers
        if(this.mounts.trainers) {
            this.mounts.trainers.innerHTML = state.data.trainers.map(t => Templates.trainerCard(t)).join('');
        }

        // 5. Render Pricing
        if(this.mounts.pricing) {
            this.mounts.pricing.innerHTML = state.data.pricing.map((p, i) => Templates.pricingCard(p, i === 1)).join('');
        }
        
        // 6. Populate Trainer Select Dropdown
        const trainerSelect = document.getElementById('trainer-select');
        if(trainerSelect && trainerSelect.options.length <= 2) {
            const options = state.data.trainers.map(t => `<option value="${t.name}">${t.name} - ${t.specialty}</option>`).join('');
            trainerSelect.innerHTML = `<option value="">Choose your trainer...</option><option value="any">No Preference / Next Available</option>${options}`;
        }

        // 7. Update Form UI
        this.renderFormStep(state.ui.bookingStep);
        
        // 8. Update Scarcity
        const spotsEl = document.getElementById('spots-left');
        if(spotsEl) spotsEl.textContent = state.ui.scarcityCount;
    }
    
    renderFormStep(currentStep) {
        // Update progress bar
        const progressBar = document.getElementById('form-progress-bar');
        if(progressBar) progressBar.style.width = `${(currentStep / 3) * 100}%`;
        
        // Update nav steps
        for(let i=1; i<=3; i++){
            const nav = document.getElementById(`step-nav-${i}`);
            if(!nav) continue;
            if(i <= currentStep) nav.classList.add('is-active');
            else nav.classList.remove('is-active');
        }
        
        // Show/hide steps
        for(let i=1; i<=3; i++){
            const stepEl = document.getElementById(`form-step-${i}`);
            if(!stepEl) continue;
            if(i === currentStep) stepEl.classList.add('is-active');
            else stepEl.classList.remove('is-active');
        }
    }

    // --- EVENT DELEGATION ---
    bindEvents() {
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if(!target) return;

            const action = target.dataset.action;
            
            switch(action) {
                case 'toggleNav':
                    this.toggleMobileNav(target);
                    break;
                case 'navLink':
                    this.closeMobileNav();
                    break;
                case 'retryLoad':
                    this.store.state.ui.isLoading = true;
                    this.store.state.ui.error = null;
                    this.loadData();
                    break;
                case 'filterPrograms':
                    document.querySelectorAll('#programs-filters .btn--filter').forEach(b => b.classList.remove('is-active'));
                    target.classList.add('is-active');
                    this.store.setProgramsFilter(target.dataset.filter);
                    break;
                case 'nextStep':
                    this.handleFormNext(parseInt(target.dataset.step), target);
                    break;
                case 'prevStep':
                    this.store.setBookingStep(parseInt(target.dataset.step) - 1);
                    break;
            }
        });
        
        // Forms specific bindings
        const bookingForm = document.getElementById('booking-form');
        if(bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }
        
        const leadForm = document.getElementById('lead-magnet-form');
        if(leadForm) {
            leadForm.addEventListener('submit', (e) => this.handleLeadMagnetSubmit(e));
        }

        // Scroll event
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if(nav) {
                if(window.scrollY > 50) nav.classList.add('navbar--scrolled');
                else nav.classList.remove('navbar--scrolled');
            }
        }, { passive: true });
    }

    // --- LOGIC HANDLERS ---
    toggleMobileNav(hamburger) {
        const nav = document.getElementById('nav');
        const isActive = hamburger.classList.contains('is-active');
        
        if(isActive) {
            hamburger.classList.remove('is-active');
            nav.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
        } else {
            hamburger.classList.add('is-active');
            nav.classList.add('is-open');
            hamburger.setAttribute('aria-expanded', 'true');
        }
    }
    
    closeMobileNav() {
        const hamburger = document.getElementById('hamburger');
        const nav = document.getElementById('nav');
        if(hamburger && hamburger.classList.contains('is-active')){
            hamburger.classList.remove('is-active');
            nav.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    }

    handleFormNext(currentStep, btn) {
        const stepEl = document.getElementById(`form-step-${currentStep}`);
        
        // Basic Validation
        if(currentStep === 1) {
            const objective = stepEl.querySelector('input[name="objective"]:checked');
            if(!objective) return alert("Please select an objective to continue.");
            this.store.updateBookingData('objective', objective.value);
            this.store.setBookingStep(2);
        }
        else if(currentStep === 2) {
            const trainer = document.getElementById('trainer-select').value;
            if(!trainer) return alert("Please select your preferred trainer.");
            this.store.updateBookingData('trainer', trainer);
            this.store.setBookingStep(3);
        }
    }

    async handleBookingSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const msgEl = document.getElementById('form-message');
        const btn = document.getElementById('submit-btn');

        this.store.updateBookingData('name', form.querySelector('[name="name"]').value);
        this.store.updateBookingData('email', form.querySelector('[name="email"]').value);
        this.store.updateBookingData('phone', form.querySelector('[name="phone"]').value);
        
        const paymentMethod = form.querySelector('input[name="payment"]:checked');
        this.store.updateBookingData('payment', paymentMethod ? paymentMethod.value : 'card');

        btn.classList.add('is-loading');
        msgEl.className = 'form-message mt-4';
        msgEl.textContent = '';

        try {
            const res = await ApiService.submitApplication(this.store.state.ui.bookingData);
            msgEl.textContent = res.message;
            msgEl.classList.add('form-message--success');
            form.reset();
            setTimeout(() => { this.store.setBookingStep(1); msgEl.textContent=''; }, 5000);
        } catch (error) {
            msgEl.textContent = error.message;
            msgEl.classList.add('form-message--error');
        } finally {
            btn.classList.remove('is-loading');
        }
    }
    
    async handleLeadMagnetSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('button');
        const originalText = btn.textContent;
        
        btn.textContent = "Processing...";
        btn.disabled = true;
        
        try {
            await ApiService.claimLeadMagnet(input.value);
            btn.textContent = "Blueprint Sent!";
            btn.style.backgroundColor = "var(--color-success)";
            btn.style.color = "var(--color-bg-base)";
            input.value = '';
        } catch (err) {
            alert(err.message);
            btn.textContent = originalText;
        } finally {
            setTimeout(() => {
                btn.disabled = false;
                if(btn.textContent === "Blueprint Sent!") {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = "var(--color-accent)";
                }
            }, 3000);
        }
    }

    // --- OBSERVERS & EFFECTS ---
    initObservers() {
        // Reveal Animations
        const revealCb = (entries, observer) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        };
        const revealObserver = new IntersectionObserver(revealCb, { rootMargin: "0px 0px -50px 0px", threshold: 0.1 });
        document.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));

        // Number Counters
        const statsCb = (entries, observer) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    const stats = entry.target.querySelectorAll('[data-stat]');
                    stats.forEach(s => {
                        const target = parseFloat(s.dataset.target);
                        const suffix = s.dataset.suffix || '';
                        let count = 0;
                        const duration = 1500;
                        const increment = target / (duration / 16); 

                        const animate = () => {
                            count += increment;
                            if(count >= target) {
                                s.textContent = (target % 1 !== 0 ? target.toFixed(1) : target) + (target > 500 ? '+' : '') + suffix;
                            } else {
                                s.textContent = (target % 1 !== 0 ? count.toFixed(1) : Math.floor(count)) + suffix;
                                requestAnimationFrame(animate);
                            }
                        };
                        requestAnimationFrame(animate);
                    });
                    observer.unobserve(entry.target);
                }
            });
        };
        const statsObserver = new IntersectionObserver(statsCb, { threshold: 0.5 });
        const statsGrid = document.querySelector('.stats-grid');
        if(statsGrid) statsObserver.observe(statsGrid);
    }
    
    initScarcitySim() {
        // Randomly decrement spots every 25-45 seconds to simulate high demand
        setInterval(() => {
            if(Math.random() > 0.5) this.store.decrementScarcity();
        }, Math.floor(Math.random() * 20000) + 25000);
    }
}

// Boot application
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});