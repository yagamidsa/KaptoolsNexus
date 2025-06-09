// 🔥 Hook para posicionamiento inteligente de tooltips
// Crear archivo: src/hooks/useSmartTooltip.tsx

import { useEffect, useRef, useState } from 'react';

interface TooltipPosition {
    position: 'top' | 'bottom' | 'left' | 'right';
    className: string;
}

export const useSmartTooltip = () => {
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
        position: 'top',
        className: 'tooltip-top'
    });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculatePosition = () => {
            if (!triggerRef.current) return;

            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Espacios disponibles
            const spaceTop = rect.top;
            const spaceBottom = viewportHeight - rect.bottom;
            const spaceLeft = rect.left;
            const spaceRight = viewportWidth - rect.right;

            // Umbrales mínimos
            const minSpace = 120; // Espacio mínimo necesario para tooltip

            let newPosition: TooltipPosition;

            // En móvil, preferir arriba/abajo
            if (viewportWidth <= 768) {
                if (spaceTop > minSpace) {
                    newPosition = { position: 'top', className: 'tooltip-top' };
                } else {
                    newPosition = { position: 'bottom', className: 'tooltip-bottom' };
                }
            } else {
                // En desktop, considerar todas las posiciones
                if (spaceTop > minSpace && spaceTop >= Math.max(spaceBottom, spaceLeft, spaceRight)) {
                    newPosition = { position: 'top', className: 'tooltip-top' };
                } else if (spaceBottom > minSpace && spaceBottom >= Math.max(spaceTop, spaceLeft, spaceRight)) {
                    newPosition = { position: 'bottom', className: 'tooltip-bottom' };
                } else if (spaceLeft > minSpace && spaceLeft >= spaceRight) {
                    newPosition = { position: 'left', className: 'tooltip-left' };
                } else {
                    newPosition = { position: 'right', className: 'tooltip-right' };
                }
            }

            setTooltipPosition(newPosition);
        };

        // Calcular posición inicial
        calculatePosition();

        // Recalcular en resize y scroll
        const handleResize = () => calculatePosition();
        const handleScroll = () => calculatePosition();

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    return { triggerRef, tooltipPosition };
};