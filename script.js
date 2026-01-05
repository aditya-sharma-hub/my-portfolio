// ULTRA-ADVANCED PORTFOLIO SCRIPT v2.0
// Features: Three.js Particles, Hacker Text Scramble, Generative Audio

const lerp = (a, b, n) => (1 - n) * a + n * b;
const getMousePos = (e) => ({ x: e.clientX, y: e.clientY });

// --- Theme & Preloader ---
window.addEventListener('load', () => {
    // Default to Dark if null
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    // Update Toggle Icon
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        if (savedTheme === 'light') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.classList.add('hidden');
        if (loadingComplete) return;
        loadingComplete = true;
        
        // Init Recruiter Mode from storage
        const recruiterMode = localStorage.getItem('recruiterMode') === 'true';
        if (recruiterMode) {
            document.body.classList.add('recruiter-mode');
            document.getElementById('recruiter-mode-toggle').classList.add('active');
            audio.muted = true;
        } else {
            initThreeJS(); // Start heavy 3D only if not in recruiter mode
        }
    }, 1500);
});
let loadingComplete = false;

// --- Sound Engine (Web Audio API) ---
// --- Sound Engine (Web Audio API) ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = localStorage.getItem('recruiterMode') === 'true'; // Enable based on mode

        // Global unlock for browser autoplay policy
        const unlockAudio = () => {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
    }

    playClick() {
        if (this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume(); // Try resume if still suspended

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // High pitched short blip
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playHover() {
        if (this.muted) return;
        if (this.ctx.state === 'suspended') return; // Don't try to force resume on hover, only click

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Subtle low frequency hum
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
}

const audio = new AudioEngine();

// Attach sounds to interactions
document.querySelectorAll('a, button, .theme-toggle').forEach(el => {
    el.addEventListener('mouseenter', () => audio.playHover());
    el.addEventListener('click', () => audio.playClick());
});


// --- Three.js Background ---
let scene, camera, renderer, particles;
let mouseX = 0, mouseY = 0;

function initThreeJS() {
    const container = document.createElement('div');
    container.id = 'three-canvas';
    document.body.prepend(container);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Geometry - Neural Network Nodes
    const geometry = new THREE.BufferGeometry();
    const count = 300; // Particle count
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 100; // Spread
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.4,
        color: 0x2563eb,
        transparent: true,
        opacity: 0.8
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Connecting Lines
    // (Optimization: Lines are expensive, let's stick to floating particles for performance or use a LinesSegments approach if needed later)

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX - window.innerWidth / 2;
        mouseY = e.clientY - window.innerHeight / 2;
    });

    renderer.setAnimationLoop(animateThree);
}

function animateThree() {


    // Gentle rotation
    particles.rotation.y += 0.001;
    particles.rotation.x += 0.0005;

    // Mouse Interaction
    particles.rotation.x += (mouseY * 0.00005 - particles.rotation.x) * 0.05;
    particles.rotation.y += (mouseX * 0.00005 - particles.rotation.y) * 0.05;

    // Theme color update
    const theme = document.body.getAttribute('data-theme');
    if (particles.material) {
        particles.material.color.setHex(theme === 'dark' ? 0x60a5fa : 0x2563eb);
    }

    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});


// --- Text Scramble Effect ---
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Apply scramble to Hero Title on Hover
const heroTitle = document.querySelector('.hero-title span');
if (heroTitle) {
    const scrambler = new TextScramble(heroTitle);
    const originalText = heroTitle.innerText;

    heroTitle.addEventListener('mouseenter', () => {
        scrambler.setText(originalText);
    });
}


// --- Standard Interactions (Cursor, Scroll, Theme) ---

// Custom Cursor
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');
let mouse = { x: 0, y: 0 };
let followerPos = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
    mouse = getMousePos(e);
    cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
});

function updateCursor() {
    followerPos.x = lerp(followerPos.x, mouse.x, 0.1);
    followerPos.y = lerp(followerPos.y, mouse.y, 0.1);
    follower.style.transform = `translate3d(${followerPos.x}px, ${followerPos.y}px, 0)`;
    requestAnimationFrame(updateCursor);
}
updateCursor();

document.querySelectorAll('a, button, .project-card, .skill-card').forEach(el => {
    el.addEventListener('mouseenter', () => follower.classList.add('hovered'));
    el.addEventListener('mouseleave', () => follower.classList.remove('hovered'));
});

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Icon update
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun');
    icon.classList.toggle('fa-moon');
});

// Recruiter Mode Toggle
const recruiterToggle = document.getElementById('recruiter-mode-toggle');
recruiterToggle.addEventListener('click', () => {
    const isActive = body.classList.toggle('recruiter-mode');
    recruiterToggle.classList.toggle('active');
    localStorage.setItem('recruiterMode', isActive);
    
    audio.muted = isActive;
    
    if (isActive) {
        // Stop Three.js if it exists
        const canvas = document.getElementById('three-canvas');
        if (canvas) canvas.style.display = 'none';
        if (renderer) renderer.setAnimationLoop(null);
    } else {
        // Restart or show Three.js
        const canvas = document.getElementById('three-canvas');
        if (canvas) {
            canvas.style.display = 'block';
            if (renderer) renderer.setAnimationLoop(animateThree);
        } else {
            initThreeJS();
        }
    }
});

// Scroll Progress
window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / scrollHeight) * 100;
    document.getElementById('scroll-progress').style.width = scrollPercent + '%';
});

// Scroll Reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.section-title, .project-card, .skill-card').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
});

// Typing Effect
const typingText = document.querySelector('.typing-text');
const roles = ["Data Scientist", "Machine Learning & AI Analytics", "Data-Driven Problem Solver"]
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function type() {
    if (!typingText) return;
    const currentRole = roles[roleIndex];
    if (isDeleting) {
        typingText.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500;
    }
    setTimeout(type, typeSpeed);
}
type();

// Mobile Menu
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
    });
}

// --- Modal Logic ---
const modalTriggers = document.querySelectorAll('.details-btn');
const closeButtons = document.querySelectorAll('.close-modal');
const modals = document.querySelectorAll('.modal');

// Open Modal
modalTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent jump behavior
        const projectId = btn.getAttribute('data-project');
        const modal = document.getElementById(`modal-${projectId}`);
        if (modal) {
            modal.style.display = 'block';
            // Trigger reflow to enable transition
            modal.offsetHeight;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Stop background scroll
            if (audio) audio.playClick();
        }
    });
});

// Close Modal Function
function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300); // Wait for transition
}

// Close Triggers
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        closeModal(modal);
    });
});

// Click Outside to Close
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// Escape Key to Close
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) closeModal(openModal);
    }
});
