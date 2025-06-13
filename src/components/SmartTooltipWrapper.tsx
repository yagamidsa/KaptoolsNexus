// 🔥 SmartTooltipWrapper.tsx - ARREGLADO para Tauri (sin NodeJS.Timeout)
// src/components/SmartTooltipWrapper.tsx

import React, { useEffect, useRef, useState, cloneElement, ReactElement } from 'react';
import ReactDOM from 'react-dom';
import './style/SmartTooltip.css';

interface TooltipContent {
    icon: string;
    message: string;
    detail?: string;
    type: 'success' | 'warning' | 'error' | 'info';
}

interface SmartTooltipWrapperProps {
    children: ReactElement;
    content: TooltipContent;
    enabled?: boolean;
    delay?: number;
    offset?: number;
}

export const SmartTooltipWrapper: React.FC<SmartTooltipWrapperProps> = ({
    children,
    content,
    enabled = true,
    delay = 500,
    offset = 8
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0, placement: 'top' });
    const triggerRef = useRef<HTMLElement>(null);
    // 🔥 ARREGLADO: usar number en lugar de NodeJS.Timeout para Tauri
    const timeoutRef = useRef<number>();

    // 🔥 Calcular posición inteligente
    const calculatePosition = () => {
        if (!triggerRef.current || !enabled) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Espacios disponibles
        const spaceTop = rect.top;
        const spaceBottom = viewportHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = viewportWidth - rect.right;

        // Tamaño estimado del tooltip
        const tooltipWidth = viewportWidth <= 768 ? 180 : 240;
        const tooltipHeight = 60; // Estimación

        let placement = 'top';
        let x = rect.left + rect.width / 2;
        let y = rect.top;

        // Algoritmo de posicionamiento inteligente
        if (viewportWidth <= 1024) {
            // Móvil/tablet: preferir arriba/abajo
            if (spaceTop > tooltipHeight + offset && spaceTop >= spaceBottom) {
                placement = 'top';
                y = rect.top - offset;
            } else if (spaceBottom > tooltipHeight + offset) {
                placement = 'bottom';
                y = rect.bottom + offset;
            } else {
                // No hay espacio suficiente, no mostrar
                return;
            }
        } else {
            // Desktop: todas las direcciones
            const positions = [
                { name: 'top', space: spaceTop, x, y: rect.top - offset },
                { name: 'bottom', space: spaceBottom, x, y: rect.bottom + offset },
                { name: 'left', space: spaceLeft, x: rect.left - offset, y: rect.top + rect.height / 2 },
                { name: 'right', space: spaceRight, x: rect.right + offset, y: rect.top + rect.height / 2 }
            ];

            // Encontrar la mejor posición
            const bestPosition = positions
                .filter(pos => pos.space > (pos.name.includes('left') || pos.name.includes('right') ? tooltipWidth : tooltipHeight) + offset)
                .sort((a, b) => b.space - a.space)[0];

            if (bestPosition) {
                placement = bestPosition.name;
                x = bestPosition.x;
                y = bestPosition.y;
            } else {
                return; // No hay espacio suficiente
            }
        }

        // Ajustar posición para evitar salirse del viewport
        if (placement === 'top' || placement === 'bottom') {
            const halfWidth = tooltipWidth / 2;
            if (x - halfWidth < 10) {
                x = halfWidth + 10;
            } else if (x + halfWidth > viewportWidth - 10) {
                x = viewportWidth - halfWidth - 10;
            }
        }

        setPosition({ x, y, placement });
    };

    // 🔥 Handlers
    const handleMouseEnter = () => {
        if (!enabled) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // 🔥 ARREGLADO: window.setTimeout devuelve number en el navegador
        timeoutRef.current = window.setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // 🔥 Efectos
    useEffect(() => {
        const handleResize = () => {
            if (isVisible) {
                calculatePosition();
            }
        };

        const handleScroll = () => {
            if (isVisible) {
                calculatePosition();
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isVisible]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // 🔥 Clonar el children con eventos
    const enhancedChild = cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: (e: React.MouseEvent) => {
            handleMouseEnter();
            if (children.props.onMouseEnter) {
                children.props.onMouseEnter(e);
            }
        },
        onMouseLeave: (e: React.MouseEvent) => {
            handleMouseLeave();
            if (children.props.onMouseLeave) {
                children.props.onMouseLeave(e);
            }
        }
    });

    // 🔥 Tooltip Component
    const TooltipComponent = () => {
        if (!isVisible || !enabled) return null;

        const getTooltipStyle = () => {
            const { x, y, placement } = position;
            
            switch (placement) {
                case 'top':
                    return {
                        left: x,
                        top: y,
                        transform: 'translateX(-50%) translateY(-100%)'
                    };
                case 'bottom':
                    return {
                        left: x,
                        top: y,
                        transform: 'translateX(-50%)'
                    };
                case 'left':
                    return {
                        left: x,
                        top: y,
                        transform: 'translateX(-100%) translateY(-50%)'
                    };
                case 'right':
                    return {
                        left: x,
                        top: y,
                        transform: 'translateY(-50%)'
                    };
                default:
                    return {
                        left: x,
                        top: y,
                        transform: 'translateX(-50%) translateY(-100%)'
                    };
            }
        };

        return (
            <div
                className={`smart-tooltip smart-tooltip-${position.placement} smart-tooltip-${content.type} visible`}
                style={getTooltipStyle()}
            >
                <div className="smart-tooltip-content">
                    <div className="tooltip-header">
                        <span className={`tooltip-icon ${content.type}`}>
                            {content.icon}
                        </span>
                        <strong>{content.message}</strong>
                    </div>
                    {content.detail && (
                        <div className="tooltip-detail">
                            💡 {content.detail}
                        </div>
                    )}
                </div>
                <div className="smart-tooltip-arrow"></div>
            </div>
        );
    };

    // 🔥 Renderizar tooltip en portal para evitar conflictos de z-index
    return (
        <>
            {enhancedChild}
            {isVisible && enabled && ReactDOM.createPortal(
                <TooltipComponent />,
                document.body
            )}
        </>
    );
};