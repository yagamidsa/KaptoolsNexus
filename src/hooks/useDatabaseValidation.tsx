// src/hooks/useDatabaseValidation.tsx - Versión simplificada
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DatabaseValidation {
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    userCount: number;
    currentUser: string | null;
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
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    // Función de validación con manejo de timeouts y reintentos
    const validateConnection = async (retryCount: number = 0): Promise<void> => {
        const maxRetries = 2; // Reducido para evitar demasiados reintentos
        setIsLoading(true);
        setError(null);

        try {
            console.log(`🔄 Validating database connection (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            
            // Dar tiempo para la conexión inicial
            await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000)));
            
            // Primero obtener el usuario actual
            try {
                const username = await invoke('get_current_user') as string;
                setCurrentUser(username);
                console.log('👤 Current user identified:', username);
            } catch (userErr) {
                console.warn('⚠️ Could not get current user:', userErr);
                setCurrentUser('Unknown');
            }
            
            // Validar la conexión a la base de datos
            const response: DatabaseResponse = await invoke('validate_database_connection', {
                dbPath: DATABASE_PATH
            });

            if (response.success) {
                setIsConnected(true);
                setUserCount(response.user_count || 0);
                setError(null);
                
                // Si tenemos usuario, registrar la sesión
                if (currentUser && currentUser !== 'Unknown') {
                    try {
                        console.log('🚀 Registering user session...');
                        await invoke('initialize_user_session', {
                            dbPath: DATABASE_PATH,
                            username: currentUser
                        });
                        console.log('✅ User session registered successfully');
                    } catch (sessionErr) {
                        console.warn('⚠️ Could not register user session:', sessionErr);
                        // No fallar la validación completa por esto
                    }
                }
                
                console.log('✅ Database connection successful!');
            } else {
                throw new Error(response.error || 'Unknown database error');
            }
        } catch (err) {
            console.error(`❌ Database validation failed (attempt ${retryCount + 1}):`, err);
            
            // Reintentar si no hemos alcanzado el máximo
            if (retryCount < maxRetries) {
                console.log(`🔄 Retrying in ${(retryCount + 1) * 2} seconds...`);
                setTimeout(() => {
                    validateConnection(retryCount + 1);
                }, (retryCount + 1) * 2000);
                return;
            }
            
            // Si ya no hay más reintentos, marcar como fallido
            setIsConnected(false);
            setUserCount(0);
            setError('Something is failing, contact the KapTools Nexus administrator or check your VPN connection must be active to continue...');
        } finally {
            setIsLoading(false);
        }
    };

    const retryConnection = () => {
        console.log('🔄 Manual retry requested...');
        validateConnection(0);
    };

    // Efecto inicial con delay más largo
    useEffect(() => {
        console.log('🚀 Initializing database validation...');
        
        // Delay inicial para que el SplashScreen se muestre
        const timer = setTimeout(() => {
            validateConnection(0);
        }, 2500); // Aumentado a 2.5 segundos

        return () => clearTimeout(timer);
    }, []);

    return {
        isConnected,
        isLoading,
        error,
        userCount,
        currentUser,
        retryConnection
    };
};