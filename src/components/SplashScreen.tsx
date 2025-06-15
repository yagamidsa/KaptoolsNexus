// src/components/SplashScreen.tsx - VERSIÓN COMPACTA Y CENTRADA
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    onLoadingComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onLoadingComplete }) => {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [logoVisible, setLogoVisible] = useState(false);
    const [systemsOnline, setSystemsOnline] = useState<Record<string, boolean>>({});

    // Sistemas reducidos
    const systems = [
        { id: 'neural', name: 'Neural Networks', delay: 600 },
        { id: 'quantum', name: 'Quantum Core', delay: 1100 },
        { id: 'nexus', name: 'Nexus Matrix', delay: 1800 },
        { id: 'ai', name: 'AI Systems', delay: 2400 }
    ];

    useEffect(() => {
        // Mostrar logo después de 300ms
        setTimeout(() => setLogoVisible(true), 300);

        // Activar sistemas progresivamente
        systems.forEach((system) => {
            setTimeout(() => {
                setSystemsOnline(prev => ({ ...prev, [system.id]: true }));
            }, system.delay);
        });

        // Progreso más directo
        const loadingSteps = [
            { progress: 15, step: '🔧 Initializing...', delay: 400 },
            { progress: 35, step: '🧠 Loading Neural Networks...', delay: 500 },
            { progress: 60, step: '🌐 Connecting to Nexus...', delay: 400 },
            { progress: 85, step: '⚡ Finalizing Systems...', delay: 350 },
            { progress: 100, step: '🎉 KapTools Nexus Online!', delay: 600 }
        ];

        let currentIndex = 0;

        const executeStep = () => {
            if (currentIndex < loadingSteps.length) {
                const step = loadingSteps[currentIndex];

                setTimeout(() => {
                    setProgress(step.progress);
                    setCurrentStep(step.step);

                    if (step.progress === 100) {
                        setTimeout(() => {
                            onLoadingComplete();
                        }, 1000);
                    } else {
                        currentIndex++;
                        executeStep();
                    }
                }, step.delay);
            }
        };

        executeStep();
    }, [onLoadingComplete]);

    // Estilos compactos inline
    const styles = {
        container: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(ellipse at center, #1a1d3a 0%, #0f1123 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            overflow: 'hidden'
        },

        content: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            textAlign: 'center' as const,
            maxWidth: '400px',
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
            transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
        },

        // Icono más pequeño
        icon: {
            width: '60px',
            height: '60px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },

        iconSvg: {
            width: '40px',
            height: '40px',
            filter: 'drop-shadow(0 0 15px rgba(108, 92, 231, 0.6))',
            animation: 'iconFloat 4s ease infinite'
        },

        // Título más compacto
        title: {
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            fontWeight: 900,
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #6c5ce7 50%, #ff6b9d 100%)',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'titleFlow 4s ease infinite',
            letterSpacing: '-1px'
        },

        subtitle: {
            fontSize: '12px',
            background: 'linear-gradient(90deg, #a0a3bd, #6c5ce7, #ff6b9d)',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
            fontWeight: 500,
            marginBottom: '8px',
            animation: 'subtitleGlow 3s ease infinite'
        },

        version: {
            background: 'rgba(108, 92, 231, 0.1)',
            border: '1px solid rgba(108, 92, 231, 0.3)',
            borderRadius: '15px',
            padding: '4px 12px',
            color: '#6c5ce7',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '1px',
            marginBottom: '25px'
        },

        // Progreso más pequeño
        progressContainer: {
            position: 'relative' as const,
            width: '140px',
            height: '140px',
            marginBottom: '20px'
        },

        progressSvg: {
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
            filter: 'drop-shadow(0 0 15px rgba(108, 92, 231, 0.3))'
        },

        progressText: {
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff, #6c5ce7, #ff6b9d)',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'monospace'
        },

        // Estado más compacto
        currentStep: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(37, 42, 74, 0.6)',
            border: '1px solid rgba(108, 92, 231, 0.2)',
            borderRadius: '20px',
            padding: '8px 16px',
            backdropFilter: 'blur(15px)',
            marginBottom: '20px',
            minHeight: '36px',
            maxWidth: '300px'
        },

        stepIcon: {
            fontSize: '16px'
        },

        stepText: {
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500
        },

        // Panel de sistemas más pequeño
        systemsPanel: {
            width: '100%',
            maxWidth: '320px'
        },

        systemsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            padding: '12px',
            background: 'rgba(37, 42, 74, 0.3)',
            border: '1px solid rgba(108, 92, 231, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(15px)'
        },

        systemItem: (isOnline: boolean) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'rgba(26, 29, 58, 0.4)',
            opacity: isOnline ? 1 : 0.3,
            transform: isOnline ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.4s ease'
        }),

        systemIndicator: (isOnline: boolean) => ({
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            flexShrink: 0,
            background: isOnline
                ? 'linear-gradient(45deg, #00ff87, #6c5ce7)'
                : 'rgba(108, 92, 231, 0.2)',
            boxShadow: isOnline ? '0 0 8px currentColor' : 'none',
            transition: 'all 0.4s ease'
        }),

        systemName: {
            color: '#a0a3bd',
            fontSize: '9px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px'
        }
    };

    const circumference = 2 * Math.PI * 55;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div style={styles.container}>
            {/* Efecto de fondo sutil */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 50% 50%, rgba(108, 92, 231, 0.03) 0%, transparent 50%)',
                animation: 'gradientPulse 6s ease infinite'
            }}></div>

            {/* Contenido principal compacto */}
            <div style={styles.content}>
                {/* Icono simple */}
                <div style={styles.icon}>
                    <svg style={styles.iconSvg} viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 2L13.09 8.26L19 7L18.74 13.09L21 14L15.25 16.17L13.09 22L12 15.74L10.91 22L8.75 16.17L3 14L5.26 13.09L5 7L10.91 8.26L12 2Z"
                            fill="url(#hologram-gradient)"
                            stroke="url(#hologram-stroke)"
                            strokeWidth="0.5"
                        />
                        <defs>
                            <linearGradient id="hologram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6c5ce7" />
                                <stop offset="50%" stopColor="#ff6b9d" />
                                <stop offset="100%" stopColor="#00ff87" />
                            </linearGradient>
                            <linearGradient id="hologram-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a29bfe" />
                                <stop offset="100%" stopColor="#fd79a8" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Título compacto */}
                <h1 style={styles.title}>
                    KAPTOOLS • NEXUS
                </h1>

                {/* Subtítulo */}
                <div style={styles.subtitle}>
                    KANTAR • KAP • DP
                </div>

                {/* Versión */}
                <div style={styles.version}>
                    v2.0.0
                </div>

                {/* Progreso circular compacto */}
                <div style={styles.progressContainer}>
                    <svg style={styles.progressSvg} viewBox="0 0 120 120">
                        {/* Track principal */}
                        <circle
                            cx="60"
                            cy="60"
                            r="55"
                            fill="none"
                            stroke="rgba(108, 92, 231, 0.1)"
                            strokeWidth="3"
                        />

                        {/* Progreso */}
                        <circle
                            cx="60"
                            cy="60"
                            r="55"
                            fill="none"
                            stroke="url(#progress-gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{
                                transition: 'stroke-dashoffset 0.8s ease'
                            }}
                        />

                        <defs>
                            <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6c5ce7" />
                                <stop offset="50%" stopColor="#ff6b9d" />
                                <stop offset="100%" stopColor="#00ff87" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Porcentaje central */}
                    <div style={styles.progressText}>
                        {progress}%
                    </div>
                </div>

                {/* Estado actual compacto */}
                <div style={styles.currentStep}>
                    <div style={styles.stepIcon}>⚡</div>
                    <span style={styles.stepText}>{currentStep}</span>
                </div>

                {/* Panel de sistemas compacto */}
                <div style={styles.systemsPanel}>
                    <div style={styles.systemsGrid}>
                        {systems.map((system) => (
                            <div
                                key={system.id}
                                style={styles.systemItem(systemsOnline[system.id])}
                            >
                                <div style={styles.systemIndicator(systemsOnline[system.id])}></div>
                                <span style={styles.systemName}>{system.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CSS Animations compactas */}
            <style>{`
                @keyframes iconFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                
                @keyframes titleFlow {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                
                @keyframes subtitleGlow {
                    0%, 100% { 
                        background-position: 0% 50%;
                        filter: drop-shadow(0 0 3px rgba(108, 92, 231, 0.5));
                    }
                    50% { 
                        background-position: 100% 50%;
                        filter: drop-shadow(0 0 8px rgba(255, 107, 157, 0.6));
                    }
                }
                
                @keyframes gradientPulse {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;