// src/components/SplashScreen.tsx - RESTAURANDO TU DISEÑO ORIGINAL CON CLASES CSS
import React, { useState, useEffect, useRef } from 'react';
import { useDatabaseValidation } from '../hooks/useDatabaseValidation';
import './SplashScreen.css';

interface SplashScreenProps {
    onLoadingComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onLoadingComplete }) => {
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [logoVisible, setLogoVisible] = useState(false);
    const [systemsOnline, setSystemsOnline] = useState<Record<string, boolean>>({});
    const [showError, setShowError] = useState(false);
    
    // 🔥 SOLO AÑADIDO - timeout de seguridad
    const [forceComplete, setForceComplete] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Hook de validación de base de datos
    const { isConnected, isLoading: dbLoading, error: dbError, userCount, currentUser, retryConnection } = useDatabaseValidation();

    const systems = [
        { id: 'neural', name: 'Neural Networks', delay: 600 },
        { id: 'quantum', name: 'Quantum Core', delay: 1100 },
        { id: 'nexus', name: 'Nexus Matrix', delay: 1800 },
        { id: 'database', name: 'SQLite Database', delay: 2400 },
        { id: 'ai', name: 'AI Systems', delay: 3000 }
    ];

    // 🔥 SOLO AÑADIDO - timeout maestro
    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            console.warn('⚠️ SplashScreen master timeout - forcing completion');
            setForceComplete(true);
            setProgress(100);
            setTimeout(() => {
                onLoadingComplete();
            }, 2000);
        }, 30000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [onLoadingComplete]);

    useEffect(() => {
        setTimeout(() => setLogoVisible(true), 300);

        // Activar sistemas gradualmente (excepto database que depende de la validación)
        systems.forEach((system) => {
            if (system.id !== 'database') {
                setTimeout(() => {
                    setSystemsOnline(prev => ({ ...prev, [system.id]: true }));
                }, system.delay);
            }
        });
    }, []);

    // Efecto para manejar el estado de la base de datos
    useEffect(() => {
        if (!dbLoading && !forceComplete) {
            setTimeout(() => {
                setSystemsOnline(prev => ({ ...prev, database: isConnected }));
                
                if (dbError) {
                    setShowError(true);
                    setCurrentStep('❌ Database Connection Failed');
                } else if (isConnected) {
                    setCurrentStep(`✅ Database Connected (${userCount} users)`);
                    // Continuar con el proceso de carga normal
                    startNormalLoading();
                }
            }, 2400);
        }
    }, [dbLoading, isConnected, dbError, userCount, forceComplete]);

    const startNormalLoading = () => {
        if (forceComplete) return;

        const loadingSteps = [
            { progress: 15, step: '🔧 Initializing...', delay: 400 },
            { progress: 35, step: '🧠 Loading Neural Networks...', delay: 500 },
            { progress: 60, step: '🌐 Connecting to Nexus...', delay: 400 },
            { progress: 75, step: '📊 Validating Database...', delay: 350 },
            { progress: 85, step: '⚡ Finalizing Systems...', delay: 350 },
            { progress: 100, step: '🎉 KapTools Nexus Online!', delay: 600 }
        ];

        let currentIndex = 0;

        const executeStep = () => {
            if (currentIndex < loadingSteps.length && !forceComplete) {
                const step = loadingSteps[currentIndex];

                setTimeout(() => {
                    if (!forceComplete) {
                        setProgress(step.progress);
                        setCurrentStep(step.step);

                        if (step.progress === 100) {
                            setTimeout(() => {
                                if (!forceComplete) {
                                    if (timeoutRef.current) {
                                        clearTimeout(timeoutRef.current);
                                    }
                                    onLoadingComplete();
                                }
                            }, 1000);
                        } else {
                            currentIndex++;
                            executeStep();
                        }
                    }
                }, step.delay);
            }
        };

        executeStep();
    };

    const handleRetry = () => {
        setShowError(false);
        setProgress(0);
        setCurrentStep('🔄 Retrying connection...');
        retryConnection();
    };

    const handleSkipDatabase = () => {
        setShowError(false);
        setCurrentStep('⚠️ Continuing without database...');
        setSystemsOnline(prev => ({ ...prev, database: false }));
        setTimeout(() => {
            startNormalLoading();
        }, 1000);
    };

    const circumference = 2 * Math.PI * 100; // Para el progreso circular
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="splash-screen-container">
            {/* Background Effects */}
            <div className="splash-background-effects">
                <div className="splash-gradient-overlay"></div>
                <div className="splash-grid-pattern"></div>
            </div>

            {/* Main Content */}
            <div className="splash-content-container">
                {/* Logo Section */}
                <div className={`splash-logo-section ${logoVisible ? 'splash-visible' : ''}`}>
                    <div className="splash-holographic-icon">
                        <div className="splash-icon-glow"></div>
                        <div className="splash-icon-rings">
                            <div className="splash-ring-1"></div>
                            <div className="splash-ring-2"></div>
                            <div className="splash-ring-3"></div>
                        </div>
                        <div className="splash-icon-core">
                            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                                <circle cx="30" cy="30" r="25" stroke="url(#iconGradient)" strokeWidth="2" />
                                <text x="30" y="38" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">KT</text>
                                <defs>
                                    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6c5ce7" />
                                        <stop offset="50%" stopColor="#ff6b9d" />
                                        <stop offset="100%" stopColor="#00ff87" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    <div className="splash-main-title">
                        <span className="splash-title-main">KapTools</span>
                        <div className="splash-title-separator"></div>
                        <span className="splash-title-sub">Nexus</span>
                    </div>

                    <div className="splash-subtitle">
                        <div className="splash-subtitle-dot"></div>
                        <span className="splash-subtitle-text">Enterprise Data Intelligence</span>
                        <div className="splash-subtitle-dot"></div>
                    </div>

                    <div className="splash-version-container">
                        <div className="splash-version-badge">
                            <div className="splash-version-glow"></div>
                            <span className="splash-version-text">Version 2.1.0</span>
                        </div>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="splash-progress-section">
                    <div className="splash-progress-container">
                        {/* Progress Ring */}
                        <svg className="splash-progress-svg" width="220" height="220">
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6c5ce7" />
                                    <stop offset="50%" stopColor="#ff6b9d" />
                                    <stop offset="100%" stopColor="#00ff87" />
                                </linearGradient>
                            </defs>
                            
                            {/* Background Circle */}
                            <circle
                                cx="110"
                                cy="110"
                                r="100"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="4"
                                fill="none"
                            />
                            
                            {/* Progress Circle */}
                            <circle
                                cx="110"
                                cy="110"
                                r="100"
                                stroke="url(#progressGradient)"
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="splash-progress-circle"
                                transform="rotate(-90 110 110)"
                            />
                        </svg>

                        {/* Progress Text */}
                        <div className="splash-progress-text">
                            <span className="splash-progress-number">{Math.round(progress)}</span>
                            <span className="splash-progress-symbol">%</span>
                        </div>

                        {/* Central Pulse */}
                        <div className="splash-central-pulse"></div>

                        {/* Outer Rings */}
                        <div className="splash-outer-rings">
                            <div className="splash-rotating-ring-1"></div>
                            <div className="splash-rotating-ring-2"></div>
                        </div>
                    </div>

                    {/* Current Step */}
                    <div className="splash-current-step">
                        <span className="splash-step-icon">⚡</span>
                        <span className="splash-step-text">{currentStep || '🚀 Initializing KapTools Nexus...'}</span>
                    </div>
                </div>

                {/* Systems Panel */}
                <div className="splash-systems-panel">
                    <div className="splash-systems-grid">
                        {systems.map((system) => (
                            <div 
                                key={system.id} 
                                className={`splash-system-item ${systemsOnline[system.id] ? 'splash-online' : ''}`}
                            >
                                <div className="splash-system-indicator"></div>
                                <span className="splash-system-name">{system.name}</span>
                                {system.id === 'database' && systemsOnline[system.id] && userCount > 0 && (
                                    <span className="system-count">({userCount})</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* User Welcome Message */}
                    {currentUser && isConnected && (
                        <div className="user-welcome">
                            Welcome back, {currentUser}!
                        </div>
                    )}
                </div>

                {/* 🔥 SOLO AÑADIDO - Error Panel con estilos inline simples */}
                {showError && !forceComplete && (
                    <div style={{
                        background: 'rgba(231, 76, 60, 0.1)',
                        border: '1px solid rgba(231, 76, 60, 0.3)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginTop: '20px',
                        maxWidth: '350px',
                        backdropFilter: 'blur(15px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '8px' }}>
                            ⚠️ Connection Issue
                        </div>
                        <div style={{ color: '#ffffff', fontSize: '11px', marginBottom: '12px' }}>
                            {dbError || 'Database connection failed'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                                onClick={handleRetry}
                                style={{
                                    background: 'linear-gradient(135deg, #6c5ce7, #ff6b9d)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Retry
                            </button>
                            <button 
                                onClick={handleSkipDatabase}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                ⏭️ Skip
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplashScreen;