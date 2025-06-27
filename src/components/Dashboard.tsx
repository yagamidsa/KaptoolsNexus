// src/components/Dashboard.tsx - CÓDIGO COMPLETO CORREGIDO
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Función createProgressRing
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

    // Función createMetricCard
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

    // Cargar datos de la base de datos
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

    // Actualizar conexión del usuario
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

    // Efecto para cargar datos cuando se abre el dashboard
    useEffect(() => {
        if (isOpen) {
            updateUserConnection();
            loadDashboardData();
            // ❌ REMOVIDO AUTO-REFRESH - Solo carga cuando se abre
        }
    }, [isOpen, loadDashboardData]);

    // ❌ REMOVIDO - App.tsx ya maneja F4 para evitar conflictos
    // El manejo de F4 se hace en App.tsx centralizadamente

    // Si no está abierto, no renderizar nada
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

                {/* Header */}
                <div className="dashboard-header">
                    <h1 className="dashboard-title">KAPTOOLS NEXUS Dashboard</h1>
                    <p className="dashboard-subtitle">Activity Monitoring System • Real-Time Analytics</p>
                </div>

                {/* Tarjetas de usuarios arriba */}
                <div className="metrics-container" id="metricsContainer">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading dashboard data...</p>
                        </div>
                    ) : error ? (
                        <div className="error-container">
                            <div className="error-message">{error}</div>
                            <button 
                                className="retry-button"
                                onClick={loadDashboardData}
                            >
                                🔄 Retry Connection
                            </button>
                        </div>
                    ) : dashboardData.length === 0 ? (
                        <div className="no-data-container">
                            <div className="no-data-message">📭 No user data available</div>
                            <p>Start using the application to see activity metrics</p>
                        </div>
                    ) : (
                        // Renderizar tarjetas de usuarios
                        dashboardData.map((user, index) => createMetricCard(user, index))
                    )}
                </div>

                {/* Estadísticas abajo - solo si hay datos */}
                {!isLoading && !error && dashboardData.length > 0 && (
                    <div className="stats-cards-container">
                        <div className="stats-card">
                            <div className="stats-icon">
                                <svg viewBox="0 0 24 24" className="stats-svg-icon">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <div className="stats-content">
                                <div className="stats-label">Active Users</div>
                                <div className="stats-value">{dashboardData.length}</div>
                            </div>
                        </div>
                        
                        <div className="stats-card">
                            <div className="stats-icon">
                                <svg viewBox="0 0 24 24" className="stats-svg-icon">
                                    <path d="M6 9H4.5a2.5 2.5 0 1 0 0 5H6"/>
                                    <path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/>
                                    <path d="M8 12h8"/>
                                </svg>
                            </div>
                            <div className="stats-content">
                                <div className="stats-label">Total Connections</div>
                                <div className="stats-value">
                                    {dashboardData.reduce((sum, user) => sum + user.connections, 0)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="stats-card">
                            <div className="stats-icon">
                                <svg viewBox="0 0 24 24" className="stats-svg-icon">
                                    <path d="M3 3v18h18"/>
                                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                                </svg>
                            </div>
                            <div className="stats-content">
                                <div className="stats-label">Avg per User</div>
                                <div className="stats-value">
                                    {dashboardData.length > 0 
                                        ? Math.round(dashboardData.reduce((sum, user) => sum + user.connections, 0) / dashboardData.length)
                                        : 0
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="footer">
                    <p>KAPTools Nexus v2.0.0 • Advanced Usage Analytics</p>
                    <p className="refresh-info">Press F4 to close</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;