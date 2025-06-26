// src/hooks/useDatabaseValidation.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DatabaseValidation {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    userCount: number;
    retryConnection: () => void;
}

interface DatabaseResponse {
    success: boolean;
    user_count?: number;
    error?: string;
}

const DATABASE_PATH = "\\\\mbaw1fs.grpit.local\\KAP_OUTPUTS\\KAPDataProcessing\\TestData\\app_usage.db";

export const useDatabaseValidation = (): DatabaseValidation => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userCount, setUserCount] = useState(0);

    const validateConnection = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Llamar al backend de Tauri para validar la conexión SQLite
            const response: DatabaseResponse = await invoke('validate_database_connection', {
                dbPath: DATABASE_PATH
            });

            if (response.success) {
                setIsConnected(true);
                setUserCount(response.user_count || 0);
                setError(null);
            } else {
                setIsConnected(false);
                setUserCount(0);
                setError(response.error || 'Unknown database error');
            }
        } catch (err) {
            console.error('Database validation failed:', err);
            setIsConnected(false);
            setUserCount(0);
            setError('Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...');
        } finally {
            setIsLoading(false);
        }
    };

    const retryConnection = () => {
        validateConnection();
    };

    useEffect(() => {
        // Delay inicial para que el SplashScreen se muestre primero
        const timer = setTimeout(() => {
            validateConnection();
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return {
        isConnected,
        isLoading,
        error,
        userCount,
        retryConnection
    };
};