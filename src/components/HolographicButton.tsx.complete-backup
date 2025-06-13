import React from 'react';
import './HolographicButton.css';

interface HolographicButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
    icon?: string;
}

const HolographicButton: React.FC<HolographicButtonProps> = ({
    children,
    onClick,
    loading = false,
    disabled = false,
    variant = 'primary',
    icon
}) => {
    const isDisabled = loading || disabled;
    
    return (
        <button
            className={`holo-btn holo-btn-${variant} ${loading ? 'loading' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={onClick}
            disabled={isDisabled}
        >
            <div className="holo-btn-bg"></div>
            <div className="holo-btn-content">
                {icon && <span className="holo-icon">{icon}</span>}
                <span className="holo-text">{children}</span>
            </div>
            <div className="holo-particles">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`particle particle-${i + 1}`}></div>
                ))}
            </div>
            {loading && <div className="holo-loader"></div>}
        </button>
    );
};

export default HolographicButton;