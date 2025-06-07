import React from 'react';
import './FuturisticBackground.css';

const FuturisticBackground: React.FC = () => {
    return (
        <div className="futuristic-background">
            {/* Gradientes de fondo estáticos */}
            <div className="bg-gradient-1"></div>
            <div className="bg-gradient-2"></div>
            <div className="bg-gradient-3"></div>
            
            {/* Grid sutil opcional */}
            <div className="static-grid"></div>
        </div>
    );
};

export default FuturisticBackground;