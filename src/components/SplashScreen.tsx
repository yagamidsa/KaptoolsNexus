import React, { useState, useEffect } from 'react';
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

    
    const { isConnected, isLoading: dbLoading, error: dbError, userCount, currentUser, retryConnection } = useDatabaseValidation();

    
    const systems = [
        { id: 'neural', name: 'Start Git', delay: 600 },
        { id: 'quantum', name: 'Verify Core', delay: 1100 },
        { id: 'nexus', name: 'Nexus Components', delay: 1800 },
        { id: 'database', name: 'Start Nexus', delay: 2400 },
        { id: 'user_session', name: 'User Session', delay: 3200 },
        { id: 'ai', name: 'Start Systems', delay: 3000 }
    ];

    useEffect(() => {
        setTimeout(() => setLogoVisible(true), 300);

        
        systems.forEach((system) => {
            if (system.id !== 'database' && system.id !== 'user_session') {
                setTimeout(() => {
                    setSystemsOnline(prev => ({ ...prev, [system.id]: true }));
                }, system.delay);
            }
        });
    }, []);

    
    useEffect(() => {
        if (!dbLoading) {
            setTimeout(() => {
                setSystemsOnline(prev => ({ ...prev, database: isConnected }));
                
                if (dbError) {
                    setShowError(true);
                    setCurrentStep('❌ Database Connection Failed');
                } else if (isConnected) {
                    setCurrentStep(`✅ Connected `);
                    
                    
                    setTimeout(() => {
                        setSystemsOnline(prev => ({ ...prev, user_session: true }));
                        if (currentUser) {
                            setCurrentStep(`👤 User Session: ${currentUser}`);
                        }
                    }, 800);
                    
                    // Continuar con el proceso de carga normal
                    startNormalLoading();
                }
            }, 2400);
        }
    }, [dbLoading, isConnected, dbError, userCount, currentUser]);

    const startNormalLoading = () => {
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
    };

    const handleRetry = () => {
        setShowError(false);
        setProgress(0);
        setCurrentStep('🔄 Retrying connection...');
        retryConnection();
    };

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
            maxWidth: '500px',
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },

        title: {
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 0%, #6c5ce7 30%, #ff6b9d 60%, #00ff87 100%)',
            backgroundSize: '300% 300%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'titleFlow 6s ease infinite',
            marginBottom: '20px',
            letterSpacing: '-1px'
        },

        subtitle: {
            fontSize: '14px',
            color: '#a0a3bd',
            marginBottom: '40px',
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
            fontWeight: 600
        },

        progressContainer: {
            position: 'relative' as const,
            width: '180px',
            height: '180px',
            marginBottom: '30px'
        },

        progressSvg: {
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
            filter: 'drop-shadow(0 0 15px rgba(108, 92, 231, 0.4))'
        },

        progressText: {
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: 'monospace'
        },

        currentStep: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(37, 42, 74, 0.6)',
            border: '1px solid rgba(108, 92, 231, 0.2)',
            borderRadius: '20px',
            padding: '12px 20px',
            backdropFilter: 'blur(15px)',
            marginBottom: '30px',
            minHeight: '40px',
            maxWidth: '350px'
        },

        stepText: {
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500
        },

        systemsPanel: {
            width: '100%',
            maxWidth: '400px'
        },

        systemsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            padding: '16px',
            background: 'rgba(37, 42, 74, 0.3)',
            border: '1px solid rgba(108, 92, 231, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(15px)'
        },

        systemItem: (isOnline: boolean) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(26, 29, 58, 0.4)',
            opacity: isOnline ? 1 : 0.3,
            transform: isOnline ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.6s ease'
        }),

        systemIndicator: (isOnline: boolean) => ({
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            flexShrink: 0,
            background: isOnline
                ? 'linear-gradient(45deg, #00ff87, #6c5ce7)'
                : 'rgba(108, 92, 231, 0.2)',
            boxShadow: isOnline ? '0 0 8px currentColor' : 'none',
            transition: 'all 0.6s ease'
        }),

        systemName: {
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px'
        },


        systemCount: {
            fontSize: '10px',
            color: '#ff6b9d',
            marginLeft: '4px',
            fontWeight: 500
        },

        errorPanel: {
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            maxWidth: '400px'
        },

        errorTitle: {
            color: '#e74c3c',
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },

        errorMessage: {
            color: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: '16px'
        },

        retryButton: {
            background: 'linear-gradient(135deg, #6c5ce7, #ff6b9d)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase' as const,
            letterSpacing: '1px'
        },


        footer: {
            marginTop: '20px',
            textAlign: 'center' as const
        },

        userInfo: {
            color: '#00ff87',
            fontSize: '12px',
            fontWeight: 500,
            marginTop: '8px'
        }
    };


    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <h1 style={styles.title}>KAPTOOLS NEXUS</h1>
                <p style={styles.subtitle}>Advanced Analytics Platform</p>

                <div style={styles.progressContainer}>
                    <svg style={styles.progressSvg}>
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="rgba(108, 92, 231, 0.1)"
                            strokeWidth="6"
                        />
                        <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            style={{
                                strokeDasharray,
                                transition: 'stroke-dasharray 0.5s ease'
                            }}
                        />
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6c5ce7" />
                                <stop offset="50%" stopColor="#ff6b9d" />
                                <stop offset="100%" stopColor="#00ff87" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style={styles.progressText}>{progress}%</div>
                </div>

                <div style={styles.currentStep}>
                    <span style={styles.stepText}>{currentStep}</span>
                </div>

                <div style={styles.systemsPanel}>
                    <div style={styles.systemsGrid}>
                        {systems.map((system) => (
                            <div
                                key={system.id}
                                style={styles.systemItem(systemsOnline[system.id])}
                            >
                                <div style={styles.systemIndicator(systemsOnline[system.id])}></div>
                                <span style={styles.systemName}>{system.name}</span>
                                {/* AGREGADO: Mostrar contador de usuarios en database */}
                                {system.id === 'database' && isConnected && (
                                    <span style={styles.systemCount}>({userCount})</span>
                                )}
                                {/* AGREGADO: Mostrar nombre de usuario en user_session */}
                                {system.id === 'user_session' && currentUser && (
                                    <span style={styles.systemCount}>({currentUser})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* AGREGADO: Footer con mensaje de bienvenida */}
                {currentUser && systemsOnline.user_session && (
                    <div style={styles.footer}>
                        <div style={styles.userInfo}>Welcome back, {currentUser}!</div>
                    </div>
                )}

                {showError && dbError && (
                    <div style={styles.errorPanel}>
                        <div style={styles.errorTitle}>
                            ⚠️ Connection Error
                        </div>
                        <div style={styles.errorMessage}>
                            {dbError}
                        </div>
                        <button
                            style={styles.retryButton}
                            onClick={handleRetry}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(108, 92, 231, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            Retry Connection
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes titleFlow {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;