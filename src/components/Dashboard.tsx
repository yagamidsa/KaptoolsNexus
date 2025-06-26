// src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Dashboard.css';

interface DashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserData {
    user: string;
    connections: number;
    last_connection: string;
    percentage: number;
}

interface DashboardData {
    users: UserData[];
    statistics: {
        total_users: number;
        total_connections: number;
        average_connections: number;
    };
    timestamp: string;
}

const DATABASE_PATH = "\\\\mbaw1fs.grpit.local\\KAP_OUTPUTS\\KAPDataProcessing\\TestData\\app_usage.db";

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose }) => {
    const [dashboardData, setDashboardData] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Función para crear el anillo de progreso
    const createProgressRing = (percentage: number) => {
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        
        return (
            <div className="progress-ring">
                <svg>
                    <circle 
                        className="progress-ring-bg" 
                        cx="60" 
                        cy="60" 
                        r={radius}
                    />
                    <circle 
                        className="progress-ring-fill" 
                        cx="60" 
                        cy="60" 
                        r={radius}
                        style={{
                            strokeDasharray,
                            transformOrigin: 'center'
                        }}
                    />
                </svg>
                <div className="progress-text">{percentage}%</div>
            </div>
        );
    };

    // Función para crear una tarjeta de métrica
    const createMetricCard = (data: UserData, index: number) => {
        const itemClass = `item-${(index % 4) + 1}`;
        return (
            <div key={data.user} className={`metric-card ${itemClass}`}>
                <div className="progress-container">
                    <div className="dots-container"></div>
                    {createProgressRing(data.percentage || data.connections)}
                </div>
                <div className="user-label">{data.user}</div>
                <div className="connection-count">{data.connections} connections</div>
                <div className="last-connection">Last: {data.last_connection}</div>
            </div>
        );
    };

    // Función para cargar datos del dashboard
    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('📊 Loading dashboard data...');
            const response = await invoke('get_dashboard_data', { 
                dbPath: DATABASE_PATH 
            }) as string;

            const data: DashboardData = JSON.parse(response);
            
            if (data.users && Array.isArray(data.users)) {
                setDashboardData(data.users);
                console.log('✅ Dashboard data loaded:', data.users.length, 'users');
            } else {
                throw new Error('Invalid data format received');
            }
        } catch (err) {
            console.error('❌ Error loading dashboard data:', err);
            setError('Failed to load dashboard data. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Efecto para cargar datos cuando se abre el dashboard
    useEffect(() => {
        if (isOpen) {
            loadDashboardData();
            
            // Auto-refresh cada 30 segundos
            const interval = setInterval(() => {
                console.log('🔄 Auto-refreshing dashboard data...');
                loadDashboardData();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [isOpen, loadDashboardData]);

    // Manejar tecla F4 para cerrar
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'F4' && isOpen) {
                event.preventDefault();
                console.log('🔑 F4 pressed - closing dashboard');
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    // Función para actualizar conexión del usuario
    const updateUserConnection = async () => {
        try {
            const username = await invoke('get_current_user') as string;
            await invoke('update_user_connection', {
                dbPath: DATABASE_PATH,
                username
            });
            console.log('✅ User connection updated');
        } catch (err) {
            console.error('❌ Error updating user connection:', err);
        }
    };

    // Actualizar conexión cuando se abre el dashboard
    useEffect(() => {
        if (isOpen) {
            updateUserConnection();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="dashboard-overlay">
            <div className="dashboard-container">
                <button 
                    className="dashboard-close-btn"
                    onClick={onClose}
                    title="Close Dashboard (F4)"
                >
                    ✕
                </button>

                <div className="dashboard-header">
                    <h1 className="dashboard-title">KAPTOOLS NEXUS Dashboard</h1>
                    <p className="dashboard-subtitle">Activity Monitoring System • Real-Time Analytics</p>
                </div>

                <div className="metrics-container">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading dashboard data...</p>
                        </div>
                    ) : error ? (
                        <div className="error-container">
                            <p className="error-message">⚠️ {error}</p>
                            <button 
                                className="retry-button"
                                onClick={loadDashboardData}
                            >
                                Retry
                            </button>
                        </div>
                    ) : dashboardData.length === 0 ? (
                        <div className="no-data-container">
                            <p>No user data available</p>
                        </div>
                    ) : (
                        dashboardData.map(createMetricCard)
                    )}
                </div>

                <div className="chart-container">
                    <h3 className="chart-title">Trend Analysis • Connections vs Global Average</h3>
                    <div className="chart-area">
                        <div className="chart-lines">
                            <div className="chart-line chart-line-1"></div>
                            <div className="chart-line chart-line-2"></div>
                            {/* Chart points */}
                            <div className="chart-point point-1" style={{ left: '10%' }}></div>
                            <div className="chart-point point-2" style={{ left: '25%' }}></div>
                            <div className="chart-point point-1" style={{ left: '40%' }}></div>
                            <div className="chart-point point-2" style={{ left: '60%' }}></div>
                            <div className="chart-point point-1" style={{ left: '80%' }}></div>
                        </div>
                    </div>
                    <div className="chart-labels">
                        <span>MON</span>
                        <span>TUE</span>
                        <span>WED</span>
                        <span>THU</span>
                        <span>FRI</span>
                        <span>SAT</span>
                        <span>SUN</span>
                    </div>
                    <div className="legend">
                        <div className="legend-item">
                            <div className="legend-color legend-1"></div>
                            <span>User Connections</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color legend-2"></div>
                            <span>Global Average</span>
                        </div>
                    </div>
                </div>

                <div className="footer">
                    <p>KAPTools Nexus v2.0.0 • Advanced Usage Analytics</p>
                    <p className="refresh-info">Press F4 to close • Data synchronized automatically</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;