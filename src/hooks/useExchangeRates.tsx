// src/hooks/useExchangeRates.tsx
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

const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_KEY = 'kaptools_exchange_rates';
const HISTORY_KEY = 'kaptools_exchange_history';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export const useExchangeRates = () => {
    const [exchangeRates, setExchangeRates] = useState<ExchangeRatesState>({
        USD_COP: { current: 0, previous: 0, trend: 'neutral', change: 0, changePercent: 0 },
        USD_INR: { current: 0, previous: 0, trend: 'neutral', change: 0, changePercent: 0 },
        lastUpdated: null,
        loading: true,
        error: null
    });

    // Obtener datos del cache
    const getCachedRates = () => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        return isExpired ? null : data;
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

            const response = await fetch(EXCHANGE_API);
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const previousRates = getPreviousDayRate();

            const copTrend = calculateTrend(
                data.rates.COP,
                previousRates?.USD_COP || data.rates.COP
            );

            const inrTrend = calculateTrend(
                data.rates.INR,
                previousRates?.USD_INR || data.rates.INR
            );

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
                lastUpdated: new Date(data.date),
                loading: false,
                error: null
            };

            setExchangeRates(newRates);
            saveToCache(newRates);

        } catch (error) {
            console.error('Error fetching exchange rates:', error);

            // Intentar usar cache como fallback
            const cached = getCachedRates();
            if (cached) {
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

    // Verificar si cambió el día
    const checkDayChange = () => {
        const today = new Date().toDateString();
        const lastCheck = localStorage.getItem('last_exchange_check');

        if (lastCheck !== today) {
            fetchExchangeRates();
            localStorage.setItem('last_exchange_check', today);
        }
    };

    useEffect(() => {
        // Cargar cache inicial o fetch
        const cached = getCachedRates();
        if (cached) {
            setExchangeRates({ ...cached, loading: false });
        } else {
            fetchExchangeRates();
        }

        // Check inicial de cambio de día
        checkDayChange();

        // Interval cada 24 horas
        const dailyInterval = setInterval(fetchExchangeRates, 24 * 60 * 60 * 1000);

        // Check cada hora para detectar cambio de día
        const hourlyCheck = setInterval(checkDayChange, 60 * 60 * 1000);

        // Event listener para visibility change
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                const cached = getCachedRates();
                if (!cached) fetchExchangeRates();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(dailyInterval);
            clearInterval(hourlyCheck);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return { exchangeRates, refetch: fetchExchangeRates };
};