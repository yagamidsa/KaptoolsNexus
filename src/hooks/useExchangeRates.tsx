// src/hooks/useExchangeRates.tsx - VERSIÓN CORREGIDA PARA DATOS ACTUALES
import { useState, useEffect } from 'react';

interface ExchangeRate {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'neutral';
    change: number;
    changePercent: number;
}

interface ExchangeRatesState {
    USD_COP: ExchangeRate;
    USD_INR: ExchangeRate;
    lastUpdated: Date | null;
    loading: boolean;
    error: string | null;
}

// 🔥 CAMBIO PRINCIPAL: API que se actualiza en tiempo real
const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

const CACHE_KEY = 'kaptools_exchange_rates';
const HISTORY_KEY = 'kaptools_exchange_history';
const CACHE_DURATION = 1 * 60 * 60 * 1000; // 🔥 Reducido a 1 hora

export const useExchangeRates = () => {
    const [exchangeRates, setExchangeRates] = useState<ExchangeRatesState>({
        USD_COP: { current: 0, previous: 0, trend: 'neutral', change: 0, changePercent: 0 },
        USD_INR: { current: 0, previous: 0, trend: 'neutral', change: 0, changePercent: 0 },
        lastUpdated: null,
        loading: true,
        error: null
    });

    // Obtener datos del cache con validación mejorada
    const getCachedRates = () => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        try {
            const { data, timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp > CACHE_DURATION;

            // 🔥 NO validar por fecha de la API, solo por tiempo de cache
            return isExpired ? null : data;
        } catch (error) {
            console.error('Error parsing cached data:', error);
            return null;
        }
    };

    // Obtener datos del día anterior
    const getPreviousDayRate = () => {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
        const dates = Object.keys(history).sort().reverse();

        const today = new Date().toDateString();
        const previousDay = dates.find(date => date !== today);

        return previousDay ? history[previousDay] : null;
    };

    // Calcular tendencia
    const calculateTrend = (current: number, previous: number) => {
        if (!previous || previous === 0) return { trend: 'neutral' as const, change: 0, changePercent: 0 };

        const change = current - previous;
        const changePercent = (change / previous) * 100;

        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        if (Math.abs(changePercent) > 0.01) {
            trend = change > 0 ? 'up' : 'down';
        }

        return {
            trend,
            change: parseFloat(change.toFixed(4)),
            changePercent: parseFloat(changePercent.toFixed(2))
        };
    };

    // Guardar en cache e historial
    const saveToCache = (currentRates: any) => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: currentRates,
            timestamp: Date.now()
        }));

        // 🔥 USAR FECHA ACTUAL (no de la API)
        const today = new Date().toDateString();
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');

        history[today] = {
            USD_COP: currentRates.USD_COP.current,
            USD_INR: currentRates.USD_INR.current,
            timestamp: Date.now()
        };

        // Mantener solo últimos 7 días
        const keys = Object.keys(history);
        if (keys.length > 7) {
            const oldest = keys.sort()[0];
            delete history[oldest];
        }

        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    };

    // Fetch datos de la API
    const fetchExchangeRates = async () => {
        try {
            setExchangeRates(prev => ({ ...prev, loading: true, error: null }));

            console.log('🔄 Fetching current exchange rates...');
            const response = await fetch(EXCHANGE_API);
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            
            // Verificar que tenemos las monedas necesarias
            if (!data.rates?.COP || !data.rates?.INR) {
                throw new Error('Required currencies not found in API response');
            }

            const previousRates = getPreviousDayRate();

            const copTrend = calculateTrend(
                data.rates.COP,
                previousRates?.USD_COP || data.rates.COP
            );

            const inrTrend = calculateTrend(
                data.rates.INR,
                previousRates?.USD_INR || data.rates.INR
            );

            // 🔥 USAR FECHA Y HORA ACTUALES (no de la API)
            const lastUpdated = new Date();

            const newRates = {
                USD_COP: {
                    current: data.rates.COP,
                    previous: previousRates?.USD_COP || data.rates.COP,
                    ...copTrend
                },
                USD_INR: {
                    current: data.rates.INR,
                    previous: previousRates?.USD_INR || data.rates.INR,
                    ...inrTrend
                },
                lastUpdated: lastUpdated,
                loading: false,
                error: null
            };

            console.log('✅ Exchange rates updated:', {
                COP: data.rates.COP,
                INR: data.rates.INR,
                time: lastUpdated.toLocaleString()
            });

            setExchangeRates(newRates);
            saveToCache(newRates);

        } catch (error) {
            console.error('❌ Error fetching exchange rates:', error);

            // Intentar usar cache como fallback
            const cached = getCachedRates();
            if (cached) {
                console.log('📋 Using cached data as fallback');
                setExchangeRates({ ...cached, loading: false, error: 'Using cached data' });
            } else {
                setExchangeRates(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to load exchange rates'
                }));
            }
        }
    };

    // 🔥 MEJORAR DETECCIÓN DE CAMBIO DE DÍA
    const checkForUpdates = async () => {
        const today = new Date().toDateString();
        const lastCheck = localStorage.getItem('last_exchange_check');
        
        // Si cambió el día o no hay último check, fetch nuevos datos
        if (lastCheck !== today) {
            console.log('📅 New day detected, fetching fresh rates');
            await fetchExchangeRates();
            localStorage.setItem('last_exchange_check', today);
        } else {
            // Verificar si el cache expiró
            const cached = getCachedRates();
            if (!cached) {
                console.log('⏰ Cache expired, fetching fresh rates');
                await fetchExchangeRates();
            }
        }
    };

    useEffect(() => {
        console.log('🚀 Exchange rates hook initializing...');
        
        // Cargar cache inicial o fetch
        const cached = getCachedRates();
        if (cached) {
            console.log('📋 Loading from cache');
            setExchangeRates({ ...cached, loading: false });
        } else {
            console.log('🔄 No valid cache, fetching fresh data');
            fetchExchangeRates();
        }

        // Check inicial de actualizaciones
        checkForUpdates();

        // 🔥 INTERVALOS MÁS FRECUENTES
        // Check cada 1 hora
        const hourlyInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

        // Check cada 15 minutos para detectar cambio de día
        const frequentCheck = setInterval(checkForUpdates, 15 * 60 * 1000);

        // Event listener para cuando la app vuelve a ser visible
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('👁️ App became visible, checking for updates');
                checkForUpdates();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(hourlyInterval);
            clearInterval(frequentCheck);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return { exchangeRates, refetch: fetchExchangeRates };
};