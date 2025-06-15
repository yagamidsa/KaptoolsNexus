// src/components/ExchangeRate/index.tsx
import React from 'react';
import './ExchangeRate.css';

interface TrendIconProps {
    trend: 'up' | 'down' | 'neutral';
    changePercent: number;
}

const TrendIcon: React.FC<TrendIconProps> = ({ trend, changePercent }) => {
    if (trend === 'neutral') {
        return (
            <span className="trend-neutral-neon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="change-percent-neon">—</span>
            </span>
        );
    }

    return (
        <span className={`trend-indicator-neon trend-neon-${trend}`}>
            {trend === 'up' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 4L4 12L8 12L12 8L16 12L20 12L12 4Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 20L20 12L16 12L12 16L8 12L4 12L12 20Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            )}
            <span className="change-percent-neon">{Math.abs(changePercent)}%</span>
        </span>
    );
};

const CurrencyIconCOP: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="currency-icon-neon">
        <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
        <path
            d="M8 12H16M10 8V16M14 8V16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const CurrencyIconINR: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="currency-icon-neon">
        <path
            d="M6 7H18M6 11H18M9 15L15 15M12 15L12 19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M8 15C8 13 9.5 11 12 11C14.5 11 16 13 16 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

interface ExchangeRateDisplayProps {
    exchangeRates: any;
}

const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({ exchangeRates }) => {
    // 🔧 VALIDACIÓN DEFENSIVA
    if (!exchangeRates) {
        return null;
    }

    if (exchangeRates.loading) {
        return (
            <div className="footer-exchange-rates">
                <div className="exchange-loading">Loading rates...</div>
            </div>
        );
    }

    if (exchangeRates.error && !exchangeRates.USD_COP?.current) {
        return (
            <div className="footer-exchange-rates">
                <div className="exchange-error">Rates unavailable</div>
            </div>
        );
    }

    // 🔧 VALIDAR QUE EXISTAN LOS DATOS
    const copData = exchangeRates.USD_COP || { current: 0, trend: 'neutral', changePercent: 0 };
    const inrData = exchangeRates.USD_INR || { current: 0, trend: 'neutral', changePercent: 0 };

    return (
        <div className="footer-exchange-rates">
            <div className="exchange-item">
                <CurrencyIconCOP />
                <div className="rate-container">
                    <span className="rate-text">
                        USD → COP: ${copData.current.toFixed(2)}
                    </span>
                    <TrendIcon
                        trend={copData.trend}
                        changePercent={copData.changePercent}
                    />
                </div>
            </div>

            <div className="exchange-item">
                <CurrencyIconINR />
                <div className="rate-container">
                    <span className="rate-text">
                        USD → INR: ₹{inrData.current.toFixed(2)}
                    </span>
                    <TrendIcon
                        trend={inrData.trend}
                        changePercent={inrData.changePercent}
                    />
                </div>
            </div>

            {/* 🔧 VALIDACIÓN SEGURA PARA LA FECHA */}
            {exchangeRates.lastUpdated && (
                <div className="last-updated">
                    <small>
                        Updated: {
                            exchangeRates.lastUpdated instanceof Date
                                ? exchangeRates.lastUpdated.toLocaleDateString()
                                : typeof exchangeRates.lastUpdated === 'string'
                                    ? new Date(exchangeRates.lastUpdated).toLocaleDateString()
                                    : 'Today'
                        }
                    </small>
                </div>
            )}
        </div>
    );
};

export default ExchangeRateDisplay;