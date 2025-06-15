// src/components/SplashScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
    onLoadingComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onLoadingComplete }) => {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [logoVisible, setLogoVisible] = useState(false);
    const [systemsOnline, setSystemsOnline] = useState<Record<string, boolean>>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    // Sistemas que se van activando (con delays más naturales)
    const systems = [
        { id: 'neural', name: 'Neural Networks', delay: 600 },
        { id: 'quantum', name: 'Quantum Core', delay: 1100 },
        { id: 'security', name: 'Security Protocols', delay: 1800 },
        { id: 'nexus', name: 'Nexus Matrix', delay: 2600 },
        { id: 'ai', name: 'AI Systems', delay: 3200 },
        { id: 'data', name: 'Data Streams', delay: 3900 }
    ];

    // Partículas animadas en canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            color: string;
        }> = [];
        const particleCount = 100;

        // Crear partículas
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.5 ? '#6c5ce7' : '#ff6b9d'
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle, index) => {
                // Actualizar posición
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                // Rebote en bordes
                if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

                // Conexiones entre partículas cercanas
                particles.forEach((otherParticle, otherIndex) => {
                    if (index !== otherIndex) {
                        const dx = particle.x - otherParticle.x;
                        const dy = particle.y - otherParticle.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 80) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(108, 92, 231, ${0.1 * (1 - distance / 80)})`;
                            ctx.lineWidth = 0.5;
                            ctx.moveTo(particle.x, particle.y);
                            ctx.lineTo(otherParticle.x, otherParticle.y);
                            ctx.stroke();
                        }
                    }
                });

                // Dibujar partícula
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Mostrar logo después de 300ms
        setTimeout(() => setLogoVisible(true), 300);

        // Activar sistemas progresivamente
        systems.forEach((system) => {
            setTimeout(() => {
                setSystemsOnline(prev => ({ ...prev, [system.id]: true }));
            }, system.delay);
        });

        // Progreso principal MÁS FLUIDO Y REALISTA
        const loadingSteps = [
            { progress: 3, step: '🔧 Initializing Quantum Architecture...', delay: 400 },
            { progress: 8, step: '🔧 Initializing Quantum Architecture...', delay: 200 },
            { progress: 15, step: '🧠 Calibrating Neural Networks...', delay: 300 },
            { progress: 22, step: '🧠 Calibrating Neural Networks...', delay: 250 },
            { progress: 28, step: '🔐 Establishing Secure Channels...', delay: 200 },
            { progress: 35, step: '🔐 Establishing Secure Channels...', delay: 180 },
            { progress: 42, step: '⚡ Synchronizing Data Streams...', delay: 220 },
            { progress: 49, step: '⚡ Synchronizing Data Streams...', delay: 190 },
            { progress: 56, step: '🌐 Connecting to Nexus Grid...', delay: 210 },
            { progress: 63, step: '🌐 Connecting to Nexus Grid...', delay: 180 },
            { progress: 68, step: '🛡️ Activating Defense Protocols...', delay: 170 },
            { progress: 74, step: '🛡️ Activating Defense Protocols...', delay: 160 },
            { progress: 78, step: '🎯 Optimizing Performance Matrix...', delay: 150 },
            { progress: 83, step: '🎯 Optimizing Performance Matrix...', delay: 140 },
            { progress: 88, step: '✨ Finalizing Quantum State...', delay: 130 },
            { progress: 92, step: '✨ Finalizing Quantum State...', delay: 120 },
            { progress: 96, step: '🚀 System Ready for Launch...', delay: 110 },
            { progress: 98, step: '🚀 System Ready for Launch...', delay: 200 },
            { progress: 100, step: '🎉 KapTools Nexus Online!', delay: 800 }
        ];

        let currentIndex = 0;

        const executeStep = () => {
            if (currentIndex < loadingSteps.length) {
                const step = loadingSteps[currentIndex];

                setTimeout(() => {
                    setProgress(step.progress);
                    setCurrentStep(step.step);

                    if (step.progress === 100) {
                        setTimeout(() => onLoadingComplete(), 1500);
                    } else {
                        currentIndex++;
                        executeStep();
                    }
                }, step.delay);
            }
        };

        executeStep();
    }, [onLoadingComplete, systems]);

    return (
        <div className="splash-container">
            {/* Canvas de partículas */}
            <canvas
                ref={canvasRef}
                className="particle-canvas"
            />

            {/* Efectos de fondo */}
            <div className="background-effects">
                <div className="gradient-overlay"></div>
                <div className="grid-pattern"></div>
            </div>

            {/* Contenido principal */}
            <div className="content-container">
                {/* Logo y título */}
                <div
                    className={`logo-section ${logoVisible ? 'visible' : ''}`}
                >
                    {/* Icono holográfico */}
                    <div className="holographic-icon">
                        <div className="icon-core">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 2L13.09 8.26L19 7L18.74 13.09L21 14L15.25 16.17L13.09 22L12 15.74L10.91 22L8.75 16.17L3 14L5.26 13.09L5 7L10.91 8.26L12 2Z"
                                    fill="url(#hologram-gradient)"
                                    stroke="url(#hologram-stroke)"
                                    strokeWidth="0.5"
                                />
                                <defs>
                                    <linearGradient id="hologram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6c5ce7" />
                                        <stop offset="33%" stopColor="#ff6b9d" />
                                        <stop offset="66%" stopColor="#00ff87" />
                                        <stop offset="100%" stopColor="#6c5ce7" />
                                    </linearGradient>
                                    <linearGradient id="hologram-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#a29bfe" />
                                        <stop offset="100%" stopColor="#fd79a8" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="icon-glow"></div>
                        <div className="icon-rings">
                            <div className="ring-1"></div>
                            <div className="ring-2"></div>
                            <div className="ring-3"></div>
                        </div>
                    </div>

                    {/* Título principal */}
                    <h1 className="main-title">
                        <span className="title-main">KAPTOOLS</span>
                        <div className="title-separator"></div>
                        <span className="title-sub">NEXUS</span>
                    </h1>

                    {/* Subtítulo */}
                    <div className="subtitle">
                        <span className="subtitle-text">KANTAR</span>
                        <span className="subtitle-dot">•</span>
                        <span className="subtitle-text">KAP</span>
                        <span className="subtitle-dot">•</span>
                        <span className="subtitle-text">DP</span>
                    </div>

                    {/* Versión */}
                    <div className="version-container">
                        <div className="version-badge">
                            <span className="version-text">NEXUS v2.0.0</span>
                            <div className="version-glow"></div>
                        </div>
                    </div>
                </div>

                {/* Progreso circular avanzado */}
                <div className="progress-section">
                    <div className="progress-container">
                        {/* Anillos de fondo */}
                        <svg className="progress-svg" viewBox="0 0 200 200">
                            {/* Track exterior */}
                            <circle
                                cx="100"
                                cy="100"
                                r="85"
                                fill="none"
                                stroke="rgba(26, 29, 58, 0.8)"
                                strokeWidth="2"
                                strokeDasharray="2 4"
                                opacity="0.3"
                            />

                            {/* Track principal */}
                            <circle
                                cx="100"
                                cy="100"
                                r="75"
                                fill="none"
                                stroke="rgba(108, 92, 231, 0.1)"
                                strokeWidth="4"
                            />

                            {/* Progreso principal con transición suave */}
                            <circle
                                cx="100"
                                cy="100"
                                r="75"
                                fill="none"
                                stroke="url(#progress-gradient)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 75}`}
                                strokeDashoffset={`${2 * Math.PI * 75 * (1 - progress / 100)}`}
                                transform="rotate(-90 100 100)"
                                className="progress-circle"
                                filter="url(#glow)"
                            />

                            {/* Marcadores */}
                            {[0, 25, 50, 75, 100].map((mark) => {
                                const angle = (mark * 3.6 - 90) * (Math.PI / 180);
                                const x = 100 + 82 * Math.cos(angle);
                                const y = 100 + 82 * Math.sin(angle);

                                return (
                                    <circle
                                        key={mark}
                                        cx={x}
                                        cy={y}
                                        r="3"
                                        fill={progress >= mark ? '#00ff87' : 'rgba(108, 92, 231, 0.3)'}
                                        className="progress-marker"
                                        style={{
                                            transition: 'fill 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                            transitionDelay: `${mark * 0.02}s`
                                        }}
                                    />
                                );
                            })}

                            <defs>
                                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6c5ce7" />
                                    <stop offset="50%" stopColor="#ff6b9d" />
                                    <stop offset="100%" stopColor="#00ff87" />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                        </svg>

                        {/* Porcentaje central */}
                        <div className="progress-text">
                            <span className="progress-number">{progress}</span>
                            <span className="progress-symbol">%</span>
                        </div>

                        {/* Pulse central */}
                        <div className="central-pulse"></div>

                        {/* Anillos externos rotativos */}
                        <div className="outer-rings">
                            <div className="rotating-ring-1"></div>
                            <div className="rotating-ring-2"></div>
                        </div>
                    </div>

                    {/* Estado actual */}
                    <div className="current-step">
                        <div className="step-icon">⚡</div>
                        <span className="step-text">{currentStep}</span>
                    </div>
                </div>

                {/* Panel de sistemas */}
                <div className="systems-panel">
                    <div className="systems-grid">
                        {systems.map((system) => (
                            <div
                                key={system.id}
                                className={`system-item ${systemsOnline[system.id] ? 'online' : 'offline'}`}
                            >
                                <div className="system-indicator"></div>
                                <span className="system-name">{system.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;